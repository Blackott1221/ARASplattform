import { motion } from "framer-motion";
import { User, Volume2, VolumeX, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import arasAiImage from "@assets/ChatGPT Image 9. Apr. 2025_ 21_38_23_1754515368187.png";

// 🎨 BEAUTIFUL MARKDOWN RENDERER
const renderMarkdown = (text: string) => {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let currentList: { items: string[]; ordered: boolean } | null = null;
  let lineIndex = 0;

  const flushList = () => {
    if (currentList) {
      const ListTag = currentList.ordered ? 'ol' : 'ul';
      elements.push(
        <ListTag key={`list-${lineIndex}`} className={currentList.ordered ? "list-decimal list-inside space-y-1.5 my-3 ml-2" : "list-disc list-inside space-y-1.5 my-3 ml-2"}>
          {currentList.items.map((item, i) => (
            <li key={i} className="text-gray-100 leading-relaxed">
              <span className="ml-2">{parseInlineMarkdown(item)}</span>
            </li>
          ))}
        </ListTag>
      );
      currentList = null;
    }
  };

  const parseInlineMarkdown = (text: string) => {
    const parts: (string | JSX.Element)[] = [];
    let remaining = text;
    let key = 0;

    while (remaining) {
      // Bold
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index));
        parts.push(<strong key={`bold-${key++}`} className="font-bold text-white">{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
        continue;
      }

      // Italic
      const italicMatch = remaining.match(/\*(.*?)\*/);
      if (italicMatch && italicMatch.index !== undefined) {
        if (italicMatch.index > 0) parts.push(remaining.slice(0, italicMatch.index));
        parts.push(<em key={`italic-${key++}`} className="italic text-gray-200">{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
        continue;
      }

      // Inline code
      const codeMatch = remaining.match(/`(.*?)`/);
      if (codeMatch && codeMatch.index !== undefined) {
        if (codeMatch.index > 0) parts.push(remaining.slice(0, codeMatch.index));
        parts.push(
          <code key={`code-${key++}`} className="px-1.5 py-0.5 rounded bg-white/10 text-[#FE9100] font-mono text-sm border border-white/10">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
        continue;
      }

      parts.push(remaining);
      break;
    }

    return parts;
  };

  lines.forEach((line, i) => {
    lineIndex = i;

    // Headers
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-lg font-bold text-white mt-4 mb-2">
          {parseInlineMarkdown(line.slice(4))}
        </h3>
      );
      return;
    }
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} className="text-xl font-bold text-white mt-5 mb-3">
          {parseInlineMarkdown(line.slice(3))}
        </h2>
      );
      return;
    }
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={`h1-${i}`} className="text-2xl font-bold text-white mt-6 mb-3">
          {parseInlineMarkdown(line.slice(2))}
        </h1>
      );
      return;
    }

    // Lists
    const unorderedMatch = line.match(/^[-*]\s+(.+)/);
    const orderedMatch = line.match(/^(\d+)\.\s+(.+)/);

    if (unorderedMatch) {
      if (!currentList || currentList.ordered) {
        flushList();
        currentList = { items: [], ordered: false };
      }
      currentList.items.push(unorderedMatch[1]);
      return;
    }

    if (orderedMatch) {
      if (!currentList || !currentList.ordered) {
        flushList();
        currentList = { items: [], ordered: true };
      }
      currentList.items.push(orderedMatch[2]);
      return;
    }

    // Regular paragraph
    flushList();
    if (line.trim()) {
      elements.push(
        <p key={`p-${i}`} className="text-gray-100 leading-relaxed mb-3">
          {parseInlineMarkdown(line)}
        </p>
      );
    } else {
      elements.push(<div key={`spacer-${i}`} className="h-2" />);
    }
  });

  flushList();
  return elements;
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
  const [displayedText, setDisplayedText] = useState(isAi && isNew ? "" : message);
  const [isTyping, setIsTyping] = useState(isAi && isNew);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isAi && isNew && message) {
      let currentIndex = 0;
      setDisplayedText("");
      setIsTyping(true);

      const interval = setInterval(() => {
        if (currentIndex < message.length) {
          setDisplayedText(message.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          setIsTyping(false);
          clearInterval(interval);
        }
      }, 15);

      return () => clearInterval(interval);
    } else if (!isNew) {
      setDisplayedText(message);
      setIsTyping(false);
    }
  }, [message, isAi, isNew]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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
              className={`relative px-5 py-4 rounded-2xl ${
                isAi 
                  ? 'bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm' 
                  : 'bg-transparent text-white'
              }`}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-[15px] leading-relaxed">
                {isAi && !isTyping ? (
                  <div className="space-y-2">
                    {renderMarkdown(displayedText)}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words text-gray-100">
                    {displayedText}
                    {isTyping && (
                      <motion.span
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block w-[2px] h-[18px] bg-[#FE9100] ml-1 align-middle"
                      />
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
          
          <div className={`flex items-center mt-1 px-1.5 space-x-2 ${isAi ? '' : 'flex-row-reverse space-x-reverse'}`}>
            <p className="text-xs text-gray-500">{format(timestamp, 'HH:mm')}</p>
            {isAi && (
              <>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleCopy} 
                  className="h-6 w-6 p-0 hover:bg-white/10 rounded-lg"
                  title="Text kopieren"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-[#FE9100]" />
                  )}
                </Button>
                {onSpeak && (
                  <Button size="sm" variant="ghost" onClick={() => onSpeak(message)} className="h-6 w-6 p-0 hover:bg-white/10 rounded-lg" disabled={isSpeaking}>
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-[#FE9100]" /> : <Volume2 className="w-3.5 h-3.5 text-gray-400 hover:text-[#FE9100]" />}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}