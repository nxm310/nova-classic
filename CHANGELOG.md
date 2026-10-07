# 📜 Journal des Mises à Jour — Nova Classic

Document récapitulatif centralisé de toutes les versions de Nova Classic, compagnon conversationnel IA universel propulsé par Google Gemini.

---

## [v1.0.3] — 2026-10-07

### ⚡ Déblocage Voix Asynchrone & Libération Matérielle (iOS Safari)
* **Amorçage Audio Persistant (Autoplay Bypass iOS)** :
  * Pré-amorçage (`primeAudioElement()`) d'un élément `<audio>` natif dès le tap initial sur "Appel Direct".
  * Safari conserve l'autorisation de lecture accordée lors du clic utilisateur, permettant au son généré après la requête réseau asynchrone (1-3s) de se déclencher sans être bloqué par la politique d'autoplay mobile.
* **Libération Immédiate du Microphone (`recognition.abort()`)** :
  * Dès la fin de la prise de parole de l'utilisateur, interruption matérielle immédiate du micro pour restituer le canal audio au haut-parleur principal sans conflit duplex.
* **Sécurisation de la Session Média Multimédia** :
  * Réaffirmation du profil `playback` à chaque tour de parole garantissant l'utilisation de la barre de volume multimédia standard.

---

## [v1.0.2] — 2026-10-07

### 🔊 Routage Multimédia & Forçage Haut-Parleur (iOS)
* **Verrouillage du Canal Audio Multimédia (`navigator.audioSession`)** :
  * Désactivation du profil "appel téléphonique" (combiné earpiece étouffé) imposé par iOS Safari lors de l'activation du micro.
  * Forçage de la session en mode `'playback'` pour utiliser la barre de volume multimédia normale (musique / vidéo).
* **Forçage Haut-Parleur Externe (`setSinkId('speaker')`)** :
  * Redirection matérielle vers le haut-parleur principal pour restituer le son fort et clair.
* **Rétablissement Automatique du Canal Média** :
  * Restauration immédiate du mode multimédia dès que la prise de son s'interrompt ou marque une pause.

---

## [v1.0.1] — 2026-10-07

### 📱 Optimisations iOS Safari & Mobile (Son & Micro)
* **Amplification & Égalisation Dynamique Mobile** :
  * Amplification directe du flux audio PCM 16-bit et préamplification via `GainNode` Web Audio pour garantir un volume sonore net et puissant sur haut-parleur d'iPhone.
  * Attributs `playsinline` et `webkit-playsinline` intégrés au flux HTML5 Audio pour éliminer les interruptions matérielles.
* **Déverrouillage Audio Mobile (Audio Context Unlocker)** :
  * Déverrouillage automatique du canal audio dès la première interaction tactile (Micro, Envoi de message, Appel DirectLive) pour contourner les restrictions strictes d'AutoPlay sur iOS Safari.
* **Résilience du Microphone & Mode Appel Continu** :
  * Gestion du basculement matériel audio/micro avec temporisation protectrice de réarmement (150ms) pour éviter que Safari ne bloque l'accès au microphone après la parole de l'IA.
  * Filtrage des erreurs d'inactivité bénignes d'iOS (`no-speech`, `aborted`) avec reconnexion automatique transparente.

---

## [v1.0.0] — 2026-10-07

### 🚀 Lancement Initial de Nova Classic
* **Architecture Universelle & Épurée** :
  * Déclinaison de l'application Nova originale libérée de toute dépendance matérielle de simulation clavier (DirectInput, serveurs Python locaux, batchs d'élévation administrateur et raccourcis Star Citizen).
  * Chatbot web moderne et réactif utilisable sur n'importe quel ordinateur, tablette ou smartphone.
* **Moteur Vocal & Audio Natif Haute Fidélité** :
  * Synthèse vocale instantanée propulsée par le modèle officiel **Gemini 3.8 Flash TTS** (`gemini-3.8-flash-tts`).
  * Prise en charge complète des voix personnalisées créées dans **Google AI Studio** (Voice Design et Voice Replication).
  * Synchronisation en 1-clic avec Google AI Studio via l'API officielle `/v1beta/voices` et possibilité d'ajouter des voix par leur identifiant.
  * Bouton d'écoute unique et direct, vitesse d'élocution native (1.0x sans artefacts) et filtre robotique métallique optionnel.
* **Mode Appel Mains-Libres Continu (DirectLive)** :
  * Dialogue oral fluide avec détection intelligente des silences, visualiseur audio dynamique, commutateur muet et bouton d'interruption instantanée.
* **Vision d'Écran Multimodale en Temps Réel** :
  * Partage d'écran en 1 clic pour analyser des fenêtres, images ou documents avec l'IA.
* **Intelligence & Mémoire Personnalisée** :
  * 6 profils de personnalité (Léo, Robot Féminin & Sci-Fi, Coach, Complice, Philosophe, Sur-mesure).
  * Accès direct au moteur de recherche Google Web en temps réel (Grounding).
  * Télémétrie en temps réel des jetons traités et calcul des coûts de session en euros et dollars.
  * Sauvegarde et restauration des données au format JSON.
