# Style Guide — Reel Instagram

## Format
- Dimensions : 1080 x 1920 (9:16 vertical)
- FPS : 30
- Durée totale : 30s / 900 frames
- Durée par scène : ~90-150 frames
- Transitions fade : 10 frames

## Couleurs
- Background : #FFFFFF
- Primary (titres, highlights) : #E02020 (rouge)
- Accent (badges, bordures) : #CC0000 (rouge foncé)
- Text : #111111 (noir quasi-pur)
- Text muted : #555555 (gris moyen)
- Surface (cartes) : #F5F5F5
- Border : #E0E0E0

## Typographie
- Font titres : Inter, system-ui — 80px / 900
- Font body : Inter, system-ui — 44px / 400
- Font accent : Inter, system-ui — 36px / 600

## Background animé
- Type : fond blanc pur, statique
- Overlay : légère ligne décorative rouge en bas
- Animation : aucun drift (style épuré)

## Animations
- Entrée par défaut : spring() damping: 12, depuis y+60
- Fade in : interpolate [0,15] → [0,1]
- Stagger entre items : 12 frames
- Scale pop : spring() from:1.3 to:1, damping:8
- Typing : interpolate [0,60] → [0, text.length]

## Structure des scènes
- Layout : AbsoluteFill, padding 80px horizontal, centré verticalement
- Scène 1 (Hook) : 90 frames (3s)
- Scène 2 (Problème) : 120 frames (4s)
- Scène 3 (Promesse) : 90 frames (3s)
- Scène 4 (Point 1) : 120 frames (4s)
- Scène 5 (Point 2) : 120 frames (4s)
- Scène 6 (Point 3) : 120 frames (4s)
- Scène 7 (Recap) : 90 frames (3s)
- Scène 8 (CTA) : 150 frames (5s)
