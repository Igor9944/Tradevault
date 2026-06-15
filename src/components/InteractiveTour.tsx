import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronRight, ChevronLeft, X, Play, HelpCircle, CheckCircle2 } from 'lucide-react';

interface TourStep {
  id: number;
  title: string;
  description: string;
  icon: string | React.ReactNode;
  targetId: string;
  activeTabTarget?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface InteractiveTourProps {
  userId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function InteractiveTour({ userId, activeTab, setActiveTab }: InteractiveTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  
  const tourKey = `tv_tour_completed_${userId}`;

  const steps: TourStep[] = [
    {
      id: 0,
      title: "Bienvenue sur TradeVault",
      description: "L'outil d'excellence conçu pour suivre vos performances de trading, perfectionner votre rigueur et réussir vos objectifs de financement.",
      icon: "✨",
      targetId: "",
      position: "center"
    },
    {
      id: 1,
      title: "Votre Sélecteur de Portefeuille",
      description: "Structurez vos activités. Basculez en un clic de votre compte personnel à vos évaluations Prop-firm. Toutes vos données s'ajustent instantanément à ce portefeuille.",
      icon: "💼",
      targetId: "tour-account-selector",
      position: "right"
    },
    {
      id: 2,
      title: "Le Journal de Trading",
      description: "Le cœur de votre progression. Ajoutez vos trades, consignez vos paires de devises, vos configurations graphiques, et laissez la plateforme calculer vos statistiques.",
      icon: "📝",
      targetId: "tour-add-trade",
      activeTabTarget: "journal",
      position: "top"
    },
    {
      id: 3,
      title: "Paramètres de Profil & Devise",
      description: "Personnalisez votre interface. Modifiez votre devise d'affichage (EUR, USD, GBP) dans vos options de profil pour mettre à jour vos calculs de gains dynamiquement.",
      icon: "🪙",
      targetId: "tour-profile-trigger",
      position: "right"
    },
    {
      id: 4,
      title: "Analyses de Performance en Temps Réel",
      description: "Consultez votre analyse approfondie : courbe d'équité, taux de réussite (Winrate), drawdown maximum de sécurité et les détails de vos meilleurs jours.",
      icon: "📊",
      targetId: "tour-dashboard-panel",
      activeTabTarget: "dashboard",
      position: "bottom"
    }
  ];

  // Auto trigger check
  useEffect(() => {
    if (userId) {
      const completed = localStorage.getItem(tourKey);
      if (!completed) {
        // Safe timeout to let the app finish rendering
        const timer = setTimeout(() => {
          setIsOpen(true);
          setCurrentStep(0);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [userId, tourKey]);

  // Handle active tab routing as user progresses
  useEffect(() => {
    if (!isOpen) return;
    const targetTab = steps[currentStep]?.activeTabTarget;
    if (targetTab && activeTab !== targetTab) {
      setActiveTab(targetTab);
    }
  }, [currentStep, isOpen]);

  // Calculate coordinates of current target
  const updateSpotlightCoords = () => {
    if (!isOpen) return;
    const step = steps[currentStep];
    if (!step || !step.targetId) {
      setCoords(null);
      return;
    }

    const element = document.getElementById(step.targetId);
    if (element) {
      const rect = element.getBoundingClientRect();
      // Only set coordinates if element is rendering with positive dimension layout
      if (rect.width > 0 && rect.height > 0) {
        setCoords({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        });
      }
    } else {
      setCoords(null);
    }
  };

  // Recalculate on step change, resize, search scroll or layout repaint
  useEffect(() => {
    updateSpotlightCoords();
    
    // Periodically re-align for dynamic elements loading or tab transitions
    const interval = setInterval(updateSpotlightCoords, 250);
    window.addEventListener('resize', updateSpotlightCoords);
    window.addEventListener('scroll', updateSpotlightCoords);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateSpotlightCoords);
      window.removeEventListener('scroll', updateSpotlightCoords);
    };
  }, [isOpen, currentStep, activeTab]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(tourKey, 'completed');
    setIsOpen(false);
  };

  const restartTour = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  if (!isOpen) {
    // Show a small, discreet floating help button to re-trigger the tour at any time
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 6 }}
          whileTap={{ scale: 0.95 }}
          onClick={restartTour}
          className="p-3 bg-[#080808]/90 text-[#00FF9C] hover:text-white rounded-full border border-zinc-800 hover:border-[#00FF9C]/50 shadow-2xl shadow-emerald-500/15 backdrop-blur-md flex items-center justify-center gap-1.5 cursor-pointer text-xs font-mono group"
          id="tour-help-trigger"
        >
          <HelpCircle size={15} className="group-hover:rotate-12 transition-transform" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold uppercase tracking-wider text-[10px]">Onboarding</span>
        </motion.button>
      </div>
    );
  }

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Dark backdrop overlay mask */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleComplete}
        className="absolute inset-0 bg-[#020202]/85 backdrop-blur-[2px] pointer-events-auto cursor-pointer"
      />

      {/* SVG Spotlight highlight */}
      {coords && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {/* Curved highlighted punched-out hole with subtle safe padding */}
              <rect 
                x={coords.left - 6} 
                y={coords.top - 6} 
                width={coords.width + 12} 
                height={coords.height + 12} 
                rx={12} 
                ry={12} 
                fill="black" 
              />
            </mask>
          </defs>
          {/* Black overlay with cut mask */}
          <rect width="100%" height="100%" fill="#000000" fillOpacity="0.75" mask="url(#spotlight-mask)" />
          
          {/* Animated pulsing neon halo border ring around targeted element */}
          <rect 
            x={coords.left - 7} 
            y={coords.top - 7} 
            width={coords.width + 14} 
            height={coords.height + 14} 
            rx={13} 
            ry={13} 
            fill="none" 
            stroke="#00FF9C" 
            strokeWidth="2.5" 
            className="animate-pulse"
            strokeDasharray="4 4"
          />
        </svg>
      )}

