# MTG Primer Italiano — prima fase

## Base e ambito

Workspace: `mtgprimer`. Il branch `feature/italian-localization` nasce da
`upstream/trunk`, commit `8609eb49ac0fe8a647540b62c196ba9b52f4750c`, dopo un fetch
del repository originale.

- `origin`: `https://github.com/RikkaCoder/mtgprimer-italiano.git`
- `upstream`: `https://github.com/GarrettGardner/mtgprimer.git`

La prima fase aggiunge italiano/inglese mantenendo percorsi, navigazione, immagini,
filtri e dati originali. Nessun merge o deploy viene eseguito.

## Architettura originale

Il progetto usa TypeScript, React 19, Next.js 15 App Router e Sass Modules.
`src/content/global/pages.ts` definisce l’albero delle pagine e
`src/content/global/preset.ts` i testi comuni delle guide.
`src/lib/config.ts` combina queste configurazioni con i JSON in
`src/content/guides`, includendo eventuali espansioni supplementari.
`src/lib/page.ts` risolve i percorsi e l’alias `/latest`.
Le pagine iniziale, elenco, informazioni, guida, gruppo di guide e 404 vengono
visualizzate attraverso `TemplateRouter`.

`next build` genera il sito statico in `out/`, con slash finali e immagini non
ottimizzate. Le illustrazioni e le immagini delle carte provengono dagli URL
originali su S3; font, icone Mana, Keyrune e Font Awesome usano i CDN originali.
Queste risorse richiedono una connessione di rete.

### Filtri

`FiltersProvider` conserva le selezioni e le sincronizza con l’hash dell’URL
tramite `src/lib/hash.ts`. `applyFilters` in `src/lib/filter.ts`:

1. seleziona carte per colori richiesti, rarità, espansioni e categorie;
2. ordina per numero, valore di mana, colore, rarità o nome originale;
3. raggruppa per valore di mana, colore, rarità o categoria, oppure senza gruppi.

Le viste sono carte, testo e pila. I colori richiesti seguono le regole
originali, compresi i simboli ibridi: questo filtro non calcola la lanciabilità
con il mana attualmente stappato.

## Localizzazione

- `src/i18n/it.json`: catalogo italiano; il testo inglese originale è la chiave.
- `src/i18n/translate.ts`: traduzione, composizione delle categorie delle guide,
  formattazione delle date e localizzazione dei soli campi di presentazione.
- `LocaleProvider`: lingua iniziale `it`, scelta ricordata nella chiave
  `MTG_PRIMER_LOCALE` di `localStorage`, aggiornamento di `<html lang>`.
- Selettore Italiano/English sopra il contenuto, disponibile anche sulla home,
  nell’elenco dei formati e nella pagina 404. Supporta tastiera e `aria-pressed`.
- Menu, filtri, pulsanti, messaggi, descrizioni, indice, ricerca, date e footer
  usano la lingua selezionata. Il titolo della scheda e la descrizione della
  pagina seguono la scelta. I metadati dell’esportazione statica sono italiani.

L’inglese restituisce i testi originali. Nomi delle espansioni e nomi propri
rimangono quelli della fonte. Le descrizioni mantengono in inglese i nomi delle
carte citate come esempio.

Non vengono modificati JSON, nomi/identificatori delle carte, numeri di
collezione, codici delle espansioni, costi, rarità, chiavi delle categorie,
percorsi, ancore, hash o URL delle immagini. Gli oggetti delle carte e le
selezioni predefinite conservano anche i riferimenti originali durante la
traduzione: il cambio lingua non azzera i filtri.

I fogli Sass originali restano invariati. L’unico stile aggiunto riguarda il
selettore di lingua. `LICENSE`, copyright MIT di Garrett Gardner, autore nei
metadati, crediti e collegamenti originali sono conservati.

### Aggiungere traduzioni

Per una nuova etichetta, aggiungere la coppia inglese/italiano al catalogo e
usare `t()` nel componente. Per i contenuti generati, usare i campi di
presentazione già visitati da `localizeTemplate`. Il test di copertura segnala
nuovi titoli, descrizioni o categorie privi di una resa italiana; aggiornare
esplicitamente le eccezioni soltanto per nomi propri o termini condivisi.
I contenuti futuri non riconosciuti ricadono sul testo originale inglese.

