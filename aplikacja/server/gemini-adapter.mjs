#!/usr/bin/env node
// Zgodność ze starszymi instrukcjami: ten sam serwer co server/serwer-lokalny.mjs, a gdy nic nie wskazuje dostawcy,
// domyślnie Gemini API. Nowe uruchomienie: node server/serwer-lokalny.mjs.
process.env.AI_PROVIDER_DOMYSLNY = 'gemini';
const { start } = await import('./serwer-lokalny.mjs');
start();