      {/* Interactive Tour Card Display */}
      <div className="absolute inset-0 flex items-center justify-center p-4 z-20">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="w-full max-w-sm bg-[#0a0a0b]/95 border border-zinc-900 rounded-3xl p-6 pointer-events-auto shadow-2xl relative overflow-hidden backdrop-blur-xl"
        >
          {/* Subtle green ambient background glow */}
          <div className="absolute -top-12 -left-12 w-28 h-28 bg-[#00FF9C]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top header step info & skip button */}
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#00FF9C] uppercase flex items-center gap-1">
              <Sparkles size={11} className="text-[#00FF9C]" />
              GUIDE INTERACTIF • {currentStep + 1} SUR {steps.length}
            </span>
            <button 
              onClick={handleComplete}
              className="p-1 px-2.5 rounded-lg bg-zinc-900/60 text-slate-400 hover:text-white border border-transparent hover:border-zinc-800 transition-all text-[9px] font-bold uppercase tracking-wider font-mono cursor-pointer"
              title="Passer l'introduction"
            >
              Passer
            </button>
          </div>

          {/* Graphic and Step info */}
          <div className="flex gap-4 items-start mb-6 relative z-10">
            <div className="w-12 h-12 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0 shadow-black/40">
              {currentStepData.icon}
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-sm font-black font-sans text-white tracking-wide uppercase">
                {currentStepData.title}
              </h3>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {currentStepData.description}
              </p>
            </div>
          </div>

          {/* Bullet Step Indicator Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-900 relative z-10 gap-2">
            <div className="flex gap-1">
              {steps.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === currentStep ? 'w-4 bg-[#00FF9C]' : 'w-1.5 bg-zinc-800'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-2.5 py-1.5 bg-zinc-900 text-slate-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-0.5 border border-zinc-800 hover:border-zinc-700 transition-colors pointer-events-auto cursor-pointer"
                >
                  <ChevronLeft size={14} /> Retour
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-3.5 py-1.5 bg-[#00FF9C] hover:bg-[#00D180] text-black rounded-xl text-xs font-black flex items-center gap-1 transition-all pointer-events-auto hover:shadow-lg hover:shadow-[#00FF9C]/20 cursor-pointer"
              >
                {currentStep === steps.length - 1 ? (
                  <>Commencer <CheckCircle2 size={14} /></>
                ) : (
                  <>Suivant <ChevronRight size={14} /></>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