Senza JavaScript viene mostrata la versione italiana. Con una preferenza inglese
salvata, l’HTML italiano iniziale viene aggiornato dopo l’idratazione. Se il
browser blocca lo storage, la selezione funziona per la visita corrente.

## Dipendenze e verifiche

Installazione riproducibile con `npm ci`; `package-lock.json` aggiornato.
Non sono necessarie nuove dipendenze di produzione. Sono aggiunti `tsx` e
`@playwright/test` per le verifiche di regressione. Lo script lint richiama
direttamente `eslint .` con la configurazione ESLint esistente, includendo anche
test e configurazioni. Il comando originale `next lint` è stato verificato e
funziona anch’esso con Next 15.4.2.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Su PowerShell con script disabilitati usare `npm.cmd` e `npx.cmd`.
Per installare Chromium all’interno del workspace su Windows:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.playwright'
npm.cmd exec -- playwright install chromium
npm.cmd run test:e2e
```

Il test browser serve esclusivamente `out/` su `127.0.0.1:3100` tramite
`scripts/serve-export.mjs`; richiede quindi una build aggiornata.
Le cartelle di cache, browser e risultati sono escluse da Git.

I test verificano copertura dei contenuti attuali, date, fallback inglese,
immutabilità dei dati per tutte le pagine, risultati dei filtri e hash identici
nelle due lingue. Chromium verifica home, persistenza, navigazione, 404, ricerca
tradotta e filtri desktop/mobile. Il build originale segnala che il plugin Next
non è incluso nella configurazione ESLint: il lint esplicito e il controllo
TypeScript vengono eseguiti separatamente.

Esito della verifica iniziale del 20 ottobre 2026: installazione completata; lint e
TypeScript superati; 3 test di regressione superati; build di 287 pagine riuscita;
4 test Chromium superati, incluse le larghezze 1440 e 390 pixel. Nell’ambiente
Windows protetto, `tsx` ha richiesto esecuzione fuori dalla sandbox per leggere
le informazioni dell’utente; Playwright ha richiesto la stessa modalità per
chiudere correttamente il server locale.

### Correzione dei titoli con nomi di formato contenenti `:`

I titoli sono composti da `title` e `formatName` tramite `createPageTitle`
(`src/lib/title.ts`), condiviso dalla generazione delle pagine e dalla
localizzazione. `localizeTemplate` ricompone anche i titoli dei template
annidati senza dividere stringhe già composte: i nomi ufficiali dei formati
restano invariati indipendentemente da `:` e `|`.

`createMetadata` usa la stessa localizzazione, in italiano per l’esportazione
statica. `PageMetadata` rende i tag nativi di React 19, che vengono inseriti nel
`head` durante il rendering sul server e aggiornati direttamente da React nel
browser. I tag localizzati hanno un solo proprietario: non vengono più modificati
manualmente mentre Next idrata o aggiorna i propri metadati. Gli attributi globali
(autore, sito, icone e tipo di scheda) restano nella configurazione del layout.
Il cambio lingua nel browser aggiorna titolo, descrizione, titoli e
descrizioni Open Graph/Twitter e lingua Open Graph. I crawler senza JavaScript
ricevono i metadati italiani dell’esportazione.

I test di regressione controllano tutti i titoli e metadati generati, i template
annidati, i nomi con più separatori e il fallback inglese. I test browser
verificano inoltre l’HTML statico senza JavaScript e il cambio lingua con refresh
per Tarkir: Dragonstorm, Avatar: The Last Airbender e Alchemy Horizons: Baldur’s Gate
(guida agli istantanei). La galleria HBG e il relativo errore di idratazione non
sono modificati. La suite include un controllo su tutti i 286 HTML esportati,
oltre ai test dei dati strutturati e ai casi browser con JavaScript disabilitato,
cambio lingua e refresh con inglese salvato.

Esito della correzione del 20 ottobre 2026: TypeScript e lint superati; build di
287 pagine riuscita; 8 test di regressione e 8 verifiche dell’esportazione/browser
superati (7 casi Chromium e 1 controllo completo sui 286 HTML). Nessun titolo
residuo inglese rilevato; metadati coerenti anche dopo refresh e navigazione.
Il server di sviluppo è riavviato su `http://127.0.0.1:3000/`.

## Fasi rinviate

Nessuna integrazione delle stampe italiane tramite Scryfall, nessun calcolo delle
magie giocabili con mana stappato e nessuna funzionalità specifica per MTG Arena
sono inclusi in questa fase.
