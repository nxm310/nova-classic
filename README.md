# 🌟 Nova Classic — Compagnon Vocal & IA Multimodal (PWA)

Application web autonome et progressive (PWA) de compagnon IA conversationnel, propulsée par l'API **Google Gemini** et hébergée directement sur GitHub Pages :
👉 **[https://nxm310.github.io/nova-classic/](https://nxm310.github.io/nova-classic/)**

---

## ✨ Fonctionnalités Principales

1. **🎙️ Voix HD & Clones AI Studio (Gemini 3.8 Flash Audio)** :
   * Synthèse vocale naturelle haute fidélité via l'API Gemini Speech.
   * Prise en charge des voix personnalisées créées dans **Google AI Studio** via synchronisation directe.
   * Contrôle fin du timbre, de la présence et des inflexions vocales sans artéfacts robotiques.

2. **📞 Mode Appel Mains-Libres & Visualiseur Audio** :
   * Discussion vocale bidirectionnelle continue avec détection d'activité vocale (VAD) et interruptions naturelles.
   * Visualiseur d'ondes audio réactif en temps réel.
   * Mode plein écran immersif pour conversations spontanées.

3. **👁️ Vision Multimodale (Écran & Caméra)** :
   * Partage d'écran en direct ou flux webcam pour analyse visuelle contextuelle par l'IA.
   * Capacité de discuter de vos documents, interfaces de travail, vidéos ou présentations.

4. **🧠 Mémoire Persistante & Personnalisation** :
   * Personnalisation du profil du compagnon (nom, avatar, rôle, ton conversationnel).
   * Système de mémoire à long terme stocké localement et modulable.
   * Export et import de vos configurations et historiques au format JSON.

5. **🔍 Recherche Web Google en Direct (Grounding)** :
   * Réponses actualisées en temps réel avec citations de sources officielles via l'outil Search Grounding de Google.

6. **📊 Télémétrie & Suivi des Coûts API** :
   * Estimation des jetons (tokens) entrants et sortants.
   * Calcul en temps réel du coût de la session en Euros (€) et Dollars ($).

---

## 🚀 Utilisation en Ligne

Aucune installation logicielle ou pont d'exécution n'est nécessaire. 

1. Rendez-vous sur **[https://nxm310.github.io/nova-classic/](https://nxm310.github.io/nova-classic/)**.
2. Cliquez sur les **Paramètres ⚙️** en haut à droite.
3. Renseignez votre clé d'API Google Gemini (disponible gratuitement sur [Google AI Studio](https://aistudio.google.com/)).
4. Démarrez la conversation par écrit ou lancez un appel vocal direct !

---

## 💻 Développement Local

### Prérequis
* **Node.js** (v18+)
* **npm** ou **yarn**

### Installation & Lancement
```bash
# Cloner le dépôt
git clone https://github.com/nxm310/nova-classic.git
cd nova-classic

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev

# Compiler et exporter la version statique (GitHub Pages)
npm run build
```

---

## 🔒 Confidentialité & Sécurité

* **100% Client-Side** : Vos requêtes et votre clé API transitent exclusivement entre votre navigateur et les serveurs de l'API Google Gemini via HTTPS chiffré.
* Aucune donnée personnelle, mémoire ou clé d'API n'est stockée sur un serveur tiers.

---

## 📝 Licence

Distribué sous licence MIT. Développé avec Next.js, Tailwind CSS et Lucide Icons.
