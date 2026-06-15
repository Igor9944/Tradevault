import React, { useState, useEffect } from 'react';
import { Copy, Check, Upload, ArrowRight, ShieldCheck, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { registerPayment } from '../utils/supabaseSync';
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
  const [step] = useState<number>(2); // 1: Account (complet), 2: Payment, 3: Access
  const [realFileObject, setRealFileObject] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submissionCompleted, setSubmissionCompleted] = useState(false);

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
      setRealFileObject(file);
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

  const handleRealSubmit = async () => {
    if (!proofFile) {
      displayToast('Veuillez d\'abord uploader une capture d\'écran de preuve de paiement !');
      return;
    }

    setUploading(true);
    let publicUrl = proofFile; // fallback to base64
    
    try {
      // 1. Storage Upload attempt
      if (realFileObject) {
        const { supabase } = await import('../lib/supabase');
        try {
          // Upload proof raw to Supabase storage to the bucket 'preuves-paiement'
          const fileExt = realFileObject.name.split('.').pop() || 'jpg';
          const fileName = `${user.id}/preuve_${Date.now()}.${fileExt}`;
          const { data, error } = await supabase.storage
            .from("preuves-paiement")
            .upload(fileName, realFileObject, { 
              upsert: true,
              cacheControl: '3600'
            });

          if (!error && data) {
            const { data: urlData } = supabase.storage
              .from("preuves-paiement")
              .getPublicUrl(fileName);
            if (urlData?.publicUrl) {
              publicUrl = urlData.publicUrl;
            }
          }
        } catch (storageErr) {
          console.warn("Storage upload failed, fallback to base64:", storageErr);
        }
      }
    } catch (e) {
      console.warn("Dynamic import of supabase storage upload failed:", e);
    }

    try {
      // 2. Update status and profiles
      const { supabase } = await import('../lib/supabase');
      try {
        // Sync users
        await supabase.from('users').update({ status: 'pending', avatar_url: user.avatar_url || null }).eq('id', user.id);
        // Sync profiles as requested
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: user.username,
          email: user.email,
          status: 'pending',
          payment_proof: publicUrl,
          created_at: new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn("Database sync error (ignored):", dbErr);
      }
    } catch (e) {
      console.warn("Database sync dynamic import failed:", e);
    }

        try {
      await registerPayment(user.id, subscriptionPrice, publicUrl);
    } catch (e) {
      console.warn("Payment registration failed:", e);
    }

    // 3. Trigger edge functions email
    try {
      let rawCheckoutUrl = import.meta.env.VITE_SUPABASE_URL || "";
      if (rawCheckoutUrl && rawCheckoutUrl.includes('supabase.com/dashboard/project/')) {
        const match = rawCheckoutUrl.match(/project\/([a-z0-9]+)/);
        if (match) {
          rawCheckoutUrl = `https://${match[1]}.supabase.co`;
        }
      } else if (rawCheckoutUrl && !rawCheckoutUrl.startsWith('http')) {
        rawCheckoutUrl = `https://${rawCheckoutUrl}.supabase.co`;
      }
      const supabaseUrl = rawCheckoutUrl;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
      if (supabaseUrl && supabaseAnonKey) {
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            type: "registration_pending",
            user: { name: user.username, email: user.email },
            context: { paymentProof: publicUrl }
          })
        });
      }
    } catch (emailErr) {
      console.warn("Fetch to edge function send-email failed:", emailErr);
    }

    setUploading(false);
    setSubmissionCompleted(true);
    
    // Log in local state
    onPaymentSuccess(publicUrl, network);
  };

  // If user is already pending or has just submitted, show pending state dashboard
  if (user.status === 'pending' || submissionCompleted) {
    return (
      <div className="min-h-screen bg-black py-12 px-4 flex flex-col items-center justify-center font-sans relative text-slate-200">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-xl w-full rounded-2xl border border-zinc-900 bg-[#080808] p-6 md:p-8 backdrop-blur-xl space-y-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.05)] relative z-10 animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold mx-auto text-2xl animate-spin-slow">
            ⌛
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white uppercase font-mono tracking-widest text-[#FFB01F]">En attente d'approbation</h2>
            <p className="text-neutral-400 text-xs font-sans">
              Votre demande d'activation est en cours de traitement par l'équipe administrative de TradeVault.
            </p>
          </div>

          <div className="bg-black/50 p-5 rounded-2xl border border-zinc-900 text-left space-y-3">
            <span className="text-[10px] text-[#00FF9C] font-mono uppercase tracking-widest font-black block">Traders Audit Info</span>
            <div className="text-[11px] space-y-2 font-mono text-neutral-300">
              <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                <span className="text-neutral-450">Nom / Pseudo :</span>
                <span className="text-white font-bold">{user.username}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                <span className="text-neutral-450">Adresse E-mail :</span>
                <span className="text-white font-bold break-all">{user.email}</span>
              </div>
              <div className="flex justify-between pb-0.5">
                <span className="text-slate-450">Statut d'Accès :</span>
                <span className="text-amber-500 font-black uppercase tracking-wider">⏳ En Cours d'Audit</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            Votre envoi a été intercepté avec succès. Dès que les fonds sont confirmés ({subscriptionPrice} USDT), votre compte s'activera automatiquement et vous recevrez un email de notification contenant vos clés.
          </p>

          <div className="pt-2 flex flex-col gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-3 rounded-xl border border-zinc-900 text-slate-400 hover:text-white hover:bg-[#0c0c0c] text-xs font-mono font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              Déconnexion / Retour d'Accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4 flex flex-col items-center justify-center font-sans relative text-slate-200">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00FF9C]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00FF9C]/5 rounded-full blur-3xl pointer-events-none"></div>
      
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-black border border-[#00FF9C]/40 p-3 rounded-lg shadow-2xl text-white font-mono text-xs">
          {toast}
        </div>
      )}

      <div className="max-w-xl w-full relative z-10 animate-scale-in">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 px-4 font-mono text-xs">
          <div className="flex flex-col items-center gap-1.5 text-[#00FF9C]">
            <div className="w-10 h-10 rounded-full bg-[#00FF9C]/10 border border-[#00FF9C]/30 flex items-center justify-center text-[#00FF9C] font-bold">
              ✓
            </div>
            <span>COMPTE</span>
          </div>
          <div className="flex-1 h-[2px] bg-[#00FF9C]/20 mx-3"></div>
          <div className={`flex flex-col items-center gap-1.5 ${step >= 2 ? 'text-[#00FF9C]' : 'text-slate-500'}`}>
            <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold ${
              step >= 2 ? 'bg-[#00FF9C]/10 border-[#00FF9C] text-white shadow-lg shadow-[#00FF9C]/20' : 'bg-zinc-900 border-zinc-800'
            }`}>
              2
            </div>
            <span>PAIEMENT</span>
          </div>
          <div className="flex-1 h-[2px] bg-zinc-900 mx-3"></div>
          <div className={`flex flex-col items-center gap-1.5 ${step === 3 ? 'text-[#00FF9C]' : 'text-slate-500'}`}>
            <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold ${
              step === 3 ? 'bg-[#00FF9C]/10 border-[#00FF9C] text-white shadow-lg shadow-[#00FF9C]/20' : 'bg-zinc-900 border-zinc-800'
            }`}>
              3
            </div>
            <span>ACCÈS</span>
          </div>
        </div>

        {/* Invoice Area */}
        <div className="rounded-2xl border border-zinc-900 bg-[#080808] p-6 md:p-8 backdrop-blur-xl space-y-6 shadow-2xl">
          
          <div className="text-center">
            <span className="text-slate-500 text-[10px] tracking-widest uppercase block font-mono">ACCÈS CAISSE PORTAIL</span>
            <div className="text-4xl font-extrabold text-white font-mono mt-1">${subscriptionPrice.toFixed(2)}</div>
            <div className={`inline-block mt-2 px-3 py-1 rounded-full bg-[#00FF9C]/10 border border-[#00FF9C]/20 text-[9px] text-[#00FF9C] font-bold uppercase tracking-wider`}>
              Abonnement Premium • {subscriptionPeriod} MOIS
            </div>
          </div>

          <div className="border-t border-zinc-900 pt-6 space-y-4">
            <span className="text-xs text-slate-300 block font-bold font-mono tracking-wide uppercase">1. SÉLECTIONNEZ LE RÉSEAU</span>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setNetwork('TRC20')}
                className={`py-3 px-2 rounded-xl border font-semibold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  network === 'TRC20' ? 'border-[#00FF9C]/30 bg-[#00FF9C]/5 shadow-[0_0_15px_rgba(0,255,156,0.15)] text-white' : 'border-zinc-900 bg-black/45 text-slate-400 hover:border-zinc-800'
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
                  network === 'BEP20' ? 'border-[#00FF9C]/30 bg-[#00FF9C]/5 shadow-[0_0_15px_rgba(0,255,156,0.15)] text-white' : 'border-zinc-900 bg-black/45 text-slate-400 hover:border-zinc-850'
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
            <span className="text-xs text-slate-300 block font-bold font-mono tracking-wide uppercase">2. EFFECTUEZ LE PAIEMENT</span>
            
            <div className="flex flex-col items-center p-6 bg-black rounded-2xl border border-zinc-900 text-center gap-4">
              {/* Copy Wallet */}
              <div className="w-full space-y-1.5 text-left">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold font-mono">Adresse USDT active ({network})</span>
                <div className="flex bg-[#0d0d0d] border border-zinc-900 p-1.5 rounded-xl gap-2 items-center justify-between">
                  <code className="text-xs text-slate-300 font-mono truncate pl-2">{WALLETS[network]}</code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="py-1.5 px-3 rounded-lg bg-[#00FF9C] hover:bg-[#00D180] text-black text-xs font-bold font-mono transition-all flex items-center gap-1 active:scale-95 shrink-0"
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
            <span className="text-xs text-slate-300 block font-bold font-mono tracking-wide uppercase">3. ENREGISTREZ LA PREUVE DE RECEPTION *</span>
            <div className="relative border border-dashed border-zinc-800 hover:border-[#00FF9C]/50 bg-black/40 rounded-xl p-4 cursor-pointer text-center transition-all">
              <input
                type="file"
                accept="image/*"
                onChange={handleProofUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {!proofFile ? (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={24} className="text-[#00FF9C]" />
                  <span className="text-xs font-semibold text-slate-200">Uploader la preuve de transaction</span>
                  <p className="text-[10px] text-slate-500">Une capture d'écran montrant l'envoi de {subscriptionPrice} USDT ({network})</p>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={proofFile} alt="Proof" className="w-10 h-10 object-cover rounded border border-[#00FF9C]/40" />
                    <div className="text-left">
                      <span className="text-xs text-[#00FF9C] block font-semibold">Preuve validée</span>
                      <span className="text-[9px] text-slate-500 font-mono block">preuve_enregistrement.png</span>
                    </div>
                  </div>
                  <span className="text-xs text-[#00FF9C] underline font-semibold font-mono uppercase tracking-wider">Remplacer</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Trigger / Simulator */}
          <div className="bg-black p-4 rounded-xl border border-zinc-900">
            <div className="space-y-3">
              <button
                type="button"
                disabled={uploading}
                onClick={handleRealSubmit}
                className="w-full py-3 rounded-xl bg-[#00FF9C] hover:bg-[#00D180] text-black text-xs font-black font-mono uppercase tracking-widest shadow-lg shadow-[#00FF9C]/10 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 active:scale-98"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Téléchargement ...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Soumettre ma preuve d'abonnement</span>
                  </>
                )}
              </button>

              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono uppercase tracking-widest pt-1">
                <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-slate-650" /> Sécurité cryptée SSL</span>
                <span>Validation manuelle requise</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 rounded-xl border border-zinc-900 text-slate-400 hover:text-white hover:bg-zinc-950 text-xs font-semibold uppercase font-mono tracking-wider transition-all"
            >
              Annuler
            </button>
          </div>

        </div>

        {/* Warning instructions info */}
        <div className="mt-4 p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 text-amber-500/95 flex gap-2.5">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-xs font-bold block uppercase tracking-wider font-mono">Instructions Importantes</span>
            <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
              Pour éviter toute interruption, envoyez le bon montant. Le renouvellement de votre abonnement se fait tous les {subscriptionPeriod} mois de façon automatique.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
