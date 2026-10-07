import { CompanionProfile, ChatMessage, MemoryItem } from '@/types/companion';
import { DEFAULT_PROFILE } from './constants';

const KEYS = {
  PROFILE: 'nova_classic_profile_v1',
  API_KEY: 'nova_classic_gemini_api_key_v1',
  MESSAGES: 'nova_classic_messages_v1',
  MEMORIES: 'nova_classic_memories_v1',
  TELEMETRY: 'nova_classic_telemetry_v1',
  CUSTOM_VOICES: 'nova_classic_custom_voices_v1',
};

export interface CustomVoiceItem {
  id: string; // voice_id, voicekey_... ou nom dans AI Studio
  name: string; // Nom d'affichage (ex: "Ma Voix Copilote")
  description?: string;
  source?: 'ai_studio' | 'manual';
  addedAt?: number;
}

export interface FullNovaClassicConfig {
  version: number;
  profile: CompanionProfile;
  apiKey: string;
  memories: MemoryItem[];
  savedAt: number;
}

export const storage = {
  getProfile(): CompanionProfile {
    if (typeof window === 'undefined') return DEFAULT_PROFILE;
    try {
      const data = localStorage.getItem(KEYS.PROFILE);
      if (!data) return DEFAULT_PROFILE;
      const parsed = JSON.parse(data);
      return { ...DEFAULT_PROFILE, ...parsed };
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  saveProfile(profile: CompanionProfile): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  },

  getApiKey(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(KEYS.API_KEY) || '';
  },

  saveApiKey(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEYS.API_KEY, key.trim());
  },

  getMessages(): ChatMessage[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(KEYS.MESSAGES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveMessages(messages: ChatMessage[]): void {
    if (typeof window === 'undefined') return;
    const truncated = messages.slice(-100);
    localStorage.setItem(KEYS.MESSAGES, JSON.stringify(truncated));
  },

  clearMessages(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(KEYS.MESSAGES);
  },

  getMemories(): MemoryItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(KEYS.MEMORIES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveMemories(memories: MemoryItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEYS.MEMORIES, JSON.stringify(memories));
  },

  addMemory(content: string): MemoryItem {
    const memories = storage.getMemories();
    const newMem: MemoryItem = {
      id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      content,
      timestamp: Date.now(),
    };
    storage.saveMemories([...memories, newMem]);
    return newMem;
  },

  deleteMemory(id: string): void {
    const memories = storage.getMemories().filter((m) => m.id !== id);
    storage.saveMemories(memories);
  },

  exportFullConfig(): FullNovaClassicConfig {
    return {
      version: 1,
      profile: this.getProfile(),
      apiKey: this.getApiKey(),
      memories: this.getMemories(),
      savedAt: Date.now(),
    };
  },

  importFullConfig(config: Partial<FullNovaClassicConfig>): boolean {
    if (!config || typeof config !== 'object') return false;
    try {
      if (config.profile) {
        this.saveProfile({ ...DEFAULT_PROFILE, ...config.profile });
      }
      if (config.apiKey !== undefined) {
        this.saveApiKey(config.apiKey);
      }
      if (Array.isArray(config.memories)) {
        this.saveMemories(config.memories);
      }
      return true;
    } catch (e) {
      console.error('Erreur importation config:', e);
      return false;
    }
  },

  getTelemetry(): { promptTokens: number; candidateTokens: number; totalTokens: number } {
    if (typeof window === 'undefined') return { promptTokens: 0, candidateTokens: 0, totalTokens: 0 };
    try {
      const data = localStorage.getItem(KEYS.TELEMETRY);
      return data ? JSON.parse(data) : { promptTokens: 0, candidateTokens: 0, totalTokens: 0 };
    } catch {
      return { promptTokens: 0, candidateTokens: 0, totalTokens: 0 };
    }
  },

  addTokens(prompt: number, candidate: number): { promptTokens: number; candidateTokens: number; totalTokens: number } {
    const current = this.getTelemetry();
    const updated = {
      promptTokens: current.promptTokens + prompt,
      candidateTokens: current.candidateTokens + candidate,
      totalTokens: current.totalTokens + prompt + candidate,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(KEYS.TELEMETRY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('ami_tokens_updated', { detail: updated }));
    }
    return updated;
  },

  resetTelemetry(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(KEYS.TELEMETRY);
      window.dispatchEvent(new CustomEvent('ami_tokens_updated', { detail: { promptTokens: 0, candidateTokens: 0, totalTokens: 0 } }));
    }
  },

  // --- Gestion des Voix Personnalisées Google AI Studio ---
  getCustomVoices(): CustomVoiceItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(KEYS.CUSTOM_VOICES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCustomVoices(voices: CustomVoiceItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEYS.CUSTOM_VOICES, JSON.stringify(voices));
    window.dispatchEvent(new CustomEvent('nova_custom_voices_updated', { detail: voices }));
  },

  addCustomVoice(voice: { id: string; name: string; description?: string; source?: 'ai_studio' | 'manual' }): CustomVoiceItem {
    const voices = this.getCustomVoices();
    const cleanId = voice.id.trim().replace(/^['"]|['"]$/g, '').replace(/^voices\//, '');
    const existingIndex = voices.findIndex((v) => v.id.toLowerCase() === cleanId.toLowerCase());
    const item: CustomVoiceItem = {
      id: cleanId,
      name: (voice.name || cleanId).trim(),
      description: voice.description?.trim() || undefined,
      source: voice.source || 'ai_studio',
      addedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      voices[existingIndex] = item;
    } else {
      voices.push(item);
    }

    this.saveCustomVoices(voices);
    return item;
  },

  deleteCustomVoice(id: string): void {
    const cleanId = id.trim().toLowerCase();
    const voices = this.getCustomVoices().filter((v) => v.id.toLowerCase() !== cleanId);
    this.saveCustomVoices(voices);
  },
};
