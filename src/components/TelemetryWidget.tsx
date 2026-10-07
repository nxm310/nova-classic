'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Coins,
  ChevronDown,
  ChevronUp,
  Zap,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { storage } from '@/lib/storage';

interface TelemetryWidgetProps {
  localPromptTokens?: number;
  localCandidateTokens?: number;
  className?: string;
  compactOnly?: boolean;
}

export const TelemetryWidget: React.FC<TelemetryWidgetProps> = ({
  localPromptTokens = 0,
  localCandidateTokens = 0,
  className = '',
  compactOnly = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localStored, setLocalStored] = useState<{
    promptTokens: number;
    candidateTokens: number;
    totalTokens: number;
  }>({ promptTokens: 0, candidateTokens: 0, totalTokens: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Charger la télémétrie locale initiale et écouter les mises à jour
  useEffect(() => {
    setLocalStored(storage.getTelemetry());

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setLocalStored(e.detail);
      } else {
        setLocalStored(storage.getTelemetry());
      }
    };

    window.addEventListener('ami_tokens_updated', handleUpdate);
    return () => {
      window.removeEventListener('ami_tokens_updated', handleUpdate);
    };
  }, []);

  // Fermer le popup au clic à l'extérieur
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const combinedPromptTokens = localStored.promptTokens + localPromptTokens;
  const combinedCandidateTokens = localStored.candidateTokens + localCandidateTokens;
  const displayTokens = combinedPromptTokens + combinedCandidateTokens;

  // Calcul financier ($0.75 / 1M prompt, $3.75 / 1M candidate, taux 0.92 €/$)
  const displayCostUSD =
    (combinedPromptTokens / 1_000_000) * 0.75 + (combinedCandidateTokens / 1_000_000) * 3.75;
  const displayCostEUR = displayCostUSD * 0.92;

  const handleReset = () => {
    storage.resetTelemetry();
    setLocalStored({ promptTokens: 0, candidateTokens: 0, totalTokens: 0 });
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Bouton / Badge Compact */}
      <button
        type="button"
        onClick={() => !compactOnly && setIsOpen(!isOpen)}
        title="Télémétrie Jetons & Consommation"
        className={`flex items-center gap-2 px-2.5 h-9 rounded-xl border transition-all text-xs font-mono backdrop-blur-md shadow-sm ${
          isOpen
            ? 'bg-slate-800/90 border-cyan-500/50 text-cyan-300 ring-1 ring-cyan-500/30'
            : 'bg-slate-900/60 hover:bg-slate-800/60 border-slate-700/60 hover:border-slate-600 text-slate-300'
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>

        <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />

        <span className="font-semibold text-slate-200">
          {displayTokens.toLocaleString()}
          <span className="text-[10px] text-slate-400 ml-0.5">tok</span>
        </span>

        <span className="text-slate-600">·</span>

        <span className="flex items-center gap-1 text-[11px] text-amber-300/90 font-medium">
          <Coins className="w-3 h-3 text-amber-400/80 shrink-0" />
          <span>${displayCostUSD.toFixed(3)}</span>
          <span className="text-[10px] text-slate-400">
            ({displayCostEUR.toFixed(3)}€)
          </span>
        </span>

        {!compactOnly && (
          <span className="ml-0.5 text-slate-500">
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </span>
        )}
      </button>

      {/* Volet Déroulant / Modal Télémétrie */}
      {isOpen && !compactOnly && (
        <div className="absolute right-0 top-full mt-2 w-72 p-3.5 rounded-2xl bg-slate-950/95 border border-cyan-500/30 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                Télémétrie Gemini IA
              </span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              title="Réinitialiser les compteurs de session"
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Grille de stats jetons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
              <span className="text-[10px] text-slate-400 font-sans">Prompt (Entrée)</span>
              <span className="text-sm font-mono font-bold text-slate-200">
                {combinedPromptTokens.toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
              <span className="text-[10px] text-slate-400 font-sans">Candidats (Sortie)</span>
              <span className="text-sm font-mono font-bold text-cyan-300">
                {combinedCandidateTokens.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Carte Coût Financier Estimé */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-950/30 to-slate-900/80 border border-amber-500/20 mb-3">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-amber-200/90 font-medium flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" /> Coût de Session :
              </span>
              <span className="font-mono font-bold text-amber-300">
                ${displayCostUSD.toFixed(5)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-amber-500/10">
              <span className="text-slate-400">Équivalent Euro :</span>
              <span className="text-xs font-semibold text-slate-300">
                ≈ {displayCostEUR.toFixed(5)} €
              </span>
            </div>
          </div>

          {/* Footer d'info */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>Modèle : gemini-3.8-flash-tts</span>
            </span>
            <span className="font-mono text-slate-500">
              Calculateur Local Prêt
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
