import type {
  GlobalItalianImageManifest,
  CompactItalianImage,
} from "../../src/models/card-images.models";
import type { Inventory } from "./inventory";
import { digest } from "./files";
import { matchPrinting } from "./image-matcher";
import type { ScryfallImageCard } from "./scryfall-card-images";

export const MATCHER_VERSION = 1;
export interface ImageCheckpoint {
  schemaVersion: 1;
  matcherVersion: number;
  generation: string;
  entries: Record<
    string,
    { sourceHash: string; providerHash: string; reason?: string }
  >;
}

export function generateImages(
  inventory: Inventory,
  index: Record<string, ScryfallImageCard[]>,
  previous?: GlobalItalianImageManifest,
  checkpoint?: ImageCheckpoint,
) {
  const reusable =
    previous?.schemaVersion === 2 &&
    checkpoint?.schemaVersion === 1 &&
    checkpoint.matcherVersion === MATCHER_VERSION &&
    previous.generation === checkpoint.generation &&
    digest({
      entries: checkpoint.entries,
      cards: previous.cards,
      matcherVersion: checkpoint.matcherVersion,
    }) === previous.generation;
  const cards: Record<string, CompactItalianImage> = {};
  const entries: ImageCheckpoint["entries"] = {};
  const stats = {
    total: 0,
    italian: 0,
    fallback: 0,
    processed: 0,
    reused: 0,
    newMatches: 0,
    removed: 0,
  };
  const issues: {
    key: string;
    reason: string;
    names: string[];
    sources: string[];
    scopes: string[];
    rawNumbers: string[];
    candidates: string[];
  }[] = [];
  for (const key of Object.keys(inventory.printings).sort()) {
    const source = inventory.printings[key];
    const candidates = index[key] ?? [];
    const providerHash = digest(
      candidates.slice().sort((a, b) => a.id.localeCompare(b.id)),
    );
    const old = checkpoint?.entries[key];
    let reason: string | undefined;
    if (
      reusable &&
      old?.sourceHash === source.sourceHash &&
      old.providerHash === providerHash
    ) {
      if (previous.cards[key]) cards[key] = previous.cards[key];
      reason = old.reason;
      stats.reused++;
    } else {
      const selected = matchPrinting(source, candidates);
      reason = selected.reason;
      if (selected.image) {
        const { id, front, back } = selected.image;
        cards[key] = back ? [id, front, back] : [id, front];
      }
      stats.processed++;
    }
    entries[key] = {
      sourceHash: source.sourceHash,
      providerHash,
      ...(reason ? { reason } : {}),
    };
    stats.total++;
    if (cards[key]) {
      stats.italian++;
      if (!previous?.cards[key]) stats.newMatches++;
    } else {
      stats.fallback++;
      issues.push({
        key,
        reason: reason ?? "unverified-printing",
        names: source.names,
        sources: source.sources,
        scopes: source.scopes,
        rawNumbers: source.rawNumbers,
        candidates: candidates.map((c) => `${c.lang}:${c.id}`),
      });
    }
  }
  stats.removed = Object.keys(checkpoint?.entries ?? {}).filter(
    (key) => !entries[key],
  ).length;
  const generation = digest({
    entries,
    cards,
    matcherVersion: MATCHER_VERSION,
  });
  const manifest: GlobalItalianImageManifest = {
    schemaVersion: 2,
    generation,
    cards,
  };
  const state: ImageCheckpoint = {
    schemaVersion: 1,
    matcherVersion: MATCHER_VERSION,
    generation,
    entries,
  };
  return { manifest, state, stats, issues };
}
