import assert from "node:assert/strict";
import test from "node:test";
import { createMetadata } from "../src/app/metadata";
import { PAGES_CONFIG } from "../src/content/global/pages";
import { generatePages } from "../src/lib/config";
import { localizeTemplate, translate } from "../src/i18n/translate";
import type { ITemplate, TTemplate } from "../src/models";

const expectedTitle = (
  page: ITemplate & { formatName?: string },
  locale: "it" | "en",
) => {
  const title = translate(page.title, locale);
  const suffix = title
    ? `${title} | MTG Primer`
    : `MTG Primer | ${translate("Strategy Guides for Limited Magic: The Gathering", locale)}`;
  return page.formatName ? `${page.formatName}: ${suffix}` : suffix;
};

for (const formatName of [
  "Tarkir: Dragonstorm",
  "Avatar: The Last Airbender",
  "Alchemy Horizons: Baldur's Gate",
  "Official: Name: Edition | Special",
]) {
  test(`structured titles preserve the complete format name: ${formatName}`, () => {
    for (const title of [
      "Format Information",
      "Instants Guide",
      "Full Card Gallery",
      "Themes",
    ]) {
      const source = {
        path: "/example",
        type: "info" as const,
        backgroundImage: "https://example.com/image.jpg",
        backgroundCaption: "Illustrated by Example Artist",
        icon: "",
        title,
        formatName,
        titleFull: `${formatName}: ${title} | MTG Primer`,
        description: `General info for ${formatName}.`,
      };
      const localized = localizeTemplate(source, "it");
      assert.equal(localized.formatName, formatName);
      assert.equal(localized.titleFull, expectedTitle(source, "it"));
      assert.equal(
        localized.description,
        `Informazioni generali su ${formatName}.`,
      );
      assert.equal(localizeTemplate(source, "en"), source);
      // A precomposed title must not be parsed, even if its contents are stale.
      assert.equal(
        localizeTemplate({ ...source, titleFull: "stale legacy title" }, "it")
          .titleFull,
        localized.titleFull,
      );
    }
  });
}

test("all generated page titles and metadata are localized from structured fields", async () => {
  const pages = await generatePages(PAGES_CONFIG);
  let colonPages = 0;
  const verify = (page: TTemplate) => {
    if ("formatName" in page && page.formatName.includes(":")) colonPages++;
    for (const locale of ["it", "en"] as const) {
      const localized = localizeTemplate(page, locale);
      const expected = expectedTitle(page, locale);
      assert.equal(localized.titleFull, expected, `${locale}: ${page.path}`);
      if ("formatName" in page && "formatName" in localized)
        assert.equal(localized.formatName, page.formatName);
      const metadata = createMetadata(page, locale);
      assert.equal(metadata.title, expected);
      assert.equal(metadata.openGraph?.title, expected);
      assert.equal(
        metadata.openGraph?.locale,
        locale === "it" ? "it_IT" : "en_US",
      );
      assert.deepEqual(metadata.openGraph?.alternateLocale, [
        locale === "it" ? "en_US" : "it_IT",
      ]);
      assert.equal(metadata.twitter?.title, expected);
      const description = translate(page.description, locale);
      assert.equal(metadata.description, description);
      assert.equal(metadata.openGraph?.description, description);
      assert.equal(metadata.twitter?.description, description);
      assert.equal(
        metadata.openGraph?.images[0].alt,
        translate(page.backgroundCaption, locale),
      );
      if (locale === "it") assert.deepEqual(createMetadata(page), metadata);
    }
  };
  pages.forEach(verify);
  assert.ok(colonPages >= 49, "include all previously affected pages");
  // Home/directory/info also contain templates used for navigation and prefetch.
  for (const page of pages) {
    const localized = localizeTemplate(page, "it");
    const nested =
      "latestFormats" in localized
        ? localized.latestFormats
        : "directory" in localized
          ? localized.directory
          : "guidePages" in localized
            ? localized.guidePages
            : [];
    nested.forEach((child) =>
      assert.equal(child.titleFull, expectedTitle(child, "it")),
    );
  }
});
