#!/bin/bash
# Claude Video Kit — Installation automatique (Mac)
# Double-clique sur ce fichier une seule fois.

cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Claude Video Kit — Installation   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Homebrew
if ! command -v brew &>/dev/null; then
    echo "→ Installation de Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Ajoute brew au PATH pour la suite du script
    eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv 2>/dev/null)"
else
    echo "✓ Homebrew déjà installé"
fi

# ffmpeg
if ! command -v ffmpeg &>/dev/null; then
    echo "→ Installation de ffmpeg..."
    brew install ffmpeg
else
    echo "✓ ffmpeg déjà installé"
fi

# Node
if ! command -v node &>/dev/null; then
    echo "→ Installation de Node.js..."
    brew install node
else
    echo "✓ Node.js déjà installé"
fi

# Packages npm (Remotion)
echo "→ Installation des packages Remotion..."
npm install --prefix reel-instagram --silent

# Packages Python
echo "→ Installation de Whisper + numpy + scipy..."
pip3 install openai-whisper numpy scipy --quiet

echo ""
echo "→ Vérification finale..."
python3 pipeline/diagnose.py

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  Installation terminée ✓             ║"
echo "║  Tu peux fermer cette fenêtre.       ║"
echo "║  Utilise maintenant monter.command   ║"
echo "╚══════════════════════════════════════╝"
echo ""
read -p "Appuie sur Entrée pour fermer..."
