import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message-bubble";
import { Send, Mic, MicOff, Plus, MessageSquare, X, Menu, Paperclip, File, Image as ImageIcon, FileText, Clock, AlertCircle } from "lucide-react";
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
  "Ruf meinen Kunden an und vereinbare einen Termin",
  "Verschiebe alle Meetings von heute auf morgen",
  "Analysiere meine Verkaufszahlen vom letzten Monat",
  "Schreib eine professionelle Follow-up Email"
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
      <div className="flex-1 flex items-center justify-center bg-black">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <img src={arasLogo} alt="Loading" className="w-12 h-12 object-contain" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black relative overflow-hidden" onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
      {isDragging && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-[#FE9100]/10 backdrop-blur-md flex items-center justify-center border-2 border-dashed border-[#FE9100]/50 m-8 rounded-3xl">
          <div className="text-center">
            <Paperclip className="w-12 h-12 text-[#FE9100] mx-auto mb-3" />
            <p className="text-white text-lg font-medium">Datei ablegen</p>
          </div>
        </motion.div>
      )}

      {/* CLEAN SIDEBAR */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowHistory(false)} />
            <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: "spring", damping: 25 }} className="fixed left-0 top-0 bottom-0 w-80 bg-black/95 backdrop-blur-xl border-r border-white/10 z-50 flex flex-col">
              <div className="p-5 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-white font-semibold text-lg">Chats</h3>
                <Button size="sm" variant="ghost" onClick={() => setShowHistory(false)} className="h-8 w-8 p-0 hover:bg-white/10">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 clean-scroll">
                {chatSessions.length > 0 ? (
                  chatSessions.map((session) => (
                    <motion.div key={session.id} whileHover={{ x: 2 }} onClick={() => loadChatSession(session.id)} className={`p-3 rounded-lg cursor-pointer transition-colors ${session.isActive ? "bg-white/10 border border-white/20" : "bg-white/5 hover:bg-white/10"}`}>
                      <div className="text-sm font-medium text-white mb-1">{session.title}</div>
                      <div className="text-xs text-gray-500">{new Date(session.updatedAt).toLocaleDateString('de-DE')}</div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 text-sm py-12">Keine Chats</div>
                )}
              </div>
              <div className="p-3 border-t border-white/10">
                <Button onClick={() => { startNewChatMutation.mutate(); setShowHistory(false); }} className="w-full bg-white/10 hover:bg-white/20 text-white">
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
        <div className="p-3 border-b border-white/10 flex justify-between items-center">
          <Button size="sm" variant="ghost" onClick={() => setShowHistory(!showHistory)} className="text-gray-400 hover:text-white h-8">
            <Menu className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => startNewChatMutation.mutate()} className="text-gray-400 hover:text-white h-8">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div ref={messagesContainerRef} className={`flex-1 overflow-y-auto relative z-10 clean-scroll ${!hasMessages ? 'flex items-center justify-center' : 'p-6 space-y-4'}`}>
        {!hasMessages ? (
          <div className="w-full max-w-2xl mx-auto px-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-16">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }} className="mb-8">
                <img src={arasLogo} alt="ARAS AI" className="w-16 h-16 object-contain mx-auto opacity-90" />
              </motion.div>

              <motion.h1 className="text-6xl font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                <motion.span 
                  className="inline-block"
                  animate={{
                    backgroundImage: [
                      "linear-gradient(90deg, #ffffff 0%, #FE9100 50%, #ffffff 100%)",
                      "linear-gradient(90deg, #FE9100 0%, #ffffff 50%, #FE9100 100%)",
                      "linear-gradient(90deg, #ffffff 0%, #FE9100 50%, #ffffff 100%)"
                    ],
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  style={{
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundSize: "200% 100%"
                  }}
                >
                  ARAS AI
                </motion.span>
              </motion.h1>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center justify-center space-x-2 text-lg text-gray-400 mb-20">
                <span>erledigt:</span>
                <span className="text-[#FE9100] font-medium min-w-[200px] text-left">
                  {displayText}
                  <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.8, repeat: Infinity }} className="inline-block w-[2px] h-[20px] bg-[#FE9100] ml-1 align-middle" />
                </span>
              </motion.div>

              {/* CLEAN SUGGESTIONS */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="space-y-2 mb-16">
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    whileHover={{ x: 4, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-sm transition-all duration-200"
                  >
                    {prompt}
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>

            {/* CENTERED INPUT */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
              {uploadedFiles.length > 0 && (
                <div className="mb-3 space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/10">
                      <div className="flex items-center space-x-2 text-sm text-white">
                        {getFileIcon(file.type)}
                        <span>{file.name}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeFile(index)} className="h-6 w-6 p-0">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative flex items-end space-x-2">
                <div className="flex-1 relative group">
                  {/* SUBTLE ANIMATED BORDER */}
                  <div className="absolute -inset-[1px] rounded-2xl overflow-hidden">
                    <motion.div
                      className="absolute inset-0"
                      animate={{
                        background: [
                          "linear-gradient(0deg, transparent 0%, rgba(254,145,0,0.3) 50%, transparent 100%)",
                          "linear-gradient(90deg, transparent 0%, rgba(254,145,0,0.3) 50%, transparent 100%)",
                          "linear-gradient(180deg, transparent 0%, rgba(254,145,0,0.3) 50%, transparent 100%)",
                          "linear-gradient(270deg, transparent 0%, rgba(254,145,0,0.3) 50%, transparent 100%)",
                          "linear-gradient(360deg, transparent 0%, rgba(254,145,0,0.3) 50%, transparent 100%)"
                        ]
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Message ARAS AI"
                    className="relative w-full min-h-[56px] max-h-[200px] bg-black/60 backdrop-blur-sm text-white placeholder:text-gray-500 border-0 rounded-2xl px-5 py-4 pr-14 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none transition-all"
                    disabled={sendMessage.isPending}
                    rows={1}
                  />

                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-3 w-10 h-10 rounded-full p-0 hover:bg-white/10"
                    disabled={sendMessage.isPending}
                  >
                    {isRecording ? (
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                        <MicOff className="w-5 h-5 text-red-400" />
                      </motion.div>
                    ) : (
                      <Mic className="w-5 h-5 text-gray-400" />
                    )}
                  </Button>
                </div>

                <Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="sm" className="h-14 w-14 p-0 rounded-2xl hover:bg-white/10">
                  <Paperclip className="w-5 h-5" />
                </Button>

                <Button onClick={() => handleSendMessage()} size="sm" disabled={!message.trim() || sendMessage.isPending} className="h-14 px-6 bg-white/10 hover:bg-white/20 text-white rounded-2xl disabled:opacity-30">
                  <Send className="w-5 h-5" />
                </Button>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-600">
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
        <div className="p-4 border-t border-white/10">
          {uploadedFiles.length > 0 && (
            <div className="mb-3 space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/10">
                  <div className="flex items-center space-x-2 text-sm text-white">
                    {getFileIcon(file.type)}
                    <span>{file.name}</span>
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
              <div className="absolute -inset-[1px] rounded-xl overflow-hidden">
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    background: [
                      "linear-gradient(0deg, transparent, rgba(254,145,0,0.3), transparent)",
                      "linear-gradient(120deg, transparent, rgba(254,145,0,0.3), transparent)",
                      "linear-gradient(240deg, transparent, rgba(254,145,0,0.3), transparent)",
                      "linear-gradient(360deg, transparent, rgba(254,145,0,0.3), transparent)"
                    ]
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
                className="relative w-full min-h-[48px] max-h-[200px] bg-black/60 backdrop-blur-sm text-white placeholder:text-gray-500 border-0 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
                disabled={sendMessage.isPending}
                rows={1}
              />

              <Button onClick={isRecording ? stopRecording : startRecording} variant="ghost" size="sm" className="absolute right-2 top-2 w-8 h-8 rounded-full p-0 hover:bg-white/10" disabled={sendMessage.isPending}>
                {isRecording ? (
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                    <MicOff className="w-4 h-4 text-red-400" />
                  </motion.div>
                ) : (
                  <Mic className="w-4 h-4 text-gray-400" />
                )}
              </Button>
            </div>

            <Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="sm" className="h-12 w-12 p-0 rounded-xl hover:bg-white/10">
              <Paperclip className="w-4 h-4" />
            </Button>

            <Button onClick={() => handleSendMessage()} size="sm" disabled={!message.trim() || sendMessage.isPending} className="h-12 px-5 bg-white/10 hover:bg-white/20 text-white rounded-xl disabled:opacity-30">
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-600">
            <AlertCircle className="w-3 h-3" />
            <p>ARAS AI kann Fehler machen.</p>
          </div>
        </div>
      )}

      {isRecording && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-red-500/20 backdrop-blur-xl border border-red-500/50 px-4 py-2 rounded-full">
          <div className="flex items-center space-x-2">
            <motion.div className="w-2 h-2 bg-red-500 rounded-full" animate={{ opacity: [1, 0.3] }} transition={{ duration: 1, repeat: Infinity }} />
            <span className="text-sm text-white">Recording</span>
          </div>
        </motion.div>
      )}

      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        .clean-scroll::-webkit-scrollbar { width: 4px; }
        .clean-scroll::-webkit-scrollbar-track { background: transparent; }
        .clean-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .clean-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}