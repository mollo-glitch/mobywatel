#!/bin/bash
# Testy rundy 26 na bieżącym dist/ i serwerze z katalogu projektu (dwa poziomy wyżej). Bez prawdziwego klucza API:
# tryb AI testuje atrapa Gemini API (mock-gemini2.mjs, port 8599) z celowo fałszywym kluczem „test-klucz-atrapa-0000”.
# Wymaga: Node.js 20.12+, Python 3 (serwer statyczny), npm install, npx playwright install chromium.
# Zajmuje porty: $PORT_STATYCZNY (domyślnie 8200), 8599, 8611–8616, 8631. Czas: około 5 minut.
set -u
cd "$(dirname "$0")"
PROJ="$(cd ../.. && pwd)"
PORT_STATYCZNY="${PORT_STATYCZNY:-8200}"
(cd "$PROJ/dist" && exec python3 -m http.server "$PORT_STATYCZNY" --bind 127.0.0.1 >/dev/null 2>&1) & STAT=$!
node mock-gemini2.mjs 8599 >/dev/null 2>&1 & MOCK=$!
trap 'kill $STAT $MOCK 2>/dev/null' EXIT
sleep 1.5
echo "== Poprawki rundy 25 (40 sprawdzeń)";        node regresja.js "$PORT_STATYCZNY" | tail -1
echo "== Plik, który nie jest zdjęciem";           node plik-widoczny.js "$PORT_STATYCZNY"
echo "== Pola (9 sprawdzeń)";                      node pola-test2.js "$PORT_STATYCZNY" | tail -1
echo "== Tryb AI na atrapie (26 sprawdzeń)";       node ai-test.js "$PROJ" "$PORT_STATYCZNY" | grep -E "^✗|RAZEM" -A1
echo "== Dostępność trybu AI (8 sprawdzeń)";       node ai-a11y.js "$PROJ" | grep -E "^✗|RAZEM" -A1
