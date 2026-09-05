#!/bin/bash
# Claude Video Kit — Montage automatique (Mac)
# Double-clique sur ce fichier pour monter une vidéo.

cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     Claude Video Kit — Montage      ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Sélecteur de fichier macOS
VIDEO=$(osascript <<'EOF'
try
    set f to choose file with prompt "Choisis ta vidéo brute :" of type {"public.mpeg-4", "com.apple.quicktime-movie", "public.movie", "public.avi"}
    POSIX path of f
on error
    ""
end try
EOF
)

if [ -z "$VIDEO" ]; then
    echo "Aucune vidéo sélectionnée. Fermeture."
    exit 0
fi

echo "Vidéo : $VIDEO"
echo ""

python3 pipeline/run.py "$VIDEO"

echo ""
read -p "Appuie sur Entrée pour fermer..."
