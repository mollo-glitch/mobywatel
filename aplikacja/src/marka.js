/*
 * Nazwa i znak asystenta: jedno miejsce w projekcie. Reszta kodu bierze stąd wszystkie formy nazwy.
 *
 * Zmiana nazwy (np. gdy weryfikacja znaku towarowego ujawni konflikt): popraw formy niżej, zbuduj projekt
 * (node build.mjs) i uruchom testy. W kodzie, stylach i src/page.html nie ma innych wystąpień nazwy (page.html ma
 * w komentarzach HTML znaczniki „marka:imie” itp., które build zastępuje formami stąd); klasy i funkcje znaku mają nazwy neutralne
 * (A.postac, .postac-*), więc nie trzeba ich zmieniać.
 *
 * Zasada użycia: imię tam, gdzie asystent się przedstawia, mówi albo działa (nagłówek rozmowy, powitanie, „pisze…”,
 * pole na Starcie, przycisk przy piśmie, opis koncepcji). Słowo „Asystent” tam, gdzie opisuje funkcję
 * (zakładka w dolnym pasku, opis strony w metadanych).
 *
 * Usunięcie znaku: postac: false. Wtedy w nagłówku rozmowy, w polu „Co chcesz załatwić?” i na ekranie „Gotowe”
 * wracają zwykłe ikony (asystent, ptaszek), a układ się nie zmienia.
 *
 * Hasło: jedno zdanie w powitaniu asystenta (pierwsza osoba, bo mówi sam asystent). Puste = bez hasła.
 * Pełne hasło marki do materiałów poza aplikacją: „Spinka — spina sprawy, nie Ciebie.”
 */
window.APP = window.APP || {};
window.APP.marka = Object.freeze({
  imie: 'Spinka',              // mianownik: „tu Spinka”, „Spinka pisze…”
  biernik: 'Spinkę',           // „Zapytaj Spinkę”
  dopelniacz: 'Spinki',        // „Odpowiedz z pomocą Spinki”
  zNarzednikiem: 'ze Spinką',  // „Rozmowa ze Spinką” (przyimek „z” albo „ze” zależy od nazwy)
  haslo: 'Spinam sprawy, nie Ciebie.',
  postac: true
});
