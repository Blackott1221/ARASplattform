import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message-bubble";
import { Send, Mic, MicOff, Plus, MessageSquare, X, Menu, Paperclip, File, Image as ImageIcon, FileText, Clock, AlertCircle, Phone, BarChart3, Zap, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ChatMessage } from "@shared/schema";
import arasAiImage from "@assets/ChatGPT Image 9. Apr. 2025_ 21_38_23_1754515368187.png";
import arasLogo from "@/assets/aras_logo_1755067745303.png";

const ANIMATED_TEXTS = [
  "Outbound Calls",
  "Terminvereinbarungen", 
  "Lead Qualifizierung",
  "Gesprächsanalysen",
  "Call Optimierung",
  "Kundengespräche"
];

const SUGGESTED_PROMPTS = [
  { text: "Starte Outbound Call", icon: Phone },
  { text: "Analysiere Gesprächsqualität", icon: BarChart3 },
  { text: "Optimiere Call-Strategie", icon: Zap },
  { text: "Terminvereinbarung durchführen", icon: Calendar }
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
      {/* FUNKELNDE STERNE - DEZENT WIE AUF DER WEBSITE */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-[2px] h-[2px] bg-[#FE9100] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              filter: 'blur(0.5px)',
            }}
            animate={{
              opacity: [0, 0.4, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {isDragging && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-[#FE9100]/5 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <Paperclip className="w-10 h-10 text-[#FE9100] mx-auto mb-2" />
            <p className="text-white text-sm">Datei ablegen</p>
          </div>
        </motion.div>
      )}

      {/* SIDEBAR */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-40" onClick={() => setShowHistory(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", damping: 30 }} className="fixed left-0 top-0 bottom-0 w-72 bg-[#0f0f0f] border-r border-white/5 z-50 flex flex-col">
              <div className="p-4 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-white font-medium text-sm">Chats</h3>
                <Button size="sm" variant="ghost" onClick={() => setShowHistory(false)} className="h-7 w-7 p-0 hover:bg-white/5">
                  <X className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 aras-scroll">
                {chatSessions.length > 0 ? (
                  chatSessions.map((session) => (
                    <motion.div
                      key={session.id}
                      whileHover={{ x: 2 }}
                      onClick={() => loadChatSession(session.id)}
                      className={`p-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                        session.isActive ? "bg-white/5 text-white" : "text-gray-500 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="truncate mb-1">{session.title}</div>
                      <div className="text-xs text-gray-600">{new Date(session.updatedAt).toLocaleDateString('de-DE')}</div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center text-gray-600 text-xs py-12">Keine Chats</div>
                )}
              </div>
              <div className="p-2 border-t border-white/5">
                <Button onClick={() => { startNewChatMutation.mutate(); setShowHistory(false); }} className="w-full bg-white/5 hover:bg-white/10 text-white text-sm h-9">
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
        <div className="p-2 border-b border-white/5 flex justify-between items-center">
          <Button size="sm" variant="ghost" onClick={() => setShowHistory(!showHistory)} className="text-gray-600 hover:text-white h-8">
            <Menu className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => startNewChatMutation.mutate()} className="text-gray-600 hover:text-white h-8">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div ref={messagesContainerRef} className={`flex-1 overflow-y-auto relative z-10 aras-scroll ${!hasMessages ? 'flex items-center justify-center' : 'p-6 space-y-4'}`}>
        {!hasMessages ? (
          <div className="w-full max-w-3xl mx-auto px-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-12">
              
              {/* ARAS AI LOGO MIT GRADIENT */}
              <motion.h1 
                className="text-7xl font-bold mb-6 relative"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <span
                  className="relative inline-block"
                  style={{
                    color: '#e9d7c4',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <motion.span
                    className="absolute inset-0"
                    animate={{
                      backgroundImage: [
                        'linear-gradient(90deg, #e9d7c4 0%, #FE9100 25%, #a34e00 50%, #FE9100 75%, #e9d7c4 100%)',
                        'linear-gradient(90deg, #FE9100 0%, #a34e00 25%, #e9d7c4 50%, #a34e00 75%, #FE9100 100%)',
                        'linear-gradient(90deg, #a34e00 0%, #e9d7c4 25%, #FE9100 50%, #e9d7c4 75%, #a34e00 100%)',
                        'linear-gradient(90deg, #e9d7c4 0%, #FE9100 25%, #a34e00 50%, #FE9100 75%, #e9d7c4 100%)',
                      ],
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    style={{
                      backgroundSize: '300% 100%',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    ARAS AI
                  </motion.span>
                  <span style={{ opacity: 0 }}>ARAS AI</span>
                </span>
              </motion.h1>

              {/* TYPEWRITER EFFEKT */}
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center space-x-2 text-base text-gray-500 mb-16"
              >
                <span>erledigt für dich:</span>
                <span 
                  className="font-medium min-w-[200px] text-left"
                  style={{
                    background: 'linear-gradient(90deg, #e9d7c4, #FE9100, #a34e00)',
                    backgroundSize: '200% auto',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {displayText}
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block w-[2px] h-[18px] bg-[#FE9100] ml-1 align-middle"
                  />
                </span>
              </motion.div>

              {/* PROMPT BUTTONS */}
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 0.5 }}
                className="flex flex-wrap justify-center gap-2 mb-16"
              >
                {SUGGESTED_PROMPTS.map((prompt, index) => {
                  const Icon = prompt.icon;
                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      whileHover={{ 
                        scale: 1.02,
                        backgroundColor: 'rgba(254, 145, 0, 0.05)',
                        borderColor: 'rgba(254, 145, 0, 0.3)'
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSendMessage(prompt.text)}
                      className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-transparent border border-white/10 text-gray-400 hover:text-white text-sm transition-all"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{prompt.text}</span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>

            {/* ZENTRIERTES EINGABEFELD MIT GOOGLE AI BORDER */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
              {uploadedFiles.length > 0 && (
                <div className="mb-3 space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/10">
                      <div className="flex items-center space-x-2 text-sm text-white">
                        {getFileIcon(file.type)}
                        <span className="truncate">{file.name}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeFile(index)} className="h-6 w-6 p-0">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative flex items-end space-x-2">
                <div className="flex-1 relative">
                  {/* GOOGLE AI STYLE BORDER - DEZENT & SMOOTH */}
                  <svg className="absolute -inset-[1px] w-[calc(100%+2px)] h-[calc(100%+2px)] pointer-events-none" style={{ borderRadius: '1.5rem' }}>
                    <defs>
                      <linearGradient id="border-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#4285F4" stopOpacity="0.6">
                          <animate attributeName="offset" values="0;1;0" dur="3s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="25%" stopColor="#EA4335" stopOpacity="0.6">
                          <animate attributeName="offset" values="0.25;0.75;0.25" dur="3s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="50%" stopColor="#FBBC04" stopOpacity="0.6">
                          <animate attributeName="offset" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="75%" stopColor="#34A853" stopOpacity="0.6">
                          <animate attributeName="offset" values="0.75;0.25;0.75" dur="3s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="100%" stopColor="#4285F4" stopOpacity="0.6">
                          <animate attributeName="offset" values="1;0;1" dur="3s" repeatCount="indefinite" />
                        </stop>
                      </linearGradient>
                    </defs>
                    <rect 
                      x="0.5" 
                      y="0.5" 
                      width="calc(100% - 1px)" 
                      height="calc(100% - 1px)" 
                      rx="24" 
                      ry="24" 
                      fill="none" 
                      stroke="url(#border-gradient)" 
                      strokeWidth="1"
                    />
                  </svg>

                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Message ARAS AI"
                    className="w-full min-h-[56px] max-h-[200px] bg-[#1a1a1a] text-white placeholder:text-gray-600 border-0 rounded-3xl px-6 py-4 pr-14 focus:outline-none resize-none"
                    disabled={sendMessage.isPending}
                    rows={1}
                  />

                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    variant="ghost"
                    size="sm"
                    className="absolute right-3 top-3 w-10 h-10 rounded-full p-0 hover:bg-white/10"
                    disabled={sendMessage.isPending}
                  >
                    {isRecording ? (
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                        <MicOff className="w-5 h-5 text-red-400" />
                      </motion.div>
                    ) : (
                      <Mic className="w-5 h-5 text-gray-500" />
                    )}
                  </Button>
                </div>

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="ghost"
                  size="sm"
                  className="h-14 w-14 p-0 rounded-2xl hover:bg-white/5"
                >
                  <Paperclip className="w-5 h-5 text-gray-500" />
                </Button>

                <Button
                  onClick={() => handleSendMessage()}
                  size="sm"
                  disabled={!message.trim() || sendMessage.isPending}
                  className="h-14 px-6 bg-white/10 hover:bg-white/15 text-white rounded-2xl disabled:opacity-30"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-700">
                <AlertCircle className="w-3 h-3" />
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
                <img src={arasAiImage} alt="ARAS AI" className="w-8 h-8 rounded-full" />
                <div className="flex space-x-1.5">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <motion.div key={i} className="w-2 h-2 bg-[#FE9100] rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay }} />
                  ))}
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {hasMessages && (
        <div className="p-4 border-t border-white/5">
          {uploadedFiles.length > 0 && (
            <div className="mb-3 space-y-2 max-w-4xl mx-auto">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/10">
                  <div className="flex items-center space-x-2 text-sm text-white">
                    {getFileIcon(file.type)}
                    <span className="truncate">{file.name}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeFile(index)} className="h-6 w-6 p-0">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-end space-x-2 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              {/* GOOGLE AI BORDER */}
              <svg className="absolute -inset-[1px] w-[calc(100%+2px)] h-[calc(100%+2px)] pointer-events-none" style={{ borderRadius: '1rem' }}>
                <defs>
                  <linearGradient id="border-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4285F4" stopOpacity="0.6">
                      <animate attributeName="offset" values="0;1;0" dur="3s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="25%" stopColor="#EA4335" stopOpacity="0.6">
                      <animate attributeName="offset" values="0.25;0.75;0.25" dur="3s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="50%" stopColor="#FBBC04" stopOpacity="0.6">
                      <animate attributeName="offset" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="75%" stopColor="#34A853" stopOpacity="0.6">
                      <animate attributeName="offset" values="0.75;0.25;0.75" dur="3s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" stopColor="#4285F4" stopOpacity="0.6">
                      <animate attributeName="offset" values="1;0;1" dur="3s" repeatCount="indefinite" />
                    </stop>
                  </linearGradient>
                </defs>
                <rect x="0.5" y="0.5" width="calc(100% - 1px)" height="calc(100% - 1px)" rx="16" ry="16" fill="none" stroke="url(#border-gradient-2)" strokeWidth="1" />
              </svg>

              <textarea ref={textareaRef} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={handleKeyPress} placeholder="Message ARAS AI" className="w-full min-h-[48px] max-h-[200px] bg-[#1a1a1a] text-white placeholder:text-gray-600 border-0 rounded-2xl px-4 py-3 pr-12 focus:outline-none resize-none" disabled={sendMessage.isPending} rows={1} />

              <Button onClick={isRecording ? stopRecording : startRecording} variant="ghost" size="sm" className="absolute right-2 top-2 w-9 h-9 rounded-full p-0 hover:bg-white/10" disabled={sendMessage.isPending}>
                {isRecording ? (
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                    <MicOff className="w-4 h-4 text-red-400" />
                  </motion.div>
                ) : (
                  <Mic className="w-4 h-4 text-gray-500" />
                )}
              </Button>
            </div>

            <Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="sm" className="h-12 w-12 p-0 rounded-xl hover:bg-white/5">
              <Paperclip className="w-4 h-4 text-gray-500" />
            </Button>

            <Button onClick={() => handleSendMessage()} size="sm" disabled={!message.trim() || sendMessage.isPending} className="h-12 px-5 bg-white/10 hover:bg-white/15 text-white rounded-xl disabled:opacity-30">
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <div className="mt-2 text-center text-xs text-gray-700">
            <p>ARAS AI kann Fehler machen.</p>
          </div>
        </div>
      )}

      {isRecording && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-full">
          <div className="flex items-center space-x-2">
            <motion.div className="w-2 h-2 bg-red-500 rounded-full" animate={{ opacity: [1, 0.3] }} transition={{ duration: 1, repeat: Infinity }} />
            <span className="text-sm text-white">Aufnahme...</span>
          </div>
        </motion.div>
      )}

      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        .aras-scroll::-webkit-scrollbar { width: 4px; }
        .aras-scroll::-webkit-scrollbar-track { background: transparent; }
        .aras-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .aras-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}