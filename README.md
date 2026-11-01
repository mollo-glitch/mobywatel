# Spinka: każda sprawa ma następny krok

Nieoficjalny prototyp konkursowy na mObywatel Challenge: koncepcja asystenta spraw „Spinka” w aplikacji mObywatel.
To nie jest oficjalna aplikacja mObywatel ani usługa administracji publicznej. Wszystkie dane są fikcyjne i nic nie jest wysyłane.

| Katalog | Co to jest |
|---|---|
| `aplikacja/` | prototyp aplikacji, runda 27 (build `61c29122…`): źródła, `dist/`, serwer z opcjonalnym trybem AI, testy, raporty, znak Spinki w SVG (`docs/znak-spinki/`). Szczegóły: `aplikacja/README.md`, `aplikacja/PRZENIESIENIE.md` |
| `strona/` | strona projektu: film jako wprowadzenie, „Pomiń film”, po filmie „Przejdź do demonstracji”, demonstracja pod `/aplikacja/`. Szczegóły: `strona/README.md` |

## Publikacja

Każdy push do `main` uruchamia `.github/workflows/strona.yml`: buduje `strona/public/` (aplikacja trafia do
`/aplikacja/` bajt w bajt, build sprawdza MD5) i publikuje wynik na gałęzi `gh-pages`. GitHub Pages serwuje tę gałąź
(Settings → Pages → Deploy from a branch → `gh-pages`, katalog `/`).

Film: wersja webowa w `strona/film-web/` (`spinka-film-v8.mp4`, `spinka-film-v8-plakat.jpg`, `spinka-film-v8.pl.vtt`),
przygotowana skryptem `strona/przygotuj-film.sh` z zatwierdzonego eksportu. Mastera nie trzymamy w repozytorium.

## Lokalnie

```bash
node strona/build.mjs --bez-filmu      # albo bez --bez-filmu, gdy film jest w strona/film-web/
node strona/podglad.mjs 8400           # http://127.0.0.1:8400/ i /aplikacja/
```
