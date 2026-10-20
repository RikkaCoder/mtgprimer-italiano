import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import fixtures from "./fixtures/scryfall-printings.json";
import {
  discoverInventory,
  type Inventory,
  type InventoryPrinting,
} from "../scripts/lib/inventory";
import { generateImages } from "../scripts/lib/image-generation";
import { matchPrinting, projectCard } from "../scripts/lib/image-matcher";
import { digest } from "../scripts/lib/files";
import { readBulk } from "../scripts/lib/scryfall-bulk";
import { retryDelay } from "../scripts/lib/http";
import type { ScryfallImageCard } from "../scripts/lib/scryfall-card-images";
import type { IGuideConfig, TPageConfig } from "../src/models";

const records: Record<string, ScryfallImageCard[]> = fixtures;
function source(key: string, name?: string): InventoryPrinting {
  const card = records[key][0];
  const item = {
    key,
    code: card.set,
    number: card.collector_number.padStart(3, "0"),
    rawNumbers: [card.collector_number],
    names: [name ?? card.name],
    layouts: [],
    sources: ["fixture.json"],
    scopes: ["fixture/gallery"],
    sourceHash: "",
  };
  item.sourceHash = digest(item);
  return item;
}
const inventory = (...keys: string[]): Inventory => ({
  printings: Object.fromEntries(keys.map((key) => [key, source(key)])),
  scopes: {},
  files: {},
});

test("real exact Italian prints from three expansions include a DFC and prepare", () => {
  const result = generateImages(
    inventory("fra/2", "fra/49", "mid/27", "neo/1", "hbg/1"),
    records,
  );
  assert.equal(result.stats.italian, 4);
  assert.equal(result.manifest.cards["mid/27"].length, 3);
  assert.equal(result.manifest.cards["fra/49"].length, 2);
  assert.equal(result.issues[0].key, "hbg/1");
  assert.equal(result.issues[0].reason, "no-italian-printing");
});

test("identical input reuses every result and produces byte-identical output", () => {
  const input = inventory("fra/2", "mid/27", "hbg/1");
  const first = generateImages(input, records);
  const second = generateImages(input, records, first.manifest, first.state);
  assert.equal(second.stats.processed, 0);
  assert.equal(second.stats.reused, 3);
  assert.deepEqual(second.manifest, first.manifest);
  assert.deepEqual(second.state, first.state);
});

test("a later Italian printing invalidates only the former negative result", () => {
  const input = inventory("fra/2", "mid/27");
  const before = {
    ...records,
    "fra/2": records["fra/2"].filter((c) => c.lang === "en"),
  };
  const first = generateImages(input, before);
  assert.equal(first.stats.fallback, 1);
  const second = generateImages(input, records, first.manifest, first.state);
  assert.equal(second.stats.processed, 1);
  assert.equal(second.stats.reused, 1);
  assert.equal(second.stats.newMatches, 1);
  assert.ok(second.manifest.cards["fra/2"]);
});

test("new, changed and removed source identities are handled without a set list", () => {
  const first = generateImages(inventory("fra/2", "mid/27"), records);
  const changed = inventory("fra/2", "neo/1");
  changed.printings["fra/2"].names = ["Incorrect source name"];
  changed.printings["fra/2"].sourceHash = "changed";
  const second = generateImages(changed, records, first.manifest, first.state);
  assert.equal(second.stats.processed, 2);
  assert.equal(second.stats.removed, 1);
  assert.equal(second.manifest.cards["mid/27"], undefined);
  assert.equal(second.issues[0].reason, "name-mismatch");
});

test("image correction changes one result, prices do not affect the projection", () => {
  const input = inventory("fra/2", "mid/27");
  const first = generateImages(input, records);
  const revised = structuredClone(records);
  revised["fra/2"].find((c) => c.lang === "it")!.image_uris!.normal +=
    "&revision=2";
  const second = generateImages(input, revised, first.manifest, first.state);
  assert.equal(second.stats.processed, 1);
  assert.equal(second.stats.reused, 1);
  const card = records["fra/2"][0];
  assert.deepEqual(
    projectCard({ ...card, prices: { usd: "500" } } as ScryfallImageCard),
    projectCard(card),
  );
});

test("art, layout, uncertain identity and suffix variations never substitute prints", () => {
  const item = source("fra/2");
  const changed = structuredClone(records["fra/2"]);
  changed.find((c) => c.lang === "it")!.illustration_id = "different-art";
  assert.equal(
    matchPrinting(item, changed).reason,
    "printing-mismatch:illustration_id",
  );
  assert.equal(
    matchPrinting({ ...item, layouts: ["transform"] }, records["fra/2"]).reason,
    "layout-mismatch",
  );
  assert.equal(
    matchPrinting(
      item,
      records["fra/2"].filter((c) => c.lang === "it"),
    ).reason,
    "unverified-printing",
  );
  assert.equal(
    matchPrinting(
      { ...item, invalid: "ambiguous-source-number" },
      records["fra/2"],
    ).reason,
    "ambiguous-source-number",
  );
  const wrong = records["fra/49"].map((c) => ({
    ...c,
    collector_number: "49a",
  }));
  // Real generator indexes these under a distinct key, so the requested 49 sees none.
  const missing = generateImages(inventory("fra/49"), { "fra/49a": wrong });
  assert.equal(missing.stats.italian, 0);
});

