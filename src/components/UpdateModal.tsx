'use client';

import React from 'react';
import { RefreshCw, X, Loader2, ExternalLink, Check, GitCommit, Calendar } from 'lucide-react';

export interface UpdateInfoData {
  latestVersion?: string;
  currentVersion?: string;
  commit?: {
    sha?: string;
    message?: string;
    author?: string;
    date?: string;
    url?: string;
  };
  error?: string;
}

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateChecking: boolean;
  updateInfo: UpdateInfoData | null;
  currentVersion: string;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateChecking,
  updateInfo,
  currentVersion,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <RefreshCw className={`w-5 h-5 ${updateChecking ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Mise à Jour Nova Classic</h3>
              <p className="text-xs text-slate-400">Vérification de l&apos;état du projet sur GitHub</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 max-h-[80vh] custom-scrollbar">
          {updateChecking ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-sm text-slate-300 font-medium">Vérification des commits GitHub...</p>
              <p className="text-xs text-slate-500">Connexion au dépôt nxm310/nova-classic</p>
            </div>
          ) : updateInfo?.error ? (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p>{updateInfo.error}</p>
              <a
                href="https://github.com/nxm310/nova-classic"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
              >
                <span>Voir le dépôt sur GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Version actuelle :</span>
                  <div className="font-mono text-cyan-300 font-bold text-sm">v{currentVersion}</div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Application à jour</span>
                </span>
              </div>

              {updateInfo?.commit && (
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Dernier Commit ({updateInfo.commit.sha})</span>
                    </span>
                    {updateInfo.commit.url && (
                      <a
                        href={updateInfo.commit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <span>Détail</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="font-mono text-slate-400 bg-slate-900 p-2 rounded-lg text-[11px]">
                    {updateInfo.commit.message}
                  </p>
                  {updateInfo.commit.date && (
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(updateInfo.commit.date).toLocaleString('fr-FR')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
