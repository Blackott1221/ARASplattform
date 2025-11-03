import { motion } from "framer-motion";
import { User, Volume2, VolumeX } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import arasAiImage from "@assets/ChatGPT Image 9. Apr. 2025_ 21_38_23_1754515368187.png";

const cleanMarkdown = (text: string): string => {
  let cleanText = text;
  for (let i = 0; i < 5; i++) {
    cleanText = cleanText
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '');
  }
  return cleanText.replace(/\*/g, '');
};

interface MessageBubbleProps {
  message: string;
  isAi: boolean;
  timestamp: Date;
  confidence?: number;
  onReaction?: (messageId: string, reaction: string) => void;
  messageId?: string;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
  isNew?: boolean;
}

export function MessageBubble({ 
  message, 
  isAi, 
  timestamp, 
  confidence, 
  onReaction, 
  messageId, 
  onSpeak, 
  isSpeaking,
  isNew = false
}: MessageBubbleProps) {
  const cleanMessage = cleanMarkdown(message);
  const [displayedText, setDisplayedText] = useState(isAi && isNew ? "" : cleanMessage);
  const [isTyping, setIsTyping] = useState(isAi && isNew);

  useEffect(() => {
    if (isAi && isNew && cleanMessage) {
      let currentIndex = 0;
      setDisplayedText("");
      setIsTyping(true);

      const interval = setInterval(() => {
        if (currentIndex < cleanMessage.length) {
          setDisplayedText(cleanMessage.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          setIsTyping(false);
          clearInterval(interval);
        }
      }, 15);

      return () => clearInterval(interval);
    }
  }, [cleanMessage, isAi, isNew]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isAi ? 'justify-start' : 'justify-end'} mb-6`}
    >
      <div className={`flex items-start ${isAi ? 'space-x-3' : 'space-x-3 flex-row-reverse'} max-w-[75%]`}>
        {/* Avatar */}
        <motion.div 
          className="flex-shrink-0"
          whileHover={{ scale: 1.05 }}
        >
          {isAi ? (
            <img 
              src={arasAiImage} 
              alt="ARAS AI" 
              className="w-9 h-9 rounded-full object-cover ring-2 ring-[#FE9100]/20"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FE9100] to-[#a34e00] flex items-center justify-center ring-2 ring-[#FE9100]/20">
              <User className="w-4 h-4 text-white" />
            </div>
          )}
        </motion.div>
        
        <div className="flex flex-col">
          {/* Message Bubble */}
          <motion.div 
            className={`px-5 py-3.5 rounded-2xl ${
              isAi 
                ? 'bg-white/[0.03] backdrop-blur-sm border border-white/10 text-gray-100' 
                : 'bg-gradient-to-br from-[#FE9100] to-[#a34e00] text-white'
            }`}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">
              {displayedText}
              {isTyping && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block w-[2px] h-[18px] bg-[#FE9100] ml-1 align-middle"
                />
              )}
            </div>
          </motion.div>
          
          {/* Timestamp & Actions */}
          <div className={`flex items-center mt-1.5 px-2 space-x-2 ${isAi ? '' : 'flex-row-reverse space-x-reverse'}`}>
            <p className="text-xs text-gray-500">
              {format(timestamp, 'HH:mm')}
            </p>
            {isAi && onSpeak && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSpeak(cleanMessage)}
                className="h-6 w-6 p-0 hover:bg-white/10 rounded-lg"
                disabled={isSpeaking}
              >
                {isSpeaking ? (
                  <VolumeX className="w-3.5 h-3.5 text-[#FE9100]" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-gray-400 hover:text-[#FE9100]" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
