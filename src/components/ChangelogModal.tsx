'use client';

import React from 'react';
import { Sparkles, X, Check, ArrowRight, ExternalLink, RefreshCw } from 'lucide-react';
import { CHANGELOG_DATA } from '@/lib/changelogData';
import { APP_VERSION } from '@/lib/version';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckUpdate?: () => void;
  isCheckingUpdate?: boolean;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  isOpen,
  onClose,
  onCheckUpdate,
  isCheckingUpdate = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh] text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* EN-TÊTE DU POPUP */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Quoi de neuf ?
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[11px] font-mono font-bold text-cyan-300">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Découvrez les dernières améliorations et nouveautés de Nova Classic
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition active:scale-95"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENU / TIMELINE DES VERSIONS */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 max-h-[65vh] custom-scrollbar">
          {CHANGELOG_DATA.map((release, index) => {
            const isCurrent = release.version === APP_VERSION;
            return (
              <div
                key={release.version}
                className={`relative pl-4 sm:pl-6 border-l-2 ${
                  isCurrent ? 'border-cyan-500' : 'border-slate-800'
                } space-y-2.5 pb-2`}
              >
                {/* Pastille timeline */}
                <div
                  className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${
                    isCurrent
                      ? 'border-cyan-400 bg-cyan-950 shadow-md shadow-cyan-500/30'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                />

                {/* En-tête de version */}
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-cyan-300">
                      v{release.version}
                    </span>
                    {release.isLatest && (
                      <span className="px-2 py-0.2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-semibold text-emerald-300 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Actuelle</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {release.date}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white tracking-tight">
                  {release.title}
                </h4>

                {/* Liste des points forts */}
                <div className="grid gap-2">
                  {release.highlights.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 sm:p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs hover:border-slate-700/80 transition"
                    >
                      <div className="font-semibold text-cyan-200 mb-0.5">
                        {item.category}
                      </div>
                      <p className="text-slate-300 text-[12px] leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* PIED DE PAGE */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {onCheckUpdate && (
              <button
                type="button"
                onClick={onCheckUpdate}
                disabled={isCheckingUpdate}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 font-medium flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-cyan-400 ${
                    isCheckingUpdate ? 'animate-spin' : ''
                  }`}
                />
                <span>Vérifier GitHub</span>
              </button>
            )}
            <a
              href="https://github.com/nxm310/nova-classic"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-cyan-300 inline-flex items-center gap-1 transition"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>C&apos;est compris !</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
