# Znak Spinki: pliki SVG i dane do animacji

## Skąd jest kształt

Znak nie ma osobnego pliku źródłowego. Rysuje go kod:

- **geometria:** `src/icons.js`, funkcja `A.postac` (pole 64 × 64, wszystkie współrzędne niżej),
- **kolory, grubości, stany i ruch:** `src/styles.css`, reguły `.postac*` i klatki `postac-fala`, `postac-pisze`, `postac-zatrzask`,
- `src/marka.js` ma tylko nazwę, formy odmiany, hasło i przełącznik `postac` (pokaż albo ukryj znak). Kształtu tam nie ma.

Pliki SVG w tym katalogu są **wyeksportowane z tego kodu** (build `61c29122…`): znacznik z `A.postac`, style CSS
zamienione na atrybuty SVG, stan końcowy bez animacji. Porównanie w Chromium przy 256 px z marginesem: każdy z 5 stanów
jest piksel w piksel taki sam jak znak narysowany przez aplikację (maksymalna różnica 0), a aplikacja nie rysuje nic
poza polem 64 × 64. Pliki są w kolorach RGB z aplikacji, bez fontów i bez CSS, więc otworzy je każdy program do grafiki wektorowej.

| Plik | Stan |
|---|---|
| `spinka-znak-slucha.svg` | słucha: spinka uchylona, odznaka z falami |
| `spinka-znak-wyjasnia.svg` | wyjaśnia: linie na kartce ciemne, odznaka „i” |
| `spinka-znak-ostrzega.svg` | ostrzega: bursztynowa odznaka „!” z ciemnym obrysem (przed potwierdzeniem) |
| `spinka-znak-krok.svg` | następny krok: przednia kartka przesunięta o 2 w prawo, odznaka ze strzałką |
| `spinka-znak-gotowe.svg` | gotowe: zielona odznaka z ptaszkiem |
| `spinka-znak-bez-odznaki.svg` | **wyprowadzony**: te same kształty bez odznaki, spinka w spoczynku, linie w kolorze obrysu. W aplikacji ten wariant nie występuje (tam zawsze jest odznaka stanu); do planszy tytułowej lub logo w filmie |
| `podglad-stanow.png` | podgląd plików w 200 px i 34 px |

## Geometria (pole 64 × 64)

Kolejność rysowania od spodu: tylna kartka, przednia kartka z liniami, spinka, odznaka.

| Element | Kształt | Wypełnienie | Obrys |
|---|---|---|---|
| tylna kartka | prostokąt x 19, y 9, 34 × 42, zaokrąglenie 5 | `#E3E8F0` | `#4F586C`, 2,6, łączenia zaokrąglone |
| przednia kartka | prostokąt x 10, y 15, 34 × 43, zaokrąglenie 5 | `#FFFFFF` | `#4F586C`, 3, łączenia zaokrąglone |
| linie tekstu | od x 17,5: y 33,5 dł. 19; y 41 dł. 19; y 48,5 dł. 11 | — | `#4F586C` (przy „wyjaśnia” `#131A2A`), 2,8, końce zaokrąglone |
| spinka | prostokąt x 16,5, y 2,5, 12 × 25, zaokrąglenie 6 (pełna pigułka) | `#C8102E` | — |
| szczelina spinki | prostokąt x 20,75, y 7,5, 3,5 × 14, zaokrąglenie 1,75 | `#FFFFFF` | — |
| odznaka | koło środek (50,5; 50,5), promień 11 | `#C8102E`; „gotowe” `#1B6A3D`; „ostrzega” `#E59A0B` | `#FFFFFF` 3; „ostrzega” `#8F5200` 1,8 |
| znaki na odznace | ścieżki w plikach SVG | — | `#FFFFFF` 2,7; „ostrzega” `#131A2A` 3 |

Proporcje: spinka wystaje 12,5 nad przednią kartkę (y 2,5 wobec 15), jej środek jest na x 22,5. Odznaka zachodzi na prawy
dolny róg obu kartek; biały obrys 3 odcina ją od kartek. Przy 34 px (najmniejszy rozmiar w aplikacji) obrys kartek ma około 1,6 px.

Kontrast do bieli: obrys `#4F586C` 7:1, spinka `#C8102E` 5,9:1. W aplikacji znak jest ozdobą ukrytą przed czytnikiem; znaczenie niesie tekst.

## Ruch (z `src/styles.css`)

| Co | Jak |
|---|---|
| zmiana stanu: spinka, przednia kartka, odznaka | przejście transform 0,25 s `cubic-bezier(.2, .8, .2, 1)`, przezroczystość 0,2 s `ease` |
| wejście odznaki | z `scale(.6)` i przezroczystości 0 do pełnej; punkt odniesienia: środek odznaki |
| kolor odznaki | przejście wypełnienia 0,2 s `ease` |
| słucha: spinka | `translateY(-1.5) rotate(-8°)`, punkt obrotu: środek dolnej krawędzi spinki (22,5; 27,5) |
| słucha: fale | przezroczystość 1 → 0,3 → 1, 1 s `ease-in-out`, opóźnienie 0,3 s, 3 razy, potem spokój |
| wyjaśnia: linie | wypisanie raz: `stroke-dasharray 20`, `stroke-dashoffset` 20 → 0 w 0,35 s `ease-out` |
| następny krok | przednia kartka `translateX(2)` |
| gotowe: zatrzask | raz, 0,3 s `ease-out`: w połowie spinka `translateY(1.5) scaleY(.94)` (punkt: środek dolnej krawędzi), potem powrót |
| ograniczony ruch | bez przejść i animacji: stan zmienia się od razu |

Nic nie powtarza się bez końca. W aplikacji stan wynika z tego, co właśnie pojawiło się w rozmowie (`moodOf()` w `src/assistant.js`).

## Czego unikać

Znak celowo nie ma twarzy, oczu ani mimiki (żadnego podobieństwa do spinacza-asystenta z pakietu biurowego ani do maskotek
innych marek). Spinka jest pełnym czerwonym kształtem ze szczeliną, nie liniowym spinaczem: liniowy spinacz to w aplikacji
ikona dodawania pliku.

Nazwa „Spinka” nie jest zatwierdzona prawnie (`docs/nazwa-spinka.md`).
