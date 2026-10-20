# Verifica visiva e funzionale — 20 ottobre 2026

App disponibile in sviluppo su **http://127.0.0.1:3000/**, con Next.js vincolato
all’interfaccia locale. Il processo rimane attivo per la prova personale.
Branch: `feature/italian-localization`. Nessun commit, push o merge eseguito.

## Pagine e navigazione

Sono stati aperti con Chromium tutti i **285 URL dell’esportazione statica**:
risposta HTTP 200, contenuto principale presente, selezione italiano/inglese
funzionante e nessun collegamento interno a pagine assenti. Il conteggio riguarda
gli URL pubblicabili, mentre la build Next comprende anche le pagine interne.
La pagina di errore per un URL inesistente è verificata separatamente dai test
browser, insieme a home, elenco dei formati e ricerca nelle guide.

Il passaggio completo ha rilevato un errore React su una galleria, descritto
sotto: pertanto la verifica non equivale a un esito privo di errori su ogni pagina.
Per questo controllo sistematico sono state escluse le richieste a risorse
esterne; immagini e font esterni sono stati caricati nel confronto visivo delle
pagine campione. Non è stata verificata individualmente ogni immagine remota.

## Lingue e filtri

La preferenza inglese e quella italiana persistono dopo il refresh. Anche hash,
filtri e carte selezionate rimangono invariati passando da una lingua all’altra.
Con inglese salvato, l’HTML iniziale resta italiano fino all’idratazione: è una
limitazione dell’attuale scelta di esportazione statica e preferenza client.

La guida agli istantanei di Reality Fracture è stata confrontata direttamente
con il codice originale `8609eb49ac0fe8a647540b62c196ba9b52f4750c`, eseguito da
una copia temporanea interna al workspace, senza creare un altro repository.
Le verifiche coprono desktop 1440 px e mobile 390 px:

| Controllo | Casi complessivi |
| --- | ---: |
| Viste carte, testo e pila | 6 |
| Tutti i colori selezionabili | 12 |
| Tutte le rarità | 8 |
| Tutte le categorie della guida | 6 |
| Colore e rarità combinati, con tutti i raggruppamenti e ordinamenti | 50 |
| **Totale** | **82** |

Tutti gli 82 casi restituiscono le stesse carte e lo stesso ordine dell’originale.
Gli hash confrontati coincidono. Ripristino e recupero dei filtri dopo refresh
funzionano. I **4 test browser esistenti** sono stati rieseguiti e superati,
includendo apertura/chiusura del menu mobile, navigazione e ricerca tradotta.

## Confronto visivo

A parità di lingua inglese, viewport e font caricati, coincidono larghezza del
menu, dimensioni delle carte, font, dimensioni tipografiche e colori misurati.
Gli stili Sass originali non hanno modifiche nel diff. Le schermate in italiano
mantengono griglia e navigazione originali.

La riga Italiano/English aggiunge **43 px** sopra il contenuto, sia a 1440 sia a
390 px. È una differenza introdotta deliberatamente dal selettore di lingua;
non sono state apportate ulteriori modifiche grafiche durante questa verifica.
Alcune etichette italiane, come «Valore mana», occupano due righe nei controlli
stretti: i controlli restano utilizzabili.

## Problemi rilevati

### Titoli delle schede parzialmente inglesi — corretto

Nell’audit iniziale **49 pagine** mantenevano nel titolo della scheda diciture come `Instants Guide`,
`Full Card Gallery` o `Format Information` quando il nome del formato contiene
già `:`. Esempio: `/tarkir-dragonstorm/instants/` aveva il titolo
`Tarkir: Dragonstorm: Instants Guide | MTG Primer` anche in italiano.

La causa era la separazione sul primo `: ` in `localizeTemplate`, nel file
`src/i18n/translate.ts`. La correzione successiva usa i dati strutturati
`formatName` e `title`: `createPageTitle` in `src/lib/title.ts` ricompone il titolo
senza interpretare la punteggiatura. La generazione originale delle pagine e la
localizzazione condividono la stessa composizione. I nomi ufficiali dei formati
rimangono integralmente invariati, anche con più `:` o con `|`.

Il titolo corretto dell’esempio è
`Tarkir: Dragonstorm: Guida agli istantanei | MTG Primer`.
La stessa correzione si applica ai metadati Open Graph e Twitter, ai template
annidati e all’HTML statico. Nel browser titoli, descrizioni e lingua Open Graph
seguono anche i cambi Italiano/English e il refresh con preferenza salvata.
I tag sono gestiti da `PageMetadata` attraverso React 19, senza aggiornamenti
manuali del DOM in conflitto con l’idratazione dei metadati di Next.
I nuovi test in `tests/titles.test.ts` coprono tutte le pagine generate;
`tests/e2e/titles.spec.ts` verifica tre formati con `:`, con e senza JavaScript.
La copertura completa comprende 56 pagine con `:` nel nome del formato,
incluse le 49 segnalate inizialmente, e tutti i 286 documenti HTML esportati.

Esito della correzione: TypeScript, lint e build (287 pagine) superati; 8 test
di regressione e 8 verifiche dell’esportazione/browser superati. Queste ultime
comprendono 7 casi Chromium e il controllo dei metadati dei 286 HTML. Nessun
titolo residuo inglese; i casi browser verificano anche assenza di duplicati,
refresh con inglese salvato e navigazione verso una seconda guida. Il problema
HBG seguente resta aperto e non è stato oggetto della correzione.

### Errore di idratazione nella galleria HBG — già presente nell’originale

URL: `/alchemy-horizons-baldurs-gate/gallery/`.
React segnala un disallineamento tra HTML iniziale e contenuto client per
alcune varianti: ad esempio `Lulu, Curious Hollyphant` e
`Lulu, Forgetful Hollyphant` occupano posizioni iniziali diverse.
React rigenera il contenuto sul client, ma in sviluppo compare l’indicatore
di errore e la console registra il problema.

Riprodotto **3 volte sulla versione localizzata in sviluppo, 3 sull’originale
e 3 sull’esportazione statica localizzata**. È quindi un difetto ereditato;
non è stato modificato l’algoritmo originale di ordinamento durante l’audit.

## Diff Git

Esaminati **29 file** modificati o nuovi della prima fase. Nessun file è in
staging. Non sono stati rilevati segreti nei controlli su chiavi private,
credenziali AWS, token GitHub e assegnazioni esplicite di credenziali.
Gli URL pubblici S3 e l’identificatore Analytics originali non sono credenziali.

`node_modules/`, `.next/`, `out/`, `.npm-cache/`, `.playwright/`,
`test-results/`, i report Playwright e `*.tsbuildinfo` sono esclusi dal diff.
Il lockfile delle dipendenze è una modifica intenzionale e rimane tracciato.
`git diff --check` supera il controllo; Git segnala soltanto la conversione
automatica LF/CRLF configurata su Windows.

Licenza MIT, JSON delle carte, stili originali, algoritmi dei filtri e hash
risultano invariati rispetto alla base. L’audit iniziale non ha modificato il
codice applicativo o la grafica. La correzione successiva dei titoli è descritta
sopra; non modifica stili, dati delle carte o il problema HBG.
