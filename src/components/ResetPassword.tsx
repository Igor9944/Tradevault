import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, Key, ShieldCheck, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

interface ResetPasswordProps {
  onBackToLogin: () => void;
}

export default function ResetPassword({ onBackToLogin }: ResetPasswordProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      // Calls standard Supabase client flow to finalize password swap
      const { error: resetErr } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (resetErr) {
        throw resetErr;
      }

      setSuccess(true);
      
      // Auto sign out afterward to force a clean, secure fresh login
      await supabase.auth.signOut();
    } catch (err: any) {
      console.error("Error setting new password on Supabase:", err);
      setError(err?.message || "Impossible de réinitialiser le mot de passe. Veuillez vérifier la validité de votre lien ou renouveler la demande.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center relative p-4 bg-black">
      {/* Dynamic Background visual details */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[#3DDC97]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#3DDC97]/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-[var(--bg-secondary)] backdrop-blur-md rounded-2xl border border-white/[0.06] shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden relative z-10 transition-all">
        {/* Sleek top loader accent bar */}
        {loading && (
          <div className="absolute top-0 inset-x-0 h-1 bg-[#3DDC97] animate-pulse"></div>
        )}

        <div className="p-8 space-y-6 text-center">
          {/* Logo Header */}
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-white uppercase font-display">
              TRADE<span className="text-[#3DDC97] drop-shadow-[0_0_10px_rgba(61,220,151,0.15)]">VAULT</span>
            </h2>
            <span className="text-[9px] font-mono tracking-widest text-[#475569] block uppercase">MODIFICATION DES ACCÈS SECURISÉS</span>
          </div>

          {success ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 py-4"
            >
              <div className="w-16 h-16 rounded-full bg-[#3DDC97]/10 border-2 border-[#3DDC97]/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(61,220,151,0.05)]">
                <ShieldCheck size={28} className="text-[#3DDC97]" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white font-sans">Mot de passe réinitialisé ! 🔒</h3>
                <p className="text-xs text-[#94a3b8] leading-relaxed font-mono px-4">
                  Votre mot de passe principal a été mis à jour avec succès sur votre compte TradeVault.
                </p>
              </div>

              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full py-3.5 bg-[#3DDC97] hover:bg-[#2BB87E] text-black rounded-xl text-[10px] font-mono font-bold tracking-widest uppercase transition-all shadow-md active:scale-[0.98] cursor-pointer"
              >
                RETOURNER À L'ACCÈS MEMBRE
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 text-left">
              <div className="space-y-1">
                <p className="text-xs text-neutral-300 font-mono text-center leading-relaxed pb-3">
                  Veuillez spécifier votre nouveau mot de passe de membre pour reprendre l'accès aux graphiques et trackers TradeVault.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-mono leading-relaxed text-center">
                  ⚠️ {error}
                </div>
              )}

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-wider text-white/50 uppercase block">Nouveau Mot de Passe</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-white/20 pointer-events-none">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 caractères"
                    className="w-full pl-10 pr-10 py-2.5 bg-black border border-white/[0.06] focus:border-[#3DDC97]/40 rounded-xl text-xs font-mono text-white placeholder-white/20 focus:outline-none transition-all"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-wider text-white/50 uppercase block">Confirmer Nouveau Mot de passe</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-white/20 pointer-events-none">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Resaisir à l'identique"
                    className="w-full pl-10 pr-10 py-2.5 bg-black border border-white/[0.06] focus:border-[#3DDC97]/40 rounded-xl text-xs font-mono text-white placeholder-white/20 focus:outline-none transition-all"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Password complexity helper */}
              {newPassword.length > 0 && (
                <div className="space-y-2 py-1.5 px-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-[#52D17C]' : 'bg-red-500'}`}></span>
                    <span className={newPassword.length >= 8 ? 'text-white/60' : 'text-red-400'}>
                      Minimum 8 caractères ({newPassword.length}/8)
                    </span>
                  </div>
                  {newPassword === confirmPassword && newPassword.length >= 8 && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#52D17C]">
                      <Check size={11} /> Mots de passe concordants
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#3DDC97] hover:bg-[#2BB87E] text-black disabled:bg-zinc-900 disabled:text-zinc-600 rounded-xl text-[10px] font-mono font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all shadow-lg text-center cursor-pointer mt-6"
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> SAUVEGARDE EN COURS...
                  </>
                ) : (
                  <>
                    METTRE À JOUR MON ACCÈS <Key size={13} />
                  </>
                )}
              </button>

              {/* Back to Login anchor */}
              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full py-2.5 text-white/40 hover:text-white text-[10px] font-mono tracking-wider flex items-center justify-center gap-2 transition-all mt-2 uppercase cursor-pointer"
              >
                <ArrowLeft size={12} /> Revenir à l'accueil
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
