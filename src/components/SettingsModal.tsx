'use client';

import React, { useState, useEffect } from 'react';
import {
  CompanionProfile,
  MemoryItem,
} from '@/types/companion';
import {
  PERSONALITY_PRESETS,
  GEMINI_VOICES,
  AVATAR_OPTIONS,
} from '@/lib/constants';
import { storage, CustomVoiceItem } from '@/lib/storage';
import { audioManager } from '@/lib/audio';
import {
  X,
  User,
  Volume2,
  Brain,
  Key,
  Play,
  Square,
  Plus,
  Trash2,
  ExternalLink,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  HardDrive,
  Download,
  Upload,
  Zap,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { geminiClient } from '@/lib/geminiClient';
import { APP_VERSION } from '@/lib/version';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CompanionProfile;
  onSaveProfile: (newProfile: CompanionProfile) => void;
  memories: MemoryItem[];
  onUpdateMemories: (newMemories: MemoryItem[]) => void;
  onClearHistory: () => void;
  onCheckUpdate?: () => void;
  currentVersion?: string;
}

type TabType = 'character' | 'voice' | 'memory' | 'api' | 'backup';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  memories,
  onUpdateMemories,
  onClearHistory,
  onCheckUpdate,
  currentVersion,
}) => {
  const displayVersion = currentVersion || APP_VERSION;
  const [activeTab, setActiveTab] = useState<TabType>('character');
  const [formData, setFormData] = useState<CompanionProfile>(profile);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(false);
  const [newMemoryInput, setNewMemoryInput] = useState<string>('');
  const [saveToast, setSaveToast] = useState<boolean>(false);

  // Voix personnalisées Google AI Studio
  const [customVoices, setCustomVoices] = useState<CustomVoiceItem[]>([]);
  const [isSyncingAiStudio, setIsSyncingAiStudio] = useState<boolean>(false);
  const [aiStudioStatus, setAiStudioStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isAddingVoice, setIsAddingVoice] = useState<boolean>(false);
  const [newVoiceId, setNewVoiceId] = useState<string>('');
  const [newVoiceName, setNewVoiceName] = useState<string>('');
  const [newVoiceDesc, setNewVoiceDesc] = useState<string>('');

  useEffect(() => {
    setFormData(profile);
    setApiKey(storage.getApiKey());
    setCustomVoices(storage.getCustomVoices());
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    storage.saveApiKey(apiKey);
    storage.saveProfile(formData);
    onSaveProfile(formData);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleExportBackup = () => {
    const config = storage.exportFullConfig();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nova_classic_backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const ok = storage.importFullConfig(json);
        if (ok) {
          const newProf = storage.getProfile();
          setFormData(newProf);
          setApiKey(storage.getApiKey());
          onSaveProfile(newProf);
          alert('✓ Configuration importée avec succès !');
        } else {
          alert('Format de fichier invalide.');
        }
      } catch {
        alert('Impossible de lire le fichier JSON de configuration.');
      }
    };
    reader.readAsText(file);
  };

  const handleTestVoice = async () => {
    if (isPlayingTest) {
      audioManager.stopAll();
      setIsPlayingTest(false);
      return;
    }

    setIsPlayingTest(true);
    const testText = `Salut ! C'est ${formData.name}. Je suis ravi de discuter avec toi !`;
    const currentKey = apiKey || storage.getApiKey();
    const voiceToTest = (formData.customGeminiVoice && formData.customGeminiVoice.trim()) || formData.geminiVoice || 'Aoede';
    const customList = storage.getCustomVoices();
    const customVoiceObj = customList.find(
      (cv) => cv.id.toLowerCase() === voiceToTest.toLowerCase() || cv.name.toLowerCase() === voiceToTest.toLowerCase()
    );

    try {
      const audioUrl = await geminiClient.generateSpeech({
        text: testText,
        voice: voiceToTest,
        apiKey: currentKey,
        style: customVoiceObj?.description,
      });
      audioManager.playAudioStream(
        audioUrl,
        () => setIsPlayingTest(true),
        () => setIsPlayingTest(false),
        () => setIsPlayingTest(false),
        { robotEffect: formData.robotEffect }
      );
    } catch (err: any) {
      console.warn('Erreur test synthèse vocale Gemini:', err);
      setIsPlayingTest(false);
      alert("Erreur lors de la synthèse vocale Gemini : " + (err?.message || err));
    }
  };

  const handleSyncAiStudioVoices = async () => {
    const currentKey = (apiKey || storage.getApiKey() || '').trim();
    if (!currentKey) {
      setAiStudioStatus({
        message: "Renseignez d'abord votre clé API Gemini dans l'onglet 'Clé API' pour synchroniser avec Google AI Studio.",
        type: 'error',
      });
      return;
    }

    setIsSyncingAiStudio(true);
    setAiStudioStatus({ message: 'Interrogation de Google AI Studio...', type: 'info' });

    try {
      const remoteVoices = await geminiClient.listVoices(currentKey);
      if (remoteVoices.length === 0) {
        setAiStudioStatus({
          message: "Aucune voix personnalisée trouvée sur ce projet Google AI Studio. Vous pouvez en créer une dans AI Studio puis entrer son nom ou ID ci-dessous.",
          type: 'info',
        });
      } else {
        remoteVoices.forEach((rv) => {
          storage.addCustomVoice({
            id: rv.id,
            name: rv.name,
            description: rv.description,
            source: 'ai_studio',
          });
        });
        const updated = storage.getCustomVoices();
        setCustomVoices(updated);
        setAiStudioStatus({
          message: `✓ ${remoteVoices.length} voix récupérée(s) depuis Google AI Studio avec succès !`,
          type: 'success',
        });
      }
    } catch (err: any) {
      setAiStudioStatus({
        message: "Erreur de synchronisation avec Google AI Studio : " + (err?.message || err),
        type: 'error',
      });
    } finally {
      setIsSyncingAiStudio(false);
    }
  };

  const handleAddCustomVoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoiceId.trim()) return;

    const added = storage.addCustomVoice({
      id: newVoiceId.trim(),
      name: newVoiceName.trim() || newVoiceId.trim(),
      description: newVoiceDesc.trim() || 'Voix personnalisée Google AI Studio',
      source: 'manual',
    });

    const updated = storage.getCustomVoices();
    setCustomVoices(updated);
    setFormData({
      ...formData,
      geminiVoice: added.id,
      customGeminiVoice: added.id,
    });
    setNewVoiceId('');
    setNewVoiceName('');
    setNewVoiceDesc('');
    setIsAddingVoice(false);
    setAiStudioStatus({
      message: `✓ Voix "${added.name}" enregistrée et sélectionnée !`,
      type: 'success',
    });
  };

  const handleDeleteCustomVoice = (id: string) => {
    storage.deleteCustomVoice(id);
    const updated = storage.getCustomVoices();
    setCustomVoices(updated);
    if (formData.customGeminiVoice === id || formData.geminiVoice === id) {
      setFormData({
        ...formData,
        geminiVoice: 'Aoede',
        customGeminiVoice: '',
      });
    }
  };

  const handleAddMemory = () => {
    if (!newMemoryInput.trim()) return;
    const added = storage.addMemory(newMemoryInput.trim());
    onUpdateMemories([...memories, added]);
    setNewMemoryInput('');
  };

  const handleDeleteMemory = (id: string) => {
    storage.deleteMemory(id);
    onUpdateMemories(memories.filter((m) => m.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
      <div className="relative flex flex-col w-full max-w-xl max-h-[90dvh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>⚙️</span> Paramètres de Nova Classic
            {onCheckUpdate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCheckUpdate();
                }}
                className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 transition group cursor-pointer"
                title="Vérifier les mises à jour"
              >
                <span>v{displayVersion}</span>
                <RefreshCw className="w-3 h-3 text-cyan-400 group-hover:rotate-180 transition-transform duration-500" />
              </button>
            )}
          </h2>
          <button
            type="button"
            onClick={() => {
              audioManager.stopAll();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Onglets */}
        <div className="p-2 border-b border-slate-800 bg-slate-950/80">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('character')}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-semibold rounded-xl transition text-center ${
                activeTab === 'character'
                  ? 'bg-accent-600/30 text-accent-300 border border-accent-500/60 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800/80'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Caractère</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('voice')}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-semibold rounded-xl transition text-center ${
                activeTab === 'voice'
                  ? 'bg-accent-600/30 text-accent-300 border border-accent-500/60 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800/80'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Voix</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('memory')}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-semibold rounded-xl transition text-center ${
                activeTab === 'memory'
                  ? 'bg-accent-600/30 text-accent-300 border border-accent-500/60 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800/80'
              }`}
            >
              <Brain className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Mémoire ({memories.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('api')}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-semibold rounded-xl transition text-center ${
                activeTab === 'api'
                  ? 'bg-accent-600/30 text-accent-300 border border-accent-500/60 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800/80'
              }`}
            >
              <Key className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Clé & Modèle</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('backup')}
              className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-semibold rounded-xl transition text-center ${
                activeTab === 'backup'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/60 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800/80'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 shrink-0 text-purple-400" />
              <span className="truncate">Sauvegarde</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: CARACTÈRE */}
          {activeTab === 'character' && (
            <div className="space-y-4 animate-fade-in">
              {/* Prénom & Avatar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Prénom du compagnon
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-accent-500 text-sm"
                    placeholder="Ex: Léo, Maya, Aria..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Avatar
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {AVATAR_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatar: emoji })}
                        className={`text-xl p-1.5 rounded-lg border transition ${
                          formData.avatar === emoji
                            ? 'border-accent-500 bg-accent-500/20 scale-110'
                            : 'border-slate-800 hover:border-slate-600 bg-slate-950'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Type de caractère (Presets) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Personnalité & Humeur
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PERSONALITY_PRESETS.map((p) => {
                    const isSelected = formData.presetId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setFormData({ ...formData, presetId: p.id })}
                        className={`cursor-pointer p-3 rounded-xl border text-left transition ${
                          isSelected
                            ? 'border-accent-500 bg-accent-950/30 ring-1 ring-accent-500'
                            : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{p.emoji}</span>
                          <span className="font-semibold text-sm text-slate-200">
                            {p.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {p.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Longueur des réponses */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Longueur des réponses
                    </label>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                    {formData.responseLength === 'ultra_concise' && '⚡ Ultra-concise (1 phrase max)'}
                    {(!formData.responseLength || formData.responseLength === 'short') && '🎯 Courte (1 à 2 phrases) - Recommandé'}
                    {formData.responseLength === 'balanced' && '⚖️ Équilibrée (2 à 4 phrases)'}
                    {formData.responseLength === 'detailed' && '📖 Détaillée & Pédagogue'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    { id: 'ultra_concise', label: 'Ultra-courte', desc: '1 phrase max' },
                    { id: 'short', label: 'Courte (Défaut)', desc: '1 à 2 phrases' },
                    { id: 'balanced', label: 'Équilibrée', desc: '2 à 4 phrases' },
                    { id: 'detailed', label: 'Détaillée', desc: 'Complète' },
                  ].map((item) => {
                    const isSelected = (formData.responseLength || 'short') === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, responseLength: item.id as any })}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/40 shadow-sm'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-semibold">{item.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recherche Google en direct */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <span>🌐</span> Recherche Web Google en temps réel
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Permet à l&apos;IA de consulter le web pour les actualités récentes, documentations et puces tech.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.webSearch ?? true}
                  onChange={(e) => setFormData({ ...formData, webSearch: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900 cursor-pointer"
                />
              </div>

              {/* Consignes personnalisées */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Consignes particulières (Prompt additionnel)
                </label>
                <textarea
                  rows={2}
                  value={formData.customInstructions}
                  onChange={(e) => setFormData({ ...formData, customInstructions: e.target.value })}
                  placeholder="Ex: Reste dynamique, pose parfois des questions, utilise un vocabulaire soigné..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-accent-500 text-xs font-sans leading-relaxed"
                />
              </div>

              {/* Ce que l'ami sait de toi */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Ce que ton compagnon sait de toi (Contexte personnel)
                </label>
                <textarea
                  rows={2}
                  value={formData.userContext}
                  onChange={(e) => setFormData({ ...formData, userContext: e.target.value })}
                  placeholder="Ex: Prénom: Alex, passions: programmation, musique, cinéma..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-accent-500 text-xs font-sans leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 2: VOIX & AUDIO */}
          {activeTab === 'voice' && (
            <div className="space-y-4 animate-fade-in">
              {/* Voix Personnalisées Google AI Studio */}
              <div className="p-4 bg-slate-950/80 border border-cyan-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>Voix Personnalisées Google AI Studio</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Synchronise ou utilise les voix générées avec Voice Design ou Voice Replication.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncAiStudioVoices}
                    disabled={isSyncingAiStudio}
                    className="px-3 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 rounded-xl text-xs font-semibold text-cyan-200 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAiStudio ? 'animate-spin' : ''}`} />
                    <span>{isSyncingAiStudio ? 'Sync...' : 'Synchroniser AI Studio'}</span>
                  </button>
                </div>

                {aiStudioStatus && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      aiStudioStatus.type === 'success'
                        ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                        : aiStudioStatus.type === 'error'
                        ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                        : 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-300'
                    }`}
                  >
                    <span>{aiStudioStatus.message}</span>
                  </div>
                )}

                {/* Formulaire ajout manuel de voix */}
                {isAddingVoice ? (
                  <form onSubmit={handleAddCustomVoice} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <div className="text-xs font-semibold text-slate-200">Ajouter une voix par son ID ou nom AI Studio :</div>
                    <input
                      type="text"
                      placeholder="ID ou nom de la voix (ex: voice_12345 ou MonNomDeVoix)"
                      value={newVoiceId}
                      onChange={(e) => setNewVoiceId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Nom d'affichage (ex: Ma Voix Nova)"
                      value={newVoiceName}
                      onChange={(e) => setNewVoiceName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingVoice(false)}
                        className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-semibold text-white"
                      >
                        Ajouter la voix
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingVoice(true)}
                    className="w-full py-2 border border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl text-xs text-slate-400 hover:text-cyan-300 transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une voix manuellement par son ID</span>
                  </button>
                )}

                {/* Liste des voix AI Studio enregistrées */}
                {customVoices.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Vos voix personnalisées :
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                      {customVoices.map((v) => {
                        const isSelected = (formData.customGeminiVoice === v.id) || (formData.geminiVoice === v.id);
                        return (
                          <div
                            key={v.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                              isSelected
                                ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 ring-1 ring-cyan-500/50'
                                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  geminiVoice: v.id,
                                  customGeminiVoice: v.id,
                                });
                              }}
                              className="flex-1 text-left flex items-center gap-2 min-w-0"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <div className="truncate">
                                <span className="font-semibold block truncate">{v.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono truncate">{v.id}</span>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomVoice(v.id)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-rose-400 shrink-0 ml-2"
                              title="Supprimer cette voix de la liste"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Voix Natives Gemini */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Voix de Base Google Gemini (3.8 Flash TTS)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GEMINI_VOICES.map((v) => {
                    const isSelected = !formData.customGeminiVoice && formData.geminiVoice === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            geminiVoice: v.id,
                            customGeminiVoice: '',
                          });
                        }}
                        className={`p-3 rounded-xl border text-left transition ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/40'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-200">{v.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{v.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Effet Robotique & Bouton Test */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      🤖 Voix Robot (Effet Métallique Sci-Fi)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Applique une résonance de vocoder légère sur la voix choisie.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.robotEffect ?? false}
                    onChange={(e) => setFormData({ ...formData, robotEffect: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900 cursor-pointer"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Tester le rendu sonore :</span>
                  <button
                    type="button"
                    onClick={handleTestVoice}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-md shadow-cyan-600/30"
                  >
                    {isPlayingTest ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlayingTest ? 'Arrêter' : '▶️ Écouter un extrait de la voix'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MÉMOIRE */}
          {activeTab === 'memory' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-xs text-slate-400">
                Les mémoires sont des faits permanents retenus par votre compagnon au fil de vos échanges.
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMemoryInput}
                  onChange={(e) => setNewMemoryInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMemory()}
                  placeholder="Ajouter un souvenir manuellement..."
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleAddMemory}
                  className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-xs font-semibold text-white transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {memories.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    Aucun souvenir enregistré pour l&apos;instant.
                  </div>
                ) : (
                  memories.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs text-slate-200"
                    >
                      <span className="flex-1 mr-2">{m.content}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteMemory(m.id)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CLÉ API & MODÈLE */}
          {activeTab === 'api' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Clé API Google Gemini (Google AI Studio)
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Ta clé est stockée uniquement sur ton appareil / navigateur local. Elle n&apos;est jamais transmise à un tiers.
                </p>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 pr-10 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-accent-500 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs text-blue-300 leading-relaxed">
                <div className="font-semibold mb-1 flex items-center gap-1.5">
                  <span>💡</span> Obtenir une clé gratuite :
                </div>
                Tu peux générer une clé API en 30 secondes sur{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline inline-flex items-center gap-0.5 hover:text-blue-200"
                >
                  Google AI Studio <ExternalLink className="w-3 h-3" />
                </a>{' '}
                avec ton compte Google (quota gratuit disponible).
              </div>

              {/* Sélection du modèle de réponse */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Moteur IA & Modèle
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      id: '3.8-flash-tts' as const,
                      title: '🎙️ Gemini 3.8 Flash TTS',
                      desc: 'Moteur vocal haute fidélité pour une intonation ultra-naturelle et instantanée.',
                      badge: 'Recommandé 2026',
                    },
                    {
                      id: '3.8-live' as const,
                      title: '✨ Gemini 3.8 LIVE',
                      desc: 'Modèle audio natif bidirectionnel ultra-rapide (<0.5s) en temps réel.',
                      badge: 'Temps Réel Direct',
                    },
                    {
                      id: '3.8-flash' as const,
                      title: '⚡ Gemini 3.8 Flash',
                      desc: 'Ultra-rapide et économique, idéal pour les dialogues textuels fluides.',
                      badge: 'Rapide',
                    },
                    {
                      id: 'high' as const,
                      title: '🧠 Gemini 3.1 Pro',
                      desc: 'Raisonnement approfondi et réponses très riches pour les questions complexes.',
                      badge: 'Haute Intelligence',
                    },
                  ].map((opt) => {
                    const isSelected = (formData.responseQuality || '3.8-flash-tts') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, responseQuality: opt.id })}
                        className={`p-3 rounded-xl border text-left transition ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/40 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-slate-200">{opt.title}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                            {opt.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Effacer la conversation */}
              <div className="pt-3 border-t border-slate-800">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Zone de réinitialisation
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Voulez-vous vraiment effacer tout l'historique de discussion ?")) {
                      onClearHistory();
                      alert('Historique effacé.');
                    }
                  }}
                  className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-xs font-medium text-red-300 transition"
                >
                  Effacer l&apos;historique de discussion
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: SAUVEGARDE */}
          {activeTab === 'backup' && (
            <div className="space-y-4 animate-fade-in text-slate-200">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-purple-400" />
                  <h3 className="font-semibold text-sm text-white">
                    Sauvegarde & Restauration des Données
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Exportez l&apos;intégralité de vos réglages (profil, voix, clé API et mémoires) sous forme de fichier JSON sécurisé.
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-cyan-300 transition flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger la sauvegarde (.json)
                  </button>

                  <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition flex items-center gap-2 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-purple-300" />
                    <span>Restaurer depuis un fichier (.json)</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-950">
          <div className="text-xs text-slate-400">
            {saveToast && (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Enregistré avec succès !
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                audioManager.stopAll();
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-accent-600 hover:bg-accent-500 text-white shadow-lg shadow-accent-600/30 transition"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
