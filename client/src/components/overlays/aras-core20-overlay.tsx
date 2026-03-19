import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CSS = [
  '@keyframes a20s{0%{background-position:-200% center}100%{background-position:200% center}}',
  '@keyframes a20g{0%,100%{box-shadow:0 0 30px rgba(254,145,0,0.06),0 0 60px rgba(254,145,0,0.03)}50%{box-shadow:0 0 50px rgba(254,145,0,0.12),0 0 100px rgba(254,145,0,0.05)}}',
  '@keyframes a20d{0%,100%{opacity:1;box-shadow:0 0 8px rgba(254,145,0,0.9)}50%{opacity:0.3;box-shadow:0 0 4px rgba(254,145,0,0.3)}}',
  '@keyframes a20b{0%{opacity:0.12}50%{opacity:0.32}100%{opacity:0.12}}',
  '@keyframes a20btn{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}',
  '.a20-ghost:hover{border-color:rgba(254,145,0,0.25)!important;color:rgba(233,215,196,0.65)!important}',
].join('');
if(typeof document!=='undefined'&&!document.getElementById('a20c')){const s=document.createElement('style');s.id='a20c';s.textContent=CSS;document.head.appendChild(s);}

const K='aras:core20:';
interface P{userId?:string;onDecision?:(a:boolean)=>void}

