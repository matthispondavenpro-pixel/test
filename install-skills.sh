#!/bin/bash
# Installe les skills Plus2Clicks dans Claude Code
SKILLS_DIR="$HOME/.claude/skills"
REPO_DIR="$(dirname "$0")/skills"

mkdir -p "$SKILLS_DIR"

for skill in "$REPO_DIR"/*/; do
  name=$(basename "$skill")
  cp -r "$skill" "$SKILLS_DIR/$name"
  echo "✓ $name installé"
done

echo ""
echo "Tous les skills sont installés. Redémarre Claude Code."
