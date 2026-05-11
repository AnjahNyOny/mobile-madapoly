#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Déploiement Mobile Madapoly - $(date '+%d/%m/%Y %H:%M')"
echo "=================================================="

# Build
echo "📦 Build Expo Web..."
npx expo export --platform web --output-dir dist

# Copier CSS personnalisé si existe
if [[ -f "web/fonts.css" ]]; then
  cp web/fonts.css dist/
fi

# Déploiement
echo "📤 Déploiement des fichiers..."
rsync -avz --delete dist/ liantsoa@babacode.ca:/var/www/mobile-madapoly/

# Permissions (nginx)
echo "🔐 Configuration permissions nginx..."
ssh liantsoa@babacode.ca "sudo chown -R www-data:www-data /var/www/mobile-madapoly && sudo chmod -R 755 /var/www/mobile-madapoly"

# Reload nginx
echo "🔄 Reload nginx..."
ssh liantsoa@babacode.ca "sudo systemctl reload nginx 2>/dev/null || echo '⚠️  Reload nginx manuellement si nécessaire'"

echo ""
echo "✅ DÉPLOIEMENT TERMINÉ !"
echo "🌐 Site : https://babacode.ca/mobile-madapoly/"
echo "💡 Si le site ne se met pas à jour : Ctrl+F5 ou navigation privée"
echo "=================================================="
