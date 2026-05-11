# 🎨 Madapoly — Design Brief
**Titre :** Madapoly
**Sous-titre :** Édition Ariary Luxe

---

## 1. Palette de couleurs
ceux qui ne pique pas trop l'oiel et agreable aregarder

### Primaires (drapeau Madagascar)
- Blanc : `#FFFFFF`
- Vert : à confirmer → `#` ___
- Rouge : à confirmer → `#` ___

### Secondaires
- Jaune : à confirmer → `#` ___
- Violet : à confirmer → `#` ___

### Fond général
- Fond sombre (actuel `#121212`) → garder sombre ou aller vers quelque chose de plus riche ?
  - [ ] Sombre pur (noir)
  - [ ] Sombre chaud (marron profond, style luxe)
  - [ ] Dégradé (ex: violet foncé → noir)
  - [ x] Autre : sombre, noire mais proche du bleue nuit tres sombre ou violet tres tres sombre ___

### Fond du plateau de jeu
derierre le plateau j'aimerais une image de ravinala pour le moment avec un fond neutre comme beige pour le moment
- Actuel : gris clair `#E0E0E0`
- Nouvelle couleur/texture souhaitée : ___

---

## 2. Typographie
tu peux garder la police pour l'instant
- Police actuelle : **Inter** (Google Fonts)
- Souhaites-tu garder Inter ou changer ?
  - [ ] Garder Inter
  - [ ] Autre police : ___
- Style des titres (ex: "MADAPOLY") :
  - [ ] Tout en majuscules
  - [ ] Serif (élégant, style journal)
  - [ ] Sans-serif bold (moderne)
  - [ ] Autre : ___

---

## 3. LobbyScreen — Layout & Structure

### Écran d'accueil (select)

- Disposition souhaitée :
  - [ ] Titre en haut + 3 gros boutons empilés verticalement (actuel)
  - [ ] Titre centré + cartes côte à côte (horizontal)
  - [ ] Écran plein avec illustration de fond + boutons flottants
  - [ x] Autre : je veux que le lobby soit comme un game menu, d'abord les 3 modes, apres les modes on peut choisir les options de jeu fortune ou chrono, je veux aussi un selecteur pour les icones des pions___
- Y a-t-il une illustration/image de fond souhaitée ? non___
- Le logo/titre doit-il avoir un effet visuel (ombre, glow, dégradé) ?
  - [ ] Glow coloré
  - [ ] Ombre portée
  - [ ] Dégradé sur le texte
  - [x ] Autre : mada en blanc poly en rouge et le sous titre en vert le logo doit etre le lemur-madagascar et le flag-for-madagascar derriere___
- Sélecteur nom + avatar : garder en haut ou déplacer ? garde en haut___

### Vue Hôte (local + en ligne)
- Liste des joueurs connectés : style souhaité ?
  - [ x] Cartes avec avatar + nom (actuel)
  - [ ] Liste compacte avec badge coloré
  - [ ] Autre : ___
- Bouton "Lancer" : position et style préférés ? juste Lancer et minimaliste, couleur violette___

### Vue Client (attente)
- Message d'attente : texte seul ou animation ? animation minimaliste___

### Liste des parties en ligne
- Style des cartes de room :
  - [ x] Compact (actuel)
  - [ ] Grande carte avec plus d'infos
  - [ ] Autre : ___

---

## 4. HUD en jeu (HUDLayer)

- Cartes joueurs (en haut) : style souhaité ?
  - [x ] Chips compactes (actuel)
  - [ ] Cartes plus grandes avec barre de vie/fortune
  - [ ] Autre : ___
- Bouton 🎲 "LANCER" : style préféré ?
  - [ ] Actuel (rouge avec glow)
  - [ x] Autre couleur/forme : violet et petit___
- Compteur chrono : position ?
  - [ x] Haut centre (actuel)
  - [ ] Autre : ___
- Bouton log 📜 et abandon ⚙️ : garder ou repositionner ? repositionner en bas a droite___

---

## 5. Plateau de jeu

- Cases : fond actuel blanc/gris → changer vers quoi ? ___
- Couleur de la zone centrale (milieu du plateau) : garde et ajoute le titre et sous titre___
- Cases spéciales (prison, départ, parking, etc.) : style souhaité ?
  - [ ] Icônes + texte (actuel)
  - [ x] Illustrations custom (à fournir plus tard)
  - [ ] Autre : ___
- Pions : des assets custom seront fournis → confirmer les noms/thèmes :
  - [ x] Zébu 🐂
  - [ x] Baobab 🌳
  - [ x] Pirogue ⛵
  - [ x] Chapeau lamba 🎩
  - [ ] Autre : ___

---

## 6. Modales

### Modale propriété (achat)
- Style souhaité ?
  - [ ] Carte façon vrai Monopoly (actuel)
  - [ ] Design plus moderne/luxe
  - [ ] Autre : ___

### Modale carte Magie-Magie / Ankamantatra
- Style de la carte révélée : ___
- Couleurs distinctives par type ?
  - Magie-Magie : `#` ___
  - Ankamantatra : `#` ___

### Modale échange
- Garder le design actuel ou refaire ? ___

### Modal déconnexion (rouge danger)
- Garder ou changer le style ? ___

---

## 7. Effets & Animations

- Transition entre écrans :
  - [ ] Aucune (actuel)
  - [ ] Fade
  - [x ] Slide
  - [ ] Autre : ___
- Animation dés :
  - [ ] Shake + résultat (simple)
  - [ ] Rotation 3D des dés avant résultat
  - [ ] Autre : ___
- Victoire :
  - [ ] Bannière + glow (actuel)
  - [ ] Confettis
  - [ x] Les deux
  - [ ] Autre : ___

---

## 8. Sons (à implémenter après design)

- [ ] Son lancer de dés
- [ ] Son achat propriété
- [ ] Son paiement loyer
- [ ] Son prison
- [ ] Son victoire / fanfare
- [ ] Musique d'ambiance lobby
- [ ] Musique en jeu
- Style sonore : ___
  - [ ] Classique Monopoly (kitch, festif)
  - [ ] Luxe/sérieux (orchestral)
  - [ ] Malagasy / traditionnel
  - [ ] Électronique/moderne (style Monopoly GO)

---

## 9. Inspirations visuelles

> Décris ici ce qui t'a plu dans Monopoly GO ou Plaato, ou colle des captures d'écran

- Ce que j'aime dans Monopoly GO : ___
- Ce que j'aime dans Plaato : ___
- Ambiance générale visée :
  - [ ] Luxe / premium (or, velours, cristal)
  - [ ] Fun / cartoon (couleurs vives, gros contours)
  - [x] Réaliste / élégant
  - [x] Malagasy / culturel (lamba, raphia, couleurs locales)
  - [ ] Mélange : ___

---

## 10. Ce que je vais fournir plus tard

- [ ] Logo Madapoly (PNG/SVG)
- [ ] Pions custom (PNG/SVG par pion)
- [ ] Icônes des propriétés (par case)
- [ ] Illustrations des cartes Magie-Magie / Ankamantatra
- [ ] Police custom (si différente d'Inter)
- [ ] Sons / musiques
