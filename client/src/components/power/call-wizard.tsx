import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Settings, Sparkles, Phone, ArrowRight, ArrowLeft, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  question: string;
  type: 'text' | 'date' | 'time' | 'choice';
  options?: string[];
  required: boolean;
  placeholder?: string;
}

interface CallWizardProps {
  contactName: string;
  phoneNumber: string;
  initialMessage: string;
  onCallReady: (enhancedData: any) => void;
  onCancel: () => void;
}

const CI = {
  orange: '#FE9100',
  goldLight: '#E9D7C4',
  goldDark: '#A34E00'
};

export function CallWizard({ 
  contactName, 
  phoneNumber, 
  initialMessage, 
  onCallReady,
  onCancel 
}: CallWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'validating' | 'questions' | 'settings' | 'review'>('validating');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState({
    tone: 'freundlich',
    urgency: 'mittel',
    maxDuration: 180
  });
  const [finalPrompt, setFinalPrompt] = useState<string>('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    validatePrompt();
  }, []);

  const validatePrompt = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/aras-voice/validate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: initialMessage,
          contactName,
          answers
        })
      });

      if (!response.ok) {
        throw new Error('Validierung fehlgeschlagen');
      }

      const result = await response.json();
      setValidationResult(result);

      if (result.isComplete) {
        setFinalPrompt(result.enhancedPrompt);
        setSettings(result.suggestedSettings || settings);
        setStep('settings');
      } else {
        setStep('questions');
      }
    } catch (error: any) {
      toast({
        title: 'Validierung fehlgeschlagen',
        description: error.message,
        variant: 'destructive'
      });
      onCancel();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerComplete = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/aras-voice/validate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: initialMessage,
          contactName,
          answers
        })
      });

      if (!response.ok) {
        throw new Error('Validierung fehlgeschlagen');
      }

      const result = await response.json();
      
      if (result.isComplete) {
        setFinalPrompt(result.enhancedPrompt);
        setSettings(result.suggestedSettings || settings);
        setStep('settings');
      } else {
        toast({
          title: 'Weitere Informationen benötigt',
          description: 'Bitte beantworten Sie alle erforderlichen Fragen',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsComplete = () => {
    setStep('review');
  };

  const handleStartCall = () => {
    onCallReady({
      enhancedPrompt: finalPrompt,
      settings,
      answers,
      contactName,
      phoneNumber
    });
  };

  if (step === 'validating' || loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center"
      >
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: CI.orange }} />
          <h3 className="text-xl font-bold text-white mb-2">Analysiere Anfrage...</h3>
          <p className="text-gray-400 text-sm">Gemini 2.5 Flash prüft die Vollständigkeit</p>
        </div>
      </motion.div>
    );
  }

  if (step === 'questions' && validationResult) {
    const allRequiredAnswered = validationResult.questions
      ?.filter((q: Question) => q.required)
      .every((q: Question) => answers[q.id]?.trim());

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-2xl w-full my-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">Zusätzliche Informationen benötigt</h2>
              <p className="text-gray-400 text-sm">
                {validationResult.detectedIntent || 'Bitte vervollständigen Sie Ihre Anfrage'}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {validationResult.missingInfo && validationResult.missingInfo.length > 0 && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <h4 className="text-sm font-bold text-red-400 mb-2">Fehlende Informationen:</h4>
              <ul className="space-y-1">
                {validationResult.missingInfo.map((info: string, idx: number) => (
                  <li key={idx} className="text-xs text-red-300">• {info}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-5 mb-8">
            {validationResult.questions?.map((question: Question, idx: number) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="space-y-2"
              >
                <label className="block text-sm font-medium text-white">
                  {question.question}
                  {question.required && <span className="text-red-400 ml-1">*</span>}
                </label>

                {question.type === 'text' && (
                  <input
                    type="text"
                    value={answers[question.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                    placeholder={question.placeholder || 'Ihre Antwort...'}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#fe9100] transition-colors"
                  />
                )}

                {question.type === 'date' && (
                  <input
                    type="date"
                    value={answers[question.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-[#fe9100] transition-colors"
                  />
                )}

                {question.type === 'time' && (
                  <input
                    type="time"
                    value={answers[question.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-[#fe9100] transition-colors"
                  />
                )}

                {question.type === 'choice' && question.options && (
                  <select
                    value={answers[question.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-[#fe9100] transition-colors"
                  >
                    <option value="">Bitte wählen...</option>
                    {question.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </motion.div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleAnswerComplete}
              disabled={!allRequiredAnswered || loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#fe9100] to-[#ff6b00] hover:from-[#ff6b00] hover:to-[#fe9100] text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Weiter <ArrowRight className="w-5 h-5" /></>}
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (step === 'settings') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-2xl w-full my-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Settings className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">Anruf-Einstellungen</h2>
              <p className="text-gray-400 text-sm">Passen Sie das Gesprächsverhalten an</p>
            </div>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-white mb-3">Tonalität des Gesprächs</label>
              <div className="grid grid-cols-2 gap-3">
                {['formal', 'freundlich', 'neutral', 'direkt'].map((tone) => (
                  <button
                    key={tone}
                    onClick={() => setSettings({ ...settings, tone })}
                    className={`px-4 py-3 rounded-xl font-medium transition-all capitalize ${
                      settings.tone === tone
                        ? 'bg-[#fe9100] text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-3">Dringlichkeit</label>
              <div className="grid grid-cols-3 gap-3">
                {['niedrig', 'mittel', 'hoch'].map((urgency) => (
                  <button
                    key={urgency}
                    onClick={() => setSettings({ ...settings, urgency })}
                    className={`px-4 py-3 rounded-xl font-medium transition-all capitalize ${
                      settings.urgency === urgency
                        ? 'bg-[#fe9100] text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-3">
                Maximale Gesprächsdauer: {Math.floor(settings.maxDuration / 60)}:{(settings.maxDuration % 60).toString().padStart(2, '0')} Min
              </label>
              <input
                type="range"
                min="60"
                max="600"
                step="30"
                value={settings.maxDuration}
                onChange={(e) => setSettings({ ...settings, maxDuration: parseInt(e.target.value) })}
                className="w-full accent-[#fe9100]"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 Min</span>
                <span>10 Min</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('questions')}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" /> Zurück
            </button>
            <button
              onClick={handleSettingsComplete}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#fe9100] to-[#ff6b00] hover:from-[#ff6b00] hover:to-[#fe9100] text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              Weiter <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (step === 'review') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-3xl w-full my-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">Anruf bereit!</h2>
              <p className="text-gray-400 text-sm">Überprüfen Sie den optimierten Anruf-Prompt</p>
            </div>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800/50 rounded-xl">
              <div className="text-xs text-gray-500 mb-1">Kontakt</div>
              <div className="text-white font-medium">{contactName}</div>
              <div className="text-gray-400 text-sm">{phoneNumber}</div>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-xl">
              <div className="text-xs text-gray-500 mb-1">Einstellungen</div>
              <div className="text-white text-sm capitalize">
                {settings.tone} • {settings.urgency} • {Math.floor(settings.maxDuration / 60)} Min
              </div>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#fe9100]" />
              KI-Optimierter Anruf-Prompt
            </label>
            <div className="p-5 bg-gradient-to-br from-[#fe9100]/10 to-transparent border border-[#fe9100]/20 rounded-xl max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                {finalPrompt}
              </pre>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('settings')}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" /> Zurück
            </button>
            <button
              onClick={handleStartCall}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-lg"
            >
              <Phone className="w-5 h-5" />
              Jetzt anrufen
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return null;
}
