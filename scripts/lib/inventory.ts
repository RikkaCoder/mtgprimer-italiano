import { readFile } from "node:fs/promises";
import { generatePages, type GuideCardSource } from "../../src/lib/config";
import { PAGES_CONFIG } from "../../src/content/global/pages";
import { cardImageKey } from "../../src/lib/card-image-key";
import type { IGuideConfig, TPageConfig } from "../../src/models";
import { digest } from "./files";

export interface InventoryPrinting {
  key: string;
  code: string;
  number: string;
  rawNumbers: string[];
  names: string[];
  layouts: string[];
  sources: string[];
  scopes: string[];
  sourceHash: string;
  invalid?: string;
}
export interface Inventory {
  warnings?: string[];
  printings: Record<string, InventoryPrinting>;
  scopes: Record<string, string[]>;
  files: Record<string, string>;
}
const sorted = (items: string[]) => [...new Set(items)].sort();

export async function discoverInventory(
  config: TPageConfig = PAGES_CONFIG,
  loader?: (format: string, file: string) => Promise<IGuideConfig | undefined>,
): Promise<Inventory> {
  const resolved = new Map<string, GuideCardSource[]>();
  const files: Record<string, string> = {};
  const warnings = new Set<string>();
  const pages = await generatePages(config, {
    strict: true,
    onMissingGuide: (format, file) => {
      warnings.add(`Optional guide unavailable: ${format}/${file}`);
    },
    loadGuide:
      loader ??
      (async (format, file) => {
        if (!/^[a-z0-9-]+$/i.test(format) || !/^[a-z0-9-]+$/i.test(file))
          throw new Error("Invalid guide path");
        const path = `src/content/guides/${format}/${file}.json`;
        let text: string;
        try {
          text = await readFile(path, "utf8");
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT")
            return undefined;
          throw error;
        }
        const value = JSON.parse(text) as IGuideConfig;
        if (
          !value.cards ||
          typeof value.cards !== "object" ||
          Array.isArray(value.cards)
        )
          throw new Error(`Invalid guide: ${path}`);
        files[path] = digest(value);
        return value;
      }),
    onGuide: (guide, sources) => {
      resolved.set(`${guide.code}/${guide.key}`, sources);
    },
  });
  const scopes: Record<string, string[]> = {};
  const printings: Record<string, InventoryPrinting> = {};
  for (const page of pages) {
    const guides =
      page.type === "guide"
        ? [page.guide]
        : page.type === "guide-group"
          ? page.guides
          : [];
    for (const guide of guides) {
      if (!guide) throw new Error(`Configured guide missing: ${page.path}`);
      const scope = `${guide.code}/${guide.key}`;
      if (scopes[scope]) continue;
      scopes[scope] = [];
      for (const source of resolved.get(scope) ?? []) {
        const { card, rawNumber } = source;
        const key = cardImageKey(card.code, card.number);
        scopes[scope].push(key);
        const item = (printings[key] ??= {
          key,
          code: card.code.toLowerCase(),
          number: card.number,
          rawNumbers: [],
          names: [],
          layouts: [],
          sources: [],
          scopes: [],
          sourceHash: "",
        });
        if (!rawNumber || card.code === "exa" || card.number === "000")
          item.invalid = "missing-source-id";
        if (rawNumber) item.rawNumbers.push(rawNumber);
        item.names.push(card.name);
        if (card.layout) item.layouts.push(card.layout);
        item.sources.push(...source.files);
        item.scopes.push(scope);
      }
      scopes[scope] = sorted(scopes[scope]);
    }
  }
  for (const item of Object.values(printings)) {
    item.rawNumbers = sorted(item.rawNumbers);
    item.names = sorted(item.names);
    item.layouts = sorted(item.layouts);
    item.sources = sorted(item.sources);
    item.scopes = sorted(item.scopes);
    if (item.rawNumbers.length > 1) item.invalid = "ambiguous-source-number";
    item.sourceHash = digest({
      code: item.code,
      rawNumbers: item.rawNumbers,
      names: item.names,
      layouts: item.layouts,
      invalid: item.invalid,
    });
  }
  return { printings, scopes, files, warnings: [...warnings].sort() };
}
