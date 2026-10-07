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
    version: '1.0.1',
    date: '07 Octobre 2026',
    isLatest: true,
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
