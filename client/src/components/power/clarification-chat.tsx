import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Icons entfernt - nur Typografie & Flächen

const CI = {
  goldLight: '#E9D7C4',
  orange: '#FE9100',
  goldDark: '#A34E00'
};

interface Question {
  id: string;
  question: string;
  type: 'text' | 'date' | 'time' | 'choice';
  options?: string[];
  required: boolean;
  placeholder?: string;
}

interface Message {
  id: string;
  role: 'aras' | 'user';
  content: string;
  timestamp: Date;
}

interface UserProfileContext {
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  website?: string;
  industry?: string;
  jobRole?: string;
  phone?: string;
  aiProfile?: any;
}

interface CallSummary {
  outcome: string;
  bulletPoints: string[];
  nextStep: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  tags: string[];
}

interface ClarificationChatProps {
  questions: Question[];
  onAnswersComplete: (answers: Record<string, string>) => void;
  onSkip: () => void;
  initialMessage: string;
  userProfileContext?: UserProfileContext | null;
  callStatus?: 'idle' | 'processing' | 'ringing' | 'connected' | 'ended';
  callInProgressSummaryHint?: string;
  finalSummary?: CallSummary | null;
}

export function ClarificationChat({ 
  questions, 
  onAnswersComplete, 
  onSkip,
  initialMessage,
  userProfileContext,
  callStatus = 'idle',
  callInProgressSummaryHint,
  finalSummary
}: ClarificationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Disable input während Call läuft
  const isInputDisabled = callStatus === 'connected';

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Initial ARAS greeting
  useEffect(() => {
    setIsTyping(true);
    setTimeout(() => {
      // Build personalized greeting
      let greetingContent = `Perfekt! Ich habe Ihren Auftrag analysiert: "${initialMessage}"`;
      
      // Add profile info if available
      if (userProfileContext?.company) {
        greetingContent += `\n\n💼 Ich nutze dabei Ihr Firmenprofil (${userProfileContext.company}${userProfileContext.industry ? `, ${userProfileContext.industry}` : ''}) um das Gespräch optimal auf Ihre Zielgruppe abzustimmen.`;
      }
      
      greetingContent += `\n\nUm den Anruf optimal vorzubereiten, benötige ich noch ein paar Details. Lassen Sie uns das Schritt für Schritt durchgehen.`;
      
      setMessages([{
        id: 'greeting',
        role: 'aras',
        content: greetingContent,
        timestamp: new Date()
      }]);
      setIsTyping(false);
      
      // Show first question after greeting
      setTimeout(() => showNextQuestion(), 800);
    }, 1200);
  }, []);

  const showNextQuestion = () => {
    if (currentQuestionIndex >= questions.length) {
      // All questions answered
      handleComplete();
      return;
    }

    const question = questions[currentQuestionIndex];
    setIsTyping(true);
    
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: `question-${question.id}`,
        role: 'aras',
        content: question.question,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 600);
  };

  const handleSubmitAnswer = () => {
    const currentQuestion = questions[currentQuestionIndex];
    
    if (!inputValue.trim() && currentQuestion.required) {
      return;
    }

    // Add user message
    setMessages(prev => [...prev, {
      id: `answer-${currentQuestion.id}`,
      role: 'user',
      content: inputValue || '(übersprungen)',
      timestamp: new Date()
    }]);

    // Save answer
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: inputValue
    }));

    setInputValue('');
    setCurrentQuestionIndex(prev => prev + 1);

    // Show next question or complete
    setTimeout(() => {
      if (currentQuestionIndex + 1 >= questions.length) {
        handleComplete();
      } else {
        showNextQuestion();
      }
    }, 400);
  };

  const handleComplete = () => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: 'complete',
        role: 'aras',
        content: '✨ Perfekt! Ich habe alle Informationen. Der Anruf ist jetzt bereit zur Durchführung.',
        timestamp: new Date()
      }]);
      setIsTyping(false);
      
      setTimeout(() => {
        onAnswersComplete(answers);
      }, 1000);
    }, 600);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div 
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(16px)',
        minHeight: '500px',
        maxHeight: '600px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div 
        className="px-4 py-3 border-b"
        style={{
          borderColor: 'rgba(255,255,255,0.08)',
          background: 'linear-gradient(135deg, rgba(254,145,0,0.05), rgba(233,215,196,0.03))'
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="h-8 w-8 rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 30% 20%, rgba(254,145,0,0.85), rgba(10,10,10,0.1) 70%)',
              boxShadow: '0 0 16px rgba(254,145,0,0.35)',
              border: '1px solid rgba(233,215,196,0.25)'
            }}
          >
            <div className="h-2 w-2 rounded-full bg-white/60" />
          </div>
          <div>
            <h3 
              className="text-sm font-bold"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                background: `linear-gradient(90deg, ${CI.goldLight}, ${CI.orange})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              ARAS Klärungsdialog
            </h3>
            <p className="text-[11px] text-gray-400">Optimiert deinen Anruf in Echtzeit</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 premium-scroll">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex items-start gap-2 max-w-[85%]">
                {msg.role === 'aras' && (
                  <div 
                    className="mt-1 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'radial-gradient(circle, rgba(254,145,0,0.75), rgba(10,10,10,0.1) 65%)',
                      border: '1px solid rgba(233,215,196,0.2)'
                    }}
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-white/50" />
                  </div>
                )}
                
                <div
                  className="px-4 py-3 rounded-2xl"
                  style={msg.role === 'aras' ? {
                    background: 'linear-gradient(135deg, rgba(254,145,0,0.12), rgba(233,215,196,0.08))',
                    border: '1px solid rgba(254,145,0,0.25)',
                    boxShadow: '0 0 20px rgba(254,145,0,0.08)'
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(254,145,0,0.3)',
                    marginLeft: 'auto'
                  }}
                >
                  <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {msg.timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-2"
          >
            <div 
              className="mt-1 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'radial-gradient(circle, rgba(254,145,0,0.75), rgba(10,10,10,0.1) 65%)',
                border: '1px solid rgba(233,215,196,0.2)'
              }}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-white/50" />
            </div>
            <div 
              className="px-4 py-3 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(254,145,0,0.08), rgba(233,215,196,0.05))',
                border: '1px solid rgba(254,145,0,0.2)'
              }}
            >
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ background: CI.orange }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 🔥 Live Call Status */}
        {(callStatus === 'processing' || callStatus === 'ringing' || callStatus === 'connected') && (
          <motion.div
            className="flex items-start gap-2"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div
              className="px-4 py-3 rounded-2xl max-w-[80%]"
              style={{
                background: 'linear-gradient(135deg, rgba(254,145,0,0.10), rgba(233,215,196,0.06))',
                border: '1px solid rgba(254,145,0,0.25)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <p className="text-sm text-neutral-200">
                {callStatus === 'processing' && 'Ich bereite den Anruf gerade vor – einen Moment...'}
                {callStatus === 'ringing' && 'Ich stelle die Verbindung her – gleich ist ARAS am Telefon.'}
                {callStatus === 'connected' && (
                  callInProgressSummaryHint || 'Der Anruf läuft. Ich höre zu und bereite deine Zusammenfassung vor.'
                )}
              </p>
            </div>
          </motion.div>
        )}

        {/* 🎯 Final Summary after Call */}
        {callStatus === 'ended' && finalSummary && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-[90%]"
          >
            <div
              className="px-4 py-4 rounded-2xl max-w-[90%]"
              style={{
                background: 'rgba(12,12,12,0.95)',
                border: '1px solid rgba(233,215,196,0.25)',
                boxShadow: '0 0 18px rgba(0,0,0,0.8)'
              }}
            >
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500 mb-1">
                  Call-Zusammenfassung
                </div>
                <div className="text-sm font-semibold text-gray-200 mb-2">
                  {finalSummary.outcome}
                </div>
                {finalSummary.bulletPoints?.length > 0 && (
                  <ul className="space-y-1.5 text-xs text-gray-300">
                    {finalSummary.bulletPoints.slice(0, 3).map((bp, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="mt-1">•</span>
                        <span>{bp}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {finalSummary.nextStep && (
                  <p className="mt-2 text-xs text-gray-300 pt-2 border-t border-white/10">
                    <span className="font-semibold" style={{ color: CI.orange }}>→ Nächster Schritt:</span>{' '}
                    {finalSummary.nextStep}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      {currentQuestion && !isTyping && currentQuestionIndex < questions.length && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border-t"
          style={{
            borderColor: 'rgba(255,255,255,0.08)',
            background: 'rgba(0,0,0,0.3)'
          }}
        >
          {currentQuestion.type === 'choice' && currentQuestion.options ? (
            <div className="space-y-2">
              {currentQuestion.options.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setInputValue(option);
                    setTimeout(handleSubmitAnswer, 100);
                  }}
                  className="w-full px-4 py-3 rounded-xl text-left text-sm transition-all hover:scale-[1.02]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(254,145,0,0.08)';
                    e.currentTarget.style.borderColor = CI.orange;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isInputDisabled && handleSubmitAnswer()}
                  placeholder={currentQuestion.placeholder || 'Ihre Antwort...'}
                  disabled={isInputDisabled}
                  className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)'
                  }}
                  onFocus={(e) => {
                    if (!isInputDisabled) {
                      e.currentTarget.style.borderColor = CI.orange;
                      e.currentTarget.style.boxShadow = `0 0 0 3px rgba(254,145,0,0.1)`;
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  autoFocus={!isInputDisabled}
                />
                <button
                  onClick={handleSubmitAnswer}
                  disabled={(!inputValue.trim() && currentQuestion.required) || isInputDisabled}
                  className="px-5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 flex items-center gap-2"
                  style={{
                    background: (!inputValue.trim() && currentQuestion.required) || isInputDisabled
                      ? 'rgba(100,100,100,0.3)'
                      : `linear-gradient(135deg, ${CI.orange}, ${CI.goldDark})`,
                    color: '#fff',
                    fontFamily: 'Orbitron, sans-serif'
                  }}
                >
                  {isLastQuestion ? '✓' : '→'}
                </button>
              </div>
              {isInputDisabled && (
                <p className="mt-2 text-[10px] text-gray-500">
                  Während des laufenden Gesprächs kannst du hier nichts eingeben. 
                  Sobald der Call beendet ist, bekommst du die Zusammenfassung.
                </p>
              )}
            </div>
          )}

          {!currentQuestion.required && (
            <button
              onClick={() => {
                setInputValue('');
                handleSubmitAnswer();
              }}
              className="mt-2 text-[11px] text-gray-400 hover:text-gray-300 transition-colors"
            >
              Frage überspringen
            </button>
          )}
        </motion.div>
      )}

      {/* Skip All Button */}
      <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <button
          onClick={onSkip}
          className="w-full py-2 rounded-xl text-xs font-medium transition-all"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#9ca3af'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(254,145,0,0.05)';
            e.currentTarget.style.borderColor = 'rgba(254,145,0,0.3)';
            e.currentTarget.style.color = CI.orange;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = '#9ca3af';
          }}
        >
          Alle Fragen überspringen & sofort anrufen
        </button>
      </div>
    </div>
  );
}