test("partial DFCs and placeholder images fall back; later scans are detected", () => {
  const changed = structuredClone(records);
  const dfc = changed["mid/27"].find((c) => c.lang === "it")!;
  delete dfc.card_faces![1].image_uris;
  assert.equal(
    matchPrinting(source("mid/27"), changed["mid/27"]).reason,
    "missing-back-image",
  );
  changed["fra/2"].find((c) => c.lang === "it")!.image_status = "placeholder";
  const input = inventory("fra/2");
  const first = generateImages(input, changed);
  assert.equal(first.issues[0].reason, "image-placeholder");
  assert.equal(
    generateImages(input, records, first.manifest, first.state).stats
      .newMatches,
    1,
  );
});

test("mismatched checkpoint generations rebuild automatically", () => {
  const input = inventory("fra/2");
  const first = generateImages(input, records);
  assert.equal(
    generateImages(
      input,
      records,
      { ...first.manifest, cards: {} },
      first.state,
    ).stats.processed,
    1,
  );
  assert.equal(
    generateImages(input, records, first.manifest, {
      ...first.state,
      generation: "interrupted",
    }).stats.processed,
    1,
  );
});

test("discovery includes new formats, grouped guides, overrides and ranged guests", async () => {
  const data: Record<string, IGuideConfig> = {
    "new/new": {
      cards: { Alpha: { number: "2" } },
      includeFormats: [{ code: "guest", min: 3, max: 3 }],
    },
    "new/new-instants": { cards: { Alpha: { code: "neo", number: "1" } } },
    "guest/guest": {
      cards: { Beta: { number: "3" }, Excluded: { number: "4" } },
    },
    "guest/guest-instants": { cards: { Beta: {}, Excluded: {} } },
  };
  const config: TPageConfig = {
    slug: "future-expansion",
    template: "info",
    formatCode: "new",
    releaseDate: "tomorrow",
    pages: [
      { slug: "gallery", template: "guide", guide: "gallery" },
      { slug: "group", template: "guide-group", guides: ["instants"] },
    ],
  };
  const result = await discoverInventory(
    config,
    async (format, file) => data[`${format}/${file}`],
  );
  assert.deepEqual(Object.keys(result.printings).sort(), [
    "guest/3",
    "neo/1",
    "new/2",
  ]);
  assert.deepEqual(result.scopes["new/instants"], ["guest/3", "neo/1"]);
  assert.ok(
    result.printings["guest/3"].sources.includes(
      "src/content/guides/new/new.json",
    ),
  );
  assert.deepEqual(result.printings["neo/1"].rawNumbers, ["1"]);
});

test("include cycles and corrupt guide data fail instead of publishing incomplete output", async () => {
  const config: TPageConfig = {
    slug: "cycle",
    template: "info",
    formatCode: "a",
    releaseDate: "today",
  };
  await assert.rejects(
    discoverInventory(config, async () => ({
      cards: {},
      includeFormats: ["a"],
    })),
    /Cyclic/,
  );
  await assert.rejects(
    discoverInventory(config, async () => {
      throw new Error("corrupt");
    }),
    /corrupt/,
  );
  await assert.rejects(
    discoverInventory(
      {
        ...config,
        pages: [{ slug: "missing", template: "guide", guide: "missing" }],
      },
      async (_format, file) => (file === "a" ? { cards: {} } : undefined),
    ),
    /Missing configured guide/,
  );
  const optional = await discoverInventory(
    {
      ...config,
      pages: [{ slug: "group", template: "guide-group", guides: ["missing"] }],
    },
    async (_format, file) => (file === "a" ? { cards: {} } : undefined),
  );
  assert.deepEqual(optional.warnings, [
    "Optional guide unavailable: a/a-missing",
  ]);
});

test("gzip JSONL streaming detects truncated and invalid snapshots", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mtg-bulk-"));
  const path = join(dir, "sample.jsonl.gz");
  const consume = async () => {
    const cards = [];
    for await (const c of readBulk(path)) cards.push(c);
    return cards;
  };
  try {
    const gzip = gzipSync(
      records["fra/2"].map((c) => JSON.stringify(c)).join("\n"),
    );
    await writeFile(path, gzip);
    assert.equal((await consume()).length, 2);
    await writeFile(path, gzip.subarray(0, gzip.length - 8));
    await assert.rejects(consume());
    await writeFile(path, gzipSync('{"object":"error"}\n'));
    await assert.rejects(consume(), /Invalid bulk/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("rate-limit backoff honors seconds and dates, with a 30-second minimum", () => {
  assert.equal(retryDelay(429, null, 0), 30000);
  assert.equal(retryDelay(429, "2", 0), 30000);
  assert.equal(retryDelay(429, "60", 0), 60000);
  assert.equal(
    retryDelay(
      429,
      "Tue, 20 Oct 2026 12:01:00 GMT",
      0,
      Date.parse("2026-10-20T12:00:00Z"),
    ),
    60000,
  );
  assert.equal(retryDelay(503, null, 1), 2000);
});
