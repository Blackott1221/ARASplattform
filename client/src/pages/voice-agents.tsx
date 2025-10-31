import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { GlowButton } from "@/components/ui/glow-button";
import { GradientText } from "@/components/ui/gradient-text";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bot, Plus, Edit, Trash2, Mic, Play, Pause } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { SubscriptionResponse, VoiceAgent, InsertVoiceAgent } from "@shared/schema";

export default function VoiceAgents() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [editingAgent, setEditingAgent] = useState<VoiceAgent | null>(null);
  const [isPlaying, setIsPlaying] = useState<number | null>(null);
  
  const [agentData, setAgentData] = useState<InsertVoiceAgent>({
    name: "",
    description: "",
    voice: "professional",
    personality: "",
    customScript: "",
    ttsVoice: "nova",
    language: "en",
    industry: "general",
    userId: null,
    isSystemAgent: false,
    isActive: true,
  });

  const queryClient = useQueryClient();

  // Fetch user's subscription data
  const { data: subscriptionData } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  // Fetch voice agents
  const { data: voiceAgents = [], isLoading: agentsLoading } = useQuery<VoiceAgent[]>({
    queryKey: ["/api/voice-agents"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  // Create voice agent mutation
  const createAgentMutation = useMutation({
    mutationFn: async (agentData: InsertVoiceAgent) => {
      const response = await apiRequest("POST", "/api/voice-agents", agentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Voice Agent Created",
        description: "Your custom voice agent has been created successfully!",
      });
      setShowCreateAgent(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/voice-agents"] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create voice agent",
        variant: "destructive",
      });
    },
  });

  // Update voice agent mutation
  const updateAgentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertVoiceAgent> }) => {
      const response = await apiRequest("PUT", `/api/voice-agents/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Voice Agent Updated",
        description: "Your voice agent has been updated successfully!",
      });
      setEditingAgent(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/voice-agents"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update voice agent",
        variant: "destructive",
      });
    },
  });

  // Delete voice agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/voice-agents/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Voice Agent Deleted",
        description: "Voice agent has been removed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/voice-agents"] });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete voice agent",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setAgentData({
      name: "",
      description: "",
      voice: "professional",
      personality: "",
      customScript: "",
      ttsVoice: "nova",
      language: "en",
      industry: "general",
      userId: null,
      isSystemAgent: false,
      isActive: true,
    });
  };

  const handleEdit = (agent: VoiceAgent) => {
    setEditingAgent(agent);
    setAgentData({
      name: agent.name,
      description: agent.description || "",
      voice: agent.voice,
      personality: agent.personality || "",
      customScript: agent.customScript || "",
      ttsVoice: agent.ttsVoice || "nova",
      language: agent.language || "en",
      industry: agent.industry || "general",
      userId: user?.id || null,
      isSystemAgent: false,
      isActive: agent.isActive || true,
    });
    setShowCreateAgent(true);
  };

  const handleSubmit = () => {
    if (!agentData.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide an agent name",
        variant: "destructive",
      });
      return;
    }

    if (editingAgent) {
      updateAgentMutation.mutate({ id: editingAgent.id, data: { ...agentData, userId: user?.id || null } });
    } else {
      createAgentMutation.mutate({ ...agentData, userId: user?.id || null });
    }
  };

  const handleDelete = (agent: VoiceAgent) => {
    if (agent.isSystemAgent) {
      toast({
        title: "Cannot Delete",
        description: "System agents cannot be deleted",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to delete "${agent.name}"?`)) {
      deleteAgentMutation.mutate(agent.id);
    }
  };

  const playVoicePreview = async (agent: VoiceAgent) => {
    if (isPlaying === agent.id) {
      setIsPlaying(null);
      return;
    }

    setIsPlaying(agent.id);
    
    try {
      const previewText = agent.customScript || `Hello, this is ${agent.name}. I'm your AI voice agent ready to help with your sales calls.`;
      
      const response = await apiRequest("POST", "/api/speech/synthesize", {
        text: previewText,
        voice: agent.ttsVoice || "nova",
        speed: 1.0
      });
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => setIsPlaying(null);
      audio.onerror = () => {
        setIsPlaying(null);
        toast({
          title: "Preview Failed",
          description: "Could not play voice preview",
          variant: "destructive",
        });
      };
      
      await audio.play();
    } catch (error) {
      setIsPlaying(null);
      toast({
        title: "Preview Error",
        description: "Failed to generate voice preview",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen bg-space space-pattern circuit-pattern items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const defaultSubscriptionData: SubscriptionResponse = {
    plan: 'starter',
    status: 'trial',
    aiMessagesUsed: 0,
    voiceCallsUsed: 0,
    aiMessagesLimit: 5,
    voiceCallsLimit: 0,
    renewalDate: null
  };

  return (
    <div className="flex h-screen bg-space space-pattern circuit-pattern">
      <Sidebar activeSection="voice-agents" onSectionChange={() => {}} />
      <div className="flex-1 flex flex-col">
        <TopBar 
          currentSection="voice-agents" 
          subscriptionData={subscriptionData || defaultSubscriptionData}
          user={user as any}
        />
        
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl font-orbitron font-bold">
                  <GradientText>Voice Agents</GradientText>
                </h1>
                <p className="text-lg text-muted-foreground">
                  Create and customize AI voice agents for your sales calls
                </p>
              </div>
              
              <GlowButton
                size="lg"
                onClick={() => {
                  setEditingAgent(null);
                  resetForm();
                  setShowCreateAgent(true);
                }}
                className="px-6"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Agent
              </GlowButton>
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agentsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-muted rounded-full"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              ) : (
                voiceAgents.map((agent, index) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-lg transition-all duration-300 border-border/50">
                      <CardHeader className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-12 h-12">
                              <AvatarFallback className="bg-primary/10">
                                <Bot className="w-6 h-6 text-primary" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                {agent.name}
                                {agent.isSystemAgent && (
                                  <Badge variant="secondary" className="text-xs">System</Badge>
                                )}
                              </CardTitle>
                              <CardDescription>
                                {agent.description}
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Voice:</span>
                            <Badge variant="outline">{agent.voice}</Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">TTS Voice:</span>
                            <Badge variant="outline">{agent.ttsVoice}</Badge>
                          </div>
                          {agent.industry && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Industry:</span>
                              <Badge variant="outline">{agent.industry}</Badge>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {agent.personality && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Personality</Label>
                            <p className="text-sm mt-1 line-clamp-3">{agent.personality}</p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => playVoicePreview(agent)}
                            disabled={isPlaying !== null}
                            className="flex-1 mr-2"
                          >
                            {isPlaying === agent.id ? (
                              <Pause className="w-4 h-4 mr-1" />
                            ) : (
                              <Play className="w-4 h-4 mr-1" />
                            )}
                            Preview
                          </Button>
                          
                          <div className="flex space-x-1">
                            {!agent.isSystemAgent && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(agent)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(agent)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Create/Edit Agent Dialog */}
        <Dialog open={showCreateAgent} onOpenChange={setShowCreateAgent}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-orbitron">
                <GradientText>
                  {editingAgent ? "Edit Voice Agent" : "Create Voice Agent"}
                </GradientText>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Agent Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Professional Sarah"
                      value={agentData.name}
                      onChange={(e) => setAgentData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="voice">Voice Type *</Label>
                    <Select 
                      value={agentData.voice} 
                      onValueChange={(value) => setAgentData(prev => ({ ...prev, voice: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="authoritative">Authoritative</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="empathetic">Empathetic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Brief description of the agent"
                    value={agentData.description}
                    onChange={(e) => setAgentData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              {/* Voice Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Voice Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ttsVoice">TTS Voice</Label>
                    <Select 
                      value={agentData.ttsVoice || "nova"} 
                      onValueChange={(value) => setAgentData(prev => ({ ...prev, ttsVoice: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alloy">Alloy (Neutral)</SelectItem>
                        <SelectItem value="echo">Echo (Deep)</SelectItem>
                        <SelectItem value="fable">Fable (Expressive)</SelectItem>
                        <SelectItem value="nova">Nova (Warm)</SelectItem>
                        <SelectItem value="onyx">Onyx (Professional)</SelectItem>
                        <SelectItem value="shimmer">Shimmer (Friendly)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Select 
                      value={agentData.industry || "general"} 
                      onValueChange={(value) => setAgentData(prev => ({ ...prev, industry: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="real_estate">Real Estate</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Personality & Script */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Personality & Script</h3>
                
                <div>
                  <Label htmlFor="personality">Personality Description</Label>
                  <Textarea
                    id="personality"
                    placeholder="Describe how this agent should behave and speak..."
                    value={agentData.personality || ""}
                    onChange={(e) => setAgentData(prev => ({ ...prev, personality: e.target.value }))}
                    className="min-h-[80px]"
                  />
                </div>
                
                <div>
                  <Label htmlFor="customScript">Custom Opening Script</Label>
                  <Textarea
                    id="customScript"
                    placeholder="The opening message for calls..."
                    value={agentData.customScript || ""}
                    onChange={(e) => setAgentData(prev => ({ ...prev, customScript: e.target.value }))}
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateAgent(false)}
                >
                  Cancel
                </Button>
                <GlowButton 
                  onClick={handleSubmit}
                  disabled={createAgentMutation.isPending || updateAgentMutation.isPending}
                >
                  {editingAgent ? "Update Agent" : "Create Agent"}
                </GlowButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}