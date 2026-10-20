# Pubblicazione di MTG Primer Italiano su GitHub Pages

Sito previsto: https://rikkacoder.github.io/mtgprimer-italiano/

## Procedura di attivazione

1. Approvare e unire la PR del deploy sul branch `trunk`.
2. In GitHub aprire **Settings → Pages → Build and deployment**.
3. Impostare **Source = GitHub Actions**. Il repository è pubblico.
4. Aprire **Actions → Publish MTG Primer Italiano (GitHub Pages)** e,
   se necessario, avviare **Run workflow** dal branch `trunk`.
5. Verificare homepage, directory, guida agli istantanei, cambio IT/EN,
   immagini Scryfall e navigazione mobile all'URL pubblico.

Il workflow esegue una build statica, verifica i percorsi e pubblica
`out/` come artifact di GitHub Pages. Le PR eseguono la stessa validazione,
ma **non** pubblicano nulla. I nuovi merge su `trunk` avviano un nuovo deploy.

## Differenze tra sviluppo locale e GitHub Pages

In locale si usa `npm run dev`, con percorsi che partono da `/`.
Il workflow esporta invece il sito con la variabile `GITHUB_PAGES=true`,
attivando `basePath=/mtgprimer-italiano` in Next.js.

Le risorse `_next` e i link realizzati con `next/link` seguono automaticamente
il base path. Lo script `prepare-github-pages.mjs` aggiorna gli URL assoluti
`/images/` presenti nel CSS generato e crea `.nojekyll`, necessario affinché
GitHub Pages esponga la directory `_next`.
`verify-github-pages.mjs` controlla il risultato, incluse alcune route.

Per preparare un'esportazione Pages localmente in PowerShell:

```powershell
$env:GITHUB_PAGES = "true"
npm run build
node scripts/prepare-github-pages.mjs
node scripts/verify-github-pages.mjs
Remove-Item Env:GITHUB_PAGES
```

**Non usare** il vecchio comando di deploy AWS dell'autore originale:
il progetto italiano pubblica esclusivamente tramite GitHub Actions.

## Automazioni dati e immagini

I workflow `sync-upstream-data.yml` e `update-italian-card-images.yml`
restano inattivi finché non viene impostata la variabile GitHub
`MTG_AUTOMATION_ENABLED=true`. La pubblicazione Pages NON la modifica.

Il workflow Pages non scarica bulk Scryfall e non aggiorna i dati delle carte:
pubblica il manifest verificato già presente su `trunk`.

## Limitazioni note

- L'host gratuito di GitHub Pages potrebbe subire ritardi di aggiornamento.
- Font, carte e altre risorse di terze parti mantengono i loro URL esterni.
- Per nuovi schemi delle guide resta necessario verificare la compatibilità
  con il generatore di immagini.
