// Zamienia w podanym src/marka.js nazwę „Spinka” na „Kartka”, usuwa hasło i znak (postac: false). Używa go uruchom-testy.sh
// na kopii projektu w katalogu tymczasowym; nie uruchamiaj na oryginale. argv: [2] ścieżka do kopii src/marka.js
const fs = require('fs'); const f = process.argv[2]; let s = fs.readFileSync(f, 'utf8');
for (const [a, b] of [
  ["imie: 'Spinka'", "imie: 'Kartka'"], ["biernik: 'Spinkę'", "biernik: 'Kartkę'"], ["dopelniacz: 'Spinki'", "dopelniacz: 'Kartki'"],
  ["zNarzednikiem: 'ze Spinką'", "zNarzednikiem: 'z Kartką'"], ["haslo: 'Spinam sprawy, nie Ciebie.'", "haslo: ''"], ['postac: true', 'postac: false']
]) { if (!s.includes(a)) { console.error('brak w marka.js: ' + a); process.exit(1); } s = s.replace(a, b); }
fs.writeFileSync(f, s);
