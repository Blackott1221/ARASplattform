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
      }, 20);

      return () => clearInterval(interval);
    } else if (!isNew) {
      setDisplayedText(cleanMessage);
      setIsTyping(false);
    }
  }, [cleanMessage, isAi, isNew]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isAi ? 'justify-start' : 'justify-end'} mb-3`}
    >
      <div className={`flex items-start ${isAi ? 'gap-3' : 'gap-3 flex-row-reverse'} max-w-[68%]`}>
        <motion.div className="flex-shrink-0" whileHover={{ scale: 1.05 }}>
          {isAi ? (
            <img src={arasAiImage} alt="ARAS AI" className="w-8 h-8 rounded-full object-cover ring-2 ring-[#FE9100]/20" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FE9100] to-[#a34e00] flex items-center justify-center ring-2 ring-[#FE9100]/20">
              <User className="w-4 h-4 text-white" />
            </div>
          )}
        </motion.div>
        
        <div className="flex flex-col max-w-full">
          <div className="relative">
            {!isAi && (
              <div className="absolute -inset-[1px] rounded-xl">
                <motion.div
                  className="w-full h-full rounded-xl"
                  animate={{
                    background: [
                      "linear-gradient(90deg, rgba(233, 215, 196, 0.2) 0%, rgba(254, 145, 0, 0.2) 50%, rgba(233, 215, 196, 0.2) 100%)",
                      "linear-gradient(90deg, rgba(254, 145, 0, 0.2) 0%, rgba(233, 215, 196, 0.2) 50%, rgba(254, 145, 0, 0.2) 100%)",
                      "linear-gradient(90deg, rgba(233, 215, 196, 0.2) 0%, rgba(254, 145, 0, 0.2) 50%, rgba(233, 215, 196, 0.2) 100%)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  style={{
                    padding: '1px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
              </div>
            )}

            <motion.div 
              className={`relative px-4 py-3 rounded-xl ${isAi ? 'bg-transparent text-gray-100' : 'bg-transparent text-white'}`}
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
          </div>
          
          <div className={`flex items-center mt-1 px-1.5 space-x-2 ${isAi ? '' : 'flex-row-reverse space-x-reverse'}`}>
            <p className="text-xs text-gray-500">{format(timestamp, 'HH:mm')}</p>
            {isAi && onSpeak && (
              <Button size="sm" variant="ghost" onClick={() => onSpeak(cleanMessage)} className="h-6 w-6 p-0 hover:bg-white/10 rounded-lg" disabled={isSpeaking}>
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-[#FE9100]" /> : <Volume2 className="w-3.5 h-3.5 text-gray-400 hover:text-[#FE9100]" />}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}