#!/bin/bash

# Evita que el script continúe si hay un error
set -e

echo "🚀 Iniciando configuración del entorno de desarrollo para Mac..."
echo "==============================================================="

# 1. Homebrew
if ! command -v brew &> /dev/null; then
    echo "🍺 Instalando Homebrew... (Se te pedirá la contraseña de tu Mac, es normal que no se vean los caracteres al escribir)"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Dependiendo de si es Intel o Apple Silicon, Homebrew se instala en ubicaciones diferentes.
    if [[ -d /opt/homebrew/bin ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [[ -d /usr/local/bin ]]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
else
    echo "✅ Homebrew ya parece estar instalado. Actualizando paquetes..."
    brew update || echo "⚠️ Advertencia: brew update falló, pero continuaremos con la instalación..."
fi

echo "📦 Instalando herramientas en Homebrew (git, gh, jq, wget)..."
brew install git gh jq wget

# 2. Node Version Manager (NVM)
echo "🟢 Instalando NVM (Node Version Manager)..."
if [ ! -d "$HOME/.nvm" ]; then
    # Instalador oficial de nvm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
else
    echo "✅ NVM ya está instalado."
fi

# Cargar NVM dinámicamente en este script para poder usarlo enseguida
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "🟢 Instalando la versión de Node.js más reciente y estable (LTS)..."
nvm install --lts
nvm use --lts
nvm alias default 'lts/*'

# 3. Herramientas NPM Globales (pnpm, vercel, neonctl)
echo "🌐 Instalando PNPM, Vercel CLI y Neon CLI globalmente..."
# Asegurarnos de que tenemos el npm correcto (el que nos dio nvm)
npm install -g pnpm vercel neonctl

echo "==============================================================="
echo "🎉 ¡Tu MacBook Pro está lista para programar fluidamente!"
echo "⚠️  IMPORTANTE: Cierra esta ventana de la terminal y vuelve a abrir una nueva para que todos los cambios se apliquen correctamente."
echo "==============================================================="
