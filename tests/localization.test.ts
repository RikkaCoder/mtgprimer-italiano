import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";
import {
  DEFAULT_FILTER_OPTIONS,
  DEFAULT_FILTER_SELECTIONS,
} from "../src/constants/constants";
import { PAGES_CONFIG } from "../src/content/global/pages";
import { generatePages } from "../src/lib/config";
import { applyFilters } from "../src/lib/filter";
import { decodeHash, encodeHash } from "../src/lib/hash";
import {
  DEFAULT_LOCALE,
  formatReleaseDate,
  localizeTemplate,
  translate,
} from "../src/i18n/translate";
import type { IFilterSelections } from "../src/models";

test("Italian is the default; English and unknown content preserve the source", () => {
  assert.equal(DEFAULT_LOCALE, "it");
  assert.equal(translate("Instants Guide", "it"), "Guida agli istantanei");
  assert.equal(translate("Instants Guide", "en"), "Instants Guide");
  assert.equal(translate("New future mechanic", "it"), "New future mechanic");
  assert.equal(
    translate("General info for Reality Fracture.", "it"),
    "Informazioni generali su Reality Fracture.",
  );
  assert.equal(formatReleaseDate("October 2, 2026", "it"), "2 ottobre 2026");
  assert.equal(formatReleaseDate("October 2, 2026", "en"), "October 2, 2026");
  assert.equal(formatReleaseDate("August 1st, 2025", "it"), "1 agosto 2025");
});

test("every current guide, page and category label is covered, except proper names and shared terms", () => {
  const shared = new Set([
    "",
    "Dungeon",
    "Flashback",
    "Ajani",
    "Arni",
    "Chandra",
    "Danitha",
    "Edgar",
    "Fblthp",
    "Gallia",
    "Garruk",
    "Ghalta",
    "Gideon",
    "Hapatra",
    "Jace / Tam",
    "Jiang Yanggu",
    "Karn",
    "Kiora",
    "Koth",
    "Liliana",
    "Loot",
    "Lyra",
    "Mabel",
    "Marwyn",
    "Massacre Girl / Rescue Girl",
    "Pia",
    "Proft",
    "Ruric Thar",
    "Saheeli",
    "Samut",
    "Tetsuko Umezawa",
    "Teyo",
    "Thalia",
    "Tinybones / Titanbones",
    "Tomik",
    "Traxos",
    "Vraska",
    "Winter",
    "Yargle",
    "Yoshimaru",
    "Yuriko",
  ]);
  const labels = new Set<string>();
  const walk = (path: string) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith(".json")) {
        const data = JSON.parse(readFileSync(file, "utf8"));
        for (const key of ["name", "description"])
          if (data[key]) labels.add(data[key]);
        for (const label of Object.values(data.categories ?? {}))
          labels.add(label as string);
      }
    }
  };
  walk("src/content/guides");
  for (const file of [
    "src/content/global/pages.ts",
    "src/content/global/preset.ts",
  ]) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const visit = (node: ts.Node) => {
      if (
        ts.isPropertyAssignment(node) &&
        ["title", "description", "NAME", "DESCRIPTION"].includes(
          node.name.getText(source),
        ) &&
        ts.isStringLiteral(node.initializer)
      )
        labels.add(node.initializer.text);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  for (const options of Object.values(DEFAULT_FILTER_OPTIONS))
    for (const label of Object.values(options)) labels.add(label as string);
  const missing = [...labels].filter(
    (label) => !shared.has(label) && translate(label, "it") === label,
  );
  assert.deepEqual(missing, []);
});

test("localization preserves every route, card, image identifier, filter key and hash behavior", async () => {
  const pages = await generatePages(PAGES_CONFIG);
  assert.ok(pages.length > 250);
  for (const original of pages) {
    const before = JSON.stringify(original);
    const localized = localizeTemplate(original, "it");
    assert.equal(localizeTemplate(original, "en"), original);
    assert.equal(localized.path, original.path);
    assert.equal(localized.backgroundImage, original.backgroundImage);
    if ("filter" in original && "filter" in localized) {
      assert.equal(
        localized.filter.defaultSelections,
        original.filter.defaultSelections,
      );
      assert.deepEqual(
        Object.keys(localized.filter.options),
        Object.keys(original.filter.options),
      );
      for (const key of Object.keys(
        original.filter.options,
      ) as (keyof typeof original.filter.options)[])
        assert.deepEqual(
          Object.keys(localized.filter.options[key]),
          Object.keys(original.filter.options[key]),
        );
      const guides = "guides" in original ? original.guides : [original.guide];
      const translated =
        "guides" in localized ? localized.guides : [localized.guide];
      guides.forEach((guide, index) => {
        assert.equal(translated[index].cards, guide.cards);
        assert.equal(translated[index].key, guide.key);
        for (const grouping of Object.keys(
          DEFAULT_FILTER_OPTIONS.groupings,
        ) as IFilterSelections["grouping"][]) {
          const selections: IFilterSelections = {
            ...structuredClone(DEFAULT_FILTER_SELECTIONS),
            grouping,
            colors: ["u"],
            rarities: ["c", "u"],
          };
          assert.deepEqual(
            applyFilters(guide.cards, localized.filter, selections),
            applyFilters(guide.cards, original.filter, selections),
          );
          const hash = encodeHash(
            original.filter.defaultSelections,
            selections,
          );
          assert.deepEqual(
            decodeHash(
              localized.filter.defaultSelections,
              hash ? "#" + hash : "",
            ),
            decodeHash(
              original.filter.defaultSelections,
              hash ? "#" + hash : "",
            ),
          );
          if (
            original.filter.defaultSelections.grouping &&
            original.filter.defaultSelections.ordering
          )
            assert.deepEqual(
              decodeHash(
                localized.filter.defaultSelections,
                hash ? "#" + hash : "",
              ),
              selections,
            );
        }
      });
    }
    assert.equal(
      JSON.stringify(original),
      before,
      "source template must never be mutated",
    );
  }
});
