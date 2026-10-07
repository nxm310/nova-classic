'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CompanionProfile,
  ChatMessage,
  MemoryItem,
} from '@/types/companion';
import { DEFAULT_PROFILE, PERSONALITY_PRESETS } from '@/lib/constants';
import { storage } from '@/lib/storage';
import { audioManager } from '@/lib/audio';
import { cleanTextForSpeech } from '@/lib/speechUtils';
import { SettingsModal } from '@/components/SettingsModal';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { ConversationModal, LiveCallState } from '@/components/ConversationModal';
import { ChangelogModal } from '@/components/ChangelogModal';
import { TelemetryWidget } from '@/components/TelemetryWidget';
import { visionManager } from '@/lib/vision';
import { geminiClient } from '@/lib/geminiClient';
import {
  Settings,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Phone,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  ExternalLink,
  Zap,
  Radio,
  GitCommit,
  Calendar,
  User,
  MessageSquare,
} from 'lucide-react';
import { APP_VERSION } from '@/lib/version';

export default function NovaClassicApp() {
  const [profile, setProfile] = useState<CompanionProfile>(DEFAULT_PROFILE);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Vision écran et flux d'analyse
  const [isVisionActive, setIsVisionActive] = useState(false);

  // États du Pop-up Nouveautés & Version (Changelog)
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  // États de la Mise à Jour GitHub
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
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
  } | null>(null);

  // États pour le Mode Appel Mains-Libres continu
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callState, setCallState] = useState<LiveCallState>('listening');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastReply, setLastReply] = useState('');
  const [isCallMuted, setIsCallMuted] = useState<boolean>(false);
  const isCallMutedRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef(messages);
  const recognitionRef = useRef<any>(null);
  const continuousRecognizerRef = useRef<any>(null);
  const isCallActiveRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('nova_classic_call_muted') === 'true';
      setIsCallMuted(savedMute);
      isCallMutedRef.current = savedMute;
    }
  }, []);

  const handleToggleCallMute = () => {
    setIsCallMuted((prev) => {
      const next = !prev;
      isCallMutedRef.current = next;
      if (typeof window !== 'undefined') {
        localStorage.setItem('nova_classic_call_muted', String(next));
      }
      if (next) {
        audioManager.stopAll();
        setIsPlayingAudio(false);
        setPlayingMessageId(null);
        if (isCallActiveRef.current && callState === 'speaking') {
          setCallState('listening');
          continuousRecognizerRef.current?.start();
        }
      }
      return next;
    });
  };

  useEffect(() => {
    const loadedProfile = storage.getProfile();
    const loadedMessages = storage.getMessages();
    const loadedMemories = storage.getMemories();

    setProfile(loadedProfile);
    setMessages(loadedMessages);
    messagesRef.current = loadedMessages;
    setMemories(loadedMemories);

    // Vérification de la version vue pour afficher le pop-up Quoi de neuf automatiquement
    if (typeof window !== 'undefined') {
      const lastSeenVersion = localStorage.getItem('nova_classic_last_seen_version');
      if (lastSeenVersion !== APP_VERSION) {
        const timer = setTimeout(() => {
          setIsChangelogOpen(true);
          localStorage.setItem('nova_classic_last_seen_version', APP_VERSION);
        }, 700);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateMessages = (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    messagesRef.current = newMessages;
    storage.saveMessages(newMessages);
  };

  const handleCheckUpdate = async () => {
    setIsUpdateModalOpen(true);
    setUpdateChecking(true);
    try {
      const res = await fetch('https://api.github.com/repos/nxm310/nova-classic/commits/main');
      if (res.ok) {
        const cJson = await res.json();
        setUpdateInfo({
          currentVersion: APP_VERSION,
          latestVersion: APP_VERSION,
          commit: {
            sha: cJson.sha ? cJson.sha.slice(0, 7) : '',
            message: cJson.commit?.message || '',
            author: cJson.commit?.author?.name || 'nxm310',
            date: cJson.commit?.author?.date || '',
            url: cJson.html_url || '',
          },
        });
      } else {
        setUpdateInfo({
          currentVersion: APP_VERSION,
          latestVersion: APP_VERSION,
          error: "Dépôt GitHub en cours d'initialisation ou quota API temporaire.",
        });
      }
    } catch (err: any) {
      setUpdateInfo({ error: "Impossible de joindre GitHub : " + (err?.message || err) });
    } finally {
      setUpdateChecking(false);
    }
  };

  const handleToggleVision = async () => {
    if (isVisionActive) {
      visionManager.stopScreenShare();
      setIsVisionActive(false);
    } else {
      const ok = await visionManager.startScreenShare(() => {
        setIsVisionActive(false);
      });
      setIsVisionActive(ok);
    }
  };

  const playSpeech = async (
    text: string,
    messageId?: string,
    onEndCallback?: () => void
  ) => {
    try {
      if (!text || !text.trim()) {
        if (onEndCallback) onEndCallback();
        return;
      }

      setIsPlayingAudio(true);
      if (messageId) setPlayingMessageId(messageId);

      const apiKey = storage.getApiKey();
      const voiceToUse = (profile.customGeminiVoice && profile.customGeminiVoice.trim()) || profile.geminiVoice || 'Aoede';
      const customList = storage.getCustomVoices();
      const customVoiceObj = customList.find(
        (cv) => cv.id.toLowerCase() === voiceToUse.toLowerCase() || cv.name.toLowerCase() === voiceToUse.toLowerCase()
      );

      const audioUrl = await geminiClient.generateSpeech({
        text,
        voice: voiceToUse,
        apiKey,
        style: customVoiceObj?.description,
      });

      audioManager.playAudioStream(
        audioUrl,
        () => {
          setIsPlayingAudio(true);
          if (messageId) setPlayingMessageId(messageId);
        },
        () => {
          setIsPlayingAudio(false);
          setPlayingMessageId(null);
          if (onEndCallback) onEndCallback();
        },
        () => {
          setIsPlayingAudio(false);
          setPlayingMessageId(null);
          if (onEndCallback) onEndCallback();
        },
        { robotEffect: profile.robotEffect }
      );
    } catch (err) {
      console.warn('Erreur lors de la lecture audio:', err);
      setIsPlayingAudio(false);
      setPlayingMessageId(null);
      if (onEndCallback) onEndCallback();
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    // Déverrouiller le canal audio sur l'interaction utilisateur (crucial pour iOS Safari)
    audioManager.unlock().catch(() => {});

    if (!textToSend) setInputText('');

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now() + '_u',
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newHistory = [...messagesRef.current, userMessage];
    updateMessages(newHistory);
    setIsLoading(true);

    let imageBase64: string | undefined = undefined;
    if (isVisionActive) {
      imageBase64 = visionManager.captureFrameBase64() || undefined;
    }

    try {
      const apiKey = storage.getApiKey();
      const formattedHistory = newHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const botReply = await geminiClient.sendMessage({
        messages: formattedHistory,
        profile,
        apiKey: apiKey || '',
        memories,
        imageBase64,
      });

      const displayReply = botReply.trim();

      const botMessage: ChatMessage = {
        id: 'msg_' + Date.now() + '_a',
        role: 'assistant',
        content: displayReply,
        timestamp: Date.now(),
      };

      const finalHistory = [...newHistory, botMessage];
      updateMessages(finalHistory);
      messagesRef.current = finalHistory;
      setLastReply(displayReply);

      if (profile.autoPlayVoice) {
        const speechText = cleanTextForSpeech(displayReply);
        if (speechText) {
          playSpeech(speechText, botMessage.id);
        }
      }
    } catch (err: any) {
      console.error('Erreur chat:', err);
      const errorMessage: ChatMessage = {
        id: 'msg_' + Date.now() + '_err',
        role: 'assistant',
        content: `Désolé, une erreur s'est produite : ${err.message || 'Échec de connexion à Gemini.'}`,
        timestamp: Date.now(),
      };
      updateMessages([...newHistory, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Dictée Vocale Simple (Microphone) ---
  const toggleVoiceRecording = async () => {
    // Déverrouiller immédiatement le pipeline audio sur le tap utilisateur (requis iOS)
    audioManager.unlock().catch(() => {});

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    audioManager.stopAll();
    setIsPlayingAudio(false);
    setPlayingMessageId(null);

    // Léger délai pour s'assurer que le matériel audio est bien libéré par tout élément audio en cours
    await new Promise((r) => setTimeout(r, 60));

    const rec = audioManager.createSpeechRecognition(
      (transcript) => {
        setIsRecording(false);
        if (transcript.trim()) {
          handleSendMessage(transcript.trim());
        }
      },
      (err) => {
        console.warn('Erreur reconnaissance vocale:', err);
        setIsRecording(false);
      },
      () => {
        setIsRecording(false);
      }
    );

    if (rec) {
      recognitionRef.current = rec;
      try {
        rec.start();
        setIsRecording(true);
      } catch (e) {
        console.warn('Échec démarrage dictée vocale:', e);
        setIsRecording(false);
      }
    } else {
      alert("La reconnaissance vocale n'est pas supportée sur ce navigateur.");
    }
  };

  // --- Mode Appel Mains-Libres Continu (DirectLive) ---
  const startHandsFreeCall = () => {
    // Déverrouiller le contexte audio dès le tap (crucial pour iOS)
    audioManager.unlock().catch(() => {});

    setIsCallModalOpen(true);
    isCallActiveRef.current = true;
    setCallState('listening');
    setLiveTranscript('');

    audioManager.stopAll();
    setIsPlayingAudio(false);
    setPlayingMessageId(null);

    const continuousRec = audioManager.createContinuousSpeechRecognizer({
      onInterim: (interimText) => {
        setLiveTranscript(interimText);
      },
      onFinalSilence: async (finalText) => {
        if (!finalText.trim() || !isCallActiveRef.current) return;
        setLiveTranscript(finalText);
        setCallState('thinking');
        continuousRecognizerRef.current?.pause();
        await handleLiveMessage(finalText.trim());
      },
      onError: (err) => {
        console.warn('[Mode Appel] Erreur reconnaissance:', err);
      },
      silenceMs: 1300,
    });

    if (continuousRec) {
      continuousRecognizerRef.current = continuousRec;
      continuousRec.start();
    }
  };

  const stopHandsFreeCall = () => {
    isCallActiveRef.current = false;
    setIsCallModalOpen(false);
    if (continuousRecognizerRef.current) {
      continuousRecognizerRef.current.stop();
      continuousRecognizerRef.current = null;
    }
    audioManager.stopAll();
    setIsPlayingAudio(false);
    setPlayingMessageId(null);
  };

  const handleInterruptCall = () => {
    audioManager.stopAll();
    setIsPlayingAudio(false);
    setPlayingMessageId(null);
    if (isCallActiveRef.current) {
      setCallState('listening');
      continuousRecognizerRef.current?.start();
    }
  };

  const handleSendCallText = async (text: string) => {
    if (!text.trim() || !isCallActiveRef.current) return;
    setCallState('thinking');
    continuousRecognizerRef.current?.pause();
    await handleLiveMessage(text.trim());
  };

  const handleLiveMessage = async (text: string) => {
    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now() + '_u',
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newHistory = [...messagesRef.current, userMessage];
    updateMessages(newHistory);

    let imageBase64: string | undefined = undefined;
    if (isVisionActive) {
      imageBase64 = visionManager.captureFrameBase64() || undefined;
    }

    try {
      const apiKey = storage.getApiKey();
      const formattedHistory = newHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const botReply = await geminiClient.sendMessage({
        messages: formattedHistory,
        profile,
        apiKey: apiKey || '',
        memories,
        imageBase64,
      });

      const displayReply = botReply.trim();

      const botMessage: ChatMessage = {
        id: 'msg_' + Date.now() + '_a',
        role: 'assistant',
        content: displayReply,
        timestamp: Date.now(),
      };

      const finalHistory = [...newHistory, botMessage];
      updateMessages(finalHistory);
      messagesRef.current = finalHistory;
      setLastReply(displayReply);

      if (!isCallActiveRef.current) return;

      if (!isCallMutedRef.current) {
        setCallState('speaking');
        const speechText = cleanTextForSpeech(displayReply);
        if (speechText) {
          playSpeech(speechText, botMessage.id, () => {
            if (isCallActiveRef.current) {
              setCallState('listening');
              // Laisser 150ms à iOS pour libérer le hardware audio avant de relancer le micro
              setTimeout(() => {
                if (isCallActiveRef.current) {
                  continuousRecognizerRef.current?.start();
                }
              }, 150);
            }
          });
        } else {
          setCallState('listening');
          setTimeout(() => {
            if (isCallActiveRef.current) {
              continuousRecognizerRef.current?.start();
            }
          }, 100);
        }
      } else {
        setCallState('listening');
        continuousRecognizerRef.current?.start();
      }
    } catch (err: any) {
      console.error('Erreur live call:', err);
      if (isCallActiveRef.current) {
        setCallState('listening');
        setTimeout(() => {
          if (isCallActiveRef.current) {
            continuousRecognizerRef.current?.start();
          }
        }, 150);
      }
    }
  };

  const currentPreset = PERSONALITY_PRESETS.find((p) => p.id === profile.presetId);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-950 text-slate-100 overflow-hidden relative selection:bg-cyan-500/30">
      {/* HEADER PRINCIPAL */}
      <header className="flex flex-col bg-slate-900/95 border-b border-slate-800/80 backdrop-blur-xl z-30 safe-top select-none shrink-0 shadow-lg">
        {/* ÉTAGE 1 : HUD & TÉLÉMÉTRIE */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-2 border-b border-slate-800/50 gap-2">
          {/* Identité */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br from-cyan-500/20 to-indigo-600/30 border transition-all duration-300 ${
                  isPlayingAudio
                    ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-500/20 scale-105'
                    : 'border-slate-700/80'
                }`}
              >
                {profile.avatar}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                  isPlayingAudio
                    ? 'bg-cyan-400 animate-pulse'
                    : isRecording
                    ? 'bg-rose-400 animate-ping'
                    : 'bg-emerald-400'
                }`}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm text-white tracking-tight truncate">
                  {profile.name}
                </h1>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-medium border border-cyan-500/20 uppercase tracking-wider">
                  {currentPreset?.name.split('&')[0].trim() || 'Compagnon'}
                </span>
                {/* Bouton Nouveautés / Changelog */}
                <button
                  type="button"
                  onClick={() => setIsChangelogOpen(true)}
                  className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 font-bold transition active:scale-95 group cursor-pointer"
                  title="Voir les nouveautés de Nova Classic"
                >
                  <Sparkles className="w-2.5 h-2.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span>v{APP_VERSION}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Visualiseur & Télémétrie */}
          <div className="flex items-center gap-2 shrink-0">
            <AudioVisualizer isPlaying={isPlayingAudio} isListening={isRecording} />
            <TelemetryWidget />
          </div>
        </div>

        {/* ÉTAGE 2 : ACTIONS & CONTRÔLES */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-2 gap-2">
          {/* Actions Vocales & Visuelles */}
          <div className="flex items-center gap-2">
            {/* Bouton Appel Direct Mains-Libres */}
            <button
              type="button"
              onClick={startHandsFreeCall}
              className="h-10 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-cyan-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/25 active:scale-95 transition flex items-center gap-2"
              title="Démarrer un appel vocal direct mains-libres"
            >
              <Phone className="w-4 h-4 text-cyan-200 animate-pulse" />
              <span className="font-bold tracking-wide">Appel Direct</span>
              <span className="hidden sm:inline text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-cyan-100">Live</span>
            </button>

            {/* Bouton Vision Écran */}
            <button
              type="button"
              onClick={handleToggleVision}
              className={`h-10 px-3 rounded-xl border text-xs font-semibold shadow-sm active:scale-95 transition flex items-center gap-1.5 ${
                isVisionActive
                  ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20 animate-pulse'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700/80 text-slate-300'
              }`}
              title={
                isVisionActive
                  ? "Désactiver le flux vidéo d'écran"
                  : "Activer la vision d'écran (partager une fenêtre ou tout l'écran avec votre compagnon)"
              }
            >
              {isVisionActive ? (
                <Eye className="w-4 h-4 text-white" />
              ) : (
                <EyeOff className="w-4 h-4 text-slate-400" />
              )}
              <span className="hidden sm:inline">
                {isVisionActive ? 'Vision ON' : 'Vision'}
              </span>
            </button>
          </div>

          {/* Outils & Configuration */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Bascule lecture auto voix */}
            <button
              type="button"
              onClick={() => {
                const updated = { ...profile, autoPlayVoice: !profile.autoPlayVoice };
                setProfile(updated);
                storage.saveProfile(updated);
              }}
              title={profile.autoPlayVoice ? 'Voix activée (cliquer pour couper)' : 'Voix coupée (cliquer pour activer)'}
              className={`w-10 h-10 rounded-xl border transition active:scale-95 flex items-center justify-center ${
                profile.autoPlayVoice
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25'
                  : 'bg-slate-800/70 border-slate-700/70 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {profile.autoPlayVoice ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            {/* Bouton Effacer la conversation */}
            <button
              type="button"
              onClick={() => {
                if (confirm('Effacer tous les messages de la conversation ?')) {
                  updateMessages([]);
                  storage.clearMessages();
                }
              }}
              title="Effacer l'historique"
              className="w-10 h-10 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 text-slate-400 hover:text-rose-400 transition active:scale-95 flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Bouton Réglages */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="Paramètres du compagnon"
              className="h-10 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-slate-300 hover:text-cyan-300 transition active:scale-95 flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline text-xs font-semibold">Réglages</span>
            </button>
          </div>
        </div>
      </header>

      {/* ZONE CENTRALE : CHAT STREAM & ACCUEIL */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950 relative">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #06b6d4 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative z-10 custom-scrollbar">
          <div className="max-w-4xl mx-auto w-full">
            {messages.length === 0 ? (
              /* ACCUEIL CONVERSATIONNEL IA */
              <div className="flex flex-col items-center min-h-[70vh] text-center px-2 sm:px-4 py-4 animate-fade-in space-y-6">
                <div className="relative pt-2">
                  <div className="absolute -inset-4 rounded-full bg-cyan-500/20 blur-2xl animate-pulse" />
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-cyan-600/30 via-slate-900/90 to-purple-600/30 border-2 border-cyan-400/50 flex items-center justify-center text-4xl sm:text-5xl shadow-2xl shadow-cyan-500/30 ring-4 ring-cyan-500/10">
                    {profile.avatar}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-[11px] font-mono text-cyan-300 shadow-sm">
                    <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span>COMPAGNON CONVERSATIONNEL IA</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Bonjour, je suis {profile.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                    Échangez à la voix ou à l&apos;écrit, partagez votre écran et profitez de l&apos;intelligence artificielle Gemini avec fluidité.
                  </p>
                </div>

                {/* Badges fonctionnels */}
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 shadow-sm">
                    <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Gemini 3.8 Flash TTS</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 shadow-sm">
                    <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Appel DirectLive Mains-Libres</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Voix Google AI Studio</span>
                  </div>
                </div>

                {/* Suggestions de départ */}
                <div className="w-full max-w-2xl pt-4 text-left">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Suggestions de discussion :</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        title: 'Actualités Tech en direct',
                        prompt: 'Quelles sont les dernières actualités technologiques marquantes de ces derniers jours ?',
                        desc: 'Recherche Google Web instantanée',
                      },
                      {
                        title: 'Idée créative',
                        prompt: 'Donne-moi 3 idées de projets créatifs stimulants à développer ce mois-ci.',
                        desc: 'Brainstorming & imagination',
                      },
                      {
                        title: 'Analyse d\'écran',
                        prompt: "J'active la vision : que vois-tu à l'écran et que me conseilles-tu ?",
                        desc: 'Multimodal vision Gemini',
                      },
                      {
                        title: 'Discussion amicale',
                        prompt: 'Comment te sens-tu aujourd\'hui ? De quoi as-tu envie de discuter ?',
                        desc: 'Dialogue naturel & spontané',
                      },
                    ].map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(s.prompt)}
                        className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800/80 hover:border-cyan-500/40 text-left transition active:scale-[0.98] group shadow-sm"
                      >
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 mb-1">
                          {s.title}
                        </div>
                        <div className="text-[11px] text-slate-400 italic mb-1.5 truncate">
                          « {s.prompt} »
                        </div>
                        <div className="text-[10px] text-slate-500">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* FLUX DE MESSAGES */
              <div className="space-y-4">
                {messages.map((message) => {
                  const isUser = message.role === 'user';
                  const isPlaying = isPlayingAudio && playingMessageId === message.id;

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 text-sm animate-fade-in ${
                        isUser ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 select-none shadow-sm ${
                          isUser
                            ? 'bg-slate-800 text-slate-200 border border-slate-700'
                            : 'bg-gradient-to-br from-cyan-600/30 to-indigo-600/30 border border-cyan-500/40 text-cyan-200'
                        }`}
                      >
                        {isUser ? '👤' : profile.avatar}
                      </div>

                      {/* Bulle de message */}
                      <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`p-3.5 rounded-2xl shadow-md whitespace-pre-wrap leading-relaxed ${
                            isUser
                              ? 'bg-cyan-600 text-white rounded-tr-none'
                              : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                          }`}
                        >
                          {message.content}
                        </div>

                        {/* Actions sous la bulle */}
                        <div className="flex items-center gap-1.5 mt-1 px-1 text-[11px] text-slate-500">
                          <span>
                            {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>

                          {!isUser && (
                            <>
                              <span>·</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isPlaying) {
                                    audioManager.stopAll();
                                    setIsPlayingAudio(false);
                                    setPlayingMessageId(null);
                                  } else {
                                    const speechText = cleanTextForSpeech(message.content);
                                    if (speechText) {
                                      playSpeech(speechText, message.id);
                                    }
                                  }
                                }}
                                className="hover:text-cyan-400 transition flex items-center gap-0.5"
                                title="Écouter ce message"
                              >
                                {isPlaying ? (
                                  <>
                                    <Square className="w-3 h-3 text-rose-400" />
                                    <span className="text-rose-400 font-medium">Stop</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3 h-3" />
                                    <span>Écouter</span>
                                  </>
                                )}
                              </button>

                              <span>·</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(message.content);
                                  setCopiedId(message.id);
                                  setTimeout(() => setCopiedId(null), 2000);
                                }}
                                className="hover:text-slate-300 transition flex items-center gap-0.5"
                                title="Copier le texte"
                              >
                                {copiedId === message.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400 font-medium">Copié</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copier</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex gap-3 text-sm animate-fade-in items-center">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sm text-cyan-400">
                      {profile.avatar}
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span className="text-xs">Réflexion en cours...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* FOOTER : CHAMP DE SAISIE */}
        <footer className="p-3 sm:p-4 bg-slate-900/95 border-t border-slate-800/80 backdrop-blur-xl z-20 safe-bottom">
          <div className="max-w-4xl mx-auto w-full">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              {/* Bouton Microphone */}
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`h-12 w-12 rounded-2xl border transition-all duration-200 flex items-center justify-center flex-shrink-0 relative shadow-md active:scale-95 ${
                  isRecording
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse shadow-rose-500/30 ring-2 ring-rose-500/40'
                    : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-200 hover:text-white'
                }`}
                title={isRecording ? 'Arrêter la dictée' : 'Parler au micro'}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-cyan-400" />}
              </button>

              {/* Champ texte */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isRecording
                      ? 'Écoute en cours...'
                      : `Message pour ${profile.name}...`
                  }
                  className="w-full h-12 px-4 bg-slate-950/90 border border-slate-700/80 rounded-2xl focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 text-sm text-white placeholder-slate-500 transition shadow-inner font-sans"
                />
              </div>

              {/* Bouton Envoyer */}
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="h-12 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 disabled:hover:from-cyan-600 disabled:hover:to-indigo-600 text-white font-semibold transition shadow-lg shadow-cyan-600/25 flex items-center justify-center gap-1.5 flex-shrink-0 active:scale-95"
                title="Envoyer le message"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Envoyer</span>
              </button>
            </form>
          </div>
        </footer>
      </div>

      {/* MODAL PARAMÈTRES */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onSaveProfile={(newProf) => {
          setProfile(newProf);
          storage.saveProfile(newProf);
        }}
        memories={memories}
        onUpdateMemories={(newMems) => setMemories(newMems)}
        onClearHistory={() => {
          updateMessages([]);
          storage.clearMessages();
        }}
        onCheckUpdate={handleCheckUpdate}
        currentVersion={APP_VERSION}
      />

      {/* MODAL APPEL DIRECT MAINS-LIBRES */}
      <ConversationModal
        isOpen={isCallModalOpen}
        onClose={stopHandsFreeCall}
        profile={profile}
        callState={callState}
        liveTranscript={liveTranscript}
        lastReply={lastReply}
        onInterrupt={handleInterruptCall}
        onSendMessage={handleSendCallText}
        isVisionActive={isVisionActive}
        onToggleVision={handleToggleVision}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isMuted={isCallMuted}
        onToggleMute={handleToggleCallMute}
      />

      {/* MODAL NOUVEAUTÉS / CHANGELOG */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
        onCheckUpdate={handleCheckUpdate}
        isCheckingUpdate={updateChecking}
      />

      {/* MODAL MISE À JOUR GITHUB */}
      {isUpdateModalOpen && (
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
                onClick={() => setIsUpdateModalOpen(false)}
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
                      <div className="font-mono text-cyan-300 font-bold text-sm">v{APP_VERSION}</div>
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
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="font-mono text-slate-400 bg-slate-900 p-2 rounded-lg text-[11px]">
                        {updateInfo.commit.message}
                      </p>
                      {updateInfo.commit.date && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
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
      )}
    </div>
  );
}
