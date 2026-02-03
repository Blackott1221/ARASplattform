/**
 * ============================================================================
 * ARAS COMMAND CENTER - Team Feed Section
 * ============================================================================
 * Premium chat-style collaboration feed
 * ARAS CI: "Apple meets Neuralink"
 * ============================================================================
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Image, X, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

// ============================================================================
// TYPES
// ============================================================================

interface FeedItem {
  id: number;
  authorUserId: string;
  authorUsername: string;
  actorName?: string;
  type: string;
  message: string;
  body?: string;
  title?: string;
  actionType?: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, any>;
  createdAt: string;
}

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: 'file' | 'image';
  preview?: string;
}

interface TeamFeedSectionProps {
  currentUserId?: string;
  currentUsername?: string;
  onItemClick?: (item: FeedItem) => void;
}

// ============================================================================
// LIVE PULSE DOT
// ============================================================================

function LivePulseDot() {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: '#22c55e' }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span
        className="text-[10px] font-medium uppercase tracking-wider"
        style={{ color: '#22c55e', fontFamily: 'Inter, sans-serif' }}
      >
        LIVE
      </span>
    </div>
  );
}

// ============================================================================
// TYPING INDICATOR
// ============================================================================

function TypingIndicator({ username }: { username?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
        style={{ background: 'linear-gradient(135deg, #FE9100, #a34e00)', color: 'white' }}
      >
        {username?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: '#ff6a00' }}
              animate={{ scale: [0.8, 1, 0.8] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          is typing…
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// MESSAGE BUBBLE
// ============================================================================

function MessageBubble({
  item,
  isOwn,
  onClick,
}: {
  item: FeedItem;
  isOwn: boolean;
  onClick?: () => void;
}) {
  const getRoleBadge = (type: string) => {
    const badges: Record<string, string> = {
      announcement: 'Announcement',
      update: 'Update',
      note: 'Note',
      system: 'System',
      post: 'Post',
    };
    return badges[type] || type;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      style={{ maxWidth: '100%' }}
    >
      <button
        onClick={onClick}
        className="group text-left transition-all duration-[140ms] hover:-translate-y-px focus:outline-none focus:ring-2 focus:ring-orange-500/30 rounded-[14px]"
        style={{
          maxWidth: '72%',
          cursor: 'pointer',
        }}
      >
        <div
          className="rounded-[14px] p-3 transition-shadow duration-[140ms] group-hover:shadow-lg"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {/* Message Header */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #FE9100, #a34e00)', color: 'white' }}
            >
              {item.authorUsername?.[0]?.toUpperCase() || item.actorName?.[0]?.toUpperCase() || '?'}
            </div>
            <span
              className="text-[13px] font-semibold"
              style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter, sans-serif' }}
            >
              {item.authorUsername || item.actorName || 'Unknown'}
            </span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(254,145,0,0.08), rgba(163,78,0,0.08))',
                color: '#FE9100',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {getRoleBadge(item.type)}
            </span>
            <span
              className="text-[11px] ml-auto"
              style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter, sans-serif' }}
            >
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: de })}
            </span>
          </div>

          {/* Message Content */}
          <p
            className="text-[14px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter, sans-serif' }}
          >
            {item.message || item.body || item.title}
          </p>
        </div>
      </button>
    </motion.div>
  );
}

// ============================================================================
// ATTACHMENT PREVIEW
// ============================================================================

function AttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-3 p-2 rounded-lg"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        maxHeight: '64px',
      }}
    >
      {attachment.type === 'image' && attachment.preview ? (
        <img
          src={attachment.preview}
          alt={attachment.name}
          className="w-10 h-10 rounded object-cover"
        />
      ) : (
        <div
          className="w-10 h-10 rounded flex items-center justify-center"
          style={{ background: 'rgba(254,145,0,0.1)' }}
        >
          <Paperclip className="w-4 h-4" style={{ color: '#FE9100' }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {attachment.name}
        </p>
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {formatSize(attachment.size)}
        </p>
      </div>
      <button
        onClick={onRemove}
        className="p-1 rounded hover:bg-white/10 transition-colors"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TeamFeedSection({
  currentUserId,
  currentUsername,
  onItemClick,
}: TeamFeedSectionProps) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | undefined>();

  // Fetch feed items
  const { data: feedData, isLoading } = useQuery({
    queryKey: ['command-center-feed'],
    queryFn: async () => {
      const res = await fetch('/api/internal/command-center/team-feed?limit=30');
      if (!res.ok) throw new Error('Failed to fetch feed');
      return res.json();
    },
    refetchInterval: 15000,
  });

  const feedItems: FeedItem[] = feedData?.items || [];

  // Post mutation
  const postMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch('/api/internal/command-center/team-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, type: 'post' }),
      });
      if (!res.ok) throw new Error('Failed to post');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['command-center-feed'] });
      setMessage('');
      setAttachments([]);
    },
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feedItems.length]);

  // Simulate typing indicator (in real app, this would come from WebSocket)
  useEffect(() => {
    if (message.length > 0) {
      // In a real app, emit typing event via WebSocket
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim()) {
      postMutation.mutate(message.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const files = Array.from(e.target.files || []);
    const newAttachments: Attachment[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type,
      preview: type === 'image' ? URL.createObjectURL(file) : undefined,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Sort messages oldest to newest for chat display
  const sortedItems = useMemo(() => {
    return [...feedItems].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [feedItems]);

  return (
    <div
      className="w-full"
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
      }}
    >
      {/* Glass Feed Card */}
      <div
        className="rounded-2xl flex flex-col"
        style={{
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,106,0,0.18)',
          boxShadow: '0 0 0 1px rgba(255,106,0,0.12), 0 12px 40px rgba(0,0,0,0.6)',
          padding: '20px',
        }}
      >
        {/* Feed Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              className="text-[14px] font-bold tracking-[0.18em] uppercase"
              style={{ fontFamily: 'Orbitron, sans-serif', color: '#e9d7c4' }}
            >
              TEAM FEED
            </h2>
            <p
              className="text-[12px] mt-0.5"
              style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.65)' }}
            >
              Internal updates & collaboration
            </p>
          </div>
          <LivePulseDot />
        </div>

        {/* Message List */}
        <div
          className="flex-1 space-y-3 overflow-y-auto pr-2 mb-4"
          style={{
            maxHeight: '400px',
            minHeight: '200px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,106,0,0.3) transparent',
          }}
        >
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div
                  className="animate-pulse rounded-[14px] p-3"
                  style={{
                    width: '60%',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-white/10" />
                    <div className="h-3 w-20 rounded bg-white/10" />
                  </div>
                  <div className="h-4 w-full rounded bg-white/10 mb-1" />
                  <div className="h-4 w-2/3 rounded bg-white/10" />
                </div>
              </div>
            ))
          ) : sortedItems.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="w-10 h-10 mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
              <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                No activity yet — post the first update
              </p>
            </div>
          ) : (
            // Messages
            <>
              {sortedItems.map((item) => (
                <MessageBubble
                  key={item.id}
                  item={item}
                  isOwn={item.authorUserId === currentUserId}
                  onClick={() => onItemClick?.(item)}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}

          {/* Typing Indicator */}
          <AnimatePresence>
            {isTyping && typingUser && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <TypingIndicator username={typingUser} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Attachment Preview */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 space-y-2"
            >
              {attachments.map((attachment) => (
                <AttachmentPreview
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={() => removeAttachment(attachment.id)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-2 rounded-xl px-3 transition-all focus-within:ring-2 focus-within:ring-orange-500/50"
            style={{
              height: '44px',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write an update…"
              className="flex-1 bg-transparent text-[14px] outline-none"
              style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter, sans-serif' }}
            />

            {/* Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'file')}
            />

            {/* Image Button */}
            <button
              onClick={() => imageInputRef.current?.click()}
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <Image className="w-4 h-4" />
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'image')}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!message.trim() || postMutation.isPending}
            className="w-11 h-11 flex items-center justify-center rounded-xl transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-orange-500/20"
            style={{
              background: 'linear-gradient(135deg, #FE9100, #a34e00)',
              color: 'white',
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hidden inputs for file upload */}
    </div>
  );
}

export default TeamFeedSection;
