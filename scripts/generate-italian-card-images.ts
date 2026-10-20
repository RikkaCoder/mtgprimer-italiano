import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import type { GlobalItalianImageManifest } from "../src/models/card-images.models";
import { cardImageKey } from "../src/lib/card-image-key";
import { discoverInventory } from "./lib/inventory";
import { digest, readJson, writeChanged } from "./lib/files";
import { getBulk, readBulk } from "./lib/scryfall-bulk";
import { projectCard } from "./lib/image-matcher";
import { generateImages, type ImageCheckpoint } from "./lib/image-generation";
import type { ScryfallImageCard } from "./lib/scryfall-card-images";

const { values } = parseArgs({
  options: {
    offline: { type: "boolean" },
    "dry-run": { type: "boolean" },
    rebuild: { type: "boolean" },
    scope: { type: "string", default: "all" },
    cache: { type: "string", default: ".scryfall-cache" },
  },
});
const cache = values.cache!;
const reports = join(cache, "reports");
const started = performance.now();
await mkdir(reports, { recursive: true });
try {
  const inventory = await discoverInventory();
  if (values.scope !== "all") {
    const keys = inventory.scopes[values.scope!];
    if (!keys) throw new Error(`Unknown scope: ${values.scope}`);
    if (!values["dry-run"])
      throw new Error(
        "A scoped run requires --dry-run; global output must remain complete",
      );
    inventory.printings = Object.fromEntries(
      keys.map((key) => [key, inventory.printings[key]]),
    );
  }
  const bulk = await getBulk(cache, values.offline);
  const lookupHash = digest(Object.keys(inventory.printings).sort());
  const indexFile = join(cache, "printing-index.json");
  const cached = await readJson<{
    version: string;
    lookupHash: string;
    records: Record<string, ScryfallImageCard[]>;
    scanned: number;
  }>(indexFile);
  const version = digest(bulk.metadata);
  const indexHit =
    cached?.version === version && cached.lookupHash === lookupHash;
  let records: Record<string, ScryfallImageCard[]>;
  let scanned = 0;
  if (indexHit) {
    records = cached.records;
    scanned = cached.scanned;
  } else {
    records = {};
    for await (const card of readBulk(bulk.path)) {
      scanned++;
      if (card.lang !== "en" && card.lang !== "it") continue;
      const key = cardImageKey(card.set, card.collector_number);
      if (!inventory.printings[key]) continue;
      const group = (records[key] ??= []);
      if (group.some((c) => c.id === card.id))
        throw new Error(`Duplicate bulk ID: ${card.id}`);
      group.push(projectCard(card));
    }
    await writeChanged(
      indexFile,
      JSON.stringify({ version, lookupHash, records, scanned }),
    );
  }
  const manifestFile = "src/content/card-images/italian.json";
  const stateFile = "scripts/state/italian-images.json";
  const previous = await readJson<GlobalItalianImageManifest>(manifestFile);
  const checkpoint = values.rebuild
    ? undefined
    : await readJson<ImageCheckpoint>(stateFile);
  const generated = generateImages(inventory, records, previous, checkpoint);
  const bySet: Record<string, { total: number; italian: number }> = {};
  for (const [key, source] of Object.entries(inventory.printings)) {
    const row = (bySet[source.code] ??= { total: 0, italian: 0 });
    row.total++;
    if (generated.manifest.cards[key]) row.italian++;
  }
  const reasons: Record<string, number> = {};
  for (const issue of generated.issues)
    reasons[issue.reason] = (reasons[issue.reason] ?? 0) + 1;
  const summary = {
    total: generated.stats.total,
    italian: generated.stats.italian,
    fallback: generated.stats.fallback,
    scopes: Object.keys(inventory.scopes).length,
    bySet,
    reasons,
  };
  if (!values["dry-run"]) {
    // Checkpoint first, then the runtime manifest. An interruption leaves the old
    // runtime intact; a generation mismatch disables reuse on the next run.
    await writeChanged(stateFile, JSON.stringify(generated.state) + "\n");
    await writeChanged(manifestFile, JSON.stringify(generated.manifest) + "\n");
    await writeChanged(
      "src/content/card-images/coverage.json",
      JSON.stringify(summary, null, 2) + "\n",
    );
  }
  const elapsedMs = Math.round(performance.now() - started);
  const manifestBytes = Buffer.byteLength(JSON.stringify(generated.manifest));
  const report = {
    status: "ok",
    generatedAt: new Date().toISOString(),
    bulk: bulk.metadata.updated_at,
    bulkDownloaded: bulk.downloaded,
    indexHit,
    scanned,
    elapsedMs,
    manifestBytes,
    peakMemoryMB: Math.round(process.resourceUsage().maxRSS / 1024),
    summary: { ...summary, ...generated.stats },
    files: inventory.files,
    warnings: inventory.warnings,
    issues: generated.issues,
  };
  await writeChanged(
    join(reports, "images.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  const markdown =
    `# Immagini italiane\n\nStampe: ${summary.total}; italiane: ${summary.italian}; fallback: ${summary.fallback}.\n\n` +
    `Nuovi abbinamenti: ${generated.stats.newMatches}; ricalcolati: ${generated.stats.processed}; riutilizzati: ${generated.stats.reused}; rimossi: ${generated.stats.removed}.\n\n` +
    `Bulk: ${bulk.metadata.updated_at}; download: ${bulk.downloaded}; indice in cache: ${indexHit}.\n\n` +
    `Tempo: ${elapsedMs} ms; manifest: ${manifestBytes} byte.\n\n` +
    `Guide facoltative assenti: ${inventory.warnings?.length ?? 0} (dettagli nel report JSON).\n\n` +
    `| Motivo fallback | Stampe |\n| --- | ---: |\n${Object.entries(reasons)
      .map(([k, n]) => `| ${k} | ${n} |`)
      .join("\n")}\n`;
  await writeChanged(join(reports, "images.md"), markdown);
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
  console.log(
    JSON.stringify(
      {
        ...generated.stats,
        scopes: summary.scopes,
        elapsedMs,
        manifestBytes,
        indexHit,
        bulkDownloaded: bulk.downloaded,
        reasons,
      },
      null,
      2,
    ),
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await writeChanged(
    join(reports, "images.json"),
    JSON.stringify({ status: "error", message }, null, 2),
  );
  await writeChanged(
    join(reports, "images.md"),
    `# Generazione immagini fallita\n\n${message}\n`,
  );
  throw error;
}
