// Gestionnaire Audio & Voix pour Nova Classic (Optimisé iOS Safari & Multiplateforme)
import { cleanTextForSpeech } from './speechUtils';

let currentAudio: HTMLAudioElement | null = null;
let sharedAudioContext: AudioContext | null = null;
let isAudioUnlocked = false;
let primedAudioElement: HTMLAudioElement | null = null;

// Audio silencieux encodé en base64 (format WAV 44 bytes valide ultra-court)
const SILENT_WAV_BASE64 = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP//';

/**
 * Configure la session audio iOS en mode "playback" (multimédia / musique)
 * pour éviter qu'iOS ne bascule sur le canal "appel téléphonique" (combiné / earpiece)
 * et garantit l'utilisation de la barre de volume média standard.
 */
export const enforceMediaAudioSession = () => {
  if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
    try {
      const audioSession = (navigator as any).audioSession;
      if (audioSession.type !== 'playback') {
        audioSession.type = 'playback';
      }
    } catch (e) {
      // Certains navigateurs peuvent ignorer ou restreindre l'écriture
    }
  }
};

/**
 * Crée ou amorce l'élément audio HTML pré-déverrouillé pour iOS Safari.
 * En jouant un son silencieux direct sur un geste utilisateur (clic / tap),
 * Safari accorde à cet élément l'autorisation permanente de jouer des audios,
 * même après des requêtes asynchrones réseau (fetch de l'IA).
 */
export const primeAudioElement = (): HTMLAudioElement | null => {
  if (typeof window === 'undefined') return null;

  try {
    if (!primedAudioElement) {
      const el = new Audio();
      el.setAttribute('playsinline', 'true');
      el.setAttribute('webkit-playsinline', 'true');
      (el as any).playsInline = true;
      el.preload = 'auto';
      primedAudioElement = el;
    }

    // Amorcer avec un WAV silencieux
    primedAudioElement.src = SILENT_WAV_BASE64;
    const playPromise = primedAudioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (primedAudioElement) {
            primedAudioElement.pause();
            primedAudioElement.currentTime = 0;
          }
        })
        .catch(() => {});
    }
    return primedAudioElement;
  } catch (err) {
    console.warn('[Audio] Échec de l\'amorçage de l\'élément audio:', err);
    return null;
  }
};

/**
 * Déverrouille l'audio sur iOS Safari et navigateurs mobiles lors d'une interaction utilisateur (clic / tap).
 * Joue un micro-buffer silencieux pour autoriser la lecture asynchrone ultérieure sans blocage de l'autoplay,
 * et force le canal média standard.
 */
export const unlockAudioContext = async (): Promise<AudioContext | null> => {
  if (typeof window === 'undefined') return null;

  enforceMediaAudioSession();
  primeAudioElement();

  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;

    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioCtxClass();
    }

    if (sharedAudioContext.state === 'suspended') {
      await sharedAudioContext.resume();
    }

    if (!isAudioUnlocked && sharedAudioContext.state === 'running') {
      // Micro-buffer silencieux (0.01 sec)
      const buffer = sharedAudioContext.createBuffer(1, 1, 22050);
      const source = sharedAudioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(sharedAudioContext.destination);
      source.start(0);
      isAudioUnlocked = true;
    }

    return sharedAudioContext;
  } catch (err) {
    console.warn('[Audio] Échec du déverrouillage audio context:', err);
    return null;
  }
};

