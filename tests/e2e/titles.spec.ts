import { test, expect, type Page } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

test("all exported documents have consistent Italian titles and metadata", async () => {
  let documents = 0;
  const decode = (value: string) =>
    value.replace(
      /&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi,
      (_, entity: string) => {
        if (entity.startsWith("#x"))
          return String.fromCodePoint(parseInt(entity.slice(2), 16));
        if (entity.startsWith("#"))
          return String.fromCodePoint(parseInt(entity.slice(1), 10));
        return (
          { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" } as Record<
            string,
            string
          >
        )[entity];
      },
    );
  const scan = async (directory: string) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory() && entry.name !== "_next") await scan(file);
      else if (entry.isFile() && entry.name.endsWith(".html")) {
        const html = await readFile(file, "utf8");
        const title = decode(
          html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "",
        );
        expect(title, file).not.toBe("");
        expect(title, file).not.toMatch(
          /(?:Instants Guide|Full Card Gallery|Format Information|Effect-o-pedia|Removal Guide|Morphs Guide|Themes)\s*\|/,
        );
        const tags = [...html.matchAll(/<meta\s+([^>]+)>/g)].map((match) =>
          Object.fromEntries(
            [...match[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((attribute) => [
              attribute[1],
              decode(attribute[2]),
            ]),
          ),
        );
        const content = (key: string) =>
          tags.find((tag) => tag.name === key || tag.property === key)?.content;
        expect(content("og:title"), file).toBe(title);
        expect(content("twitter:title"), file).toBe(title);
        const description = content("description");
        expect(description, file).toBeTruthy();
        expect(content("og:description"), file).toBe(description);
        expect(content("twitter:description"), file).toBe(description);
        expect(content("og:locale"), file).toBe("it_IT");
        expect(content("og:locale:alternate"), file).toBe("en_US");
        documents++;
      }
    }
  };
  await scan("out");
  expect(documents).toBeGreaterThanOrEqual(286);
});

for (const sample of [
  {
    path: "/tarkir-dragonstorm/instants/",
    format: "Tarkir: Dragonstorm",
    it: "Guida agli istantanei",
    en: "Instants Guide",
  },
  {
    path: "/avatar-the-last-airbender/",
    format: "Avatar: The Last Airbender",
    it: "Info sul formato",
    en: "Format Information",
  },
  {
    path: "/alchemy-horizons-baldurs-gate/instants/",
    format: "Alchemy Horizons: Baldur's Gate",
    it: "Guida agli istantanei",
    en: "Instants Guide",
  },
]) {
  test(`static and client metadata preserve ${sample.format}`, async ({
    page,
    browser,
    baseURL,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const expectedItalian = `${sample.format}: ${sample.it} | MTG Primer`;
    const expectedEnglish = `${sample.format}: ${sample.en} | MTG Primer`;
    const check = async (target: Page, title: string) => {
      await expect(target).toHaveTitle(title);
      await expect(target.locator('meta[property="og:title"]')).toHaveAttribute(
        "content",
        title,
      );
      await expect(
        target.locator('meta[name="twitter:title"]'),
      ).toHaveAttribute("content", title);
      const description = await target
        .locator('meta[name="description"]')
        .getAttribute("content");
      expect(description).toBeTruthy();
      await expect(
        target.locator('meta[property="og:description"]'),
      ).toHaveAttribute("content", description!);
      await expect(
        target.locator('meta[name="twitter:description"]'),
      ).toHaveAttribute("content", description!);
      await expect(
        target.locator('meta[property="og:locale"]'),
      ).toHaveAttribute(
        "content",
        title === expectedItalian ? "it_IT" : "en_US",
      );
      await expect(
        target.locator('meta[property="og:locale:alternate"]'),
      ).toHaveAttribute(
        "content",
        title === expectedItalian ? "en_US" : "it_IT",
      );
    };
    // The exported metadata must be correct before hydration as well.
    const staticContext = await browser.newContext({
      javaScriptEnabled: false,
      baseURL,
    });
    try {
      const staticPage = await staticContext.newPage();
      await staticPage.goto(sample.path, { waitUntil: "domcontentloaded" });
      await check(staticPage, expectedItalian);
    } finally {
      await staticContext.close();
    }

    await page.goto(sample.path, { waitUntil: "domcontentloaded" });
    await check(page, expectedItalian);
    await page.getByRole("button", { name: "English", exact: true }).click();
    await check(page, expectedEnglish);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      "content",
      "en_US",
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await check(page, expectedEnglish);
    await page.getByRole("button", { name: "Italiano", exact: true }).click();
    await check(page, expectedItalian);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      "content",
      "it_IT",
    );
    if (sample.format === "Tarkir: Dragonstorm") {
      await page.getByRole("button", { name: "English", exact: true }).click();
      await page
        .getByRole("link", { name: "Full Card Gallery", exact: true })
        .click();
      await check(page, "Tarkir: Dragonstorm: Full Card Gallery | MTG Primer");
    }
    expect(errors).toEqual([]);
  });
}
