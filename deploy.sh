#!/usr/bin/env bash
set -euo pipefail

# =============================================================
#  DEPLOY — Portfolio 3D (Nuxt 4 SPA)
#  Usage :
#    ./scripts/deploy.sh          → dry-run (simulation)
#    ./scripts/deploy.sh --live   → déploiement réel
# =============================================================

# --- CONFIGURATION ---
HOST="74.208.248.17"
SSH_USER="liantsoa"
REMOTE_DIR="/var/www/portfolio3d/public"
BUILD_DIR=".output/public"
RSYNC_EXCLUDES=("--exclude" ".DS_Store" "--exclude" ".git" "--exclude" "node_modules")
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
echo "  🚀 Deploy — Portfolio 3D  |  $(date '+%d/%m/%Y %H:%M')"
echo "  Cible : ${SSH_USER}@${HOST}:${REMOTE_DIR}"
if [[ "${LIVE}" -eq 0 ]]; then
  echo "  MODE : DRY-RUN (simulation, rien ne sera envoyé)"
else
  echo "  MODE : ⚠️  LIVE — les fichiers seront réellement déployés"
fi
echo "======================================================"
echo ""

echo "=== [1/4] Vérification de l'environnement ==="
for cmd in npm rsync ssh node; do
  command -v "$cmd" >/dev/null || { echo "❌ Commande manquante : '$cmd'"; exit 1; }
done
echo "✔ node $(node -v) | npm $(npm -v) | rsync OK | ssh OK"

echo ""
echo "=== [2/4] Build Nuxt (SSR=false → SPA statique) ==="
if [[ ! -d node_modules ]]; then
  echo "Installation des dépendances..."
  npm ci
fi

echo "Génération statique (nuxt generate)..."
npx nuxt generate

if [[ ! -f "${BUILD_DIR}/index.html" ]]; then
  echo "❌ Erreur : index.html absent dans '${BUILD_DIR}'."
  echo "   Vérifie que nitro.preset: 'static' est dans nuxt.config.ts."
  exit 1
fi

# Tag de version
VERSION=$(git rev-parse --short HEAD 2>/dev/null || date +%s)
echo "${VERSION}" > "${BUILD_DIR}/version.txt"
echo "✔ Build OK — version : ${VERSION}"

echo ""
echo "=== [3/4] Backup & transfert ==="
if [[ "${LIVE}" -eq 1 ]]; then
  TS=$(date +%Y%m%d-%H%M%S)
  echo "Création d'un backup distant..."
  ssh "${SSH_USER}@${HOST}" "
    if [ -d ${REMOTE_DIR} ]; then
      mkdir -p /var/www/portfolio3d/_backups
      tar -czf /var/www/portfolio3d/_backups/public-${TS}.tgz -C /var/www/portfolio3d public
      echo 'Backup créé : /var/www/portfolio3d/_backups/public-${TS}.tgz'
    else
      echo 'Pas de backup (premier déploiement)'
    fi
  "

  echo "🚀 Envoi des fichiers..."
  rsync -avz --delete "${RSYNC_EXCLUDES[@]}" \
    "${BUILD_DIR}/" \
    "${SSH_USER}@${HOST}:${REMOTE_DIR}/"

  echo "🔧 Correction des permissions..."
  ssh "${SSH_USER}@${HOST}" "
    chown -R ${SSH_USER}:${SSH_USER} ${REMOTE_DIR}
    chmod -R 755 ${REMOTE_DIR}
  "

  echo ""
  echo "=== [4/4] Vérification ==="
  DEPLOYED_VERSION=$(ssh "${SSH_USER}@${HOST}" "cat ${REMOTE_DIR}/version.txt 2>/dev/null || echo 'inconnu'")
  echo "✔ Version déployée sur le serveur : ${DEPLOYED_VERSION}"

  echo ""
  echo "✅ Déploiement LIVE terminé avec succès !"
  echo "   🌐 https://anjahnyony.com"

else
  echo "--- DRY RUN ---"
  echo "Fichiers qui seraient envoyés vers '${SSH_USER}@${HOST}:${REMOTE_DIR}/' :"
  rsync -avz --delete --dry-run "${RSYNC_EXCLUDES[@]}" \
    "${BUILD_DIR}/" \
    "${SSH_USER}@${HOST}:${REMOTE_DIR}/"
  echo "---------------"
  echo ""
  echo "✔ Dry-run terminé. Pour déployer réellement :"
  echo "   ./scripts/deploy.sh --live"
fi