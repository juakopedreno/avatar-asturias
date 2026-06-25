#!/usr/bin/env bash
set -euo pipefail

# Vercel puede omitir devDependencies del workspace; aseguramos el toolchain de Vite.
if [ ! -d "node_modules/@vitejs/plugin-react" ] || [ ! -d "node_modules/vite" ]; then
  echo "Installing Vite build toolchain for @avatar/web..."
  npm install \
    @vitejs/plugin-react@^4.3.4 \
    vite@^5.4.19 \
    tailwindcss@^3.4.17 \
    postcss@^8.5.6 \
    autoprefixer@^10.4.21 \
    typescript@^5.8.3 \
    -w @avatar/web \
    --no-audit --no-fund
fi

npm run build -w @avatar/web
