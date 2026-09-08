# 🎲 Monopoly Madagascar

Monopoly Madagascar est une adaptation mobile du célèbre jeu de plateau Monopoly, entièrement thématisée sur Madagascar. Le jeu propose une expérience immersive permettant à un joueur humain d'affronter des intelligences artificielles (bots) dans un environnement hors ligne.

## 🚀 Fonctionnalités Principales (Phase 1)

* **Plateau de jeu 100% Malgache** : 40 cases repensées avec des lieux emblématiques (Tsingy de Bemaraha, Nosy Be, Antananarivo, etc.), des gares locales (Cotisse, Posy-posy) et des services publics (JIRAMA).
* **Joueur vs IA** : Affrontez des bots dotés d'un comportement déterministe intelligent (achats, gestion de prison, constructions).
* **Moteur de jeu robuste** : Gestion complète des règles fondamentales (lancer de dés, déplacements, achats, loyers, prison, faillite).
* **Caméra Dynamique** : Une interface utilisateur (HUD) fluide qui centre la vue automatiquement sur l'action en cours.
* **Architecture performante** : Séparation stricte et absolue entre la logique métier (Store Zustand) et le rendu visuel (React).

## 🛠️ Stack Technique

* **Framework** : React Native avec Expo.
* **Langage** : TypeScript (Typage strict pour la modélisation des états).
* **Gestion d'état** : Zustand.
* **Animations** : React Native Reanimated (pour le mouvement organique des pions).
* **Réseau** : `react-native-tcp-socket` (pour la communication LAN).

## 🏗️ Architecture du Projet

Le projet suit une organisation claire :

```text
/monopoly-mada
├── /assets            # SVG, Polices, Sons
├── /src
│   ├── /components    
│   │   ├── /board     # BoardLayer, Tile, TokenLayer
│   │   └── /ui        # HUDLayer, Boutons, Modales
│   ├── /constants     # staticBoard.ts (Les 40 cases)
│   ├── /store         # useGameStore.ts (Moteur de jeu via Zustand)
│   ├── /types         # Interfaces TypeScript (GameState, Player, etc.)
│   └── /utils         # Fonctions mathématiques, logique de coordonnées
└── App.tsx            # Point d'entrée de l'application
```

## 📱 Environnement de Test & Compilation

> ⚠️ **Important :** Le projet utilise des librairies avec du code natif (`react-native-tcp-socket`). Il est donc obligatoire de générer des **Custom Dev Clients** ; l'application standard *Expo Go* ne fonctionnera pas.

### Développement & Test Local

1. **Lancer le serveur relais local** :
   ```bash
   npm start
   ```
2. **Lancer l'application avec le client de développement** :
   ```bash
   npx expo start --dev-client
   ```
   *Astuce : Utilisez un iPhone physique comme hôte pour exposer une véritable IP locale LAN, et un émulateur Android comme client.*

### Arrêter tous les services

Pour nettoyer vos terminaux et stopper les serveurs :
```bash
pkill -f "expo start" ; pkill -f "relay-server/server.js" ; pkill -f "node server.js"
```

## 🌐 Déploiement Web (Production)

L'application peut également être compilée et servie via le web :

1. Compilation pour le web : `npx expo export --platform web --output-dir dist`
2. Copie vers le serveur via SSH/SCP (référez-vous aux scripts de déploiement inclus dans le projet).