export const audioManager = {
  unlock(): Promise<AudioContext | null> {
    primeAudioElement();
    return unlockAudioContext();
  },

  playAudioStream(
    src: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void,
    options?: { robotEffect?: boolean; rate?: number }
  ): HTMLAudioElement {
    this.stopAll();

    // Forcer le canal média standard (musique / vidéo) et déverrouiller
    enforceMediaAudioSession();
    unlockAudioContext().catch(() => {});

    // Réutiliser l'élément audio pré-amorcé (ou en créer un nouveau si non disponible)
    let audio: HTMLAudioElement;
    if (primedAudioElement) {
      audio = primedAudioElement;
    } else {
      audio = new Audio();
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      (audio as any).playsInline = true;
      audio.preload = 'auto';
      primedAudioElement = audio;
    }

    audio.src = src;
    audio.playbackRate = 1.0;
    audio.defaultPlaybackRate = 1.0;

    // Si setSinkId est supporté (standards modernes), tenter de router sur les haut-parleurs
    if (typeof (audio as any).setSinkId === 'function') {
      try {
        (audio as any).setSinkId('speaker').catch(() => {});
      } catch {}
    }

    currentAudio = audio;

    let cleanupDone = false;
    const cleanup = () => {
      if (cleanupDone) return;
      cleanupDone = true;
      if (currentAudio === audio) {
        currentAudio = null;
      }
    };

    // Sur iOS Safari, createMediaElementSource(audio) détourne le flux vers le sous-système Web Audio
    // qui est soumis au mode Silencieux matériel et aux conflits de sessions micro.
    // Pour une clarté et fiabilité maximale, on n'utilise createMediaElementSource QUE si l'effet robotique est activé.
    // Sinon, l'élément HTMLAudioElement natif joue directement et sort sur le haut-parleur sans aucune perte !
    if (options?.robotEffect && typeof window !== 'undefined') {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
            sharedAudioContext = new AudioCtxClass();
          }
          if (sharedAudioContext.state === 'suspended') {
            sharedAudioContext.resume();
          }

          if (sharedAudioContext.state === 'running') {
            const source = sharedAudioContext.createMediaElementSource(audio);

            const mainGain = sharedAudioContext.createGain();
            mainGain.gain.value = 1.35;

            // 1. Coupe-bas pour donner un son de transmetteur net
            const hp = sharedAudioContext.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = 350;

            // 2. Filtre résonant métallique (coque / robotique)
            const peak = sharedAudioContext.createBiquadFilter();
            peak.type = 'peaking';
            peak.frequency.value = 2400;
            peak.Q.value = 5.5;
            peak.gain.value = 9.0;

            // 3. Peigne de délai court (7ms) pour la résonance vocoder
            const delay = sharedAudioContext.createDelay();
            delay.delayTime.value = 0.007;

            const feedback = sharedAudioContext.createGain();
            feedback.gain.value = 0.6;

            const wetGain = sharedAudioContext.createGain();
            wetGain.gain.value = 0.55;

            const dryGain = sharedAudioContext.createGain();
            dryGain.gain.value = 0.7;

            // Chaînage
            delay.connect(feedback);
            feedback.connect(delay);
            delay.connect(wetGain);

            source.connect(hp);
            hp.connect(peak);

            peak.connect(dryGain);
            peak.connect(delay);

            dryGain.connect(mainGain);
            wetGain.connect(mainGain);

            mainGain.connect(sharedAudioContext.destination);
          }
        }
      } catch (err) {
        console.warn('[Audio] Filtre robotique non appliqué (fallback natif):', err);
      }
    }

    if (onStart) {
      audio.onplay = () => onStart();
    }
    audio.onended = () => {
      cleanup();
      if (onEnd) onEnd();
    };
    audio.onerror = (e) => {
      cleanup();
      if (onError) onError(e);
    };

    // Lecture protégée pour iOS Safari
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('[Audio] Lecture audio bloquée (autoplay iOS ou erreur réseau):', err);
        cleanup();
        if (onError) onError(err);
      });
    }

    return audio;
  },

  stopAll(): void {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.onplay = null;
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.src = '';
        currentAudio.load();
      } catch {}
      currentAudio = null;
    }
  },

  // --- Reconnaissance Vocale (Dictée au micro) ---
  createSpeechRecognition(
    onResult: (transcript: string) => void,
    onError: (err: any) => void,
    onEnd: () => void
  ): any | null {
    if (typeof window === 'undefined') return null;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let hasResult = false;

    recognition.onresult = (event: any) => {
      try {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          hasResult = true;
          onResult(transcript);
        }
      } catch (e) {
        console.warn('[Speech] Erreur parsing transcription:', e);
      }
    };

    recognition.onerror = (event: any) => {
      // Ignorer l'erreur non-bloquante 'no-speech' fréquente sur iOS quand l'utilisateur ne parle pas tout de suite
      if (event.error !== 'no-speech') {
        onError(event.error);
      }
    };

    recognition.onend = () => {
      onEnd();
    };

    return recognition;
  },

  // --- Reconnaissance Vocale Continue avec Détection de Silence (Mode Appel) ---
  createContinuousSpeechRecognizer(options: {
    onInterim: (text: string) => void;
    onFinalSilence: (text: string) => void;
    onError: (err: any) => void;
    silenceMs?: number;
  }): {
    start: () => void;
    stop: () => void;
    pause: () => void;
  } | null {
    if (typeof window === 'undefined') return null;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return null;

    let recognition: any = null;
    let silenceTimer: any = null;
    let restartTimer: any = null;
    let accumulatedText = '';
    let isRunning = false;
    let shouldKeepRunning = false;
    const silenceDelay = options.silenceMs || 1400;

    const clearTimer = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    };

    const clearRestartTimer = () => {
      if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
      }
    };

    const triggerSilenceSend = () => {
      clearTimer();
      const textToSend = accumulatedText.trim();
      if (textToSend) {
        accumulatedText = '';
        options.onFinalSilence(textToSend);
      }
    };

    const cleanupInstance = () => {
      if (recognition) {
        try {
          recognition.onresult = null;
          recognition.onerror = null;
          recognition.onend = null;
          recognition.abort();
        } catch {}
        recognition = null;
      }
    };

    const initRecognition = () => {
      cleanupInstance();

      try {
        recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR';
        // Sur iOS Safari, continuous = true peut causer des blocages matériels de flux.
        // On active le mode continu mais avec gestion de redémarrage propre en cas de fin spontanée.
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              accumulatedText += ' ' + res[0].transcript;
            } else {
              currentInterim += res[0].transcript;
            }
          }

          const currentFull = (accumulatedText + ' ' + currentInterim).trim();
          if (currentFull) {
            options.onInterim(currentFull);

            // Réinitialiser le décompte de silence
            clearTimer();
            silenceTimer = setTimeout(() => {
              triggerSilenceSend();
            }, silenceDelay);
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'no-speech') {
            // Silence normal sur iOS, rien à signaler
            return;
          }
          if (event.error === 'aborted') {
            // Arrêt intentionnel ou redémarrage
            return;
          }
          console.warn('[Mode Appel Continuous] Erreur recognition:', event.error);
          options.onError(event.error);
        };

        recognition.onend = () => {
          isRunning = false;
          // Si on doit continuer à écouter (ex: iOS coupe au bout de 8 à 10s de pause), on relance
          if (shouldKeepRunning) {
            clearRestartTimer();
            restartTimer = setTimeout(() => {
              if (shouldKeepRunning && !isRunning) {
                try {
                  initRecognition();
                  recognition.start();
                  isRunning = true;
                } catch (e) {
                  console.warn('[Mode Appel Continuous] Échec relance auto:', e);
                }
              }
            }, 250);
          }
        };
      } catch (err) {
        console.warn('[Mode Appel Continuous] Erreur initialisation:', err);
      }
    };

    return {
      start: () => {
        shouldKeepRunning = true;
        accumulatedText = '';
        clearTimer();
        clearRestartTimer();
        initRecognition();
        try {
          if (recognition) {
            recognition.start();
            isRunning = true;
          }
        } catch (e) {
          console.warn('[Mode Appel] Recognition start error:', e);
        }
      },
      pause: () => {
        shouldKeepRunning = false;
        clearTimer();
        clearRestartTimer();
        if (recognition && isRunning) {
          try {
            recognition.abort();
          } catch {
            try {
              recognition.stop();
            } catch {}
          }
        }
        isRunning = false;
        // Rétablir immédiatement le canal média standard (sortie haut-parleur musique/média)
        enforceMediaAudioSession();
      },
      stop: () => {
        shouldKeepRunning = false;
        clearTimer();
        clearRestartTimer();
        accumulatedText = '';
        cleanupInstance();
        isRunning = false;
        // Rétablir immédiatement le canal média standard
        enforceMediaAudioSession();
      },
    };
  },
};
