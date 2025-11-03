import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "./message-bubble";
import { Send, Sparkles, Bot, Mic, MicOff, RotateCcw, PlayCircle, PauseCircle, FileText, Search, Settings, Phone, Calendar, BarChart3, MessageSquare, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ChatMessage } from "@shared/schema";
import arasAiImage from "@assets/ChatGPT Image 9. Apr. 2025_ 21_38_23_1754515368187.png";
import arasLogo from "@/assets/aras_logo_1755067745303.png";

const ANIMATED_TEXTS = [
  "Anrufe",
  "Termine vereinbaren",
  "Termine verschieben", 
  "Leads anrufen",
  "Kunden anrufen",
  "Verkaufsgespräche führen",
  "Follow-ups automatisieren"
];

export function ChatInterface() {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [aiPersonality, setAiPersonality] = useState("professional");
  const [responseLength, setResponseLength] = useState("detailed");
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    return localStorage.getItem("aras-language") || "en";
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Typewriter animation effect
  useEffect(() => {
    const currentText = ANIMATED_TEXTS[currentTextIndex];
    let charIndex = 0;
    
    if (isTyping) {
      const typeInterval = setInterval(() => {
        if (charIndex <= currentText.length) {
          setDisplayText(currentText.substring(0, charIndex));
          charIndex++;
        } else {
          setIsTyping(false);
          setTimeout(() => {
            setIsTyping(true);
            setCurrentTextIndex((prev) => (prev + 1) % ANIMATED_TEXTS.length);
          }, 2000);
          clearInterval(typeInterval);
        }
      }, 100);
      
      return () => clearInterval(typeInterval);
    }
  }, [currentTextIndex, isTyping]);

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  const { data: chatSessions = [], isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/chat/sessions"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  const startNewChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chat/sessions/new", {
        title: `Chat ${new Date().toLocaleTimeString()}`
      });
      return response.json();
    },
    onSuccess: (data) => {
      stopAllAudio();
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
      toast({
        title: "New chat started",
        description: "Previous conversation moved to history",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error starting new chat",
        description: error.message || "Failed to start new chat session",
        variant: "destructive",
      });
    },
  });

  const { data: subscriptionData } = useQuery<import("@shared/schema").SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      setShowTypingIndicator(true);
      
      let assistantId = null;
      try {
        const assistantConfig = await fetch("/api/assistant/config", {
          credentials: "include"
        });
        if (assistantConfig.ok) {
          const config = await assistantConfig.json();
          assistantId = config.assistantId;
        }
      } catch (error) {
        console.log("No assistant configured, using default chat");
      }
      
      const response = await apiRequest("POST", "/api/chat/messages", { 
        message,
        personality: aiPersonality,
        responseLength,
        context: "sales_automation",
        language: selectedLanguage,
        assistantId
      });
      return response.json();
    },
    onSuccess: (data) => {
      setShowTypingIndicator(false);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/subscription"] });
    },
    onError: (error: any) => {
      setShowTypingIndicator(false);
      
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
        errorData = { message: "Failed to send message" };
      }

      if (errorData?.requiresPayment) {
        toast({
          title: "Trial Limit Reached",
          description: errorData.message || "Please upgrade to continue using AI messages.",
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

      if (errorData?.requiresUpgrade) {
        toast({
          title: "Plan Limit Reached",
          description: errorData.message || "Upgrade to a higher plan to continue.",
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

      toast({
        title: "Error",
        description: errorData?.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const startNewChat = () => {
    if (messages.length > 0) {
      startNewChatMutation.mutate();
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || sendMessage.isPending) return;
    
    const userMessage = message;
    setMessage("");
    
    try {
      await sendMessage.mutateAsync(userMessage);
    } catch (error) {
      // Error already handled in mutation
    }
  };

  const handleSearchMessages = (query: string) => {
    return messages.filter(msg => 
      msg.message.toLowerCase().includes(query.toLowerCase())
    );
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          sampleSize: 16,
          channelCount: 1
        } 
      });
      
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm;codecs=vp9',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus'
      ];
      
      let selectedType = 'audio/webm';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedType = type;
          break;
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedType,
        audioBitsPerSecond: 128000
      });
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        stream.getTracks().forEach(track => track.stop());
        
        if (audioBlob.size < 1000) {
          toast({
            title: "Recording Too Short",
            description: "Please speak for at least 1-2 seconds for better recognition.",
            variant: "destructive",
          });
          return;
        }
        
        await transcribeAudio(audioBlob);
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
        toast({
          title: "Recording Error",
          description: "Failed to record audio. Please try again.",
          variant: "destructive",
        });
      };
      
      mediaRecorder.start(250);
      setIsRecording(true);
      
      toast({
        title: "Recording Started",
        description: "Speak clearly into your microphone. Click again to stop.",
      });
      
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          stopRecording();
        }
      }, 30000);
      
    } catch (error) {
      console.error('Microphone error:', error);
      setIsRecording(false);
      
      let errorMessage = "Unable to access microphone.";
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = "Microphone access denied. Please allow permissions in your browser.";
            break;
          case 'NotFoundError':
            errorMessage = "No microphone found. Please check your audio devices.";
            break;
          case 'NotReadableError':
            errorMessage = "Microphone is busy. Please close other applications using the microphone.";
            break;
        }
      }
      
      toast({
        title: "Microphone Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      toast({
        title: "Processing Speech",
        description: "Converting your voice to text...",
      });
    }
    setIsRecording(false);
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      const extension = audioBlob.type.includes('mp4') ? 'mp4' : 
                      audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
      formData.append('audio', audioBlob, `recording.${extension}`);

      const response = await fetch("/api/speech/transcribe", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (data.text && data.text.trim() && data.text.trim() !== '. . .' && data.text.trim() !== '...') {
        const cleanedText = data.text.trim().replace(/\s+/g, ' ');
        setMessage(cleanedText);
        toast({
          title: "Speech Recognized",
          description: `Transcribed: "${cleanedText.substring(0, 50)}${cleanedText.length > 50 ? '...' : ''}"`,
        });
      } else {
        toast({
          title: "No Speech Detected",
          description: `Audio processed but no clear speech found. Please speak louder and clearer.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Speech Recognition Error",
        description: "Failed to convert speech to text. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const stopAllAudio = () => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.currentTime = 0;
      if (ttsAudioRef.current.src) {
        URL.revokeObjectURL(ttsAudioRef.current.src);
      }
      ttsAudioRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    }
    
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
      setAudioURL(null);
    }
    
    setIsSpeaking(false);
    setIsPlayingAudio(false);
  };

  const speakText = async (text: string) => {
    stopAllAudio();
    
    setIsSpeaking(true);
    try {
      const response = await apiRequest("POST", "/api/speech/synthesize", { 
        text,
        voice: "nova",
        speed: 1.0
      });
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      ttsAudioRef.current = audio;
      
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        ttsAudioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        ttsAudioRef.current = null;
        toast({
          title: "Speech Synthesis Error",
          description: "Could not play AI voice response.",
          variant: "destructive",
        });
      };
      
      await audio.play();
    } catch (error) {
      console.error('Text-to-speech error:', error);
      setIsSpeaking(false);
      ttsAudioRef.current = null;
      toast({
        title: "Voice Synthesis Failed",
        description: "Could not convert AI response to speech.",
        variant: "destructive",
      });
    }
  };

  const playAudio = () => {
    if (audioURL) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      const audio = new Audio(audioURL);
      audioRef.current = audio;
      
      audio.onplay = () => setIsPlayingAudio(true);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onpause = () => setIsPlayingAudio(false);
      
      audio.play();
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
  };

  const handleNewChat = async () => {
    queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    try {
      await startNewChatMutation.mutateAsync();
    } catch (error) {
      // Error already handled in mutation
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sendMessage.isPending]);

  useEffect(() => {
    const savedPersonality = localStorage.getItem("aras-ai-personality");
    const savedResponseLength = localStorage.getItem("aras-response-length");
    
    if (savedPersonality) {
      setAiPersonality(savedPersonality);
    }
    if (savedResponseLength) {
      setResponseLength(savedResponseLength);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAllAudio();
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMultiline) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === 'Enter' && e.shiftKey) {
      setIsMultiline(true);
    }
  };

  if (authLoading || messagesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12"
        >
          <img src={arasLogo} alt="Loading" className="w-full h-full object-contain" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-black relative overflow-hidden">
      {/* Ambient Background Effect */}
      <div className="absolute inset-0 bg-gradient-radial from-orange-500/5 via-transparent to-transparent opacity-50 blur-3xl pointer-events-none" />
      
      {messages.length === 0 ? (
        /* GROK-STYLE WELCOME SCREEN */
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Animated Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <img src={arasLogo} alt="ARAS AI" className="w-20 h-20 object-contain" />
          </motion.div>

          {/* Animated Headline */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              ARAS AI
            </h1>
            <div className="flex items-center justify-center space-x-3 text-2xl md:text-3xl text-gray-400">
              <span>erledigt:</span>
              <motion.span 
                key={currentTextIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-orange-500 font-semibold min-w-[300px] text-left"
              >
                {displayText}
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block w-[3px] h-[28px] bg-orange-500 ml-1"
                />
              </motion.span>
            </div>
          </motion.div>

          {/* Quick Action Buttons */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-12 max-w-2xl w-full"
          >
            {[
              "DeepSearch",
              "Aktuelle Nachrichten", 
              "Stimme"
            ].map((label, idx) => (
              <motion.button
                key={label}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white text-sm font-medium transition-all duration-200"
                onClick={() => setMessage(label)}
              >
                {label}
              </motion.button>
            ))}
          </motion.div>

          {/* Main Input - Grok Style */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="w-full max-w-3xl"
          >
            <div className="relative">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Was möchtest du wissen?"
                className="w-full h-14 bg-white/5 backdrop-blur-sm text-white placeholder:text-gray-500 border border-white/10 rounded-2xl px-6 pr-32 text-base focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                disabled={sendMessage.isPending}
              />
              
              {/* Language Selector in Input */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                <select
                  value={selectedLanguage}
                  onChange={(e) => {
                    setSelectedLanguage(e.target.value);
                    localStorage.setItem("aras-language", e.target.value);
                  }}
                  className="text-xs bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-2 py-1 text-white focus:border-orange-500/50 outline-none cursor-pointer"
                >
                  <option value="en" className="bg-gray-900">🇺🇸 EN</option>
                  <option value="de" className="bg-gray-900">🇩🇪 DE</option>
                  <option value="es" className="bg-gray-900">🇪🇸 ES</option>
                  <option value="fr" className="bg-gray-900">🇫🇷 FR</option>
                </select>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={isRecording ? stopRecording : startRecording}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all duration-200"
                  disabled={sendMessage.isPending}
                >
                  {isRecording ? (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <MicOff className="w-4 h-4 text-red-400" />
                    </motion.div>
                  ) : isTranscribing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-4 h-4 text-orange-400" />
                    </motion.div>
                  ) : (
                    <Mic className="w-4 h-4 text-gray-400" />
                  )}
                </motion.button>
              </div>
            </div>
            
            {/* Subscription Status */}
            {subscriptionData && (
              <div className="text-center mt-3 text-xs text-gray-500">
                {subscriptionData.aiMessagesUsed} / {subscriptionData.aiMessagesLimit || '∞'} messages used this month
              </div>
            )}
          </motion.div>
        </div>
      ) : (
        /* CHAT MESSAGES VIEW */
        <>
          {/* Compact Header */}
          <div className="px-6 py-3 border-b border-white/10 flex justify-between items-center backdrop-blur-sm bg-black/50">
            <div className="flex items-center space-x-3">
              <img src={arasLogo} alt="ARAS" className="w-8 h-8 object-contain" />
              <span className="text-white font-semibold">ARAS AI</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {subscriptionData?.status === 'trial' && (
                <div className="flex items-center space-x-1 bg-orange-500/10 border border-orange-500/20 rounded-lg px-2 py-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-orange-300">
                    {subscriptionData.trialMessagesRemaining || 0} left
                  </span>
                </div>
              )}
              
              <select
                value={selectedLanguage}
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  localStorage.setItem("aras-language", e.target.value);
                }}
                className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-white focus:border-orange-500/50 outline-none"
              >
                <option value="en" className="bg-gray-900">🇺🇸 EN</option>
                <option value="de" className="bg-gray-900">🇩🇪 DE</option>
                <option value="es" className="bg-gray-900">🇪🇸 ES</option>
                <option value="fr" className="bg-gray-900">🇫🇷 FR</option>
              </select>
              
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleNewChat}
                className="text-gray-400 hover:text-white"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <AnimatePresence>
              {(searchQuery ? handleSearchMessages(searchQuery) : messages).map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg.message}
                  isAi={msg.isAi || false}
                  timestamp={msg.timestamp ? new Date(msg.timestamp) : new Date()}
                  confidence={msg.isAi ? 0.95 : undefined}
                  messageId={msg.id.toString()}
                  onReaction={(messageId, reaction) => {
                    toast({
                      title: "Feedback Recorded",
                      description: `Thanks for the ${reaction} feedback!`,
                    });
                  }}
                  onSpeak={speakText}
                  isSpeaking={isSpeaking}
                />
              ))}
            </AnimatePresence>

            {(sendMessage.isPending || showTypingIndicator) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="flex items-start space-x-3">
                  <img 
                    src={arasAiImage} 
                    alt="ARAS AI" 
                    className="w-8 h-8 rounded-full object-contain"
                  />
                  
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <motion.div 
                          className="w-2 h-2 bg-orange-400 rounded-full"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div 
                          className="w-2 h-2 bg-orange-400 rounded-full"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div 
                          className="w-2 h-2 bg-orange-400 rounded-full"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">
                        ARAS AI denkt nach...
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="px-6 py-4 border-t border-white/10 backdrop-blur-sm bg-black/50">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nachricht an ARAS AI"
                  className="w-full h-14 bg-white/5 backdrop-blur-sm text-white placeholder:text-gray-500 border border-white/10 rounded-2xl px-6 pr-32 text-base focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                  disabled={sendMessage.isPending}
                />
                
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={isRecording ? stopRecording : startRecording}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all duration-200"
                    disabled={sendMessage.isPending}
                  >
                    {isRecording ? (
                      <MicOff className="w-4 h-4 text-red-400" />
                    ) : (
                      <Mic className="w-4 h-4 text-gray-400" />
                    )}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sendMessage.isPending}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-all duration-200"
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
