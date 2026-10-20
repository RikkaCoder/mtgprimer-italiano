# Automazione delle immagini italiane

Implementazione della fase 2 del 20 ottobre 2026 sul branch `feature/italian-card-images`.
La pubblicazione del branch e della PR non attiva le automazioni: i workflow
richiedono esplicitamente la variabile `MTG_AUTOMATION_ENABLED=true` e rimangono
in attesa di un'ulteriore conferma per l'attivazione.

Il precedente pilota dipendeva da FRA/instants sia nel generatore sia nel client.
Ora tutte le espansioni e le guide raggiungibili dalla configurazione dell'app
sono scoperte automaticamente, senza elenchi di espansioni o associazioni manuali.
Il pilota è conservato solo come fixture di regressione, fuori dai dati runtime.

## Risultato misurato

Bulk Scryfall del `2026-10-20T09:19:42.393+00:00`, dati originali al commit
`8609eb49ac0fe8a647540b62c196ba9b52f4750c`.

| Misura                                           |                     Risultato |
| ------------------------------------------------ | ----------------------------: |
| Stampe uniche individuate                        |                        20.187 |
| Immagini italiane verificate                     |               15.122 (74,91%) |
| Fallback inglesi                                 |                         5.065 |
| Codici di stampa presenti                        |                            87 |
| Guide/ambiti distinti                            |                           524 |
| Stampe italiane con fronte e retro               |                           381 |
| Manifest runtime globale                         | 2.268.090 byte, circa 2,27 MB |
| Prima lettura/indexing del bulk già scaricato    |                 50,96 secondi |
| Esecuzione successiva con cache                  |             circa 3–4 secondi |
| Abbinamenti ricalcolati nella seconda esecuzione |                             0 |
| Risultati riutilizzati nella seconda esecuzione  |                        20.187 |

Esempi di copertura per codice: FRA 274/274, MID 263/268, NEO 259/283,
KHM 271/276, HBG 0/371. Sono stampe uniche presenti nelle guide, non il totale
delle stampe esistenti su Scryfall. I 524 ambiti includono le singole guide
contenute nelle pagine raggruppate; non sono 524 pagine browser visitate.

Il download iniziale è stato di 400.823.231 byte compressi. Rimane esclusivamente
in `.scryfall-cache/`, ignorata da Git. I tempi indicati del generatore escludono
quel download. Picco RSS misurato: circa 400 MB al primo indexing, 347 MB nella
seconda esecuzione. Sono misure locali, non garanzie per runner differenti.

## Comandi

```powershell
npm.cmd run images:italian
npm.cmd run images:italian -- --offline
npm.cmd run images:italian -- --dry-run
npm.cmd run images:italian -- --scope fra/instants --dry-run
npm.cmd run images:italian -- --rebuild
npm.cmd run data:upstream -- --dry-run
npm.cmd run test:images
npm.cmd run typecheck
npm.cmd run build
```

`--offline` richiede il bulk completo e i suoi metadati già in cache.
`--rebuild` disabilita il riuso del checkpoint, senza forzare un nuovo download.
`--dry-run` produce report e può popolare la cache, senza sostituire manifest o
checkpoint pubblicabili. Uno scope parziale richiede `--dry-run`, per evitare di
sovrascrivere la mappa globale con un sottoinsieme. `--cache` seleziona una
cartella di lavoro alternativa; non includerla nei commit.

`data:upstream` è un comando separato: senza `--dry-run` applica soltanto gli
aggiornamenti dati senza conflitti. Non genera immagini e non esegue commit,
push o merge. `--offline --target <SHA>` consente un confronto con oggetti Git
già presenti, senza rete.

## Scoperta, identità e facce

`scripts/lib/inventory.ts` riusa `generatePages(PAGES_CONFIG)` con un caricatore
di JSON e callback di provenienza. Non visita il sito. La risoluzione rimane
condivisa con l'app: gallerie, guide, guide-group, override, alias e intervalli
`includeFormats` mantengono la semantica originale. La modalità stretta rileva
cicli, dati corrotti e guide singole configurate mancanti; le guide opzionali
non esistenti nei gruppi o nei formati inclusi conservano il comportamento
originale e sono elencate negli avvisi del report.

Si raccolgono numero grezzo prima del padding, codice effettivo della carta,
nomi/alias, layout, guide utilizzatrici e file di provenienza. Un riferimento
SPG usa il codice della stampa, non quello del formato ospitante. Numeri mancanti
e collisioni tra numeri grezzi producono fallback. I dati dei filtri e gli
identificatori originali restano invariati.

`image-matcher.ts` cerca set e numero esatti nel catalogo EN/IT. Conserva lettere
e simboli; la normalizzazione del padding è ammessa solo senza ambiguità.
Non cerca per nome e non sostituisce una stampa con una ristampa omonima.
Richiede una stampa inglese di riferimento verificabile, lo stesso Oracle ID,
nomi e ordine delle facce compatibili, layout e illustrazione coerenti.
Controlla inoltre le caratteristiche presenti di cornice, bordo, promozione,
variante, testo e natura digitale. Differenze significative producono fallback.

