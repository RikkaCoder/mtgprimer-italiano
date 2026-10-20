import { test, expect } from "@playwright/test";

test("Italian static HTML, language persistence, navigation and 404", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/");
  expect(await response!.text()).toContain('lang="it"');
  await expect(
    page.getByRole("link", { name: "Formato più recente", exact: true }),
  ).toBeVisible();
  await expect(page.locator("footer")).toContainText("Garrett Gardner");
  await expect(page.locator("footer")).toContainText(
    "contenuto amatoriale non ufficiale",
  );
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page
    .getByRole("link", { name: "Format Directory", exact: true })
    .click();
  await expect(page.locator("main")).toContainText("Format Directory");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "Italiano", exact: true }).click();
  await expect(page.locator("main")).toContainText("Elenco dei formati");
  await page.goto("/pagina-inesistente/");
  await expect(
    page.getByRole("heading", { name: "Pagina non trovata", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

for (const width of [1440, 390]) {
  test(`filters, views and language changes preserve card identities and hash (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/reality-fracture/instants/");
    if (width < 768)
      await page
        .getByRole("button", { name: "Apri filtri", exact: true })
        .click();
    await expect(page.locator("#color-u + label")).toHaveAttribute(
      "title",
      "Blu",
    );
    await page.locator("#color-u + label").click();
    const selects = page.locator("select");
    await selects.nth(0).selectOption("text");
    await selects.nth(1).selectOption("category");
    await selects.nth(2).selectOption("name");
    await expect(page).toHaveURL(/filters/);
    const hash = new URL(page.url()).hash;
    const names = await page.locator("main .name").allTextContents();
    expect(names.length).toBeGreaterThan(0);
    await page.getByRole("button", { name: "English", exact: true }).click();
    expect(new URL(page.url()).hash).toBe(hash);
    await expect(selects.nth(0)).toHaveValue("text");
    await expect(page.locator("#color-u")).toBeChecked();
    expect(await page.locator("main .name").allTextContents()).toEqual(names);
    await expect(page.locator("#color-u + label")).toHaveAttribute(
      "title",
      "Blue",
    );
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(selects.nth(0)).toHaveValue("card");
    await expect(page.locator("#color-u")).not.toBeChecked();
    await page.getByRole("button", { name: "Italiano", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
    if (width < 768) {
      await page
        .getByRole("button", { name: "Apri menu", exact: true })
        .click();
      await expect(page.locator("body")).toHaveClass(/menuMobileOpen/);
      await page
        .getByRole("button", { name: "Chiudi menu", exact: true })
        .click();
    }
  });
}

test("Italian guide search uses translated labels and original anchors", async ({
  page,
}) => {
  await page.goto("/kaldheim/effects/");
  const search = page.getByPlaceholder("Vai a una guida...");
  await search.fill("ritorno");
  await expect(page.locator(".results")).toContainText("Ritorno in mano");
  await search.press("Enter");
  await expect(search).toHaveValue("");
  await expect(page.locator("#bounce")).toBeAttached();
});
