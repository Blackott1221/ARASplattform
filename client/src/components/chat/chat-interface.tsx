import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageBubble } from "./message-bubble";
import { Send, Mic, MicOff, Plus, MessageSquare, X, Menu, Paperclip, File, Image as ImageIcon, FileText, Clock, AlertCircle, Sparkles, Zap, TrendingUp, Calendar, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ChatMessage } from "@shared/schema";
import arasAiImage from "@assets/ChatGPT Image 9. Apr. 2025_ 21_38_23_1754515368187.png";
import arasLogo from "@/assets/aras_logo_1755067745303.png";

const ANIMATED_TEXTS = ["Anrufe", "Termine vereinbaren", "Termine verschieben", "Leads qualifizieren", "Kunden anrufen", "Verkaufsgespräche", "Follow-ups"];

const SUGGESTED_PROMPTS = [
  { icon: Phone, text: "Ruf meinen Kunden an und vereinbare einen Termin", color: "from-blue-500 to-cyan-500" },
  { icon: Calendar, text: "Verschiebe alle Meetings von heute auf morgen", color: "from-purple-500 to-pink-500" },
  { icon: TrendingUp, text: "Analysiere meine Verkaufszahlen vom letzten Monat", color: "from-orange-500 to-red-500" },
  { icon: Sparkles, text: "Schreib eine professionelle Follow-up Email", color: "from-green-500 to-emerald-500" }
];

interface UploadedFile { name: string; type: string; size: number; content: string; }
interface OptimisticMessage { id: string; message: string; isAi: boolean; timestamp: Date; isOptimistic: true; }

