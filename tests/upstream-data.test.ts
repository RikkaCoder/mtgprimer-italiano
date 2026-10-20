import assert from "node:assert/strict";
import test from "node:test";
import {
  isDataPath,
  readData,
  mergeData,
  serializeData,
} from "../scripts/lib/upstream-data";

test("only original guide/config data paths are eligible for upstream import", () => {
  assert.ok(isDataPath("src/content/guides/future/future.json"));
  for (const path of [
    "src/i18n/translate.ts",
    "LICENSE",
    ".github/workflows/evil.yml",
    "package.json",
    "src/content/guides/../secret.json",
  ])
    assert.equal(isDataPath(path), false);
});

test("three-way merge preserves Italian customizations and accepts new upstream cards", () => {
  const base = { name: "Instants", cards: { A: { number: "1" } } };
  const local = { ...base, name: "Istantanei" };
  const remote = { ...base, cards: { ...base.cards, B: { number: "2" } } };
  assert.deepEqual(JSON.parse(JSON.stringify(mergeData(base, local, remote))), {
    ...remote,
    name: "Istantanei",
  });
  assert.throws(
    () => mergeData(base, local, { ...base, name: "Conflicting title" }),
    /upstream-conflict/,
  );
});

test("new upstream format is inserted while local page customizations survive", () => {
  const base = { pages: [{ slug: "old", title: "Original" }] };
  const local = { pages: [{ slug: "old", title: "Italiano" }] };
  const remote = { pages: [{ slug: "new", title: "New Set" }, ...base.pages] };
  assert.deepEqual(JSON.parse(JSON.stringify(mergeData(base, local, remote))), {
    pages: [{ slug: "new", title: "New Set" }, ...local.pages],
  });
});

test("literal extraction never executes imports, function calls or expressions", () => {
  const path = "src/content/global/pages.ts";
  const data = readData(
    path,
    'import "malicious"; export const PAGES_CONFIG = {slug:"",template:"home",pages:[]};',
  );
  assert.equal((data as { template: string }).template, "home");
  for (const code of [
    '(()=>{throw new Error("executed")})()',
    "{...process.env}",
    '{slug:"",template:"new-runtime"}',
  ])
    assert.throws(() => readData(path, `export const PAGES_CONFIG = ${code};`));
  assert.deepEqual(readData(path, serializeData(path, data)), data);
});

test("local deletion conflicts with an upstream edit and cannot be silently overwritten", () => {
  assert.throws(
    () => mergeData({ number: "1" }, undefined, { number: "2" }),
    /upstream-conflict/,
  );
  assert.equal(
    mergeData({ number: "1" }, { number: "1" }, undefined),
    undefined,
  );
});
