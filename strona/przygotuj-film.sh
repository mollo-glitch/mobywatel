#!/bin/bash
# Wersja webowa filmu do strony (H.264 + AAC, faststart, najwyżej 1920 px szerokości) i plakat, w katalogu film-web/.
# Nie zmienia ani nie nadpisuje pliku źródłowego: odmawia, jeśli wynik miałby trafić w to samo miejsce.
#   ./przygotuj-film.sh <film-zrodlowy.mp4> [napisy.vtt] [plakat.jpg | czas klatki na plakat, domyślnie 00:00:03]
# Wymaga: ffmpeg i ffprobe.
set -euo pipefail
cd "$(dirname "$0")"
ZRODLO="${1:?Podaj film źródłowy, np. spinka-film-v8-podglad_1080p30.mp4}"
NAPISY="${2:-}"
PLAKAT="${3:-00:00:03}"
OUT=film-web
mkdir -p "$OUT"
CEL="$OUT/spinka-film-v8.mp4"
[ "$(realpath -m "$ZRODLO")" = "$(realpath -m "$CEL")" ] && { echo "Źródło i wynik to ten sam plik: przerywam." >&2; exit 1; }

echo "Źródło:"; ffprobe -v error -show_entries format=duration,size,bit_rate:stream=codec_name,width,height,r_frame_rate -of compact "$ZRODLO"
ffmpeg -hide_banner -loglevel error -y -i "$ZRODLO" \
  -map 0:v:0 -map 0:a:0? -c:v libx264 -preset slow -crf 23 -profile:v high -pix_fmt yuv420p \
  -vf "scale='min(1920,iw)':-2" -c:a aac -b:a 128k -movflags +faststart "$CEL"
echo "Wersja webowa:"; ffprobe -v error -show_entries format=duration,size,bit_rate -of compact "$CEL"

if [ -f "$PLAKAT" ]; then
  ffmpeg -hide_banner -loglevel error -y -i "$PLAKAT" -vf "scale='min(1920,iw)':-2" -q:v 3 "$OUT/spinka-film-v8-plakat.jpg"
else
  ffmpeg -hide_banner -loglevel error -y -ss "$PLAKAT" -i "$ZRODLO" -frames:v 1 -vf "scale='min(1920,iw)':-2" -q:v 3 "$OUT/spinka-film-v8-plakat.jpg"
fi
if [ -n "$NAPISY" ]; then
  head -c 6 "$NAPISY" | grep -q WEBVTT || { echo "$NAPISY nie jest plikiem WebVTT." >&2; exit 1; }
  cp "$NAPISY" "$OUT/spinka-film-v8.pl.vtt"
else
  echo "UWAGA: bez napisów. Film na stronie ma mieć napisy: podaj plik .vtt jako drugi argument." >&2
fi
ls -la "$OUT"
