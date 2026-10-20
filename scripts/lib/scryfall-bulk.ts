import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat, rename, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { digest, readJson, writeChanged } from "./files";
import { fetchChecked } from "./http";
import type { ScryfallImageCard } from "./scryfall-card-images";

export interface BulkMetadata {
  type: "all_cards";
  updated_at: string;
  jsonl_download_uri: string;
  compressed_size: number;
}
const DAY = 86400000;

export async function getBulk(cache: string, offline = false) {
  await mkdir(cache, { recursive: true });
  const metadataFile = join(cache, "bulk-metadata.json");
  let cached = await readJson<{ checkedAt: number; metadata: BulkMetadata }>(
    metadataFile,
  );
  if (!cached || (!offline && Date.now() - cached.checkedAt >= DAY)) {
    if (offline) throw new Error("No cached bulk metadata for --offline");
    const metadata = (await (
      await fetchChecked("https://api.scryfall.com/bulk-data/all_cards")
    ).json()) as BulkMetadata;
    const url = new URL(metadata.jsonl_download_uri);
    if (
      metadata.type !== "all_cards" ||
      url.protocol !== "https:" ||
      url.hostname !== "data.scryfall.io" ||
      !url.pathname.endsWith(".jsonl.gz") ||
      !Number.isFinite(Date.parse(metadata.updated_at)) ||
      !Number.isSafeInteger(metadata.compressed_size) ||
      metadata.compressed_size <= 0
    )
      throw new Error("Invalid all_cards metadata");
    cached = { checkedAt: Date.now(), metadata };
    await writeChanged(metadataFile, JSON.stringify(cached));
  }
  const { metadata } = cached;
  const path = join(
    cache,
    `all-cards-${digest(metadata).slice(0, 16)}.jsonl.gz`,
  );
  let downloaded = false;
  const size = await stat(path).then(
    (s) => s.size,
    () => 0,
  );
  if (size !== metadata.compressed_size) {
    if (offline)
      throw new Error("Complete cached bulk unavailable for --offline");
    console.log(
      `Download all_cards: ${(metadata.compressed_size / 1e6).toFixed(1)} MB`,
    );
    const response = await fetchChecked(
      metadata.jsonl_download_uri,
      "application/gzip",
    );
    if (!response.body) throw new Error("Empty bulk response");
    const temporary = `${path}.part`;
    await pipeline(
      Readable.fromWeb(
        response.body as unknown as NodeReadableStream<Uint8Array>,
      ),
      createWriteStream(temporary),
    );
    if ((await stat(temporary)).size !== metadata.compressed_size)
      throw new Error("Truncated bulk download");
    await rename(temporary, path);
    downloaded = true;
    for (const file of await readdir(cache))
      if (
        /^all-cards-[a-f0-9]{16}\.jsonl\.gz$/.test(file) &&
        join(cache, file) !== path
      )
        await unlink(join(cache, file));
  }
  return { path, metadata, downloaded };
}

export async function* readBulk(
  path: string,
): AsyncGenerator<ScryfallImageCard> {
  const input = createReadStream(path);
  const gunzip = createGunzip();
  // pipeline observes both input and gzip errors, including CRC/truncation.
  const completed = pipeline(input, gunzip);
  void completed.catch(() => {});
  const lines = createInterface({ input: gunzip, crlfDelay: Infinity });
  let count = 0;
  try {
    for await (const line of lines) {
      if (!line.trim()) continue;
      const card = JSON.parse(line) as ScryfallImageCard;
      if (
        card.object !== "card" ||
        typeof card.id !== "string" ||
        typeof card.set !== "string" ||
        typeof card.collector_number !== "string" ||
        typeof card.lang !== "string" ||
        typeof card.name !== "string"
      )
        throw new Error(`Invalid bulk card at line ${count + 1}`);
      count++;
      yield card;
    }
    await completed;
    if (!count) throw new Error("Empty bulk snapshot");
  } finally {
    lines.close();
    input.destroy();
    gunzip.destroy();
    await completed.catch(() => {});
  }
}
