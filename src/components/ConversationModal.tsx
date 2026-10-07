'use client';

import React, { useState, useRef } from 'react';
import { CompanionProfile } from '@/types/companion';
import { TelemetryWidget } from '@/components/TelemetryWidget';
import {
  PhoneOff,
  Volume2,
  VolumeX,
  Loader2,
  Square,
  Sparkles,
  Send,
  Clipboard,
  Eye,
  EyeOff,
  Settings,
  X,
} from 'lucide-react';

export type LiveCallState = 'listening' | 'thinking' | 'speaking';

interface ConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CompanionProfile;
  callState: LiveCallState;
  liveTranscript: string;
  lastReply: string;
  onInterrupt: () => void;
  onSendMessage: (text: string) => void;
  isVisionActive?: boolean;
  onToggleVision?: () => void;
  onOpenSettings?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

export const ConversationModal: React.FC<ConversationModalProps> = ({
  isOpen,
  onClose,
  profile,
  callState,
  liveTranscript,
  lastReply,
  onInterrupt,
  onSendMessage,
  isVisionActive,
  onToggleVision,
  onOpenSettings,
  isMuted = false,
  onToggleMute,
}) => {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || callState === 'thinking') return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText((prev) => (prev ? `${prev} ${text}` : text));
        inputRef.current?.focus();
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-in fade-in duration-200">
      {/* BARRE SUPÉRIEURE (HEADER) */}
      <header className="w-full max-w-4xl flex items-center justify-between pb-3 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-2xl">
                {profile.avatar || '🤖'}
              </div>
            </div>
            <span
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                callState === 'speaking'
                  ? 'bg-purple-500 animate-pulse'
                  : callState === 'thinking'
                  ? 'bg-amber-400 animate-spin'
                  : 'bg-emerald-400 animate-ping'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                {profile.name || 'Nova Classic'}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-[10px] font-mono font-medium text-cyan-300">
                DirectLive
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {callState === 'speaking' && 'Le compagnon vous répond à voix haute...'}
              {callState === 'thinking' && 'Réflexion et calcul en cours...'}
              {callState === 'listening' && 'À votre écoute en continu (parlez librement)...'}
            </p>
          </div>
        </div>

        {/* Commandes secondaires droite */}
        <div className="flex items-center gap-2">
          {/* Télémétrie */}
          <div className="hidden sm:block">
            <TelemetryWidget />
          </div>

          {/* Partage d'écran / Vision */}
          {onToggleVision && (
            <button
              type="button"
              onClick={onToggleVision}
              className={`p-2.5 rounded-xl border transition active:scale-95 flex items-center gap-1.5 text-xs ${
                isVisionActive
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={isVisionActive ? 'Arrêter la vision écran' : 'Activer la vision écran'}
            >
              {isVisionActive ? <Eye className="w-4 h-4 text-emerald-400 animate-pulse" /> : <EyeOff className="w-4 h-4" />}
              <span className="hidden md:inline">{isVisionActive ? 'Vision Active' : 'Vision'}</span>
            </button>
          )}

          {/* Réglages */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition active:scale-95"
              title="Paramètres"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Fermer */}
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 transition active:scale-95"
            title="Quitter le mode appel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ZONE CENTRALE DE DIALOGUE */}
      <main className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center my-4 overflow-hidden relative">
        {/* Visualiseur d'onde audio & état */}
        <div className="flex flex-col items-center justify-center gap-4 my-auto w-full px-4 text-center">
          <div className="flex items-center justify-center gap-1.5 h-16 sm:h-20">
            {callState === 'speaking' ? (
              [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <span
                  key={i}
                  className="w-1.5 sm:w-2 bg-gradient-to-t from-cyan-500 to-purple-400 rounded-full animate-[wave_0.8s_ease-in-out_infinite_alternate]"
                  style={{
                    height: `${30 + (i % 4) * 20}%`,
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              ))
            ) : callState === 'thinking' ? (
              <div className="flex items-center gap-2 text-amber-300 text-sm font-medium animate-pulse">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span>Traitement de votre demande...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-slate-300 font-mono text-xs">Microphone ouvert · Parlez quand vous le souhaitez</span>
              </div>
            )}
          </div>

          {/* Transcription en direct des paroles de l'utilisateur */}
          {liveTranscript && (
            <div className="w-full max-w-2xl p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-sm sm:text-base animate-in fade-in shadow-lg">
              <span className="text-xs text-cyan-400/80 font-mono block mb-1">Vous :</span>
              « {liveTranscript} »
            </div>
          )}

          {/* Dernière réponse de l'IA */}
          {lastReply && (
            <div className="w-full max-w-2xl p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-200 text-sm sm:text-base leading-relaxed text-left max-h-48 overflow-y-auto custom-scrollbar shadow-xl">
              <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{profile.name || 'Nova Classic'} :</span>
              </div>
              {lastReply}
            </div>
          )}
        </div>
      </main>

      {/* ZONE DE SAISIE DE COMMANDE / QUESTION RAPIDE */}
      <div className="w-full max-w-4xl px-1 pt-2 pb-1 shrink-0">
        {isVisionActive && (
          <div className="flex items-center justify-center mb-2">
            <button
              type="button"
              onClick={() =>
                onSendMessage("Que vois-tu à l'écran ? Fais-moi un point de situation rapide.")
              }
              disabled={callState === 'thinking'}
              className="text-xs px-3.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-500/50 text-emerald-300 flex items-center gap-1.5 transition active:scale-95 shadow-md"
            >
              <Eye className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>« Que vois-tu à l&apos;écran ? »</span>
            </button>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-2 shadow-xl focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/40 transition"
        >
          <button
            type="button"
            onClick={handlePaste}
            title="Coller un texte ou un lien du presse-papier"
            className="p-2.5 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800 active:scale-95 transition flex items-center justify-center shrink-0"
          >
            <Clipboard className="w-4 h-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Taper un message pour le compagnon..."
            disabled={callState === 'thinking'}
            className="flex-1 bg-transparent px-2 py-1 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-50 min-w-0 font-sans"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || callState === 'thinking'}
            title="Envoyer"
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:hover:bg-cyan-600 text-white font-semibold transition active:scale-95 flex items-center justify-center gap-1 shrink-0 shadow-md shadow-cyan-600/30"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Envoyer</span>
          </button>
        </form>
      </div>

      {/* BOUTONS D'ACTION INFÉRIEURS */}
      <footer className="w-full max-w-sm flex items-center justify-center gap-6 sm:gap-8 pt-2 pb-2 shrink-0">
        {/* Bouton Mute / Silencieux */}
        {onToggleMute && (
          <button
            type="button"
            onClick={onToggleMute}
            className={`flex flex-col items-center gap-1.5 text-xs transition active:scale-95 ${
              isMuted ? 'text-amber-300' : 'text-slate-300 hover:text-white'
            }`}
            title={isMuted ? 'Réactiver la voix du compagnon' : 'Couper la voix du compagnon (Mode muet)'}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all shadow-xl ${
                isMuted
                  ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-amber-500/30 ring-2 ring-amber-500/40'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6 text-cyan-400" />}
            </div>
            <span className="font-semibold text-xs">
              {isMuted ? 'Muet (ON)' : 'Son (Actif)'}
            </span>
          </button>
        )}

        {/* Bouton Interrompre si le robot parle */}
        {callState === 'speaking' && (
          <button
            type="button"
            onClick={onInterrupt}
            className="flex flex-col items-center gap-1.5 text-xs text-slate-300 hover:text-white transition active:scale-95"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-rose-400 shadow-xl">
              <Square className="w-5 h-5" />
            </div>
            <span className="font-semibold text-xs">Couper IA</span>
          </button>
        )}

        {/* Bouton Raccrocher */}
        <button
          type="button"
          onClick={onClose}
          className="flex flex-col items-center gap-1.5 text-xs text-rose-300 hover:text-white transition active:scale-95"
        >
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 flex items-center justify-center text-white shadow-2xl shadow-rose-600/40 border border-rose-400/40">
            <PhoneOff className="w-7 h-7" />
          </div>
          <span className="font-bold text-xs tracking-wide">Raccrocher</span>
        </button>
      </footer>
    </div>
  );
};
