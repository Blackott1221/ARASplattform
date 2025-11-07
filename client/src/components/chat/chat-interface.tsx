import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message-bubble";
import { Send, Mic, MicOff, Plus, MessageSquare, X, Menu, Paperclip, File, Image as ImageIcon, FileText, Clock, AlertCircle, Newspaper, Search, TrendingUp, Mail } from "lucide-react";
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
  { text: "Aktuelle Nachrichten", icon: Newspaper },
  { text: "ARAS Deepsearch", icon: Search },
  { text: "Marktanalyse & Trends", icon: TrendingUp },
  { text: "E-Mail Assistent", icon: Mail }
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [message]);

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
      <div className="flex-1 flex items-center justify-center bg-[#0f0f0f]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <img src={arasLogo} alt="Loading" className="w-12 h-12 object-contain" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] relative overflow-hidden" onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
      {/* Dezente funkelnde Sterne im Hintergrund */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#FE9100] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 0.6, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {isDragging && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-[#FE9100]/10 backdrop-blur-md flex items-center justify-center border-2 border-dashed border-[#FE9100]/50 m-8 rounded-3xl">
          <div className="text-center">
            <Paperclip className="w-12 h-12 text-[#FE9100] mx-auto mb-3" />
            <p className="text-white text-lg font-medium">Datei ablegen</p>
          </div>
        </motion.div>
      )}

      {/* MODERNE SIDEBAR */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setShowHistory(false)} />
            <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="fixed left-0 top-0 bottom-0 w-80 bg-black/95 backdrop-blur-2xl border-r border-[#FE9100]/20 z-50 flex flex-col">
              <div className="p-5 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FE9100] to-[#a34e00] flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-white font-semibold text-lg">Chats</h3>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setShowHistory(false)} className="h-8 w-8 p-0 hover:bg-white/10 rounded-lg">
                  <X className="w-4 h-4 text-gray-400" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 aras-scroll">
                {chatSessions.length > 0 ? (
                  chatSessions.map((session) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      onClick={() => loadChatSession(session.id)}
                      className={`group p-3.5 rounded-xl cursor-pointer transition-all duration-200 ${
                        session.isActive
                          ? "bg-gradient-to-r from-[#FE9100]/20 to-transparent border border-[#FE9100]/40"
                          : "bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white truncate flex-1">{session.title}</span>
                        {session.isActive && (
                          <motion.div
                            className="w-2 h-2 bg-[#FE9100] rounded-full"
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(session.updatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 text-sm py-16">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Keine Chats vorhanden</p>
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-white/10">
                <Button
                  onClick={() => {
                    startNewChatMutation.mutate();
                    setShowHistory(false);
                  }}
                  className="w-full bg-gradient-to-r from-[#FE9100] to-[#a34e00] hover:from-[#ff9d1a] hover:to-[#b55a00] text-white font-medium rounded-xl h-11 transition-all duration-200"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Neuer Chat
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp" onChange={(e) => handleFileUpload(e.target.files)} />

      {hasMessages && (
        <div className="p-3 border-b border-white/10 flex justify-between items-center backdrop-blur-sm bg-black/30">
          <Button size="sm" variant="ghost" onClick={() => setShowHistory(!showHistory)} className="text-gray-400 hover:text-white h-9 hover:bg-white/10 rounded-lg">
            <Menu className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => startNewChatMutation.mutate()} className="text-gray-400 hover:text-white h-9 hover:bg-white/10 rounded-lg">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div ref={messagesContainerRef} className={`flex-1 overflow-y-auto relative z-10 aras-scroll ${!hasMessages ? 'flex items-center justify-center' : 'p-6 space-y-4'}`}>
        {!hasMessages ? (
          <div className="w-full max-w-3xl mx-auto px-6">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-center mb-16">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="mb-8"
              >
                <img src={arasLogo} alt="ARAS AI" className="w-20 h-20 object-contain mx-auto opacity-90" />
              </motion.div>

              <motion.h1
                className="text-7xl font-bold mb-6"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.span
                  className="inline-block"
                  animate={{
                    backgroundImage: [
                      "linear-gradient(90deg, #e9d7c4 0%, #FE9100 50%, #a34e00 100%)",
                      "linear-gradient(90deg, #FE9100 0%, #a34e00 50%, #e9d7c4 100%)",
                      "linear-gradient(90deg, #a34e00 0%, #e9d7c4 50%, #FE9100 100%)",
                      "linear-gradient(90deg, #e9d7c4 0%, #FE9100 50%, #a34e00 100%)",
                    ],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  style={{
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundSize: "200% 100%",
                  }}
                >
                  ARAS AI
                </motion.span>
              </motion.h1>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center space-x-3 text-xl text-gray-400 mb-20"
              >
                <span>erledigt:</span>
                <span className="text-[#FE9100] font-medium min-w-[220px] text-left">
                  {displayText}
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block w-[2px] h-[22px] bg-[#FE9100] ml-1 align-middle"
                  />
                </span>
              </motion.div>

              {/* CLEAN PROMPT BUTTONS - HORIZONTAL */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-2 gap-3 mb-20 max-w-2xl mx-auto"
              >
                {SUGGESTED_PROMPTS.map((prompt, index) => {
                  const Icon = prompt.icon;
                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      whileHover={{
                        scale: 1.02,
                        backgroundColor: "rgba(254, 145, 0, 0.1)",
                        borderColor: "rgba(254, 145, 0, 0.4)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSendMessage(prompt.text)}
                      className="flex items-center space-x-3 px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white hover:text-[#FE9100] text-left transition-all duration-200"
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-medium">{prompt.text}</span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>

            {/* CENTERED INPUT WITH GOOGLE-STYLE BORDER */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
              {uploadedFiles.length > 0 && (
                <div className="mb-4 space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/10">
                      <div className="flex items-center space-x-2 text-sm text-white">
                        {getFileIcon(file.type)}
                        <span className="truncate max-w-[400px]">{file.name}</span>
                        <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeFile(index)} className="h-7 w-7 p-0 hover:bg-red-500/20">
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative flex items-end space-x-3">
                <div className="flex-1 relative group">
                  {/* GOOGLE-STYLE ANIMATED BORDER */}
                  <div className="absolute -inset-[2px] rounded-3xl overflow-hidden">
                    <motion.div
                      className="absolute inset-0"
                      animate={{
                        background: [
                          "conic-gradient(from 0deg, #4285F4, #EA4335, #FBBC04, #34A853, #4285F4)",
                          "conic-gradient(from 90deg, #4285F4, #EA4335, #FBBC04, #34A853, #4285F4)",
                          "conic-gradient(from 180deg, #4285F4, #EA4335, #FBBC04, #34A853, #4285F4)",
                          "conic-gradient(from 270deg, #4285F4, #EA4335, #FBBC04, #34A853, #4285F4)",
                          "conic-gradient(from 360deg, #4285F4, #EA4335, #FBBC04, #34A853, #4285F4)",
                        ],
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Message ARAS AI"
                    className="relative w-full min-h-[60px] max-h-[200px] bg-[#1a1a1a] backdrop-blur-xl text-white placeholder:text-gray-500 border-0 rounded-3xl px-6 py-5 pr-16 focus:outline-none focus:ring-0 resize-none transition-all"
                    disabled={sendMessage.isPending}
                    rows={1}
                  />

                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    variant="ghost"
                    size="sm"
                    className="absolute right-3 top-4 w-10 h-10 rounded-full p-0 hover:bg-white/10 transition-all"
                    disabled={sendMessage.isPending}
                  >
                    {isRecording ? (
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                        <MicOff className="w-5 h-5 text-red-400" />
                      </motion.div>
                    ) : (
                      <Mic className="w-5 h-5 text-gray-400 group-hover:text-[#FE9100] transition-colors" />
                    )}
                  </Button>
                </div>

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="ghost"
                  size="sm"
                  className="h-[60px] w-[60px] p-0 rounded-3xl hover:bg-white/10 transition-all"
                >
                  <Paperclip className="w-5 h-5 text-gray-400 hover:text-[#FE9100] transition-colors" />
                </Button>

                <Button
                  onClick={() => handleSendMessage()}
                  size="sm"
                  disabled={!message.trim() || sendMessage.isPending}
                  className="h-[60px] px-7 bg-gradient-to-r from-[#FE9100] to-[#a34e00] hover:from-[#ff9d1a] hover:to-[#b55a00] text-white rounded-3xl disabled:opacity-40 transition-all duration-200 font-medium"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-600">
                <AlertCircle className="w-3.5 h-3.5" />
                <p>ARAS AI kann Fehler machen. Bitte überprüfe wichtige Informationen.</p>
              </div>
            </motion.div>
          </div>
        ) : (
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4">
                <img src={arasAiImage} alt="ARAS AI" className="w-9 h-9 rounded-full object-cover ring-2 ring-[#FE9100]/30" />
                <div className="flex space-x-2">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-[#FE9100] rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {hasMessages && (
        <div className="p-5 border-t border-white/10 backdrop-blur-sm bg-black/30">
          {uploadedFiles.length > 0 && (
            <div className="mb-4 space-y-2 max-w-4xl mx-auto">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="flex items-center space-x-2 text-sm text-white">
                    {getFileIcon(file.type)}
                    <span className="truncate max-w-[400px]">{file.name}</span>
                    <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeFile(index)} className="h-7 w-7 p-0 hover:bg-red-500/20">
                    <X className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-end space-x-3 max-w-4xl mx-auto">
            <div className="flex-1 relative group">
              {/* GOOGLE-STYLE ANIMATED BORDER */}
              <div className="absolute -inset-[1.5px] rounded-2xl overflow-hidden">
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    background: [
                      "conic-gradient(from 0deg, #4285F4, #EA4335, #FBBC04, #34A853, #4285F4)",
                      "conic-gradient(from 120deg, #4285F4, #EA4335, #FBBC04, #34A853, #4285F4)",
                      "conic-gradient(from 240deg, #4285F4, #EA4335, #FBBC04, #34A853, #4285F4)",
                      "conic-gradient(from 360deg, #4285F4, #EA4335, #FBBC04, #34A853, #4285F4)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
              </div>

              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Message ARAS AI"
                className="relative w-full min-h-[52px] max-h-[200px] bg-[#1a1a1a] backdrop-blur-xl text-white placeholder:text-gray-500 border-0 rounded-2xl px-5 py-4 pr-14 focus:outline-none focus:ring-0 resize-none transition-all"
                disabled={sendMessage.isPending}
                rows={1}
              />

              <Button
                onClick={isRecording ? stopRecording : startRecording}
                variant="ghost"
                size="sm"
                className="absolute right-2 top-3 w-9 h-9 rounded-full p-0 hover:bg-white/10 transition-all"
                disabled={sendMessage.isPending}
              >
                {isRecording ? (
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                    <MicOff className="w-4 h-4 text-red-400" />
                  </motion.div>
                ) : (
                  <Mic className="w-4 h-4 text-gray-400 group-hover:text-[#FE9100] transition-colors" />
                )}
              </Button>
            </div>

            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="ghost"
              size="sm"
              className="h-[52px] w-[52px] p-0 rounded-2xl hover:bg-white/10 transition-all"
            >
              <Paperclip className="w-4 h-4 text-gray-400 hover:text-[#FE9100] transition-colors" />
            </Button>

            <Button
              onClick={() => handleSendMessage()}
              size="sm"
              disabled={!message.trim() || sendMessage.isPending}
              className="h-[52px] px-6 bg-gradient-to-r from-[#FE9100] to-[#a34e00] hover:from-[#ff9d1a] hover:to-[#b55a00] text-white rounded-2xl disabled:opacity-40 transition-all duration-200 font-medium"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-600">
            <AlertCircle className="w-3 h-3" />
            <p>ARAS AI kann Fehler machen.</p>
          </div>
        </div>
      )}

      {isRecording && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-red-600/20 backdrop-blur-2xl border border-red-500/50 px-5 py-3 rounded-full z-50"
        >
          <div className="flex items-center space-x-3">
            <motion.div
              className="w-2.5 h-2.5 bg-red-500 rounded-full"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-sm text-white font-medium">Aufnahme läuft...</span>
          </div>
        </motion.div>
      )}

      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        .aras-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .aras-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .aras-scroll::-webkit-scrollbar-thumb {
          background: rgba(254, 145, 0, 0.2);
          border-radius: 10px;
        }
        .aras-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(254, 145, 0, 0.4);
        }
      `}</style>
    </div>
  );
}