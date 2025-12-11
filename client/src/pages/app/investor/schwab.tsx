import { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { TrendingUp, Shield, Sparkles, MessageCircle, Phone } from "lucide-react";

const TOKEN_PRICE = 0.12;
const BONUS_BASE = 0.15;
const EXTRA_THRESHOLD = 125000;
const EXTRA_BONUS = 0.05;
const PRICE_CURRENT = 0.57;
const PRICE_TARGET = 1.14;

const formatEUR = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatToken = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatMultiplier = (value: number) => {
  return value.toFixed(1) + "x";
};

function useAnimatedNumber(target: number) {
  const [current, setCurrent] = useState(target);
  useEffect(() => {
    const timer = setTimeout(() => setCurrent(target), 50);
    return () => clearTimeout(timer);
  }, [target]);
  return current;
}

export default function InvestorSchwabPage() {
  const [investmentEUR, setInvestmentEUR] = useState(50000);

  const baseTokens = investmentEUR / TOKEN_PRICE;
  const bonusTokens15 = baseTokens * BONUS_BASE;
  let bonusTokensExtra5 = 0;
  if (investmentEUR > EXTRA_THRESHOLD) {
    const extraAmount = investmentEUR - EXTRA_THRESHOLD;
    const extraTokens = extraAmount / TOKEN_PRICE;
    bonusTokensExtra5 = extraTokens * EXTRA_BONUS;
  }
  const totalTokens = baseTokens + bonusTokens15 + bonusTokensExtra5;
  const valueNow = totalTokens * PRICE_CURRENT;
  const valueTarget = totalTokens * PRICE_TARGET;
  const roiNow = investmentEUR > 0 ? valueNow / investmentEUR : 0;
  const roiTarget = investmentEUR > 0 ? valueTarget / investmentEUR : 0;

  const scenarios = [
    { label: "Konservativ", price: 0.78, color: "border-blue-500/30" },
    { label: "Realistisch", price: 1.14, color: "border-[#FE9100]/50" },
    { label: "Ambitioniert", price: 2.20, color: "border-green-500/30" }
  ];

  return (
    <div className="min-h-screen bg-[#020309] text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{backgroundImage: "radial-gradient(circle at 50% 50%, rgba(254,145,0,0.03) 0%, transparent 50%)"}} />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#FE9100] opacity-[0.02] blur-[150px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#E9D7C4] opacity-[0.02] blur-[100px] rounded-full" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-16">
        
        <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="inline-block px-4 py-2 rounded-full mb-6" style={{background: 'rgba(254, 145, 0, 0.1)', border: '1px solid rgba(254, 145, 0, 0.3)'}}>
                <span className="text-xs font-bold text-[#FE9100] uppercase tracking-wider">Private Allocation</span>
              </motion.div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight" style={{fontFamily: 'Orbitron, sans-serif', background: 'linear-gradient(135deg, #E9D7C4, #FE9100, #FFD700)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
                Christian, Ihre Position in ARAS hat sich vervielfacht.
              </h1>
              <div className="space-y-3 text-lg text-white/70 mb-8">
                <p className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-white/50">Einstieg zu</span>
                  <motion.span className="text-2xl md:text-3xl font-bold text-white" style={{fontFamily: 'Orbitron, sans-serif'}} animate={{textShadow: ['0 0 10px rgba(254,145,0,0.3)', '0 0 20px rgba(254,145,0,0.5)', '0 0 10px rgba(254,145,0,0.3)']}} transition={{duration: 2, repeat: Infinity}}>0,12 EUR</motion.span>
                </p>
                <p className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-white/50">Heute:</span>
                  <span className="text-2xl md:text-3xl font-bold text-[#FE9100]" style={{fontFamily: 'Orbitron, sans-serif'}}>0,57 EUR</span>
                </p>
                <p className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-white/50">Erwartung nach Go-Live:</span>
                  <span className="text-2xl md:text-3xl font-bold text-[#FFD700]" style={{fontFamily: 'Orbitron, sans-serif'}}>1,14 EUR+</span>
                </p>
              </div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="p-4 rounded-xl" style={{background: 'rgba(254, 145, 0, 0.05)', border: '1px solid rgba(254, 145, 0, 0.2)'}}>
                <p className="text-sm text-white/80 italic">Dies ist Ihre letzte exklusive Direktzuteilung vor dem DEX-Listing.</p>
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="rounded-2xl p-8" style={{background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', border: '1px solid rgba(254, 145, 0, 0.2)', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)'}}>
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-[#FE9100]" />
                <h3 className="text-xl font-bold" style={{fontFamily: 'Orbitron, sans-serif'}}>Private Allocation</h3>
              </div>
              <p className="text-xl md:text-2xl font-bold text-white mb-6" style={{fontFamily: 'Orbitron, sans-serif'}}>Only for Christian Schwab</p>
              <div className="space-y-4">
                <div className="flex items-start gap-3"><div className="w-2 h-2 rounded-full bg-[#FE9100] mt-2 shrink-0" /><p className="text-sm text-white/70">Letzte Direktzuteilung vor dem DEX-Listing</p></div>
                <div className="flex items-start gap-3"><div className="w-2 h-2 rounded-full bg-[#FE9100] mt-2 shrink-0" /><p className="text-sm text-white/70"><span className="text-[#FE9100] font-bold">+15 % Bonus-Token</span> auf jede Nachzeichnung</p></div>
                <div className="flex items-start gap-3"><div className="w-2 h-2 rounded-full bg-[#FE9100] mt-2 shrink-0" /><p className="text-sm text-white/70">Zuteilung nur zum historischen Preis von <span className="text-white font-bold">0,12 EUR</span></p></div>
              </div>
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Deadline</p>
                <p className="text-lg font-bold text-[#FE9100]" style={{fontFamily: 'Orbitron, sans-serif'}}>Freitag, 13. Dezember 2024</p>
              </div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-20">
          <div className="rounded-2xl p-6 md:p-8" style={{background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)'}}>
            <p className="text-sm text-white/50 uppercase tracking-wider mb-8">Ihre Preisreise</p>
            <div className="relative">
              <div className="absolute top-6 left-0 right-0 h-[2px] bg-gradient-to-r from-[#E9D7C4] via-[#FE9100] to-[#FFD700] hidden md:block" />
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-0">
                <div className="flex flex-col items-center text-center">
                  <motion.div animate={{boxShadow: ['0 0 20px rgba(233,215,196,0.3)', '0 0 30px rgba(233,215,196,0.5)', '0 0 20px rgba(233,215,196,0.3)']}} transition={{duration: 2, repeat: Infinity}} className="w-12 h-12 rounded-full bg-[#E9D7C4] flex items-center justify-center mb-4"><TrendingUp className="w-6 h-6 text-black" /></motion.div>
                  <p className="text-xs text-white/50 mb-1">Einstiegspreis</p>
                  <p className="text-xl md:text-2xl font-bold text-white" style={{fontFamily: 'Orbitron, sans-serif'}}>0,12 EUR</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <motion.div animate={{boxShadow: ['0 0 20px rgba(254,145,0,0.4)', '0 0 40px rgba(254,145,0,0.6)', '0 0 20px rgba(254,145,0,0.4)']}} transition={{duration: 2, repeat: Infinity}} className="w-12 h-12 rounded-full bg-[#FE9100] flex items-center justify-center mb-4"><Sparkles className="w-6 h-6 text-black" /></motion.div>
                  <p className="text-xs text-white/50 mb-1">aktuell</p>
                  <p className="text-xl md:text-2xl font-bold text-[#FE9100]" style={{fontFamily: 'Orbitron, sans-serif'}}>0,57 EUR</p>
                  <div className="mt-2 px-3 py-1 rounded-full bg-[#FE9100]/20 border border-[#FE9100]/30"><span className="text-xs font-bold text-[#FE9100]">4,75x</span></div>
                </div>
                <div className="flex flex-col items-center text-center">
                  <motion.div animate={{boxShadow: ['0 0 20px rgba(255,215,0,0.4)', '0 0 40px rgba(255,215,0,0.6)', '0 0 20px rgba(255,215,0,0.4)']}} transition={{duration: 2, repeat: Infinity}} className="w-12 h-12 rounded-full bg-[#FFD700] flex items-center justify-center mb-4"><TrendingUp className="w-6 h-6 text-black" /></motion.div>
                  <p className="text-xs text-white/50 mb-1">Zielband nach Launch</p>
                  <p className="text-xl md:text-2xl font-bold text-[#FFD700]" style={{fontFamily: 'Orbitron, sans-serif'}}>1,14 EUR+</p>
                  <div className="mt-2 px-3 py-1 rounded-full bg-[#FFD700]/20 border border-[#FFD700]/30"><span className="text-xs font-bold text-[#FFD700]">9,5x+</span></div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-20">
          <div className="rounded-2xl p-6 md:p-12" style={{background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', border: '1px solid rgba(254, 145, 0, 0.2)', boxShadow: '0 20px 60px rgba(254, 145, 0, 0.1)'}}>
            <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{fontFamily: 'Orbitron, sans-serif'}}>Ihre Nachzeichnung - live berechnet</h2>
            <p className="text-white/60 mb-8">Sehen Sie in Echtzeit, wie sich Ihr Investment entwickeln kann.</p>
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12">
              <div>
                <label className="block text-sm font-bold text-white/70 mb-3 uppercase tracking-wider">Geplantes Investment (EUR)</label>
                <input type="number" value={investmentEUR} onChange={(e) => setInvestmentEUR(Number(e.target.value) || 0)} placeholder="z.B. 50.000" className="w-full px-6 py-4 rounded-xl text-xl md:text-2xl font-bold bg-black/40 border border-white/10 focus:border-[#FE9100] focus:outline-none transition-colors" style={{fontFamily: 'Orbitron, sans-serif'}} />
                <div className="mt-6 space-y-3 text-sm text-white/60">
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#FE9100]" /><span>Preis pro Token: <span className="text-white font-bold">0,12 EUR</span></span></div>
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#FE9100]" /><span><span className="text-[#FE9100] font-bold">+15 % Bonus-Token</span> auf das gesamte Investment</span></div>
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" /><span><span className="text-[#FFD700] font-bold">+5 % Zusatzbonus</span> auf den Teil ueber 125.000 EUR</span></div>
                </div>
                {investmentEUR > EXTRA_THRESHOLD && (<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 p-4 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/30"><p className="text-sm text-[#FFD700] font-bold">Zusatzbonus aktiviert! Sie erhalten +5% auf {formatEUR(investmentEUR - EXTRA_THRESHOLD)}</p></motion.div>)}
              </div>
              <div className="space-y-4 md:space-y-6">
                <motion.div key={totalTokens} initial={{ scale: 0.98 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }} className="p-4 md:p-6 rounded-xl" style={{background: 'linear-gradient(135deg, rgba(254,145,0,0.1), rgba(233,215,196,0.05))', border: '1px solid rgba(254, 145, 0, 0.3)'}}>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Total Token (inkl. Bonus)</p>
                  <p className="text-3xl md:text-4xl font-black text-white" style={{fontFamily: 'Orbitron, sans-serif'}}>{formatToken(totalTokens)} ARAS</p>
                </motion.div>
                <div className="p-4 md:p-6 rounded-xl bg-black/40 border border-white/10">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Wert bei 0,57 EUR</p>
                  <p className="text-2xl md:text-3xl font-bold text-[#FE9100]" style={{fontFamily: 'Orbitron, sans-serif'}}>{formatEUR(valueNow)}</p>
                  <p className="text-sm text-white/60 mt-2">Multiplikator: <span className="text-[#FE9100] font-bold">{formatMultiplier(roiNow)}</span></p>
                </div>
                <div className="p-4 md:p-6 rounded-xl bg-black/40 border border-white/10">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Wert bei 1,14 EUR</p>
                  <p className="text-2xl md:text-3xl font-bold text-[#FFD700]" style={{fontFamily: 'Orbitron, sans-serif'}}>{formatEUR(valueTarget)}</p>
                  <p className="text-sm text-white/60 mt-2">Multiplikator: <span className="text-[#FFD700] font-bold">{formatMultiplier(roiTarget)}</span></p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-20">
          <h3 className="text-xl md:text-2xl font-bold mb-8 text-center" style={{fontFamily: 'Orbitron, sans-serif'}}>Was waere wenn...?</h3>
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {scenarios.map((scenario, idx) => {
              const valueScenario = totalTokens * scenario.price;
              const roiScenario = investmentEUR > 0 ? valueScenario / investmentEUR : 0;
              return (
                <motion.div key={scenario.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} whileHover={{ scale: 1.02, y: -5 }} className={`p-4 md:p-6 rounded-xl cursor-pointer transition-all bg-black/40 border ${scenario.color}`} style={{backdropFilter: 'blur(10px)'}}>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-2">{scenario.label}</p>
                  <p className="text-xl md:text-2xl font-bold text-white mb-4" style={{fontFamily: 'Orbitron, sans-serif'}}>{scenario.price.toFixed(2)} EUR</p>
                  <div className="space-y-2 text-sm">
                    <p className="text-white/70">Wert Ihrer Position: <span className="text-white font-bold">{formatEUR(valueScenario)}</span></p>
                    <p className="text-white/70">Multiplikator: <span className="text-white font-bold">{formatMultiplier(roiScenario)}</span></p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-20">
          <div className="rounded-2xl p-6 md:p-12 relative overflow-hidden" style={{background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', border: '1px solid rgba(233, 215, 196, 0.2)'}}>
            <motion.div className="absolute top-0 left-0 right-0 h-[2px]" style={{background: 'linear-gradient(90deg, #E9D7C4, #FE9100, #FFD700, #FE9100, #E9D7C4)', backgroundSize: '200% 100%'}} animate={{backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']}} transition={{duration: 8, repeat: Infinity, ease: 'linear'}} />
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-base md:text-lg leading-relaxed text-white/80 mb-6">Lieber Herr Schwab,</p>
              <p className="text-base md:text-lg leading-relaxed text-white/80 mb-6">Sie sind einer der ersten Investoren, die uns auf diesem Weg begleitet haben. Wir haben die Zuteilung fuer Sie bis Freitag verlaengert - ausschliesslich zu Ihrem historischen Einstiegspreis von 0,12 EUR und mit einem zusaetzlichen Bonus auf jede Nachzeichnung.</p>
              <p className="text-base md:text-lg leading-relaxed text-white/80 mb-6">Einige Investoren waehlen aktuell bewusst den Weg, die Zahlung erst im naechsten Geschaeftsjahr zu leisten - die Token werden trotzdem unmittelbar nach Vertragsunterzeichnung uebertragen.</p>
              <p className="text-base md:text-lg leading-relaxed text-white/80 mb-8">Wenn Sie diese Position vor dem offiziellen Marktstart noch einmal gezielt ausbauen moechten, uebernehmen wir die gesamte Abwicklung fuer Sie - schnell, sauber und transparent.</p>
              <div className="pt-6 border-t border-white/10">
                <p className="text-white/60 mb-2">- Justin Schwarzott</p>
                <p className="text-sm text-white/50">Verwaltungsratspraesident - Schwarzott Capital Partners AG</p>
                <p className="text-sm text-[#FE9100] font-bold" style={{fontFamily: 'Orbitron, sans-serif'}}>Founder ARAS AI</p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-20">
          <div className="rounded-2xl p-6 md:p-12 text-center" style={{background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(20px)', border: '1px solid rgba(254, 145, 0, 0.3)'}}>
            <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{fontFamily: 'Orbitron, sans-serif'}}>Wie viel moechten Sie nachzeichnen?</h2>
            <p className="text-white/60 mb-8">Eine kurze Zahl und ein Ja - alles Weitere uebernehmen wir.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => console.log('WhatsApp clicked')} className="relative px-6 md:px-8 py-4 rounded-xl font-bold text-sm md:text-base overflow-hidden group" style={{fontFamily: 'Orbitron, sans-serif'}}>
                <span className="absolute inset-0 rounded-xl p-[2px]" style={{background: 'linear-gradient(90deg, #FE9100, #FFD700, #FE9100)', backgroundSize: '200% 100%', animation: 'borderRun 3s linear infinite'}} />
                <span className="relative flex items-center justify-center gap-2 bg-[#020309] rounded-xl px-6 md:px-8 py-4"><MessageCircle className="w-5 h-5" />Betrag per WhatsApp senden</span>
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => console.log('Callback clicked')} className="relative px-6 md:px-8 py-4 rounded-xl font-bold text-sm md:text-base overflow-hidden group" style={{fontFamily: 'Orbitron, sans-serif'}}>
                <span className="absolute inset-0 rounded-xl p-[1px]" style={{background: 'linear-gradient(90deg, rgba(255,255,255,0.3), rgba(254,145,0,0.5), rgba(255,255,255,0.3))', backgroundSize: '200% 100%', animation: 'borderRun 4s linear infinite'}} />
                <span className="relative flex items-center justify-center gap-2 bg-[#020309] rounded-xl px-6 md:px-8 py-4"><Phone className="w-5 h-5" />Rueckruf anfragen</span>
              </motion.button>
            </div>
          </div>
        </motion.section>

        <style dangerouslySetInnerHTML={{__html: `@keyframes borderRun { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }`}} />
      </div>
    </div>
  );
}
