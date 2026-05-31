import React, { useState, useEffect } from 'react';
import { Copy, Check, Upload, ArrowRight, ShieldCheck, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { UsdtTrc20Icon, UsdtBep20Icon } from './Portal';

interface CheckoutProps {
  user: User;
  onPaymentSuccess: (proofBase64: string, network: 'TRC20' | 'BEP20') => void;
  onCancel: () => void;
  adminWalletTRC20?: string;
  adminWalletBEP20?: string;
  subscriptionPrice?: number;
  subscriptionPeriod?: number;
}

export default function Checkout({ 
  user, 
  onPaymentSuccess, 
  onCancel,
  adminWalletTRC20 = 'TN2YxKp9vR3mHqL7bF8cD2eA5wJ6sT4uV',
  adminWalletBEP20 = '0x7a3B5c9D2eF1a4B6c8D0e2F4a6B8c0D2e4F6a8B0',
  subscriptionPrice = 30,
  subscriptionPeriod = 3
}: CheckoutProps) {
  const [network, setNetwork] = useState<'TRC20' | 'BEP20'>('TRC20');
  const [copied, setCopied] = useState(false);
  const [proofFile, setProofFile] = useState<string | null>(null);
  const [step, setStep] = useState<number>(2); // 1: Account (complet), 2: Payment, 3: Access

  // Simulated Timer State
  const [simulating, setSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(10); // 10 seconds count

  const WALLETS = {
    TRC20: adminWalletTRC20,
    BEP20: adminWalletBEP20
  };

  const [toast, setToast] = useState<string | null>(null);

  const displayToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(WALLETS[network]);
    setCopied(true);
    displayToast('Adresse crypto copiée avec succès !');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        displayToast('Veuillez uploader un fichier image uniquement.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProofFile(event.target.result as string);
          displayToast('Preuve de paiement chargée !');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 10 seconds simulation countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (simulating && simProgress > 0) {
      interval = setInterval(() => {
        setSimProgress((prev) => prev - 1);
      }, 1000);
    } else if (simulating && simProgress === 0) {
      setSimulating(false);
      setStep(3);
      setTimeout(() => {
        if (proofFile) {
          onPaymentSuccess(proofFile, network);
        } else {
          // Fallback static placeholder if user didn't upload
          onPaymentSuccess('placeholder_image', network);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [simulating, simProgress, proofFile, network, onPaymentSuccess]);

  const handleSimulatePayment = () => {
    if (!proofFile) {
      displayToast('Veuillez d\'abord uploader une capture d\'écran de preuve de paiement !');
      return;
    }
    setSimulating(true);
    setSimProgress(10);
  };

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 flex flex-col items-center justify-center font-sans relative">
      <div className="grid-bg"></div>
      
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-indigo-900 border border-indigo-500/80 p-3 rounded-lg shadow-lg text-white font-mono text-xs">
          {toast}
        </div>
      )}

      <div className="max-w-xl w-full">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 px-4 font-mono text-xs">
          <div className="flex flex-col items-center gap-1.5 text-indigo-400">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500 flex items-center justify-center text-indigo-300 font-bold">
              ✓
            </div>
            <span>COMPTE</span>
          </div>
          <div className="flex-1 h-[2px] bg-indigo-500/30 mx-3"></div>
          <div className={`flex flex-col items-center gap-1.5 ${step >= 2 ? 'text-indigo-400' : 'text-slate-500'}`}>
            <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold ${
              step >= 2 ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-900 border-slate-800'
            }`}>
              2
            </div>
            <span>PAIEMENT</span>
          </div>
          <div className="flex-1 h-[2px] bg-slate-800 mx-3"></div>
          <div className={`flex flex-col items-center gap-1.5 ${step === 3 ? 'text-indigo-400' : 'text-slate-500'}`}>
            <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold ${
              step === 3 ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-900 border-slate-800'
            }`}>
              3
            </div>
            <span>ACCÈS</span>
          </div>
        </div>

        {/* Invoice Area */}
        <div className="rounded-2xl border border-indigo-900/30 bg-slate-900/40 p-6 md:p-8 backdrop-blur-xl space-y-6">
          
          <div className="text-center">
            <span className="text-slate-400 text-[10px] tracking-widest uppercase block font-mono">ACCÈS CAISSE PORTAIL</span>
            <div className="text-4xl font-extrabold text-white font-mono mt-1">${subscriptionPrice.toFixed(2)}</div>
            <div className={`inline-block mt-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-[9px] text-blue-300 font-bold uppercase tracking-wider`}>
              Abonnement Premium • {subscriptionPeriod} MOIS
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 space-y-4">
            <span className="text-xs text-slate-300 block font-bold">1. SÉLECTIONNEZ LE RÉSEAU</span>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setNetwork('TRC20')}
                className={`py-3 px-2 rounded-xl border font-semibold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  network === 'TRC20' ? 'border-indigo-505/60 bg-[#160e35]/60 shadow-[0_0_15px_rgba(38,161,123,0.35)]' : 'border-slate-850 bg-slate-950/40 text-slate-400 hover:border-slate-750'
                }`}
              >
                <div className={`transition-all ${network === 'TRC20' ? 'scale-110' : 'opacity-85'}`}>
                  <UsdtTrc20Icon />
                </div>
                <div className="text-center">
                  <span className="block font-black text-white text-[11px]">USDT TRC20</span>
                  <span className="text-[8px] text-slate-500 font-mono tracking-widest uppercase block mt-0.5">Réseau TRON</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setNetwork('BEP20')}
                className={`py-3 px-2 rounded-xl border font-semibold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  network === 'BEP20' ? 'border-[#06b6d4]/60 bg-[#0a1f2c]/65 shadow-[0_0_15px_rgba(38,161,123,0.35)]' : 'border-slate-850 bg-slate-950/40 text-slate-400 hover:border-slate-750'
                }`}
              >
                <div className={`transition-all ${network === 'BEP20' ? 'scale-110' : 'opacity-85'}`}>
                  <UsdtBep20Icon />
                </div>
                <div className="text-center">
                  <span className="block font-black text-white text-[11px]">USDT BEP20</span>
                  <span className="text-[8px] text-slate-500 font-mono tracking-widest uppercase block mt-0.5">Réseau BSC</span>
                </div>
              </button>
            </div>
          </div>

          {/* Wallet and custom pseudocoded QR design */}
          <div className="space-y-4">
            <span className="text-xs text-slate-300 block font-bold">2. EFFECTUEZ LE PAIEMENT</span>
            
            <div className="flex flex-col items-center p-6 bg-slate-950/90 rounded-2xl border border-slate-900 text-center gap-4">
              {/* Copy Wallet */}
              <div className="w-full space-y-1 text-left">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Adresse USDT active ({network})</span>
                <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-xl gap-2 items-center justify-between">
                  <code className="text-xs text-slate-300 font-mono truncate pl-2">{WALLETS[network]}</code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copié' : 'Copier'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Proof Screen Upload Selector */}
          <div className="space-y-2">
            <span className="text-xs text-slate-300 block font-bold">3. ENREGISTREZ LA PREUVE DE RECEPTION *</span>
            <div className="relative border border-dashed border-indigo-900/60 hover:border-indigo-500/60 bg-slate-950/40 rounded-xl p-4 cursor-pointer text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleProofUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {!proofFile ? (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={24} className="text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-200">Uploader la preuve de transaction</span>
                  <p className="text-[10px] text-slate-500">Une capture d'écran montrant l'envoi de {subscriptionPrice} USDT ({network})</p>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={proofFile} alt="Proof" className="w-10 h-10 object-cover rounded border border-indigo-500" />
                    <div className="text-left">
                      <span className="text-xs text-emerald-400 block font-semibold">Preuve validée</span>
                      <span className="text-[9px] text-slate-400 font-mono block">preuve_enregistrement.png</span>
                    </div>
                  </div>
                  <span className="text-xs text-indigo-400 underline font-semibold">Remplacer</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Trigger / Simulator */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            {simulating ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2.5 text-indigo-400 text-xs font-bold">
                  <Loader2 size={16} className="animate-spin text-indigo-400" />
                  <span>Vérification sur la Blockchain en cours ... ({simProgress}s)</span>
                </div>
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-1000" 
                    style={{ width: `${(10 - simProgress) * 10}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-slate-500 block text-center font-mono">Consensus {network} node verified</span>
              </div>
            ) : step === 3 ? (
              <div className="text-center p-2 text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 animate-bounce">
                🎉 TRANSACTION VALIDÉE ! Accès déverrouillé dans 1s ...
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-bold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} /> Simuler la réception du paiement (10 sec)
                </button>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans">
                  <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-slate-400" /> Sécurité cryptée SSL</span>
                  <span>Annuler l'abonnement en 1 clic</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 text-xs font-semibold"
            >
              Annuler
            </button>
          </div>

        </div>

        {/* Warning instructions info */}
        <div className="mt-4 p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 text-amber-500/90 flex gap-2.5">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-xs font-bold block uppercase tracking-wider">Instructions Importantes</span>
            <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
              Pour éviter toute interruption, envoyez le bon montant. Le renouvellement de votre abonnement se fait tous les {subscriptionPeriod} mois de façon automatique.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