export function ArasCore20Overlay({userId,onDecision}:P){
  const[open,setOpen]=useState(false);
  const[show,setShow]=useState(false);
  const[p,setP]=useState(0);

  useEffect(()=>{if(!userId||localStorage.getItem(K+userId))return;setShow(true);requestAnimationFrame(()=>setOpen(true))},[userId]);
  useEffect(()=>{if(!open)return;const a=setTimeout(()=>setP(1),400);const b=setTimeout(()=>setP(2),800);const c=setTimeout(()=>setP(3),1200);return()=>{clearTimeout(a);clearTimeout(b);clearTimeout(c)}},[open]);
  useEffect(()=>{if(!open)return;const v=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=v}},[open]);

  const go=useCallback((ok:boolean)=>{if(userId)localStorage.setItem(K+userId,ok?'yes':'no');onDecision?.(ok);setOpen(false);setTimeout(()=>setShow(false),600)},[userId,onDecision]);

  if(!show)return null;

  return(<AnimatePresence>{open&&(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.4}} className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6" style={{background:'#0a0a0a'}}>
      <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(1200px 500px at 18% 10%,rgba(254,145,0,0.08),transparent 62%),radial-gradient(800px 400px at 86% 18%,rgba(233,215,196,0.05),transparent 64%),radial-gradient(600px 300px at 50% 90%,rgba(163,78,0,0.06),transparent 70%)'}}/>
      <div className="absolute inset-0 pointer-events-none" style={{backdropFilter:'blur(40px)'}}/>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`}}/>

      <motion.div initial={{scale:0.96,opacity:0}} animate={p>=1?{scale:1,opacity:1}:{scale:0.96,opacity:0}} transition={{type:'spring',stiffness:260,damping:28}} className="relative w-full max-w-[520px] z-10" style={{animation:p>=1?'a20g 4s ease-in-out infinite':'none'}}>
        <div className="absolute -inset-px rounded-[21px] pointer-events-none" style={{background:'linear-gradient(135deg,rgba(254,145,0,0.3),rgba(233,215,196,0.1),rgba(254,145,0,0.2))',animation:'a20b 3s ease-in-out infinite'}}/>
        <div className="relative rounded-[20px] p-7 sm:p-8 overflow-hidden" style={{background:'linear-gradient(135deg,rgba(254,145,0,0.08),rgba(255,255,255,0.01))',border:'1px solid rgba(254,145,0,0.2)',boxShadow:'0 18px 60px rgba(0,0,0,0.4)'}}>
          <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(400px 200px at 50% 0%,rgba(254,145,0,0.06),transparent 70%)'}}/>

          <div className="relative text-center mb-6">
            <motion.div initial={{opacity:0}} animate={p>=2?{opacity:1}:{opacity:0}} transition={{duration:0.4}} className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full mb-5" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(233,215,196,0.12)'}}>
              <div className="w-1.5 h-1.5 rounded-full" style={{background:'#FE9100',animation:'a20d 2s ease-in-out infinite',boxShadow:'0 0 6px #FE9100'}}/>
              <span style={{fontFamily:'Orbitron,sans-serif',letterSpacing:'0.2em',color:'#E9D7C4',fontSize:10,fontWeight:700,textTransform:'uppercase'}}>System Update</span>
            </motion.div>

            <motion.h1 initial={{opacity:0,y:8}} animate={p>=2?{opacity:1,y:0}:{opacity:0,y:8}} transition={{duration:0.5}} style={{fontFamily:'Orbitron,sans-serif',letterSpacing:'0.04em',background:'linear-gradient(90deg,#e9d7c4,#FE9100,#a34e00,#FE9100,#e9d7c4)',backgroundSize:'200% auto',backgroundClip:'text',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',animation:p>=2?'a20s 5s linear infinite':'none',fontSize:'clamp(20px,5vw,26px)',fontWeight:900,lineHeight:1.2,marginBottom:16}}>
              ARAS Core 2.0 PRO<br/><span style={{fontSize:'0.72em',letterSpacing:'0.08em'}}>is now online</span>
            </motion.h1>

            <motion.div initial={{scaleX:0}} animate={p>=2?{scaleX:1}:{scaleX:0}} transition={{duration:0.6}} className="h-px w-20 mx-auto mb-5" style={{background:'linear-gradient(90deg,transparent,rgba(254,145,0,0.5),transparent)'}}/>

            <motion.div initial={{opacity:0}} animate={p>=2?{opacity:1}:{opacity:0}} transition={{duration:0.5}} className="space-y-1">
              {['Mehr Echtheit der Stimme.','Natürlicherer Gesprächsfluss.','Tiefere kontextuelle Intelligenz.'].map((t,i)=>(
                <motion.p key={i} initial={{opacity:0,x:-8}} animate={p>=2?{opacity:1,x:0}:{opacity:0,x:-8}} transition={{duration:0.4,delay:i*0.12}} style={{fontFamily:'Inter,sans-serif',color:'rgba(233,215,196,0.7)',fontSize:13,lineHeight:'1.6'}}>{t}</motion.p>
              ))}
            </motion.div>
          </div>

          <motion.div initial={{opacity:0,y:10}} animate={p>=2?{opacity:1,y:0}:{opacity:0,y:10}} transition={{duration:0.5,delay:0.2}} className="relative rounded-[14px] p-5 sm:p-6 mb-7" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(233,215,196,0.12)'}}>
            <div className="absolute inset-0 rounded-[14px] pointer-events-none" style={{background:'radial-gradient(300px 150px at 50% 20%,rgba(254,145,0,0.04),transparent 70%)'}}/>
            <div className="relative flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'rgba(254,145,0,0.08)',border:'1px solid rgba(254,145,0,0.2)'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FE9100" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44H7A2.5 2.5 0 0 1 4.5 17.5V15"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44H17a2.5 2.5 0 0 0 2.5-2.44V15"/><path d="M3 10h4"/><path d="M17 10h4"/><path d="M12 2v2"/><path d="M12 20v2"/></svg>
              </div>
              <h3 style={{fontFamily:'Orbitron,sans-serif',letterSpacing:'0.18em',color:'#E9D7C4',fontSize:11,fontWeight:700,textTransform:'uppercase'}}>ARAS Langzeitgedächtnis</h3>
            </div>
            <p className="relative" style={{fontFamily:'Inter,sans-serif',color:'rgba(233,215,196,0.55)',fontSize:13,lineHeight:'1.7'}}>ARAS verwendet alle Informationen aus der Unternehmensanalyse, um Gespräche kontinuierlich zu verbessern, Entscheidungsfindung zu optimieren und kontextuelles Verständnis zu vertiefen.</p>
          </motion.div>

          <motion.div initial={{opacity:0,y:14}} animate={p>=3?{opacity:1,y:0}:{opacity:0,y:14}} transition={{type:'spring',stiffness:200,damping:24}} className="relative flex flex-col sm:flex-row items-center gap-3">
            <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={()=>go(true)} className="relative w-full sm:flex-1 group overflow-hidden rounded-xl py-3.5 px-6 font-semibold text-[13px] uppercase tracking-[0.12em]" style={{fontFamily:'Inter,sans-serif',background:'linear-gradient(135deg,#FE9100,#A34E00)',color:'#0a0a0a',boxShadow:'0 4px 24px rgba(254,145,0,0.25)',transition:'box-shadow 0.3s'}}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{boxShadow:'inset 0 0 30px rgba(255,255,255,0.1),0 8px 40px rgba(254,145,0,0.4)'}}/>
              <span className="relative z-10">Gedächtnis aktivieren</span>
            </motion.button>
            <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={()=>go(false)} className="a20-ghost w-full sm:flex-1 rounded-xl py-3 px-6 text-[12px] uppercase tracking-[0.1em] font-medium transition-all duration-300" style={{fontFamily:'Inter,sans-serif',color:'rgba(233,215,196,0.45)',background:'transparent',border:'1px solid rgba(233,215,196,0.1)'}}>
              Ohne Gedächtnis fortfahren
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )}</AnimatePresence>);
}
