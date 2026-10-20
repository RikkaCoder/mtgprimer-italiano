# Immagini italiane delle carte

La fase 1 è salvata nel commit `f8d1ed5` su `feature/italian-localization`.
La fase 2 è sviluppata sul branch `feature/italian-card-images`. Le automazioni
rimangono disattivate fino a un'ulteriore conferma, anche dopo la pubblicazione
del branch e l'apertura della Pull Request.

L'integrazione iniziale, limitata agli istantanei di Reality Fracture, è stata
generalizzata a tutte le guide configurate. Il relativo snapshot pilota rimane
solo in `tests/fixtures/pilot-fra-instants.json`, per regressione.

Con Italiano l'app utilizza l'immagine ufficiale italiana della stampa esatta,
quando verificabile. Con English utilizza sempre gli URL originali MTG Primer.
Se la stampa italiana manca o l'immagine non si carica, viene utilizzata
automaticamente quella inglese. Le bifronte verificate usano entrambe le facce
della stessa stampa; non si sostituiscono edizioni diverse con lo stesso nome.

Le mappe sono preparate con il bulk multilingua Scryfall. Il browser riceve
solo gli URL necessari alla pagina: nessuna chiamata API Scryfall durante la
navigazione. Carta, Testo e Pila conservano aspetto e comportamento originali.

Copertura iniziale globale: **15.122/20.187 stampe (74,91%)**, comprese 381 con
fronte e retro. Il fallback rimane attivo per le altre 5.065 stampe.

Comandi, cache incrementale, report, verifiche e attivazione futura dei due
workflow separati sono documentati in
[AUTOMAZIONE-IMMAGINI.md](AUTOMAZIONE-IMMAGINI.md).

Per la prova personale: **http://127.0.0.1:3000/reality-fracture/instants/**.
È possibile verificare anche le gallerie MID e NEO dal menu dei formati.
Il problema preesistente di idratazione HBG resta fuori da questo intervento.
