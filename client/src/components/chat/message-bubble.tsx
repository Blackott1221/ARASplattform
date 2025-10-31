import { motion } from "framer-motion";
import { Bot, User, Volume2, VolumeX } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import arasAiImage from "@assets/ChatGPT Image 9. Apr. 2025_ 21_38_23_1754515368187.png";

// Client-side markdown removal function
const cleanMarkdown = (text: string): string => {
  let cleanText = text;
  
  // Aggressive markdown removal - multiple passes
  for (let i = 0; i < 5; i++) {
    cleanText = cleanText
      .replace(/\*\*(.*?)\*\*/g, '$1')      // Remove **bold**
      .replace(/\*(.*?)\*/g, '$1')          // Remove *italic*
      .replace(/__(.*?)__/g, '$1')          // Remove __underline__
      .replace(/_(.*?)_/g, '$1')            // Remove _underline_
      .replace(/`(.*?)`/g, '$1')            // Remove `code`
      .replace(/~~(.*?)~~/g, '$1')          // Remove ~~strikethrough~~
      .replace(/\*\*/g, '')                 // Remove any remaining **
      .replace(/\*/g, '')                   // Remove any remaining *
      .replace(/^\s*[\*\-\+]\s*/gm, '- ')   // Convert bullet points to dashes
      .replace(/^\s*\d+\.\s*/gm, '');       // Remove numbered lists
  }
  
  // Final cleanup - remove ALL asterisks
  cleanText = cleanText
    .replace(/\*/g, '')                     // Remove ALL asterisks
    .replace(/\*\*/g, '')                   // Remove ALL double asterisks
    .replace(/:\*([^*]*?)\*/g, ': $1')      // Remove asterisks around content after colons
    .replace(/\*([^*]*?):/g, '$1:')         // Remove asterisks before colons
    .replace(/\*:/g, ':')                   // Remove asterisks before colons
    .replace(/:\*/g, ':');                  // Remove asterisks after colons
    
  return cleanText;
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
}

export function MessageBubble({ message, isAi, timestamp, confidence, onReaction, messageId, onSpeak, isSpeaking }: MessageBubbleProps) {
  // Clean the message of all markdown formatting before rendering
  const cleanMessage = cleanMarkdown(message);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isAi ? 'justify-start' : 'justify-end'} mb-6 w-full`}
    >
      <div className={`flex items-start space-x-3 w-full max-w-[60%] ${isAi ? 'flex-row' : 'flex-row-reverse space-x-reverse'}`} style={{ maxWidth: '60%' }}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isAi 
            ? 'bg-transparent' 
            : 'bg-primary/20 border border-primary/30'
        }`}>
          {isAi ? (
            <img 
              src={arasAiImage} 
              alt="ARAS AI" 
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <User className="w-4 h-4 text-white" />
          )}
        </div>
        
        <div className={`flex flex-col ${isAi ? 'w-fit max-w-full' : 'w-fit max-w-full'}`}>
          {/* Message Bubble - Transparent with thin animated borders */}
          <div 
            className={`px-4 py-3 text-sm rounded-2xl transition-all duration-300 ${
              isAi 
                ? 'ai-message-glow text-foreground relative z-10 w-fit' 
                : 'user-message-glow text-foreground w-fit'
            }`}
            style={{
              maxWidth: '100%',
              wordWrap: 'break-word',
              overflowWrap: 'anywhere',
              whiteSpace: 'pre-wrap',
              hyphens: 'auto'
            }}
          >
            <div className={`leading-[1.6] space-y-3 break-words overflow-hidden text-wrap ${
              isAi ? 'text-foreground' : 'text-primary-foreground'
            }`}>
              {cleanMessage.split('\n\n').map((paragraph, paragraphIndex) => {
                const trimmedParagraph = paragraph.trim();
                if (!trimmedParagraph) return null;
                
                // Handle different content types
                const lines = trimmedParagraph.split('\n');
                const hasListItems = lines.some(line => 
                  line.trim().match(/^[\d]+\./) || 
                  line.trim().startsWith('- ') || 
                  line.trim().startsWith('• ')
                );
                
                if (hasListItems) {
                  return (
                    <div key={paragraphIndex} className="space-y-1">
                      {lines.map((line, lineIndex) => {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) return null;
                        
                        if (trimmedLine.match(/^[\d]+\./)) {
                          return (
                            <div key={lineIndex} className="flex items-start space-x-2 mt-2">
                              <span className="text-primary font-semibold text-sm mt-0.5 min-w-fit">
                                {trimmedLine.match(/^[\d]+\./)![0]}
                              </span>
                              <span className={`flex-1 break-words ${
                                isAi ? 'text-foreground' : 'text-primary-foreground'
                              }`}>{trimmedLine.replace(/^[\d]+\.\s*/, '')}</span>
                            </div>
                          );
                        }
                        
                        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
                          return (
                            <div key={lineIndex} className="flex items-start space-x-2">
                              <span className="text-primary mt-1 text-xs">•</span>
                              <span className={`flex-1 break-words ${
                                isAi ? 'text-foreground' : 'text-primary-foreground'
                              }`}>{trimmedLine.replace(/^[-•]\s*/, '')}</span>
                            </div>
                          );
                        }
                        
                        return (
                          <p key={lineIndex} className={`break-words whitespace-pre-wrap ${
                            isAi ? 'text-foreground' : 'text-primary-foreground'
                          }`}>
                            {trimmedLine}
                          </p>
                        );
                      })}
                    </div>
                  );
                }
                
                // Regular paragraph
                return (
                  <div key={paragraphIndex} className={`break-words ${
                    isAi ? 'text-foreground' : 'text-primary-foreground'
                  }`}>
                    {lines.map((line, lineIndex) => (
                      <p key={lineIndex} className="mb-1 last:mb-0 break-words whitespace-pre-wrap">
                        {line.trim() || '\u00A0'}
                      </p>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Enhanced Timestamp with Confidence and Reactions */}
          <div className={`flex items-center justify-between mt-1 px-2 ${
            isAi ? 'text-left' : 'text-right'
          }`}>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-muted-foreground">
                {format(timestamp, 'HH:mm')}
              </p>
              {confidence && isAi && (
                <span className="text-xs text-green-400">
                  {Math.round(confidence * 100)}% confident
                </span>
              )}
            </div>
            {isAi && (
              <div className="flex items-center space-x-1">
                {onSpeak && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onSpeak(cleanMessage)}
                    className="h-6 w-6 p-0 hover:bg-gray-700 opacity-70 hover:opacity-100"
                    disabled={isSpeaking}
                  >
                    {isSpeaking ? (
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        <VolumeX className="w-3 h-3 text-orange-400" />
                      </motion.div>
                    ) : (
                      <Volume2 className="w-3 h-3 text-gray-400" />
                    )}
                  </Button>
                )}
                {onReaction && messageId && (
                  <>
                    <button 
                      onClick={() => onReaction(messageId, '👍')}
                      className="text-xs hover:bg-gray-700 px-1 py-0.5 rounded opacity-70 hover:opacity-100"
                    >
                      👍
                    </button>
                    <button 
                      onClick={() => onReaction(messageId, '👎')}
                      className="text-xs hover:bg-gray-700 px-1 py-0.5 rounded opacity-70 hover:opacity-100"
                    >
                      👎
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}