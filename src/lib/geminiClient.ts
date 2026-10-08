import { PERSONALITY_PRESETS } from '@/lib/constants';
import { CompanionProfile, MemoryItem } from '@/types/companion';
import { storage } from '@/lib/storage';

export interface ChatRequestOptions {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  profile: CompanionProfile;
  apiKey: string;
  memories?: MemoryItem[];
  imageBase64?: string;
}

export const geminiClient = {
  async sendMessage({
    messages,
    profile,
    apiKey,
    memories,
    imageBase64,
  }: ChatRequestOptions): Promise<string> {
    const key = (apiKey || '').trim();
    if (!key) {
      throw new Error("Clé API Gemini manquante. Renseigne ta clé dans les Paramètres ⚙️.");
    }

    const preset = PERSONALITY_PRESETS.find((p) => p.id === profile.presetId);
    const presetInstruction = preset ? preset.promptInstruction : '';

    const memoriesText =
      memories && memories.length > 0
        ? memories.map((m) => `• ${m.content}`).join('\n')
        : 'Aucun souvenir enregistré pour le moment.';

    const lengthConfig: Record<
      string,
      { sectionPrompt: string; maxTokens: number }
    > = {
      ultra_concise: {
        sectionPrompt: `[DIRECTIVE PRIORITAIRE ABSOLUE : MODE ULTRA-COURT (COMBAT / ACTION)]
Tu DOIS IMPÉRATIVEMENT respecter ces 4 règles strictes sans exception :
1. NOMBRE DE PHRASES : UNE SEULE ET UNIQUE PHRASE, JAMAIS DEUX. Il t'est formellement INTERDIT d'écrire une deuxième phrase.
2. NOMBRE DE MOTS : 5 à 15 mots maximum. Va droit au but comme un copilote de combat spatial.
3. INTERDICTIONS FORMELLES : Zéro bavardage, zéro formule de politesse ("Bonjour", "Bien reçu", "À vos ordres", "N'hésite pas"), aucune question en retour.
4. ACHÈVEMENT OBLIGATOIRE : Termine impérativement ta phrase par un point final. Ne t'arrête JAMAIS au milieu d'une idée ou d'une phrase.
Exemples stricts de réponses attendues en mode ultra-court :
• "Phares allumés et train déployé, Commandant. [ACTION:KEY:l] [ACTION:KEY:n]"
• "Boucliers réactivés à pleine puissance. [ACTION:KEY:o]"
• "Moteur quantique calibré et paré au saut. [ACTION:KEY:b]"`,
        maxTokens: 350,
      },
      short: {
        sectionPrompt: `[DIRECTIVE PRIORITAIRE ABSOLUE : MODE COURT (RECOMMANDÉ)]
Tu DOIS IMPÉRATIVEMENT respecter ces 3 règles :
1. NOMBRE DE PHRASES : 1 À 2 PHRASES COURTES MAXIMUM (20 à 35 mots). Évite toute phrase à rallonge.
2. STYLE : Échange radio de cockpit vif, direct, naturel et percutant. Pas de bavardage inutile.
3. ACHÈVEMENT OBLIGATOIRE : Termine impérativement chacune de tes phrases par un point final (. ! ?). Ne t'arrête JAMAIS au milieu d'une phrase.
Exemples de réponses attendues en mode court :
• "Train rentré et phares coupés, Commandant. Tous les voyants sont au vert. [ACTION:KEY:n] [ACTION:KEY:l]"
• "Demande d'atterrissage transmise à la station. Le couloir nous est assigné. [ACTION:KEY:alt+n]"`,
        maxTokens: 650,
      },
      balanced: {
        sectionPrompt: `[DIRECTIVE DE LONGUEUR : MODE ÉQUILIBRÉ (NATUREL & AMICAL)]
1. NOMBRE DE PHRASES : 2 À 3 PHRASES ÉQUILIBRÉES ET NATURELLES (40 à 80 mots).
2. STYLE : Ton complice, agréable et précis. Donne une réponse complète et utile sans faire de monologue interminable.
3. ACHÈVEMENT OBLIGATOIRE : Termine impérativement chacune de tes phrases par un point final (. ! ?). Ne t'arrête JAMAIS au milieu d'une pensée.`,
        maxTokens: 1200,
      },
      detailed: {
        sectionPrompt: `[DIRECTIVE DE LONGUEUR : MODE DÉTAILLÉ (EXHAUSTIF & PÉDAGOGIQUE)]
1. LONGUEUR : Réponse complète, développée et argumentée en plusieurs phrases ou paragraphes. Développe les explications techniques, les étapes de vol, les tactiques et les conseils utiles.
2. STYLE : Guide expert, pédagogue et exhaustif.
3. ACHÈVEMENT OBLIGATOIRE : Termine impérativement chaque phrase et chaque paragraphe par sa ponctuation finale (. ! ?). Ne coupe jamais une phrase en cours.`,
        maxTokens: 2500,
      },
    };

    const selectedLength = profile.responseLength || 'short';
    const lengthSetting = lengthConfig[selectedLength] || lengthConfig.short;

    const systemInstruction = `
Tu es ${profile.name || 'Nova'}, compagnon conversationnel et personnel IA.
Ton avatar actuel est ${profile.avatar || '🤖'}.

${lengthSetting.sectionPrompt}

[RÈGLE FONDAMENTALE D'ACHÈVEMENT DE TOUTES LES PHRASES]
Tu as l'interdiction formelle de laisser une phrase inachevée, coupée ou tronquée. Chaque phrase formulée doit avoir du sens du début à la fin et se terminer impérativement par une ponctuation terminale (. ! ?).

[TRAIT DE CARACTÈRE & TON DU COMPAGNON]
${presetInstruction}

[CONSIGNES PARTICULIÈRES DE L'UTILISATEUR]
${profile.customInstructions || 'Reste réactif, attentif et pertinent.'}

[CE QUE TU SAIS SUR TON AMI(E) (CONTEXTE & MÉMOIRE)]
${profile.userContext || ''}
Faits mémorisés au fil de vos échanges :
${memoriesText}

[RÈGLES D'EXPRESSION GÉNÉRALES]
1. Tu parles directement à ton ami(e) avec naturel, loyauté et présence.
2. Évite absolument les formules de robot générique ("En tant qu'intelligence artificielle", "Comment puis-je vous aider aujourd'hui ?"). Sois naturel(le), complice et direct(e).
3. Utilise la langue française, avec un ton vivant, chaleureux et spontané.
4. N'utilise JAMAIS d'émojis, de pictogrammes ou de smileys (ni 😊, ni 😉, ni :) etc.), car tes messages sont énoncés à voix haute. Exprime toute ta présence uniquement par tes mots.
5. ACCÈS AU WEB & RECHERCHE EN TEMPS RÉEL : Tu as un accès direct au moteur de recherche Google. Quand ton ami(e) te parle d'actualités, de technologies récentes, de puces ou produits (ex: Mac Mini, M4, M5, M6, etc.) ou s'il te donne un lien, effectue une recherche pour avoir les informations les plus fraîches et vérifiées sur le web.
6. VISION D'ÉCRAN EN DIRECT : Si une image de capture d'écran est attachée au message, observe et analyse immédiatement ce qui est affiché (écran, fenêtres, terminal, documents, images) et réponds directement et précisément selon la longueur demandée.
`.trim();

    const contents: any[] = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    if (imageBase64 && contents.length > 0) {
      const lastUserIndex = contents.map((c) => c.role).lastIndexOf('user');
      if (lastUserIndex >= 0) {
        contents[lastUserIndex].parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: imageBase64,
          },
        });
      }
    }

    const getModelCandidates = (quality?: string): string[] => {
      switch (quality) {
        case '3.8-flash-tts':
          return ['gemini-3.8-flash-tts', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
        case '3.8-flash':
          return ['gemini-3.8-flash', 'gemini-3.8-flash-tts', 'gemini-3.5-flash-lite'];
        case 'high':
          return ['gemini-3.1-pro-preview', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
        case '3.8-live':
          return ['gemini-3.8-live', 'gemini-3.8-flash-tts', 'gemini-3.8-flash'];
        case 'fast':
        default:
          return ['gemini-3.8-flash-tts', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
      }
    };

    const candidateModels = getModelCandidates(profile.responseQuality);

    // Détection intelligente du besoin de recherche Google :
    // Active la recherche uniquement si la demande concerne des infos web/actualités/liens externes,
    // ce qui évite d'ajouter 2 à 3 secondes de latence inutile sur les échanges conversationnels.
    const lastUserText = messages.slice().reverse().find((m) => m.role === 'user')?.content || '';
    const needsSearch =
      profile.webSearch !== false &&
      /(https?:\/\/|recherche|google|actualit|nouvelle|prix|date de sortie|qui est|qu'est-ce que|qu'est ce que|c'est quoi|meteo|météo|version|derni[eè]re minute)/i.test(
        lastUserText
      );

    let lastError: any = null;
    let data: any = null;

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

      const buildPayload = (withSearch: boolean) => ({
        contents,
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        ...(withSearch ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: {
          maxOutputTokens: lengthSetting.maxTokens,
          // Remplacement conforme Google Gemini 2026 :
          // thinkingLevel 'minimal' pour réponse conversationnelle instantanée
          // (remplace thinking_budget déprécié, et supprime temperature, top_p, top_k)
          thinkingConfig: {
            thinkingLevel: 'minimal',
          },
        },
      });

      try {
        let response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload(needsSearch)),
        });

        if (!response.ok && needsSearch) {
          console.warn(`[Gemini] Recherche Google non disponible pour ${model}, repli sans recherche...`);
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildPayload(false)),
          });
        }

        if (response.ok) {
          data = await response.json();
          break;
        } else {
          const errorData = await response.json().catch(() => ({}));
          lastError = new Error(
            errorData?.error?.message ||
            `Erreur de l'API Gemini (${response.status}: ${response.statusText})`
          );
          console.warn(`[Gemini] Modèle ${model} indisponible (${response.status}), tentative repli suivant...`);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini] Échec tentative modèle ${model}:`, err?.message || err);
      }
    }

    if (!data) {
      throw lastError || new Error("Impossible de joindre l'API Gemini après plusieurs tentatives.");
    }

    if (data.usageMetadata) {
      const pTokens = Number(data.usageMetadata.promptTokenCount) || 0;
      const cTokens = Number(data.usageMetadata.candidatesTokenCount) || 0;
      try {
        storage.addTokens(pTokens, cTokens);
      } catch {
        // Ignorer erreur de stockage éventuelle
      }
    }

    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
      console.warn(`[Gemini] Fin de génération anormale détectée: ${finishReason}`);
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const rawReply =
      parts
        .map((p: any) => p.text)
        .filter(Boolean)
        .join('\n\n') ||
      "Je n'ai pas trouvé quoi répondre pour le moment...";

    return ensureCompleteSentence(rawReply, finishReason);
  },

  async generateSpeech({
    text,
    voice = 'Aoede',
    apiKey,
    style,
  }: {
    text: string;
    voice?: string;
    apiKey?: string;
    style?: string;
  }): Promise<string> {
    const cleanText = (text || '').trim();
    if (!cleanText) {
      throw new Error("Texte manquant pour la synthèse vocale.");
    }

    const key = (apiKey || storage.getApiKey() || '').trim();

    // Résolution intelligente de la voix (voix standard Gemini ou voix personnalisée Google AI Studio)
    const cleanVoice = (voice || 'Aoede').trim();
    const customVoices = storage.getCustomVoices();
    const matchingCustom = customVoices.find(
      (cv) =>
        cv.id.toLowerCase() === cleanVoice.toLowerCase() ||
        cv.name.toLowerCase() === cleanVoice.toLowerCase()
    );
    const resolvedVoiceId = matchingCustom ? matchingCustom.id : cleanVoice;
    const isCustomVoice =
      Boolean(matchingCustom) ||
      resolvedVoiceId.startsWith('voice_') ||
      resolvedVoiceId.startsWith('voicekey_') ||
      resolvedVoiceId.startsWith('voices/');

    // Style vocal / prompt de posture pour speech_metadata
    const effectiveStyle = style || matchingCustom?.description || undefined;

    // 1. Si une clé API est configurée, tenter l'endpoint Gemini Multimodal Audio
    if (key) {
      const candidateModels = [
        'gemini-3.8-flash-tts',
        'gemini-3.8-flash-lite-tts',
      ];

      // Formats de payload supportés par Google Gemini :
      // - Direct "voice": pour les voix créées dans AI Studio (voice_..., voicekey_...) et les voix standard
      // - "prebuiltVoiceConfig": format canonique pour les voix studio
      const voiceConfigsToTry = isCustomVoice
        ? [
            { voice: resolvedVoiceId },
            { prebuiltVoiceConfig: { voiceName: resolvedVoiceId } },
          ]
        : [
            { prebuiltVoiceConfig: { voiceName: resolvedVoiceId } },
            { voice: resolvedVoiceId },
          ];

      for (const model of candidateModels) {
        for (const voiceConfig of voiceConfigsToTry) {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
          
          // Note essentielle : gemini-3.8-flash-tts traite le texte comme un script verbatim.
          // Ne jamais ajouter de préambule d'instruction dans "text". Le style va dans speech_metadata.
          const payload: any = {
            contents: [
              {
                parts: [
                  {
                    text: cleanText,
                    ...(effectiveStyle ? { speech_metadata: { style: effectiveStyle } } : {}),
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig,
              },
            },
          };

          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              const data = await response.json();
              const parts = data.candidates?.[0]?.content?.parts || [];
              const audioPart = parts.find((p: any) => p.inlineData || p.inline_data);
              const inline = audioPart?.inlineData || audioPart?.inline_data;

              if (inline && inline.data) {
                const mimeType = inline.mimeType || inline.mime_type || 'audio/wav';
                const base64Audio = inline.data;

                const binaryString = window.atob(base64Audio);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }

                const isAlreadyWav =
                  bytes.length >= 4 &&
                  bytes[0] === 0x52 &&
                  bytes[1] === 0x49 &&
                  bytes[2] === 0x46 &&
                  bytes[3] === 0x46; // 'RIFF'

                let blob: Blob;
                if (isAlreadyWav) {
                  blob = new Blob([bytes], { type: 'audio/wav' });
                } else {
                  let rate = 24000;
                  const match = (mimeType || '').match(/rate=(\d+)/);
                  if (match) rate = parseInt(match[1], 10);
                  blob = pcmToWavBlob(bytes, rate);
                }

                return URL.createObjectURL(blob);
              }
            } else {
              const errBody = await response.text().catch(() => '');
              console.warn(`[Gemini Audio] Échec ${model} (${response.status}) avec voiceConfig:`, errBody);
            }
          } catch (err: any) {
            console.warn(`[Gemini Audio] Tentative (${model}) échouée:`, err?.message || err);
          }
        }
      }

      // Si la voix personnalisée spécifique a échoué (ex: ID expiré ou non accessible),
      // tenter un repli de haute fidélité avec la voix standard Gemini (Aoede) avant tout autre repli
      if (isCustomVoice) {
        console.warn(`[Gemini Audio] Voix personnalisée "${resolvedVoiceId}" non accessible, tentative de repli en haute fidélité avec Aoede...`);
        try {
          const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${key}`;
          const fallbackPayload = {
            contents: [{ parts: [{ text: cleanText }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Aoede' },
                },
              },
            },
          };
          const fallbackRes = await fetch(fallbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fallbackPayload),
          });
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            const parts = data.candidates?.[0]?.content?.parts || [];
            const audioPart = parts.find((p: any) => p.inlineData || p.inline_data);
            const inline = audioPart?.inlineData || audioPart?.inline_data;
            if (inline && inline.data) {
              const binaryString = window.atob(inline.data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
              const blob = pcmToWavBlob(bytes, 24000);
              return URL.createObjectURL(blob);
            }
          }
        } catch (e) {
          console.warn('[Gemini Audio] Échec repli Aoede:', e);
        }
      }
    }

    // 2. Repli direct vers le flux audio Google Translate TTS (accessible en lecture directe Audio)
    let speakSnippet = cleanText;
    if (speakSnippet.length > 195) {
      const lastPunct = Math.max(
        speakSnippet.lastIndexOf('.', 195),
        speakSnippet.lastIndexOf('!', 195),
        speakSnippet.lastIndexOf('?', 195)
      );
      if (lastPunct > 50) {
        speakSnippet = speakSnippet.slice(0, lastPunct + 1);
      } else {
        const lastSpace = speakSnippet.lastIndexOf(' ', 195);
        speakSnippet = (lastSpace > 50 ? speakSnippet.slice(0, lastSpace) : speakSnippet.slice(0, 195)) + '.';
      }
    }
    const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=fr&client=tw-ob&q=${encodeURIComponent(
      speakSnippet
    )}`;
    return directUrl;
  },

  /**
   * Initialise une session WebSocket bidirectionnelle temps réel avec Gemini (3.8 Flash TTS / 3.8 LIVE).
   * Modèle : models/gemini-3.8-flash-tts (audio-to-audio natif à très faible latence).
   */
  createLiveWebSocketSession({
    apiKey,
    model = 'models/gemini-3.8-flash-tts',
    voice = 'Puck',
    systemInstruction,
    onAudioChunk,
    onText,
    onError,
    onClose,
  }: {
    apiKey: string;
    model?: string;
    voice?: string;
    systemInstruction?: string;
    onAudioChunk?: (pcmBase64: string) => void;
    onText?: (text: string) => void;
    onError?: (err: any) => void;
    onClose?: () => void;
  }) {
    const key = (apiKey || '').trim();
    if (!key) {
      throw new Error("Clé API manquante pour la session Gemini LIVE.");
    }

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${key}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      const setupMsg = {
        setup: {
          model: model || 'models/gemini-3.8-flash-tts',
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: (voice.startsWith('voice_') || voice.startsWith('voicekey_') || voice.startsWith('voices/'))
                ? { voice: voice }
                : {
                    prebuiltVoiceConfig: {
                      voiceName: voice || 'Aoede',
                    },
                  },
            },
          },
          ...(systemInstruction
            ? {
                systemInstruction: {
                  parts: [{ text: systemInstruction }],
                },
              }
            : {}),
        },
      };
      ws.send(JSON.stringify(setupMsg));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const serverContent = data.serverContent;
        if (serverContent?.modelTurn?.parts) {
          for (const part of serverContent.modelTurn.parts) {
            if (part.text && onText) {
              onText(part.text);
            }
            const audioData = part.inlineData?.data || part.inline_data?.data;
            if (audioData && onAudioChunk) {
              onAudioChunk(audioData);
            }
          }
        }
      } catch (e) {
        console.warn('[Gemini 3.8 LIVE] Erreur traitement paquet:', e);
      }
    };

    ws.onerror = (e) => {
      console.warn('[Gemini 3.8 LIVE] Erreur WebSocket:', e);
      if (onError) onError(e);
    };

    ws.onclose = () => {
      if (onClose) onClose();
    };

    return {
      sendText: (text: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              clientContent: {
                turns: [{ role: 'user', parts: [{ text }] }],
                turnComplete: true,
              },
            })
          );
        }
      },
      close: () => {
        try {
          ws.close();
        } catch {}
      },
      ws,
    };
  },

  /**
   * Interroge l'API Google Gemini (/v1beta/voices) pour récupérer toutes les voix disponibles,
   * y compris les voix personnalisées créées dans Google AI Studio.
   */
  async listVoices(apiKey?: string): Promise<Array<{ id: string; name: string; description?: string }>> {
    const key = (apiKey || storage.getApiKey() || '').trim();
    if (!key) return [];
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/voices?key=${key}`);
      if (res.ok) {
        const data = await res.json();
        const rawVoices = data.voices || [];
        return rawVoices.map((v: any) => {
          const rawId = (v.voiceId || v.voice_id || v.name || v.id || '').trim();
          const cleanId = rawId.replace(/^voices\//, '');
          return {
            id: cleanId,
            name: v.displayName || v.display_name || v.name || cleanId || 'Voix AI Studio',
            description: v.description || (v.gender ? `${v.gender} - ${v.accent || 'Natif'}` : undefined),
          };
        });
      }
    } catch (e) {
      console.warn('Erreur lors de la récupération des voix Gemini depuis Google AI Studio:', e);
    }
    return [];
  },
};

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function pcmToWavBlob(pcmData: Uint8Array, sampleRate = 24000, numChannels = 1, gainMultiplier = 1.35): Blob {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);

  // "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');

  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit

  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true);

  // Application du gain sur les échantillons PCM 16-bit (Little-Endian)
  // pour assurer un volume clair et puissant sur haut-parleurs mobiles/iPhone
  const targetView = new DataView(buffer, 44);
  const sourceView = new DataView(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength);
  const sampleCount = Math.floor(pcmData.byteLength / 2);

  if (gainMultiplier !== 1.0) {
    for (let i = 0; i < sampleCount; i++) {
      const sample = sourceView.getInt16(i * 2, true);
      const boosted = Math.max(-32768, Math.min(32767, Math.round(sample * gainMultiplier)));
      targetView.setInt16(i * 2, boosted, true);
    }
  } else {
    new Uint8Array(buffer, 44).set(pcmData);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Garantit que la réponse de l'IA est complète et ne se termine jamais par une phrase coupée au milieu.
 * Si le modèle s'est arrêté abruptement (ex: coupure accidentelle ou token limit),
 * la fonction coupe proprement au dernier point complet existant, ou ajoute la ponctuation terminale manquante.
 */
export function ensureCompleteSentence(text: string, finishReason?: string): string {
  if (!text) return text;
  const prose = text.trim();

  if (!prose) return '';

  // Caractères terminaux valides
  const terminalRegex = /[.!?…"»]$/;
  if (terminalRegex.test(prose)) {
    return prose;
  }

  // Si la prose ne se termine pas par une ponctuation terminale, chercher la dernière ponctuation complète
  const lastPeriod = Math.max(
    prose.lastIndexOf('.'),
    prose.lastIndexOf('!'),
    prose.lastIndexOf('?'),
    prose.lastIndexOf('…')
  );

  // Mots de liaison ou terminaisons incomplètes indiquant une phrase coupée en plein vol
  const danglingWordRegex = /(?:^|\s+)(?:à|de|du|des|en|au|aux|dans|par|pour|sur|sous|vers|avec|sans|et|ou|mais|donc|car|ni|que|qui|quoi|dont|où|d'|l'|qu'|[a-zÀ-ÿ]{1,2})\s*$/iu;

  // Si le modèle a été tronqué (MAX_TOKENS) ou se termine sur un mot de liaison incomplet
  if (lastPeriod > 0 && (finishReason === 'MAX_TOKENS' || danglingWordRegex.test(prose))) {
    return prose.slice(0, lastPeriod + 1).trim();
  }

  // Si mot de liaison sans point préalable, retirer le mot incomplet et fermer proprement
  if (danglingWordRegex.test(prose)) {
    const cleaned = prose.replace(danglingWordRegex, '').trim();
    return `${cleaned}.`;
  }

  // Sinon, c'était une phrase bien formée à laquelle il manquait juste la ponctuation terminale
  return `${prose}.`;
}

