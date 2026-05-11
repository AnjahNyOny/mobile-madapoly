#!/usr/bin/env bash
set -euo pipefail

# =============================================================
#  DEPLOY — Mobile Madapoly (Expo Web Build)
#  Usage :
#    ./scripts/deploy-vps.sh          → dry-run (simulation)
#    ./scripts/deploy-vps.sh --live   → déploiement réel
# =============================================================

# --- CONFIGURATION ---
HOST="babacode.ca"
SSH_USER="liantsoa"
REMOTE_DIR="/var/www/mobile-madapoly"
BUILD_DIR="dist"
RSYNC_EXCLUDES=("--exclude" ".DS_Store" "--exclude" ".git" "--exclude" "node_modules" "--exclude" ".expo" "--exclude" "web-build")
LIVE=0
# ---------------------

while [[ "${1:-}" != "" ]]; do
  case "$1" in
    --live) LIVE=1 ;;
    *) echo "Option inconnue: $1"; exit 1 ;;
  esac
  shift || true
done

echo ""
echo "======================================================"
echo "  🚀 Deploy — Mobile Madapoly  |  $(date '+%d/%m/%Y %H:%M')"
echo "  Cible : ${SSH_USER}@${HOST}:${REMOTE_DIR}"
if [[ "${LIVE}" -eq 0 ]]; then
  echo "  MODE : DRY-RUN (simulation, rien ne sera envoyé)"
else
  echo "  MODE : LIVE DÉPLOYEMENT"
fi
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
if [[ "${LIVE}" -eq 1 ]]; then
  npx expo export --platform web --output-dir ${BUILD_DIR}
  # Copy custom CSS files
  cp web/fonts.css ${BUILD_DIR}/
else
  echo "  (simulation) npx expo export --platform web --output-dir ${BUILD_DIR}"
  echo "  (simulation) cp web/fonts.css ${BUILD_DIR}/"
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

# --- Création du dossier distant ---
echo ""
echo "📁 Création du dossier distant..."
if [[ "${LIVE}" -eq 1 ]]; then
  ssh "${SSH_USER}@${HOST}" "mkdir -p ${REMOTE_DIR}"
else
  echo "  (simulation) ssh ${SSH_USER}@${HOST} \"mkdir -p ${REMOTE_DIR}\""
fi

# --- Déploiement avec rsync ---
echo ""
echo "📤 Déploiement des fichiers..."
RSYNC_CMD=(
  rsync
  -avz
  --delete
  "${RSYNC_EXCLUDES[@]}"
  "${BUILD_DIR}/"
  "${SSH_USER}@${HOST}:${REMOTE_DIR}/"
)

if [[ "${LIVE}" -eq 0 ]]; then
  RSYNC_CMD+=(--dry-run)
  echo "  Commande (dry-run):"
  echo "  ${RSYNC_CMD[*]}"
fi

echo "  Exécution..."
"${RSYNC_CMD[@]}"

# --- Permissions ---
echo ""
echo "🔐 Configuration des permissions..."
if [[ "${LIVE}" -eq 1 ]]; then
  ssh "${SSH_USER}@${HOST}" "sudo chown -R www-data:www-data ${REMOTE_DIR} && sudo chmod -R 755 ${REMOTE_DIR}"
else
  echo "  (simulation) ssh ${SSH_USER}@${HOST} \"sudo chown -R www-data:www-data ${REMOTE_DIR} && sudo chmod -R 755 ${REMOTE_DIR}\""
fi

# --- Finalisation ---
echo ""
echo "======================================================"
if [[ "${LIVE}" -eq 0 ]]; then
  echo "  ✅ DRY-ROUT TERMINÉ (aucun changement appliqué)"
  echo "  Pour déployer réellement : ./scripts/deploy-vps.sh --live"
else
  echo "  🎉 DÉPLOIEMENT TERMINÉ !"
  echo "  Site disponible : https://${HOST}/mobile-madapoly/"
fi
echo "======================================================"