Il selettore del pilota è riutilizzato: solo immagini `lowres`/`highres_scan`,
URL HTTPS diretti e completi da `cards.scryfall.io`. Le vere bifronte richiedono
entrambe le immagini della medesima stampa. `prepare`, split e adventure con
un'immagine completa non ricevono un retro inventato. Meld e layout fisici
non verificabili conservano l'immagine inglese: non vengono introdotti nuovi
controlli UI. FRA 402 non viene sostituita da FRA 49.

Una nuova serie con gli stessi schemi dati viene individuata senza cambiare
script, import client o workflow. Quando Scryfall non offre una stampa italiana
verificabile, il sistema prosegue con l'originale inglese e una motivazione nel
report. Nuovi schemi upstream incompatibili richiedono un intervento sul
software; non vengono risolti con associazioni manuali arbitrarie.

## Bulk, cache e incrementalità

`scryfall-bulk.ts` legge i metadati `all_cards`, comprensivi di tutte le lingue,
al massimo una volta ogni 24 ore. Controlla versione e dimensione del file;
scarica in `.part`, verifica la dimensione e rinomina solo a download completo.
Il file JSONL gzip viene decompresso in streaming, con verifica degli errori
del flusso, CRC e struttura dei record. Non viene caricato interamente in RAM.
I vecchi archivi della cache vengono eliminati dopo un nuovo download riuscito.

L'indice locale conserva soltanto i candidati inglesi e italiani delle stampe
presenti nell'app, con i dati necessari a identità e immagini. Se bulk e insieme
di chiavi dell'inventario sono invariati, non si ripete neppure la lettura gzip.
Se cambia l'inventario si può ricostruire l'indice dal file già scaricato.
Perdere la cache comporta una ricostruzione automatica, non configurazione manuale.

Il checkpoint `scripts/state/italian-images.json` conserva per stampa
`sourceHash`, `providerHash` e l'eventuale motivo di fallback, oltre alla versione
del matcher e all'identificatore di generazione. Le impronte SHA-256 usano dati
canonici; prezzi e campi estranei alle immagini sono esclusi dalla proiezione.
Il matching ricalcola solo identità nuove o con impronte cambiate, riusa gli
altri risultati ed elimina quelli senza più riferimenti.

Un'assenza italiana fa parte del contenuto indicizzato. Una stampa italiana
aggiunta successivamente, un'immagine corretta o il passaggio da placeholder a
scan cambiano l'impronta anche senza aggiornamenti upstream. Una modifica ai
soli filtri aggiorna l'inventario ma non ripete gli abbinamenti.

L'inventario viene comunque riletto per conoscere i dati attuali. Per un nuovo
bulk serve una lettura completa in streaming: Scryfall non fornisce qui un
download differenziale. Incrementali sono matching e scrittura dei risultati.

Il checkpoint viene scritto prima del singolo manifest runtime, entrambi con
lo stesso ID di generazione. In caso di interruzione resta valido il vecchio
manifest; alla ripartenza una discordanza disabilita il riuso del checkpoint.
Errori di download/lettura impediscono la sostituzione degli output. File
immutati non vengono riscritti; l'orologio non genera diff nei dati pubblicabili.

## Manifest e applicazione statica

`src/content/card-images/italian.json` contiene la mappa globale compatta:

```text
{schemaVersion: 2, generation, cards: {"set/numero": [id, fronte, retro?]}}
```

La convalida dettagliata rimane nel generatore. Il modulo
`src/lib/guide-images.server.ts`, marcato `server-only`, seleziona soltanto le
stampe necessarie alla pagina. I gruppi di guide condividono una mappa deduplicata
nel template. Bulk, indice, checkpoint e manifest globale non entrano nei
bundle client condivisi.

Il payload statico contiene già gli URL italiani per il cambio lingua:
nessuna richiesta API Scryfall durante la navigazione. English conserva gli URL
originali. `useCardImage` mantiene il fallback anche per errori precedenti
all'idratazione, aggiornando immagine e sfondo. Carta, Testo e Pila condividono
il resolver. Non sono modificati Sass, layout, dimensioni, menu o filtri.

## Workflow separati e attivazione futura

- `.github/workflows/sync-upstream-data.yml`: ogni giorno alle 04:17 UTC e
  manualmente; controlla il branch predefinito upstream e propone una PR da
  `automation/upstream-data`.
- `.github/workflows/update-italian-card-images.yml`: ogni giorno alle 05:17 UTC,
  manualmente e su aggiornamenti dei dati su `trunk`; propone una PR da
  `automation/italian-card-images` con mappe, copertura e checkpoint.

Le due PR sono distinte e non vengono unite automaticamente. Dopo l'approvazione
dei nuovi dati, il workflow immagini riconosce la nuova serie senza associazioni
manuali. La pubblicazione del sito segue il processo di deploy approvato del
repository, non viene eseguita da questi workflow.

