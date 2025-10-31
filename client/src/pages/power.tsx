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

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Phone, Upload, FileText, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { SubscriptionResponse, VoiceAgent } from "@shared/schema";

export default function Power() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [showManualCall, setShowManualCall] = useState(false);
  const [showBulkCall, setShowBulkCall] = useState(false);
  const [selectedVoiceAgent, setSelectedVoiceAgent] = useState<string>("");
  const [manualCallData, setManualCallData] = useState({
    name: "",
    phoneNumber: "",
    message: "",
  });
  const [bulkCallData, setBulkCallData] = useState({
    campaignName: "",
    csvFile: null as File | null,
  });


  const queryClient = useQueryClient();

  // Fetch user's subscription data only when user is authenticated
  const { data: userSubscription } = useQuery<SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  // Fetch voice agents
  const { data: voiceAgents, isLoading: voiceAgentsLoading } = useQuery<VoiceAgent[]>({
    queryKey: ["/api/voice-agents"],
    enabled: !!user && !authLoading,
    retry: false,
  });



  // Show loading state while authentication is in progress
  if (authLoading) {
    return (
      <div className="flex h-screen bg-space space-pattern circuit-pattern items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const subscriptionData: SubscriptionResponse = userSubscription || {
    plan: 'starter',
    status: 'trial',
    aiMessagesUsed: 0,
    voiceCallsUsed: 0,
    aiMessagesLimit: 5,
    voiceCallsLimit: 0,
    renewalDate: null
  };

  // Manual call mutation
  const manualCallMutation = useMutation({
    mutationFn: async (callData: any) => {
      const response = await apiRequest("POST", "/api/calls", callData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Call Initiated Successfully",
        description: `AI voice call started to ${data.phoneNumber}. Voice agent: ${data.voiceAgent?.name || 'Unknown'}. Call logged.`,
      });
      setShowManualCall(false);
      setManualCallData({ name: "", phoneNumber: "", message: "" });
      setSelectedVoiceAgent("");
      // Refresh subscription usage
      queryClient.invalidateQueries({ queryKey: ["/api/user/subscription"] });
    },
    onError: (error: any) => {
      // Parse error response to check for trial/upgrade requirements
      let errorData = null;
      try {
        if (error.message) {
          try {
            errorData = JSON.parse(error.message);
          } catch {
            errorData = { message: error.message };
          }
        }
      } catch {
        errorData = { message: "Failed to initiate call" };
      }

      // Handle trial limit reached
      if (errorData?.requiresPayment) {
        toast({
          title: "Trial Limit Reached",
          description: errorData.message || "Voice calls require a paid plan.",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                window.location.href = '/billing';
              }}
            >
              Upgrade Now
            </Button>
          ),
        });
        return;
      }

      // Handle subscription limit reached
      if (errorData?.requiresUpgrade) {
        toast({
          title: "Call Limit Reached", 
          description: errorData.message || "Upgrade to a higher plan for more calls.",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                window.location.href = '/billing';
              }}
            >
              Upgrade Plan
            </Button>
          ),
        });
        return;
      }

      // Default error handling
      toast({
        title: "Call Failed",
        description: errorData?.message || "Failed to initiate call",
        variant: "destructive",
      });
    },
  });

  // Bulk call mutation
  const bulkCallMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      const formData = new FormData();
      formData.append("campaignName", campaignData.campaignName);
      formData.append("voiceAgentId", campaignData.voiceAgentId);
      if (campaignData.csvFile) {
        formData.append("csvFile", campaignData.csvFile);
      }
      
      const response = await fetch("/api/campaigns/bulk-upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload campaign");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Campaign Launched",
        description: `Campaign "${data.campaignName}" has been started successfully`,
      });
      setShowBulkCall(false);
      setBulkCallData({ campaignName: "", csvFile: null });
      setSelectedVoiceAgent("");
      // Refresh subscription usage
      queryClient.invalidateQueries({ queryKey: ["/api/user/subscription"] });
    },
    onError: (error: any) => {
      // Parse error response to check for trial/upgrade requirements
      let errorData = null;
      try {
        if (error.message) {
          try {
            errorData = JSON.parse(error.message);
          } catch {
            errorData = { message: error.message };
          }
        }
      } catch {
        errorData = { message: "Failed to launch campaign" };
      }

      // Handle trial limit reached
      if (errorData?.requiresPayment) {
        toast({
          title: "Trial Limit Reached",
          description: errorData.message || "Voice campaigns require a paid plan.",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                window.location.href = '/billing';
              }}
            >
              Upgrade Now
            </Button>
          ),
        });
        return;
      }

      // Handle subscription limit reached
      if (errorData?.requiresUpgrade) {
        toast({
          title: "Campaign Limit Reached",
          description: errorData.message || "Upgrade to a higher plan for more campaigns.",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                window.location.href = '/billing';
              }}
            >
              Upgrade Plan
            </Button>
          ),
        });
        return;
      }

      // Default error handling
      toast({
        title: "Campaign Failed",
        description: errorData?.message || "Failed to launch campaign",
        variant: "destructive",
      });
    },
  });



  const handleManualCall = () => {
    if (!manualCallData.name || !manualCallData.phoneNumber || !selectedVoiceAgent) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Check subscription usage limits
    if (subscriptionData.voiceCallsUsed >= (subscriptionData.voiceCallsLimit || 0) && subscriptionData.voiceCallsLimit !== null) {
      toast({
        title: "Voice Call Limit Reached",
        description: `You've used ${subscriptionData.voiceCallsUsed}/${subscriptionData.voiceCallsLimit} calls. Upgrade your plan to make more calls.`,
        variant: "destructive",
      });
      return;
    }

    manualCallMutation.mutate({
      phoneNumber: manualCallData.phoneNumber,
      leadName: manualCallData.name,
      message: manualCallData.message,
      voiceAgentId: parseInt(selectedVoiceAgent),
    });
  };

  const handleBulkCall = () => {
    if (!bulkCallData.campaignName || !bulkCallData.csvFile || !selectedVoiceAgent) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    bulkCallMutation.mutate({
      campaignName: bulkCallData.campaignName,
      csvFile: bulkCallData.csvFile,
      voiceAgentId: parseInt(selectedVoiceAgent),
    });
  };

  return (
    <div className="flex h-screen bg-space space-pattern circuit-pattern">
      <Sidebar activeSection="power" onSectionChange={() => {}} />
      <div className="flex-1 flex flex-col">
        <TopBar 
          currentSection="power" 
          subscriptionData={subscriptionData}
          user={user as import("@shared/schema").User}
        />
        


        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full space-y-12">
            {/* Manual Call - Centered */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-6"
            >
              <div className="space-y-4">
                <h1 className="text-4xl font-orbitron font-bold">
                  <GradientText>Manual Call</GradientText>
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  Initiate a single AI-powered voice call with personalized messaging. Call will be logged and tracked in your dashboard.
                </p>
              </div>

              <GlowButton
                size="lg"
                onClick={() => setShowManualCall(true)}
                className="px-8 py-4 text-lg"
              >
                <Phone className="w-5 h-5 mr-3" />
                Start Manual Call
              </GlowButton>
            </motion.div>

            {/* Bulk Call - Below */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="border-t border-border/30 pt-12"
            >
              <div className="text-center space-y-6">
                <div className="space-y-3">
                  <h2 className="text-2xl font-orbitron font-semibold text-foreground">
                    Bulk Campaign
                  </h2>
                  <p className="text-muted-foreground max-w-lg mx-auto">
                    Launch automated campaigns to multiple contacts with CSV upload and AI voice agents.
                  </p>
                </div>
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowBulkCall(true)}
                  className="px-6 py-3"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Launch Bulk Campaign
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Manual Call Dialog */}
        <Dialog open={showManualCall} onOpenChange={setShowManualCall}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-orbitron">
                <GradientText>Manual Call</GradientText>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Contact Name *</Label>
                <Input 
                  id="name" 
                  placeholder="Enter contact name"
                  value={manualCallData.name}
                  onChange={(e) => setManualCallData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input 
                  id="phone" 
                  placeholder="+1 (555) 123-4567"
                  value={manualCallData.phoneNumber}
                  onChange={(e) => setManualCallData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="agent">Voice Agent *</Label>
                <Select value={selectedVoiceAgent} onValueChange={setSelectedVoiceAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select voice agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceAgentsLoading ? (
                      <div className="p-2 flex items-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading agents...
                      </div>
                    ) : voiceAgents && voiceAgents.length > 0 ? (
                      voiceAgents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id.toString()}>
                          {agent.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-muted-foreground">No voice agents available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="message">Custom Message</Label>
                <Textarea 
                  id="message" 
                  placeholder="Enter custom message (optional)"
                  value={manualCallData.message}
                  onChange={(e) => setManualCallData(prev => ({ ...prev, message: e.target.value }))}
                  className="min-h-[80px] text-foreground bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Plan: {subscriptionData.plan.charAt(0).toUpperCase() + subscriptionData.plan.slice(1)}</span>
                  <span>Calls Used: {subscriptionData.voiceCallsUsed}/{subscriptionData.voiceCallsLimit || '∞'}</span>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                  💡 Note: This creates a call log entry and processes with AI voice synthesis. In production, this would connect to real telephony services.
                </div>
              </div>
              <GlowButton 
                onClick={handleManualCall} 
                className="w-full"
                disabled={manualCallMutation.isPending || (subscriptionData.voiceCallsLimit !== null && subscriptionData.voiceCallsUsed >= subscriptionData.voiceCallsLimit)}
              >
                {manualCallMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Initiating Call...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Start Call
                  </>
                )}
              </GlowButton>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Call Dialog */}
        <Dialog open={showBulkCall} onOpenChange={setShowBulkCall}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-orbitron">
                <GradientText>Bulk Campaign</GradientText>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="campaign">Campaign Name *</Label>
                <Input 
                  id="campaign" 
                  placeholder="Enter campaign name"
                  value={bulkCallData.campaignName}
                  onChange={(e) => setBulkCallData(prev => ({ ...prev, campaignName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="bulk-agent">Voice Agent *</Label>
                <Select value={selectedVoiceAgent} onValueChange={setSelectedVoiceAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select voice agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceAgentsLoading ? (
                      <div className="p-2 flex items-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading agents...
                      </div>
                    ) : voiceAgents && voiceAgents.length > 0 ? (
                      voiceAgents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id.toString()}>
                          {agent.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-muted-foreground">No voice agents available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="csv">Upload CSV File *</Label>
                <div 
                  className="relative border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => document.getElementById('csv-upload')?.click()}
                >
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  {bulkCallData.csvFile ? (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        {bulkCallData.csvFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(bulkCallData.csvFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Drop your CSV file here or click to browse
                    </p>
                  )}
                  <input 
                    id="csv-upload"
                    type="file" 
                    accept=".csv" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setBulkCallData(prev => ({ ...prev, csvFile: file }));
                      }
                    }}
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>• CSV format: name, phone, email (optional)</p>
                <p>• Calls counted against your subscription limit</p>
                <p>• Current plan: {subscriptionData.plan.charAt(0).toUpperCase() + subscriptionData.plan.slice(1)} ({subscriptionData.voiceCallsUsed}/{subscriptionData.voiceCallsLimit || '∞'} calls used)</p>
              </div>
              <GlowButton 
                onClick={handleBulkCall} 
                className="w-full"
                disabled={bulkCallMutation.isPending}
              >
                {bulkCallMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading Campaign...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Launch Campaign
                  </>
                )}
              </GlowButton>
            </div>
          </DialogContent>
        </Dialog>


      </div>
    </div>
  );
}
