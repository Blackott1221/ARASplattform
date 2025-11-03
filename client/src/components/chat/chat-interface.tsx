import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageBubble } from "./message-bubble";
import { Send, Mic, MicOff, Plus, Trash2, MessageSquare, X, Menu, Paperclip, File, Image as ImageIcon, FileText, Clock } from "lucide-react";
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
  "Leads qualifizieren",
  "Kunden anrufen",
  "Verkaufsgespräche",
  "Follow-ups"
];

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content: string;
}

export function ChatInterface() {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Typewriter animation
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
      }, 80);
      
      return () => clearInterval(typeInterval);
    }
  }, [currentTextIndex, isTyping]);

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  const { data: chatSessions = [] } = useQuery<any[]>({
    queryKey: ["/api/chat/sessions"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  const { data: subscriptionData } = useQuery<import("@shared/schema").SubscriptionResponse>({
    queryKey: ["/api/user/subscription"],
    enabled: !!user && !authLoading,
    retry: false,
  });

  // Set currentSessionId from active session
  useEffect(() => {
    if (chatSessions.length > 0) {
      const activeSession = chatSessions.find(s => s.isActive);
      if (activeSession) {
        setCurrentSessionId(activeSession.id);
      }
    }
  }, [chatSessions]);

  const startNewChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chat/sessions/new", {
        title: `Chat ${new Date().toLocaleTimeString()}`
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
      setUploadedFiles([]);
      toast({
        title: "Neuer Chat gestartet",
        description: "Vorherige Konversation wurde gespeichert",
      });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const messageData: any = { 
        message,
        sessionId: currentSessionId 
      };
      
      // Add file context if files are uploaded
      if (uploadedFiles.length > 0) {
        messageData.files = uploadedFiles.map(f => ({
          name: f.name,
          content: f.content,
          type: f.type
        }));
        messageData.message = `${message}\n\n[WICHTIG: Analysiere die hochgeladenen Dateien: ${uploadedFiles.map(f => f.name).join(', ')}]`;
      }
      
      console.log('Sending message with data:', messageData);
      
      const response = await apiRequest("POST", "/api/chat/messages", messageData);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.sessionId) {
        setCurrentSessionId(data.sessionId);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/subscription"] });
      setUploadedFiles([]);
    },
    onError: (error: any) => {
      console.error('Send message error:', error);
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gesendet werden",
        variant: "destructive",
      });
    },
  });

  const loadChatSession = async (sessionId: string) => {
    try {
      await apiRequest("POST", `/api/chat/sessions/${sessionId}/activate`, {});
      setCurrentSessionId(parseInt(sessionId));
      await queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
      setShowHistory(false);
      toast({
        title: "Chat geladen",
        description: "Konversation wiederhergestellt",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Chat konnte nicht geladen werden",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      toast({
        title: "Datei zu groß",
        description: "Maximum 10MB erlaubt",
        variant: "destructive",
      });
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Dateityp nicht unterstützt",
        description: "Nur PDF, DOCX, TXT und Bilder erlaubt",
        variant: "destructive",
      });
      return;
    }

    try {
      // Read file as text or base64 depending on type
      let content = '';
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        content = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        content = await file.text();
      }
      
      setUploadedFiles([...uploadedFiles, {
        name: file.name,
        type: file.type,
        size: file.size,
        content: content
      }]);

      toast({
        title: "Datei hochgeladen",
        description: `${file.name} wurde hinzugefügt`,
      });
    } catch (error) {
      toast({
        title: "Upload-Fehler",
        description: "Datei konnte nicht gelesen werden",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && uploadedFiles.length === 0) || sendMessage.isPending) return;
    
    const userMessage = message || "Analysiere die hochgeladenen Dateien";
    setMessage("");
    
    try {
      await sendMessage.mutateAsync(userMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        stream.getTracks().forEach(track => track.stop());
        await transcribeAudio(audioBlob);
      };
      
      mediaRecorder.start(250);
      setIsRecording(true);
      
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          stopRecording();
        }
      }, 30000);
      
    } catch (error) {
      toast({
        title: "Mikrofon-Fehler",
        description: "Zugriff verweigert",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch("/api/speech/transcribe", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (data.text && data.text.trim()) {
        const cleanedText = data.text.trim().replace(/\s+/g, ' ');
        setMessage(cleanedText);
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Sprache konnte nicht erkannt werden",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="w-4 h-4" />;
    if (type.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10"
        >
          <img src={arasLogo} alt="Loading" className="w-full h-full object-contain" />
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 flex flex-col min-h-screen bg-black relative overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 bg-orange-500/20 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-orange-500"
        >
          <div className="text-center">
            <Paperclip className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <p className="text-white text-xl font-semibold">Datei hier ablegen</p>
          </div>
        </motion.div>
      )}

      {/* Ambient Background */}
      <div className="absolute inset-0 bg-gradient-radial from-orange-500/5 via-transparent to-transparent opacity-40 blur-3xl pointer-events-none" />
      
      {/* Chat History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowHistory(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 20 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-gradient-to-b from-gray-900 to-black border-r border-white/10 z-50 flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-orange-500/10 to-purple-500/10">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-orange-500" />
                  <h3 className="text-white font-semibold">Chat-Historie</h3>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {chatSessions.length > 0 ? (
                  chatSessions.map((session) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      onClick={() => loadChatSession(session.id)}
                      className={`group p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        session.isActive
                          ? "bg-gradient-to-r from-orange-500/20 to-purple-500/20 border border-orange-500/50 shadow-lg"
                          : "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1">
                          <MessageSquare className={`w-4 h-4 ${session.isActive ? 'text-orange-500' : 'text-gray-400'}`} />
                          <div className="text-sm font-medium text-white truncate">
                            {session.title}
                          </div>
                        </div>
                        {session.isActive && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(session.updatedAt).toLocaleDateString('de-DE', { 
                            day: '2-digit', 
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                        {!session.isActive && (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-orange-500">
                            Laden →
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 text-center py-12">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Keine Chat-Historie</p>
                  </div>
                )}
              </div>
              
              <div className="p-3 border-t border-white/10 bg-gradient-to-r from-orange-500/5 to-purple-500/5">
                <Button
                  onClick={() => {
                    startNewChatMutation.mutate();
                    setShowHistory(false);
                  }}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Neuer Chat
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {messages.length === 0 ? (
        /* WELCOME SCREEN */
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <img src={arasLogo} alt="ARAS AI" className="w-16 h-16 object-contain" />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              ARAS AI
            </h1>
            <div className="flex items-center justify-center space-x-2 text-xl md:text-2xl text-gray-400">
              <span>erledigt:</span>
              <motion.span 
                key={currentTextIndex}
                className="text-orange-500 font-semibold min-w-[220px] text-left"
              >
                {displayText}
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block w-[2px] h-[24px] bg-orange-500 ml-1"
                />
              </motion.span>
            </div>
          </motion.div>

          {uploadedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl mb-4"
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                    <div className="flex items-center space-x-2">
                      {getFileIcon(file.type)}
                      <span className="text-sm text-white truncate max-w-[200px]">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="w-full max-w-2xl"
          >
            <div className="relative">
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-orange-500 via-purple-500 to-orange-500 opacity-75 blur-sm animate-gradient-xy"></div>
              
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Was möchtest du wissen?"
                className="relative w-full h-12 bg-gray-900 text-white placeholder:text-gray-500 border-0 rounded-2xl px-5 pr-36 text-sm focus:ring-2 focus:ring-orange-500/50 transition-all"
                disabled={sendMessage.isPending}
              />
              
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                  disabled={sendMessage.isPending}
                >
                  <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={isRecording ? stopRecording : startRecording}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                  disabled={sendMessage.isPending}
                >
                  {isRecording ? (
                    <MicOff className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendMessage}
                  disabled={(!message.trim() && uploadedFiles.length === 0) || sendMessage.isPending}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 rounded-xl text-white text-sm font-medium transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>
            
            {subscriptionData && (
              <div className="text-center mt-2 text-xs text-gray-600">
                {subscriptionData.aiMessagesUsed} / {subscriptionData.aiMessagesLimit || '∞'} Nachrichten
              </div>
            )}
          </motion.div>
        </div>
      ) : (
        /* CHAT VIEW */
        <>
          <div className="px-4 py-2 border-b border-white/10 flex justify-between items-center backdrop-blur-sm bg-black/50">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowHistory(true)}
                className="text-gray-400 hover:text-white"
              >
                <Menu className="w-4 h-4" />
              </Button>
              <img src={arasLogo} alt="ARAS" className="w-6 h-6 object-contain" />
              <span className="text-white font-semibold text-sm" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                ARAS AI
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {subscriptionData?.status === 'trial' && (
                <div className="flex items-center space-x-1 bg-orange-500/10 rounded-lg px-2 py-1">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-orange-300">
                    {subscriptionData.trialMessagesRemaining || 0}
                  </span>
                </div>
              )}
              
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => startNewChatMutation.mutate()}
                className="text-gray-400 hover:text-white"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg.message}
                  isAi={msg.isAi || false}
                  timestamp={msg.timestamp ? new Date(msg.timestamp) : new Date()}
                  confidence={msg.isAi ? 0.95 : undefined}
                  messageId={msg.id.toString()}
                  onReaction={() => {}}
                  onSpeak={() => {}}
                  isSpeaking={false}
                />
              ))}
            </AnimatePresence>

            {sendMessage.isPending && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="flex items-start space-x-2">
                  <img 
                    src={arasAiImage} 
                    alt="ARAS AI" 
                    className="w-7 h-7 rounded-full object-contain"
                  />
                  
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        {[0, 0.2, 0.4].map((delay, i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 bg-orange-400 rounded-full"
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{ duration: 1, repeat: Infinity, delay }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">analysiert...</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {uploadedFiles.length > 0 && (
            <div className="px-4 pb-2">
              <div className="max-w-3xl mx-auto">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-2 space-y-1">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(file.type)}
                        <span className="text-xs text-white truncate max-w-[200px]">{file.name}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(index)}
                        className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="px-4 py-3 border-t border-white/10 backdrop-blur-sm bg-black/50">
            <div className="max-w-3xl mx-auto">
              <div className="relative">
                <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-orange-500 via-purple-500 to-orange-500 opacity-60 blur-sm animate-gradient-xy"></div>
                
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nachricht an ARAS AI"
                  className="relative w-full h-12 bg-gray-900 text-white placeholder:text-gray-500 border-0 rounded-2xl px-5 pr-36 text-sm focus:ring-2 focus:ring-orange-500/50 transition-all"
                  disabled={sendMessage.isPending}
                />
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                    disabled={sendMessage.isPending}
                  >
                    <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={isRecording ? stopRecording : startRecording}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                    disabled={sendMessage.isPending}
                  >
                    {isRecording ? (
                      <MicOff className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendMessage}
                    disabled={(!message.trim() && uploadedFiles.length === 0) || sendMessage.isPending}
                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 rounded-xl text-white text-sm font-medium transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      
      <style>{`
        @keyframes gradient-xy {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient-xy {
          background-size: 400% 400%;
          animation: gradient-xy 3s ease infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.7);
        }
      `}</style>
    </div>
  );
}
