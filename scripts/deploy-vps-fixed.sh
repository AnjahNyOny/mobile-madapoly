#!/usr/bin/env bash
set -euo pipefail

# =============================================================
#  DEPLOY — Mobile Madapoly (Expo Web Build) - VERSION FIXÉE
#  Usage :
#    ./scripts/deploy-vps-fixed.sh --live   → déploiement réel
# =============================================================

# --- CONFIGURATION ---
HOST="babacode.ca"
SSH_USER="liantsoa"
REMOTE_DIR="/var/www/mobile-madapoly"
BUILD_DIR="dist"
LIVE=0
# ---------------------

while [[ "${1:-}" != "" ]]; do
  case "$1" in
    --live) LIVE=1 ;;
    *) echo "Option inconnue: $1"; exit 1 ;;
  esac
  shift || true
done

if [[ "${LIVE}" -eq 0 ]]; then
  echo "❌ Utilisez --live pour déployer réellement"
  exit 1
fi

echo ""
echo "======================================================"
echo "  🚀 Deploy — Mobile Madapoly  |  $(date '+%d/%m/%Y %H:%M')"
echo "  Cible : ${SSH_USER}@${HOST}:${REMOTE_DIR}"
echo "  MODE : LIVE DÉPLOYEMENT"
echo "======================================================"
echo ""

# --- Vérifications pré-déploiement ---
if [[ ! -d "node_modules" ]]; then
  echo "❌ node_modules introuvable. Lance 'npm install' d'abord."
  exit 1
fi

if [[ ! -f "app.json" ]]; then
  echo "❌ app.json introuvable. Ce n'est pas un projet Expo."
  exit 1
fi

# --- Build Expo Web ---
echo "📦 Build Expo Web..."
npx expo export --platform web --output-dir ${BUILD_DIR}

# Copier les fichiers CSS personnalisés
if [[ -f "web/fonts.css" ]]; then
  cp web/fonts.css ${BUILD_DIR}/
fi

if [[ ! -d "${BUILD_DIR}" ]]; then
  echo "❌ Le build a échoué - dossier ${BUILD_DIR} introuvable"
  exit 1
fi

# --- Test de connexion SSH ---
echo ""
echo "🔍 Test de connexion SSH..."
if ssh "${SSH_USER}@${HOST}" "echo '✅ Connexion OK'" 2>/dev/null; then
  echo "✅ Connexion SSH réussie"
else
  echo "❌ Impossible de se connecter à ${SSH_USER}@${HOST}"
  exit 1
fi

# --- Nettoyage et préparation du dossier distant ---
echo ""
echo "🧹 Nettoyage du dossier distant..."
ssh "${SSH_USER}@${HOST}" "mkdir -p ${REMOTE_DIR} && rm -rf ${REMOTE_DIR}/*"

# --- Déploiement des fichiers principaux ---
echo ""
echo "📤 Déploiement des fichiers principaux..."
rsync -avz --delete \
  --exclude=".DS_Store" \
  --exclude=".git" \
  --exclude="node_modules" \
  --exclude=".expo" \
  --exclude="web-build" \
  "${BUILD_DIR}/" \
  "${SSH_USER}@${HOST}:${REMOTE_DIR}/"

# --- Déploiement des bundles JS (fichiers critiques) ---
echo ""
echo "📦 Déploiement des bundles JS..."
if [[ -d "${BUILD_DIR}/_expo" ]]; then
  rsync -avz --delete \
    "${BUILD_DIR}/_expo/" \
    "${SSH_USER}@${HOST}:${REMOTE_DIR}/_expo/"
fi

# --- Permissions SANS sudo (utilise chown normal) ---
echo ""
echo "🔐 Configuration des permissions..."
ssh "${SSH_USER}@${HOST}" "chmod -R 755 ${REMOTE_DIR}"

# --- Forcer le rechargement nginx (si possible) ---
echo ""
echo "🔄 Rechargement nginx..."
ssh "${SSH_USER}@${HOST}" "sudo systemctl reload nginx 2>/dev/null || echo '⚠️  Reload nginx manuellement si nécessaire'"

# --- Cache busting info ---
echo ""
echo "💡 Cache Busting :"
echo "   - Fichiers JS déployés avec nouveaux hash"
echo "   - Si le site ne se met pas à jour :"
echo "     1. Ctrl+F5 (hard refresh)"
echo "     2. Ou vide le cache du navigateur"
echo "     3. Ou ouvre en navigation privée"

# --- Finalisation ---
echo ""
echo "======================================================"
echo "  🎉 DÉPLOIEMENT TERMINÉ !"
echo "  Site disponible : https://${HOST}/mobile-madapoly/"
echo "  Teste en navigation privée si nécessaire"
echo "======================================================"
