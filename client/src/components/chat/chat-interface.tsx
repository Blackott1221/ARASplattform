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



export function ChatInterface() {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [aiPersonality, setAiPersonality] = useState("professional"); // professional, casual, technical
  const [responseLength, setResponseLength] = useState("detailed"); // brief, detailed, bullet
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
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

  // Fetch chat messages from database
  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  // Fetch chat sessions for history
  const { data: chatSessions = [], isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/chat/sessions"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  // New chat session mutation
  const startNewChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chat/sessions/new", {
        title: `Chat ${new Date().toLocaleTimeString()}`
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Stop all ongoing audio playback
      stopAllAudio();
      
      // Clear current messages and refresh both messages and sessions
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

  // Fetch user subscription data
  const { data: subscriptionData } = useQuery<import("@shared/schema").SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  // Send message mutation with enhanced AI response
  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      setShowTypingIndicator(true);
      
      // Get user's assistant configuration
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
      // Update messages list with new AI response
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/subscription"] });
    },
    onError: (error: any) => {
      setShowTypingIndicator(false);
      
      // Parse error response to check for trial/upgrade requirements
      let errorData = null;
      try {
        if (error.message) {
          // Try to parse as JSON if it's a structured error
          try {
            errorData = JSON.parse(error.message);
          } catch {
            // If not JSON, use the message directly
            errorData = { message: error.message };
          }
        }
      } catch {
        errorData = { message: "Failed to send message" };
      }

      // Handle trial limit reached
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
                // Navigate to billing page
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
          title: "Plan Limit Reached",
          description: errorData.message || "Upgrade to a higher plan to continue.",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Navigate to billing page
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
        title: "Error",
        description: errorData?.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Start new chat function - uses the mutation defined earlier

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
    // Filter messages based on search query
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
      
      // Check what formats are supported
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
      
      console.log('Using audio format:', selectedType);
      
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
        
        // Check audio quality before transcribing
        if (audioBlob.size < 1000) { // Less than 1KB indicates poor quality
          toast({
            title: "Recording Too Short",
            description: "Please speak for at least 1-2 seconds for better recognition.",
            variant: "destructive",
          });
          return;
        }
        
        // Log audio details for debugging
        console.log('Audio blob details:', {
          size: audioBlob.size,
          type: audioBlob.type,
          duration: 'unknown'
        });
        
        // Convert speech to text using OpenAI Whisper
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
      
      mediaRecorder.start(250); // Collect data every 250ms for better quality
      setIsRecording(true);
      
      toast({
        title: "Recording Started",
        description: "Speak clearly into your microphone. Click again to stop.",
      });
      
      // Auto-stop after 30 seconds for better processing
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

  // Speech-to-Text using OpenAI Whisper
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      // Use the correct extension based on the blob type
      const extension = audioBlob.type.includes('mp4') ? 'mp4' : 
                      audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
      formData.append('audio', audioBlob, `recording.${extension}`);

      console.log('Sending transcription request:', {
        blobSize: audioBlob.size,
        blobType: audioBlob.type,
        filename: `recording.${extension}`
      });

      const response = await fetch("/api/speech/transcribe", {
        method: "POST",
        body: formData,
        credentials: "include", // Include session cookies
      });
      
      const data = await response.json();
      console.log('Transcription response:', data);
      
      if (data.text && data.text.trim() && data.text.trim() !== '. . .' && data.text.trim() !== '...') {
        // Clean up the transcribed text
        const cleanedText = data.text.trim().replace(/\s+/g, ' ');
        setMessage(cleanedText);
        toast({
          title: "Speech Recognized",
          description: `Transcribed: "${cleanedText.substring(0, 50)}${cleanedText.length > 50 ? '...' : ''}"`,
        });
      } else {
        toast({
          title: "No Speech Detected",
          description: `Audio processed (${Math.round(audioBlob.size/1024)}KB, ${data.duration ? Math.round(data.duration) + 's' : 'unknown duration'}) but no clear speech found. Please speak louder and clearer.`,
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

  // Helper function to stop all audio and cleanup memory
  const stopAllAudio = () => {
    // Stop TTS audio and cleanup
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.currentTime = 0;
      // Cleanup URL to prevent memory leaks
      if (ttsAudioRef.current.src) {
        URL.revokeObjectURL(ttsAudioRef.current.src);
      }
      ttsAudioRef.current = null;
    }
    
    // Stop recording playback audio and cleanup
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      // Cleanup URL to prevent memory leaks
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    }
    
    // Cleanup audioURL
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
      setAudioURL(null);
    }
    
    setIsSpeaking(false);
    setIsPlayingAudio(false);
  };

  // Text-to-Speech for AI responses
  const speakText = async (text: string) => {
    // Stop any existing audio first
    stopAllAudio();
    
    setIsSpeaking(true);
    try {
      const response = await apiRequest("POST", "/api/speech/synthesize", { 
        text,
        voice: "nova", // OpenAI voice options: alloy, echo, fable, nova, onyx, shimmer
        speed: 1.0
      });
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      ttsAudioRef.current = audio; // Store reference for stopping
      
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
    // Force refresh the messages to show welcome screen
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

  // Load settings from localStorage
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

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      stopAllAudio();
      
      // Cleanup media recorder if still recording
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
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-background to-background/50 relative overflow-hidden">
      {/* Simple Header */}
      <div className="p-2 border-b border-border/20 flex justify-between items-center">
        <Button size="sm" variant="ghost" onClick={() => setShowChatHistory(!showChatHistory)}>
          <MessageSquare className="w-4 h-4" />
        </Button>
        
        <div className="flex items-center space-x-2">
          {/* Trial Status Indicator - Shows remaining messages for trial users */}
          {subscriptionData?.status === 'trial' && (
            <div className="flex items-center space-x-1 bg-orange-500/10 border border-orange-500/20 rounded-lg px-2 py-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className={`text-xs font-medium ${
                (subscriptionData.trialMessagesRemaining || 0) <= 2 
                  ? 'text-orange-400' 
                  : 'text-orange-300'
              }`}>
                {subscriptionData.trialMessagesRemaining || 0} left
              </span>
            </div>
          )}
          
          {/* Language Selector */}
          <select
            value={selectedLanguage}
            onChange={async (e) => {
              const newLanguage = e.target.value;
              const currentLanguage = selectedLanguage;
              
              setSelectedLanguage(newLanguage);
              localStorage.setItem("aras-language", newLanguage);
              
              // Translate existing messages if language changed and there are messages
              if (newLanguage !== currentLanguage && messages.length > 0) {
                try {
                  toast({
                    title: "Translating Messages",
                    description: "Converting existing conversation to selected language...",
                  });
                  
                  const response = await apiRequest("POST", "/api/chat/translate", {
                    messages: messages,
                    targetLanguage: newLanguage
                  });
                  
                  const data = await response.json();
                  
                  if (data.translatedMessages) {
                    // Update messages in the cache
                    queryClient.setQueryData(["/api/chat/messages"], data.translatedMessages);
                    
                    toast({
                      title: "Translation Complete",
                      description: "Conversation translated successfully!"
                    });
                  }
                } catch (error: any) {
                  toast({
                    title: "Translation Failed",
                    description: "Could not translate existing messages",
                    variant: "destructive"
                  });
                  console.error("Translation error:", error);
                }
              }
            }}
            className="text-xs bg-background border border-border/30 rounded px-2 py-1 text-foreground focus:text-foreground focus:border-primary/50 outline-none"
          >
            <option value="en">🇺🇸 EN</option>
            <option value="es">🇪🇸 ES</option>
            <option value="fr">🇫🇷 FR</option>
            <option value="de">🇩🇪 DE</option>
            <option value="pt">🇵🇹 PT</option>
            <option value="it">🇮🇹 IT</option>
            <option value="ru">🇷🇺 RU</option>
            <option value="zh">🇨🇳 ZH</option>
            <option value="ja">🇯🇵 JA</option>
            <option value="ar">🇸🇦 AR</option>
          </select>
          
          {/* Settings Button */}
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
          
          <Button size="sm" variant="ghost" onClick={handleNewChat}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-primary mb-2">
                {selectedLanguage === "es" ? "¿Cómo puedo ayudarte hoy?" :
                 selectedLanguage === "fr" ? "Comment puis-je vous aider aujourd'hui ?" :
                 selectedLanguage === "de" ? "Wie kann ich Ihnen heute helfen?" :
                 selectedLanguage === "pt" ? "Como posso ajudá-lo hoje?" :
                 selectedLanguage === "it" ? "Come posso aiutarti oggi?" :
                 selectedLanguage === "ru" ? "Как я могу помочь вам сегодня?" :
                 selectedLanguage === "zh" ? "今天我能为您做些什么？" :
                 selectedLanguage === "ja" ? "今日はどのようなお手伝いができますか？" :
                 selectedLanguage === "ar" ? "كيف يمكنني مساعدتك اليوم؟" :
                 "How can I help you today?"}
              </h2>
              <p className="text-muted-foreground text-sm">
                {selectedLanguage === "es" ? "Pregúntame sobre automatización de ventas, llamadas en frío o gestión de leads." :
                 selectedLanguage === "fr" ? "Demandez-moi des questions sur l'automatisation des ventes, les appels à froid ou la gestion des prospects." :
                 selectedLanguage === "de" ? "Fragen Sie mich über Vertriebsautomatisierung, Kaltakquise oder Lead-Management." :
                 selectedLanguage === "pt" ? "Pergunte-me sobre automação de vendas, cold calling ou gestão de leads." :
                 selectedLanguage === "it" ? "Chiedimi di automazione delle vendite, chiamate a freddo o gestione dei lead." :
                 selectedLanguage === "ru" ? "Спросите меня об автоматизации продаж, холодных звонках или управлении лидами." :
                 selectedLanguage === "zh" ? "询问我有关销售自动化、陌拜或潜在客户管理的问题。" :
                 selectedLanguage === "ja" ? "営業自動化、コールドコール、リード管理についてお聞きください。" :
                 selectedLanguage === "ar" ? "اسألني عن أتمتة المبيعات أو المكالمات الباردة أو إدارة العملاء المحتملين." :
                 "Ask me about sales automation, cold calling, or lead management."}
              </p>
            </div>
          </div>
        ) : (
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
        )}

        {/* Enhanced typing indicator with AI thinking status */}
        {(sendMessage.isPending || showTypingIndicator) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start mb-4"
          >
            <div className="flex items-start space-x-3 max-w-[60%] message-container">
              {/* ARAS AI Avatar */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-transparent">
                <img 
                  src={arasAiImage} 
                  alt="ARAS AI" 
                  className="w-8 h-8 rounded-full object-contain"
                />
              </div>
              
              <div className="flex flex-col">
                {/* Enhanced typing indicator with status */}
                <div className="bg-transparent border border-orange-500/30 rounded-lg px-4 py-3">
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
                    <span className="text-xs text-muted-foreground">
                      ARAS AI is thinking...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      


      {/* Input Area */}
      <div className="p-6 border-t border-border/50 relative z-10">


        {/* Chat History Panel */}
        {showChatHistory && (
          <div className="mb-4 bg-card/50 backdrop-blur-sm border border-border/30 rounded-xl p-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Chat History</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowChatHistory(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            {chatSessions.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                      session.isActive
                        ? "bg-primary/10 border-primary/30"
                        : "bg-card/30 border-border/30 hover:bg-card/50"
                    }`}
                    onClick={async () => {
                      try {
                        const response = await apiRequest("POST", `/api/chat/sessions/${session.id}/activate`, {});
                        const data = await response.json();
                        
                        // Force refresh messages to load the selected session's messages
                        await queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
                        await queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
                        
                        // Wait a moment for the backend to update then refetch
                        setTimeout(() => {
                          queryClient.refetchQueries({ queryKey: ["/api/chat/messages"] });
                          queryClient.refetchQueries({ queryKey: ["/api/chat/sessions"] });
                        }, 100);
                        
                        toast({
                          title: "Chat Session Loaded",
                          description: `Switched to "${session.title}" (${data.messageCount} messages)`,
                        });
                        
                        setShowChatHistory(false);
                      } catch (error: any) {
                        toast({
                          title: "Error",
                          description: "Failed to load chat session",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <div className="text-sm font-medium">{session.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.updatedAt).toLocaleDateString()}
                      {session.isActive && " (Current)"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No chat history yet</div>
            )}
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-4 p-4 bg-card/30 border border-border/30 rounded-xl">
            <h3 className="text-sm font-medium mb-3 flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              AI Settings
            </h3>
            <div className="space-y-4">
              {/* AI Personality Setting */}
              <div>
                <label className="text-xs text-muted-foreground block mb-2">AI Personality</label>
                <select
                  value={aiPersonality}
                  onChange={(e) => {
                    setAiPersonality(e.target.value);
                    localStorage.setItem("aras-ai-personality", e.target.value);
                  }}
                  className="w-full text-xs bg-transparent border border-border/30 rounded px-3 py-2 text-foreground focus:border-primary/50 outline-none"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="technical">Technical</option>
                </select>
              </div>

              {/* Response Length Setting */}
              <div>
                <label className="text-xs text-muted-foreground block mb-2">Response Length</label>
                <select
                  value={responseLength}
                  onChange={(e) => {
                    setResponseLength(e.target.value);
                    localStorage.setItem("aras-response-length", e.target.value);
                  }}
                  className="w-full text-xs bg-transparent border border-border/30 rounded px-3 py-2 text-foreground focus:border-primary/50 outline-none"
                >
                  <option value="brief">Brief</option>
                  <option value="detailed">Detailed</option>
                  <option value="bullet">Bullet Points</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        <div className="relative flex items-end space-x-3 max-w-4xl mx-auto">
          <div className="flex-1">
            {isMultiline ? (
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Message ARAS AI"
                className="min-h-[42px] max-h-32 bg-transparent text-foreground placeholder:text-muted-foreground border border-border/30 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200 resize-none pr-16"
                disabled={sendMessage.isPending}
                rows={Math.min(4, message.split('\n').length)}
              />
            ) : (
              <div className="relative">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message ARAS AI"
                  className="h-[42px] bg-transparent text-foreground placeholder:text-muted-foreground border border-border/30 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200 pr-16"
                  disabled={sendMessage.isPending}
                />
                
                {/* Microphone Button - Positioned in the circle as requested */}
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/40 p-0 flex items-center justify-center transition-all duration-200"
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
                      <img 
                        src={arasLogo} 
                        alt="ARAS AI" 
                        className="w-4 h-4 object-contain opacity-80"
                      />
                    </motion.div>
                  ) : (
                    <Mic className="w-4 h-4 text-orange-400" />
                  )}
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setIsMultiline(!isMultiline)}
              variant="outline"
              size="sm"
              className="h-[42px] px-3 border-border/30 hover:border-primary/50"
            >
              <FileText className="w-4 h-4" />
            </Button>
            <Button 
              onClick={handleSendMessage} 
              size="sm"
              disabled={!message.trim() || sendMessage.isPending}
              className="h-[42px] px-4 bg-primary hover:bg-primary/90 text-primary-foreground border-0 rounded-xl transition-all duration-200"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-center mt-3">
          <p className="text-xs text-muted-foreground">
            {subscriptionData ? (
              <>
                {subscriptionData.aiMessagesUsed} / {subscriptionData.aiMessagesLimit || '∞'} messages used this month
              </>
            ) : (
              'Loading subscription status...'
            )}
          </p>
        </div>
        
        {/* Recording Status */}
        {isRecording && (
          <div className="flex justify-center mt-2">
            <div className="flex items-center space-x-2 text-red-500">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Recording...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}