# PWA Icons

Generate PWA icons by creating these files:

## Required Icons
- `icon-192.png` - 192x192 pixels
- `icon-512.png` - 512x512 pixels

## Quick Generate (Online Tools)
1. Go to https://favicon.io/emoji-favicon/
2. Search for "flexed biceps" emoji
3. Download and rename files

## Or use this command (requires ImageMagick):
```bash
convert -size 192x192 xc:#111827 -gravity center -pointsize 100 -annotate 0 "💪" icon-192.png
convert -size 512x512 xc:#111827 -gravity center -pointsize 280 -annotate 0 "💪" icon-512.png
```

## Design Guidelines
- Background: #111827 (dark gray)
- Safe zone: center 80% for maskable icons
