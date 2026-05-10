# 🗺️ Roadmap : Monopoly Madagascar - Multijoueur Local (Wi-Fi / LAN)

## 🎯 Objectif Principal
Transformer le jeu local actuel géré par Zustand en une architecture Client-Serveur sur réseau local (LAN). L'un des téléphones (Hôte) héberge la logique autoritaire, les autres (Clients) s'y connectent pour jouer.

## ⚠️ Règles Strictes pour l'Assistant IA (À lire avant toute modification)
1. **Ne JAMAIS désinstaller ou altérer `react-native-reanimated` ou `react-native-gesture-handler`.** Les animations fluides (caméra, rebonds) et les interactions tactiles du plateau sont prioritaires et validées.
2. **Ne pas utiliser Expo Go pour tester cette phase.** L'implémentation requiert `react-native-tcp-socket` qui contient du code natif. Les tests doivent se faire via des builds EAS ou un Custom Dev Client.
3. **Séparation des préoccupations :** Le store Zustand ne doit plus agir seul. Le client ne modifie pas le store directement, il demande l'autorisation au serveur local.
4. **Mettre à jour cette roadmap :** Coche les cases `[x]` au fur et à mesure de l'avancement.

---

## 🛠️ Phase 1 : Infrastructure Réseau (Le Script)

- [x] **1.1 Installation des dépendances natives**
  - Installer `react-native-tcp-socket` (pour la communication).
  - Installer `react-native-network-info` (pour récupérer l'adresse IP locale de l'Hôte).
- [x] **1.2 Création du `NetworkManager.ts` (Service Autonome)**
  - Créer un fichier dédié dans `src/services/` ou `src/network/`.
  - Implémenter la logique **Hôte** :
    - Fonction `startServer(port)` : Crée le serveur TCP.
    - Écouteurs d'événements : `connection`, `data`, `error`, `close`.
    - Maintenir un dictionnaire des sockets connectés.
    - Fonction `broadcast(message)` : Envoie une donnée à tous les clients.
  - Implémenter la logique **Client** :
    - Fonction `connectToServer(ip, port)` : Se connecte au serveur TCP.
    - Fonction `sendMessage(intent)` : Envoie une intention d'action.
- [x] **1.3 Formatage des Paquets Réseau**
  - Définir un format standard (ex: JSON stringifié) pour les messages : `{ type: 'ACTION_NAME', payload: { ...data } }`.

## 🧠 Phase 2 : Refactorisation de l'État (Zustand)

- [x] **2.1 Séparation État Local / État Partagé**
  - Isoler l'état de la caméra et de l'UI (purement local) de l'état du jeu (positions, argent, propriétés).
- [x] **2.2 Implémentation du Serveur Autoritaire**
  - Modifier les actions Zustand actuelles (ex: `rollDice`, `buyProperty`).
  - **Sur le Client :** Ces actions n'exécutent plus la logique. Elles appellent `NetworkManager.sendMessage({ type: 'REQUEST_ROLL_DICE' })`.
  - **Sur l'Hôte :** Le NetworkManager reçoit `REQUEST_ROLL_DICE`, exécute la logique métier de Zustand, puis fait un `broadcast({ type: 'STATE_UPDATE', payload: newGameState })`.
- [x] **2.3 Synchronisation des Clients**
  - Créer un écouteur sur les clients qui reçoit `STATE_UPDATE` et écrase le store Zustand local avec les nouvelles données validées par l'Hôte.

## 🎨 Phase 3 : L'Interface (Le Lobby)

- [x] **3.1 Écran de Connexion (`LobbyScreen.tsx`)**
  - Créer l'UI avec deux choix principaux : "Héberger une partie" et "Rejoindre une partie".
- [x] **3.2 Vue de l'Hôte**
  - Au clic, récupérer et afficher l'adresse IP locale en grand (ex: `192.168.1.15`).
  - Afficher une liste dynamique des joueurs connectés (qui se met à jour quand le serveur TCP accepte un socket).
  - Bouton "Lancer la partie" (désactivé si < 2 joueurs).
- [x] **3.3 Vue du Client**
  - Afficher un champ de texte (Input) pour saisir l'adresse IP affichée par l'Hôte.
  - Bouton "Se connecter".
  - Afficher un état d'attente une fois connecté ("En attente de l'hôte pour commencer...").

## 🚀 Phase 4 : Boucle de Jeu et Animations

- [x] **4.1 Initialisation de la Partie**
  - Au clic sur "Lancer la partie" par l'Hôte, diffuser un message `GAME_START` avec l'état initial complet.
  - Rediriger tous les téléphones de `LobbyScreen` vers l'écran principal du plateau.
- [x] **4.2 Couplage Réseau-Animations**
  - S'assurer que les mises à jour d'état (ex: nouvelle position d'un pion adverse) déclenchent correctement les `withSpring` de Reanimated sur les écrans clients, exactement comme le faisaient les bots.

## 📱 Phase 5 : Tests et Déploiement Natif

- [ ] **5.1 Configuration EAS Dev Client**
  - Configurer `eas build` pour générer un Custom Development Client (permettant d'utiliser le Fast Refresh tout en exécutant le code TCP natif).
- [ ] **5.2 Tests Multi-Appareils**
  - Tester avec l'émulateur Mac et au moins un téléphone physique Android sur le même réseau Wi-Fi.
  - Valider les cas limites : latence, joueur qui quitte l'application brusquement (déconnexion de socket).