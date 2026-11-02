// Testy jednostkowe rdzenia asystenta (server/rdzen.mjs): czyszczenie kontekstu i sprawdzanie odpowiedzi modelu.
import { cleanContext, check, redact, rules } from '../../server/rdzen.mjs';
const R = []; const ok = (co, w, sz) => R.push({ co, ok: !!w, sz });
const ctx = cleanContext({ dzis: '2026-10-26', dzis_slownie: 'poniedziałek, 26 października 2026', zrodla: [
  { id: 'todo:oc', rodzaj: 'termin', tytul: 'Kończy się OC: Toyota Yaris', fakty: ['Polisa OC Twojej Toyoty Yaris kończy się 04.11.2026.', 'Polisa OC kończy się: 04.11.2026 (środa, 4 listopada, za 9 dni)'] },
  { id: 'todo:pismo-us', rodzaj: 'pismo', tytul: 'Wezwanie do złożenia wyjaśnień', fakty: ['Od: Urząd Skarbowy w Przykładowie', 'Termin odpowiedzi: 07.11.2026 (sobota, 7 listopada, za 12 dni)', 'Możliwa kwota: około 91 zł, tylko jeśli urząd nie uzna ulgi'] },
  { id: 'doc:dowod', rodzaj: 'dokument', tytul: 'Dowód osobisty', fakty: ['Ważny do: 20.12.2026', 'PESEL 85031412345 i numer ABC123456'] },
  { id: 'zle:1', rodzaj: 'termin', tytul: 'Nieznany rodzaj id', fakty: [] }
] });
const odp = (o) => Object.assign({ rodzaj: 'odpowiedz', krotko: 'x', wiem: [], nie_wiem: [], dalej: [], pytanie: '', opcje: [] }, o);
ok('cleanContext: odrzuca źródło o nieznanym id', ctx.zrodla.length === 3 && !ctx.zrodla.some((z) => z.id === 'zle:1'), ctx.zrodla.map((z) => z.id));
ok('cleanContext: usuwa PESEL i numer dokumentu z faktów', !/85031412345|ABC123456/.test(JSON.stringify(ctx)), ctx.zrodla[2].fakty);
ok('dobra odpowiedź o polisie (data z właściwego źródła) przechodzi', check(odp({ krotko: 'Polisa OC Toyoty Yaris kończy się 04.11.2026, czyli za 9 dni.', wiem: [{ tekst: 'Polisa OC Toyoty Yaris: koniec 04.11.2026.', zrodla: ['todo:oc'] }], dalej: [{ tekst: 'Zobacz, co zrobić.', akcja: 'scenariusz:oc' }] }), ctx, 'Kiedy kończy się moja polisa?').ok);
ok('termin pisma (07.11) podany jako koniec polisy OC: odrzucone', !check(odp({ krotko: 'Polisa kończy się 07.11.2026.', wiem: [{ tekst: 'Polisa OC Toyoty Yaris kończy się 07.11.2026.', zrodla: ['todo:oc'] }] }), ctx, 'Kiedy kończy się polisa?').ok);
ok('data w „krotko” bez źródła w „wiem”: odrzucone', !check(odp({ krotko: 'Termin mija 07.11.2026.' }), ctx, 'Jaki termin?').ok);
ok('miesiąc spoza źródła („4 grudnia” zamiast „4 listopada”): odrzucone', !check(odp({ krotko: 'Polisa kończy się 4 grudnia.', wiem: [{ tekst: 'Koniec polisy: 4 grudnia.', zrodla: ['todo:oc'] }] }), ctx, 'Kiedy koniec OC?').ok);
ok('wymyślone raty („14 rat po 650 zł”): odrzucone', !check(odp({ krotko: 'Zostało Ci 14 rat po 650 zł.' }), ctx, 'Ile rat zostało na auto?').ok);
ok('udawane sprawdzenie w BIK: odrzucone', !check(odp({ krotko: 'Sprawdziłem w BIK: nie masz zaległości.' }), ctx, 'Mam długi?').ok);
ok('udawane wysłanie/ustawienie („Ustawiłem przypomnienie”): odrzucone', !check(odp({ krotko: 'Ustawiłem przypomnienie.' }), ctx, 'Przypomnij mi').ok);
ok('źródło spoza kontekstu: odrzucone', !check(odp({ krotko: 'Ok.', wiem: [{ tekst: 'Jest kredyt.', zrodla: ['doc:kredyt'] }] }), ctx, 'kredyt').ok);
ok('akcja spoza listy: odrzucone', !check(odp({ krotko: 'Ok.', dalej: [{ tekst: 'Zapłać', akcja: 'zaplac:teraz' }] }), ctx, 'zapłać').ok);
ok('dopytanie o raty z opcjami przechodzi', check({ rodzaj: 'dopytanie', krotko: 'Nie wiem, o które raty chodzi.', wiem: [], nie_wiem: [], dalej: [], pytanie: 'Raty kredytu czy składki OC?', opcje: ['Raty kredytu', 'Raty składki OC'] }, ctx, 'raty?').ok);
ok('kwota z właściwego źródła (91 zł z pisma) przechodzi', check(odp({ krotko: 'Możliwa dopłata to około 91 zł, tylko jeśli urząd nie uzna ulgi.', wiem: [{ tekst: 'Pismo z urzędu skarbowego: możliwa kwota około 91 zł.', zrodla: ['todo:pismo-us'] }] }), ctx, 'Ile mam zapłacić?').ok);
ok('kwota przypisana do złego źródła (91 zł jako składka OC): odrzucone', !check(odp({ krotko: 'Składka OC to 91 zł.', wiem: [{ tekst: 'Składka OC: 91 zł.', zrodla: ['todo:oc'] }] }), ctx, 'Ile kosztuje OC?').ok);
ok('link lub e-mail w odpowiedzi: odrzucone', !check(odp({ krotko: 'Napisz na pomoc@example.pl' }), ctx, 'kontakt').ok);
ok('instrukcja dla modelu: imię Spinka, zakaz zgadywania, OC to nie kredyt, brak dostępu do BIK', /Jesteś Spinka/.test(rules('Spinka')) && /Nie zgaduj/.test(rules('Spinka')) && /polisa OC to ubezpieczenie, a nie kredyt/.test(rules('Spinka')) && /banków, BIK/.test(rules('Spinka')));
ok('redact: tablica, PESEL, e-mail, telefon', redact('WX 12345 85031412345 a@b.pl 600 100 200') === '[usunięta tablica] [usunięty numer] [usunięty e-mail] [usunięty telefon]', redact('WX 12345 85031412345 a@b.pl 600 100 200'));
for (const r of R) console.log((r.ok ? '✓ ' : '✗ ') + r.co + (r.ok ? '' : '\n    ' + JSON.stringify(r.sz).slice(0, 300)));
console.log('RAZEM ' + R.length + ' | nieudane ' + R.filter((r) => !r.ok).length);