export function ChatInterface() {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [newMessageId, setNewMessageId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

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

  const { data: messages = [] } = useQuery<ChatMessage[]>({ queryKey: ["/api/chat/messages"], enabled: !!user && !authLoading, retry: false });
  const { data: chatSessions = [] } = useQuery<any[]>({ queryKey: ["/api/chat/sessions"], enabled: !!user && !authLoading, retry: false });
  const { data: subscriptionData } = useQuery<import("@shared/schema").SubscriptionResponse>({ queryKey: ["/api/user/subscription"], enabled: !!user && !authLoading, retry: false });

  useEffect(() => {
    if (chatSessions.length > 0) {
      const activeSession = chatSessions.find(s => s.isActive);
      if (activeSession) setCurrentSessionId(activeSession.id);
    }
  }, [chatSessions]);

  const startNewChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chat/sessions/new", { title: `Chat ${new Date().toLocaleTimeString()}` });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
      setUploadedFiles([]);
      setOptimisticMessages([]);
      toast({ title: "Neuer Chat gestartet", description: "Vorherige Konversation wurde gespeichert" });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const messageData: any = { message, sessionId: currentSessionId };
      if (uploadedFiles.length > 0) {
        messageData.files = uploadedFiles.map(f => ({ name: f.name, content: f.content, type: f.type }));
        messageData.message = `${message}\n\n[WICHTIG: Analysiere die hochgeladenen Dateien: ${uploadedFiles.map(f => f.name).join(', ')}]`;
      }
      const response = await apiRequest("POST", "/api/chat/messages", messageData);
      return response.json();
    },
    onMutate: async (newMessage) => {
      const optimisticMsg: OptimisticMessage = { id: `optimistic-${Date.now()}`, message: newMessage, isAi: false, timestamp: new Date(), isOptimistic: true };
      setOptimisticMessages(prev => [...prev, optimisticMsg]);
    },
    onSuccess: (data) => {
      setOptimisticMessages([]);
      if (data.sessionId) setCurrentSessionId(data.sessionId);
      if (data.aiMessage && data.aiMessage.id) setNewMessageId(data.aiMessage.id);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/subscription"] });
      setUploadedFiles([]);
      setTimeout(() => setNewMessageId(null), 100);
    },
    onError: () => {
      setOptimisticMessages([]);
      toast({ title: "Fehler", description: "Nachricht konnte nicht gesendet werden", variant: "destructive" });
    },
  });

  const loadChatSession = async (sessionId: string) => {
    try {
      await apiRequest("POST", `/api/chat/sessions/${sessionId}/activate`, {});
      setCurrentSessionId(parseInt(sessionId));
      await queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
      setShowHistory(false);
      setOptimisticMessages([]);
      toast({ title: "Chat geladen", description: "Konversation wiederhergestellt" });
    } catch (error) {
      toast({ title: "Fehler", description: "Chat konnte nicht geladen werden", variant: "destructive" });
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "Datei zu groß", description: "Maximum 10MB erlaubt", variant: "destructive" });
      return;
    }
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Dateityp nicht unterstützt", description: "Nur PDF, DOCX, TXT und Bilder erlaubt", variant: "destructive" });
      return;
    }
    try {
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
      setUploadedFiles([...uploadedFiles, { name: file.name, type: file.type, size: file.size, content: content }]);
      toast({ title: "Datei hochgeladen", description: `${file.name} wurde hinzugefügt` });
    } catch (error) {
      toast({ title: "Upload-Fehler", description: "Datei konnte nicht gelesen werden", variant: "destructive" });
    }
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const removeFile = (index: number) => { setUploadedFiles(uploadedFiles.filter((_, i) => i !== index)); };

  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || message;
    if ((!messageToSend.trim() && uploadedFiles.length === 0) || sendMessage.isPending) return;
    const userMessage = messageToSend || "Analysiere die hochgeladenen Dateien";
    setMessage("");
    try { await sendMessage.mutateAsync(userMessage); } catch (error) { console.error('Error sending message:', error); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }});
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunks.push(event.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await transcribeAudio(audioBlob);
      };
      mediaRecorder.start(250);
      setIsRecording(true);
      setTimeout(() => { if (mediaRecorderRef.current?.state === "recording") stopRecording(); }, 30000);
    } catch (error) {
      toast({ title: "Mikrofon-Fehler", description: "Zugriff verweigert", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      const response = await fetch("/api/speech/transcribe", { method: "POST", body: formData, credentials: "include" });
      const data = await response.json();
      if (data.text && data.text.trim()) setMessage(data.text.trim().replace(/\s+/g, ' '));
    } catch (error) {
      toast({ title: "Fehler", description: "Sprache konnte nicht erkannt werden", variant: "destructive" });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => { scrollToBottom(); }, [messages, optimisticMessages]);

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="w-4 h-4" />;
    if (type.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const allMessages = [...messages, ...optimisticMessages];
  const hasMessages = allMessages.length > 0;

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <img src={arasLogo} alt="Loading" className="w-12 h-12 object-contain" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-black via-black/95 to-black relative overflow-hidden" onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FE9100]/5 rounded-full blur-[120px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px]"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      {isDragging && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-[#FE9100]/20 backdrop-blur-md flex items-center justify-center border-4 border-dashed border-[#FE9100] rounded-2xl m-4">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Paperclip className="w-20 h-20 text-[#FE9100] mx-auto mb-4" />
            </motion.div>
            <p className="text-white text-2xl font-bold mb-2">Datei hier ablegen</p>
            <p className="text-gray-300">PDF, DOCX, TXT oder Bilder</p>
          </motion.div>
        </motion.div>
      )}

      {/* MODERN SIDEBAR */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-40" 
              onClick={() => setShowHistory(false)} 
            />
            <motion.div 
              initial={{ x: -400, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-96 z-50 flex flex-col"
            >
              {/* Glassmorphism Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-black/95 via-gray-900/95 to-black/95 backdrop-blur-2xl border-r border-white/10" />
              
              {/* Content */}
              <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FE9100]/20 to-purple-500/20 flex items-center justify-center ring-2 ring-[#FE9100]/30"
                      >
                        <MessageSquare className="w-5 h-5 text-[#FE9100]" />
                      </motion.div>
                      <div>
                        <h3 className="text-white font-bold text-lg">Chat Historie</h3>
                        <p className="text-xs text-gray-400">{chatSessions.length} Konversationen</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setShowHistory(false)}
                      className="text-gray-400 hover:text-white hover:bg-white/10 h-9 w-9 p-0 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* New Chat Button */}
                  <Button 
                    onClick={() => { startNewChatMutation.mutate(); setShowHistory(false); }}
                    className="w-full bg-gradient-to-r from-[#FE9100] via-[#ff9d1a] to-[#FE9100] hover:shadow-lg hover:shadow-[#FE9100]/30 text-white font-semibold rounded-xl h-11 transition-all duration-300"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Neuer Chat
                  </Button>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 premium-scroll">
                  <AnimatePresence mode="popLayout">
                    {chatSessions.length > 0 ? (
                      chatSessions.map((session, index) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02, x: 4 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => loadChatSession(session.id)}
                          className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                            session.isActive 
                              ? "bg-gradient-to-r from-[#FE9100]/20 to-purple-500/20 border-2 border-[#FE9100]/50" 
                              : "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20"
                          }`}
                        >
                          {/* Active Indicator */}
                          {session.isActive && (
                            <motion.div
                              className="absolute top-4 right-4"
                              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <div className="w-2.5 h-2.5 bg-[#FE9100] rounded-full shadow-lg shadow-[#FE9100]/50" />
                            </motion.div>
                          )}

                          <div className="flex items-start space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              session.isActive ? 'bg-[#FE9100]/20' : 'bg-white/5'
                            }`}>
                              <MessageSquare className={`w-5 h-5 ${session.isActive ? 'text-[#FE9100]' : 'text-gray-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-white truncate mb-1">{session.title}</div>
                              <div className="flex items-center space-x-2 text-xs text-gray-400">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(session.updatedAt).toLocaleDateString('de-DE', { 
                                    day: '2-digit', 
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20"
                      >
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20 text-gray-500" />
                        <p className="text-gray-500 text-sm">Keine Chat-Historie</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp" onChange={(e) => handleFileUpload(e.target.files)} />

      {/* MINIMAL HEADER (only when messages exist) */}
      {hasMessages && (
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-4 border-b border-white/10 backdrop-blur-xl bg-black/50 relative z-20"
        >
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setShowHistory(!showHistory)}
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg h-9 px-3"
            >
              <Menu className="w-4 h-4 mr-2" />
              Historie
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => startNewChatMutation.mutate()}
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg h-9 px-3"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neuer Chat
            </Button>
          </div>
        </motion.div>
      )}

      {/* Messages Area */}
      <div ref={messagesContainerRef} className={`flex-1 overflow-y-auto relative z-10 premium-scroll ${!hasMessages ? 'flex items-center justify-center' : 'p-6 space-y-4'}`}>
        {!hasMessages ? (
          /* CENTERED HERO SECTION */
          <div className="w-full max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              {/* Logo */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, type: "spring" }}
                className="mb-8"
              >
                <div className="relative inline-block">
                  <motion.div
                    className="absolute -inset-8 rounded-full opacity-30"
                    animate={{
                      background: [
                        "radial-gradient(circle, #FE9100, transparent 70%)",
                        "radial-gradient(circle, #a34e00, transparent 70%)",
                        "radial-gradient(circle, #FE9100, transparent 70%)"
                      ]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                  />
                  <img src={arasLogo} alt="ARAS AI" className="w-24 h-24 object-contain relative z-10" />
                </div>
              </motion.div>

              {/* Title */}
              <motion.h1 
                className="text-6xl font-bold text-white mb-6" 
                style={{ fontFamily: 'Orbitron, sans-serif' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <span className="bg-gradient-to-r from-white via-[#FE9100] to-white bg-clip-text text-transparent">
                  ARAS AI
                </span>
              </motion.h1>

              {/* Animated Text */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center space-x-3 text-2xl text-gray-300 mb-16"
              >
                <span>erledigt:</span>
                <motion.span className="text-[#FE9100] font-semibold min-w-[280px] text-left inline-block">
                  {displayText}
                  <motion.span 
                    animate={{ opacity: [1, 0, 1] }} 
                    transition={{ duration: 0.8, repeat: Infinity }} 
                    className="inline-block w-[3px] h-[30px] bg-[#FE9100] ml-1 align-middle"
                  />
                </motion.span>
              </motion.div>

              {/* Suggested Prompts */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12"
              >
                {SUGGESTED_PROMPTS.map((prompt, index) => {
                  const Icon = prompt.icon;
                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSendMessage(prompt.text)}
                      className="group relative p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 text-left transition-all duration-300 overflow-hidden"
                    >
                      {/* Gradient Background on Hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${prompt.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                      
                      <div className="relative z-10 flex items-start space-x-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${prompt.color} opacity-20 group-hover:opacity-30 flex items-center justify-center flex-shrink-0 transition-opacity`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium leading-relaxed group-hover:text-white/90 transition-colors">
                            {prompt.text}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>

            {/* CENTERED INPUT AREA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              {uploadedFiles.length > 0 && (
                <div className="mb-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between bg-white/5 rounded-xl p-3 group hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-[#FE9100]/20 flex items-center justify-center">
                            {getFileIcon(file.type)}
                          </div>
                          <div>
                            <span className="text-sm text-white font-medium block">{file.name}</span>
                            <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => removeFile(index)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative flex items-end space-x-3">
                <div className="flex-1">
                  <div className="relative group">
                    {/* ANIMATED BORDER */}
                    <motion.div 
                      className="absolute -inset-[3px] rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      animate={{
                        background: [
                          "linear-gradient(90deg, #FE9100, #a34e00, #FE9100)",
                          "linear-gradient(180deg, #a34e00, #FE9100, #a34e00)",
                          "linear-gradient(270deg, #FE9100, #a34e00, #FE9100)",
                          "linear-gradient(360deg, #a34e00, #FE9100, #a34e00)"
                        ]
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                    
                    {/* GLOW EFFECT */}
                    <div className="absolute -inset-[10px] rounded-[28px] bg-gradient-to-r from-[#FE9100]/20 via-purple-500/20 to-[#FE9100]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Message ARAS AI..."
                      className="relative h-14 bg-black/80 backdrop-blur-xl text-white text-lg placeholder:text-gray-500 border-2 border-white/10 rounded-[20px] focus:border-[#FE9100]/50 focus:ring-2 focus:ring-[#FE9100]/20 transition-all duration-300 pr-20 font-medium"
                      disabled={sendMessage.isPending}
                    />
                    
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 p-0 flex items-center justify-center transition-all duration-200"
                      disabled={sendMessage.isPending}
                    >
                      {isRecording ? (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <MicOff className="w-5 h-5 text-red-400" />
                        </motion.div>
                      ) : (
                        <Mic className="w-5 h-5 text-gray-400 group-hover:text-[#FE9100] transition-colors" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                    className="h-14 px-4 border-2 border-white/10 hover:border-[#FE9100]/50 bg-black/60 backdrop-blur-xl text-white hover:bg-white/5 rounded-xl transition-all duration-200"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => handleSendMessage()}
                    size="sm"
                    disabled={!message.trim() || sendMessage.isPending}
                    className="h-14 px-6 bg-gradient-to-r from-[#FE9100] via-[#ff9d1a] to-[#FE9100] hover:shadow-xl hover:shadow-[#FE9100]/30 text-white border-0 rounded-xl transition-all duration-300 font-semibold disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Disclaimer */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <p>ARAS AI kann Fehler machen. Bitte überprüfe wichtige Informationen.</p>
              </motion.div>

              {/* Message Counter */}
              {subscriptionData && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.3 }}
                  className="text-center mt-3"
                >
                  <p className="text-xs text-gray-600">
                    {subscriptionData.aiMessagesUsed} / {subscriptionData.aiMessagesLimit || '∞'} Nachrichten
                  </p>
                </motion.div>
              )}
            </motion.div>
          </div>
        ) : (
          /* MESSAGES VIEW */
          <>
            <AnimatePresence>
              {allMessages.map((msg) => {
                const isOptimistic = 'isOptimistic' in msg && msg.isOptimistic;
                const isNewAiMessage = !isOptimistic && msg.isAi && msg.id === newMessageId;
                return (
                  <MessageBubble
                    key={isOptimistic ? msg.id : `msg-${msg.id}`}
                    message={msg.message}
                    isAi={msg.isAi || false}
                    timestamp={msg.timestamp ? new Date(msg.timestamp) : new Date()}
                    messageId={msg.id.toString()}
                    onReaction={() => {}}
                    onSpeak={() => {}}
                    isSpeaking={false}
                    isNew={isNewAiMessage}
                  />
                );
              })}
            </AnimatePresence>

            {sendMessage.isPending && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="flex items-center gap-4">
                  <motion.img 
                    src={arasAiImage} 
                    alt="ARAS AI" 
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FE9100]/30"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className="bg-white/5 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/10">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1.5">
                        {[0, 0.15, 0.3].map((delay, i) => (
                          <motion.div
                            key={i}
                            className="w-2.5 h-2.5 bg-[#FE9100] rounded-full"
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [1, 0.5, 1]
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-400 font-medium">denkt nach...</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* BOTTOM INPUT (only when messages exist) */}
      {hasMessages && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-6 border-t border-white/10 backdrop-blur-xl bg-black/50 relative z-20"
        >
          {uploadedFiles.length > 0 && (
            <div className="mb-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 max-w-3xl mx-auto">
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-2 group hover:bg-white/10 transition-colors">
                    <div className="flex items-center space-x-2">
                      {getFileIcon(file.type)}
                      <span className="text-sm text-white truncate max-w-[300px]">{file.name}</span>
                      <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-300 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="relative flex items-end space-x-3 max-w-4xl mx-auto">
            <div className="flex-1">
              <div className="relative group">
                <motion.div 
                  className="absolute -inset-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  animate={{
                    background: [
                      "linear-gradient(90deg, #FE9100, #a34e00, #FE9100)",
                      "linear-gradient(180deg, #a34e00, #FE9100, #a34e00)",
                      "linear-gradient(270deg, #FE9100, #a34e00, #FE9100)"
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message ARAS AI"
                  className="relative h-12 bg-black/80 backdrop-blur-sm text-white placeholder:text-gray-500 border-0 rounded-xl focus:ring-2 focus:ring-[#FE9100]/20 transition-all duration-200 pr-14"
                  disabled={sendMessage.isPending}
                />
                
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 p-0"
                  disabled={sendMessage.isPending}
                >
                  {isRecording ? (
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                      <MicOff className="w-4 h-4 text-red-400" />
                    </motion.div>
                  ) : (
                    <Mic className="w-4 h-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="h-12 px-3 border-white/20 hover:border-[#FE9100]/50 bg-transparent text-white rounded-xl"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => handleSendMessage()}
                size="sm"
                disabled={!message.trim() || sendMessage.isPending}
                className="h-12 px-5 bg-gradient-to-r from-[#FE9100] to-[#a34e00] hover:shadow-lg hover:shadow-[#FE9100]/30 text-white rounded-xl transition-all"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="max-w-4xl mx-auto mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
            <AlertCircle className="w-3.5 h-3.5" />
            <p>ARAS AI kann Fehler machen. Bitte überprüfe wichtige Informationen.</p>
          </div>
          
          {subscriptionData && (
            <div className="text-center mt-2">
              <p className="text-xs text-gray-600">
                {subscriptionData.aiMessagesUsed} / {subscriptionData.aiMessagesLimit || '∞'} Nachrichten
              </p>
            </div>
          )}
        </motion.div>
      )}

      {isRecording && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
        >
          <div className="flex items-center space-x-3 bg-red-500/20 backdrop-blur-xl border border-red-500/50 px-6 py-3 rounded-full shadow-2xl">
            <motion.div
              className="w-3 h-3 bg-red-500 rounded-full"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-sm font-semibold text-white">Recording...</span>
          </div>
        </motion.div>
      )}

      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        .premium-scroll::-webkit-scrollbar { width: 6px; }
        .premium-scroll::-webkit-scrollbar-track { background: transparent; }
        .premium-scroll::-webkit-scrollbar-thumb { background: rgba(254, 145, 0, 0.2); border-radius: 10px; }
        .premium-scroll::-webkit-scrollbar-thumb:hover { background: rgba(254, 145, 0, 0.4); }
      `}</style>
    </div>
  );
}