Il sincronizzatore fissa lo SHA remoto e legge soltanto JSON delle guide e i
letterali `PAGES_CONFIG`/`PRESET` dei due file globali. Non esegue TypeScript
upstream e non importa componenti, dipendenze, workflow o traduzioni. Usa un
confronto a tre vie con l'ultimo SHA importato, conservato in
`scripts/state/upstream.json`. Le pagine sono unite per slug; personalizzazioni
locali indipendenti sopravvivono. Un conflitto interrompe l'import prima di
applicare file. La licenza e le attribuzioni rimangono conservate.

Entrambi i workflow hanno concorrenza limitata, timeout, Actions fissate a SHA,
controlli mirati, TypeScript e build statica quando ci sono cambiamenti.
I report vengono conservati anche se un passaggio fallisce. Il workflow immagini
salva bulk e indice nella cache Actions, mai nel repository. Le sole operazioni
Git di pubblicazione sono quelle dell'azione che aggiorna il branch della PR;
non esistono comandi di push o merge diretto su `trunk`.

Per attivarli **dopo la verifica personale**:

1. Portare codice, manifest, checkpoint, lockfile e workflow revisionati sul
   branch predefinito attraverso il normale processo di PR.
2. Nelle impostazioni Actions del fork consentire al `GITHUB_TOKEN` le scritture
   e la creazione di Pull Request richieste da questi workflow.
3. Creare la variabile repository `MTG_AUTOMATION_ENABLED` con valore `true`.
4. Avviare manualmente prima “Propose upstream data”, poi “Update Italian card
   images”; controllare report e PR. Non serve una chiave API Scryfall.

Il cron funziona sul branch predefinito; la presenza dei file su un feature
branch non lo attiva. GitHub può ritardare o saltare run e disabilitare il cron
pubblico dopo 60 giorni senza attività. Monitorare la freschezza dei report;
Actions non costituisce una garanzia di esecuzione continua. I controlli sono
eseguiti nello stesso flusso, senza dipendere da un evento `push` del bot o da
controlli PR che potrebbero richiedere approvazione.

## Report, fallback e verifiche

- `src/content/card-images/coverage.json`: riepilogo stabile per codice e motivo.
- `.scryfall-cache/reports/images.json`: dati completi, nuove associazioni,
  riuso/ricalcoli, copertura, tempi, memoria e ogni mancato abbinamento con file,
  guide, nomi, numeri grezzi e ID candidati.
- `.scryfall-cache/reports/images.md`: riepilogo per la PR e Actions Summary.
- `.scryfall-cache/reports/upstream.*`: SHA confrontati, file e conflitti.
- Artefatti Actions: report conservati per 30 giorni, senza archivi bulk.

Fallback della prima generazione: 4.250 stampe italiane assenti, 616 placeholder,
3 immagini mancanti, 22 identificatori sorgente mancanti, 12 layout meld non
supportati, 3 illustrazioni e 159 cornici incompatibili. Non sono guasti del
caricamento né associazioni da compilare a mano: si conserva l'originale.

Il report elenca inoltre 50 guide facoltative assenti nei gruppi o nei formati
inclusi. Sono dichiarazioni già presenti nei dati originali: vengono saltate
come nell'app originale, senza bloccare la generazione.

Verifiche locali: 24 test mirati superati, TypeScript e lint dei file coinvolti
superati, build statica riuscita. Il build segnala l'avviso preesistente sul
plugin Next non rilevato nella configurazione ESLint. Upstream controllato in
dry-run: stesso SHA, zero aggiornamenti e zero conflitti. Nessuna scansione o
suite browser completa. Il problema di idratazione HBG non è stato modificato.

I test coprono stampe reali FRA/MID/NEO, assenza italiana HBG, varianti e facce,
nuova serie/guida, include e override, risultati negativi diventati disponibili,
correzioni immagini, cache, ripartenza dopo checkpoint discordante, snapshot
gzip troncati e backoff 429. Le immagini complete mantengono proporzioni,
copyright e artista, senza alterazioni o watermark aggiunti.

## Fonti primarie

[Regole API e condizioni d'uso](https://scryfall.com/docs/api),
[bulk multilingua JSONL](https://scryfall.com/docs/api/bulk-data),
[limiti e cache](https://scryfall.com/docs/api/rate-limits),
[caratteristiche delle stampe](https://scryfall.com/docs/api/cards),
[immagini e stati](https://scryfall.com/docs/api/images).
Le richieste usano User-Agent identificativo e Accept; gli endpoint ordinari
usati hanno un limite di 10/s e sono distanziati di almeno 150 ms. Su 429 il
client attende almeno 30 secondi o il maggiore Retry-After, con retry limitati
anche per 5xx e guasti di rete. Non vengono utilizzati search, collection o
manifest, che hanno limiti diversi.

[Schedule GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule),
[eventi generati da GITHUB_TOKEN](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow).
