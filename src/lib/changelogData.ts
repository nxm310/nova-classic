// Données centralisées du Changelog pour la modale Nouveautés
export interface ChangelogVersion {
  version: string;
  date: string;
  isLatest?: boolean;
  title: string;
  highlights: {
    category: string;
    description: string;
  }[];
}

export const CHANGELOG_DATA: ChangelogVersion[] = [
  {
    version: '1.1.0',
    date: '07 Octobre 2026',
    isLatest: true,
    title: 'Lecture de Livres ePUB, Documents PDF & Fichiers Texte',
    highlights: [
      {
        category: '➕ Bouton d\'Ajout de Fichiers (+)',
        description:
          "Intégration d'un bouton '+' direct à côté du champ de message pour joindre et faire lire des livres numériques au format ePUB, des documents PDF ou des fichiers texte.",
      },
      {
        category: '📚 Analyse Complète de Livres ePUB',
        description:
          "Extraction automatique et propre des chapitres XHTML de vos fichiers .epub (sans balises de style ni code résiduel) pour résumer, poser des questions ou discuter d'un livre avec Nova.",
      },
      {
        category: '📄 Synthèse & Décryptage PDF',
        description:
          "Moteur de lecture PDF côté client capable d'extraire le texte page par page pour analyser rapports, manuels ou documents en un clic.",
      },
      {
        category: '💬 Badge Visuel & Prompt Enrichi',
        description:
          "Affichage d'un badge élégant indiquant le nom, le type et le nombre de pages du document dans la bulle de discussion, avec injection optimale dans le contexte de Gemini.",
      },
    ],
  },
  {
    version: '1.0.3',
    date: '07 Octobre 2026',
    isLatest: false,
    title: 'Déblocage Voix Asynchrone & Libération Matérielle iOS',
    highlights: [
      {
        category: '🔓 Amorçage Audio Persistant (iOS Safari)',
        description:
          "Pré-amorçage direct de l'élément HTMLAudio dès l'appui sur 'Appel Direct'. Cela contourne le blocage strict d'Autoplay d'iOS Safari qui rendait la réponse vocale muette après le temps de calcul de l'IA.",
      },
      {
        category: '🎙️ Libération Immédiate du Micro (abort)',
        description:
          "Arrêt forcé et immédiat du microphone dès la détection du silence de l'utilisateur (recognition.abort()), restituant instantanément à iOS le plein contrôle du haut-parleur principal pour la voix de Nova.",
      },
      {
        category: '🔊 Canal Média Haute Priorité',
        description:
          "Rétablissement strict et forcé de la session multimédia standard (musique/vidéo) à chaque réponse pour garantir la lecture à plein volume.",
      },
    ],
  },
  {
    version: '1.0.2',
    date: '07 Octobre 2026',
    isLatest: false,
    title: 'Canal Média Standard & Sortie Haut-Parleur (iOS)',
    highlights: [
      {
        category: '🎵 Canal Média (Non-Téléphonique)',
        description:
          "Verrouillage de l'API navigator.audioSession en mode 'playback'. Le retour audio utilise désormais la barre de volume multimédia normale (musique/vidéo) et non la barre d'appel téléphonique étouffée.",
      },
      {
        category: '📢 Forçage Haut-Parleur Principal',
        description:
          "Routage matériel forcé vers le haut-parleur externe (speaker) dès que l'IA parle, empêchant la bascule vers le petit écouteur d'oreille d'iPhone.",
      },
      {
        category: '🔄 Rétablissement Instantané du Canal',
        description:
          "Dès que le micro se coupe ou marque une pause, le canal média est réinitialisé immédiatement pour une écoute claire et forte.",
      },
    ],
  },
  {
    version: '1.0.1',
    date: '07 Octobre 2026',
    isLatest: false,
    title: 'Optimisations iOS Safari & Mobile (Son & Micro)',
    highlights: [
      {
        category: '🔊 Amplification & Son Puissant',
        description:
          "Préamplification PCM 16-bit (+35%) et routage Web Audio GainNode pour éliminer le son faible et étouffé sur haut-parleurs d'iPhone.",
      },
      {
        category: '⚡ Déverrouillage Audio Mobile',
        description:
          'Déverrouillage automatique du canal audio dès le premier tap tactile. Fini les blocages silencieux d’AutoPlay sur iOS Safari.',
      },
      {
        category: '🎙️ Stabilité du Microphone',
        description:
          'Temporisation de sécurité (150ms) entre la fin de parole de l’IA et la réouverture du micro pour éviter les conflits matériels sur iOS.',
      },
      {
        category: '🔄 Reconnexion Intelligente',
        description:
          'Gestion transparente des coupures Safari et relance automatique en mode Appel DirectLive sans blocage.',
      },
    ],
  },
  {
    version: '1.0.0',
    date: '07 Octobre 2026',
    isLatest: false,
    title: 'Lancement Initial de Nova Classic',
    highlights: [
      {
        category: '🚀 Déclinaison Universelle',
        description:
          'Compagnon web fluide et réactif sans dépendances matérielles locales (exit serveurs Python et DirectInput).',
      },
      {
        category: '✨ Gemini 3.8 Flash TTS',
        description:
          'Synthèse vocale ultra-rapide et intégration des voix personnalisées Google AI Studio (Voice Design / Voice Replication).',
      },
      {
        category: '📞 Appel DirectLive Mains-Libres',
        description:
          'Mode appel continu avec détection vocale des silences, visualiseur dynamique et bouton d’interruption.',
      },
      {
        category: '👁️ Vision d’Écran Multimodale',
        description:
          'Partage d’écran en temps réel pour analyser documents, interfaces et code avec l’IA.',
      },
    ],
  },
];
