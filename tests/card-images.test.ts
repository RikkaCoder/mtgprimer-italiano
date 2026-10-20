import assert from "node:assert/strict";
import test from "node:test";
import pilot from "./fixtures/pilot-fra-instants.json";
import dfc from "./fixtures/scryfall-mid-27.it.json";
import prepare from "./fixtures/scryfall-fra-49.it.json";
import {
  cardImageKey,
  normalizeCollectorNumber,
} from "../src/lib/card-image-key";
import { getCardImages, resolveCardImages } from "../src/lib/card-images";
import { selectGuideImages } from "../src/lib/card-images";
import type { ItalianImageMap } from "../src/models/card-images.models";
import { selectItalianImage } from "../scripts/lib/scryfall-card-images";

test("page-supplied exact images are used only in Italian, in any guide", () => {
  assert.equal(Object.keys(pilot.cards).length, 53);
  for (const entry of Object.values(pilot.cards)) {
    const card = {
      code: entry.set,
      number: entry.collectorNumber.padStart(3, "0"),
    };
    const original = `https://s3-us-west-2.amazonaws.com/mtgprimer/cards/normal/${card.code}/${card.number}.jpg`;
    const image: [string, string] = [entry.id, entry.front];
    assert.equal(getCardImages(card, "it", image).front.src, entry.front);
    assert.equal(getCardImages(card, "en", image).front.src, original);
    assert.equal(getCardImages(card, "it").front.src, original);
    assert.ok(
      entry.front.startsWith("https://cards.scryfall.io/normal/front/"),
    );
  }
});

test("collector suffixes remain separate printing identifiers", () => {
  assert.equal(normalizeCollectorNumber("002"), "2");
  assert.equal(normalizeCollectorNumber("000"), "0");
  assert.equal(cardImageKey("FRA", "049a"), "fra/49a");
  assert.notEqual(cardImageKey("fra", "049a"), cardImageKey("fra", "049"));
  assert.notEqual(cardImageKey("fra", "049"), cardImageKey("spg", "049"));
});

test("an unavailable printing never substitutes another printing with the same name", () => {
  // FRA 402 is the serialized Bloodline Recollector; its Italian endpoint returns
  // 404. The available Italian FRA 49 must never be used in its place.
  const serialized = { code: "fra", number: "402" };
  const original =
    "https://s3-us-west-2.amazonaws.com/mtgprimer/cards/normal/fra/402.jpg";
  assert.equal(getCardImages(serialized, "it").front.src, original);
  const available = selectItalianImage(
    { code: "fra", number: "049", name: "Bloodline Recollector" },
    prepare,
  );
  assert.ok(available.image);
  assert.equal(
    resolveCardImages(serialized, available.image).front.src,
    original,
  );
});

test("real Italian double-faced printing provides two distinct image faces", () => {
  const selected = selectItalianImage(
    { code: "mid", number: "027", name: "Lunarch Veteran" },
    dfc,
  );
  assert.ok(selected.image);
  const images = resolveCardImages(
    { code: "mid", number: "027" },
    selected.image,
  );
  assert.equal(images.front.src, dfc.card_faces[0].image_uris.normal);
  assert.equal(images.back.src, dfc.card_faces[1].image_uris.normal);
  assert.equal(images.hasItalianBack, true);
  assert.equal(
    images.front.fallback,
    "https://s3-us-west-2.amazonaws.com/mtgprimer/cards/normal/mid/027.jpg",
  );
  assert.equal(
    images.back.fallback,
    "https://s3-us-west-2.amazonaws.com/mtgprimer/cards/normal/mid/027b.jpg",
  );
  // A missing page record falls back independently of other pages.
  assert.equal(
    getCardImages({ code: "mid", number: "027" }, "it").front.src,
    images.front.fallback,
  );
});

test("static page payload contains only that page's images and deduplicates prints", () => {
  const all: ItalianImageMap = {
    "fra/2": ["a", "https://cards.scryfall.io/a.jpg"],
    "mid/27": ["b", "https://cards.scryfall.io/b.jpg"],
  };
  const selected = selectGuideImages(
    [
      { code: "FRA", number: "002" },
      { code: "fra", number: "002" },
    ],
    all,
  );
  assert.deepEqual(Object.keys(selected), ["fra/2"]);
  assert.equal(
    getCardImages({ code: "fra", number: "002" }, "en", selected["fra/2"]).front
      .src,
    "https://s3-us-west-2.amazonaws.com/mtgprimer/cards/normal/fra/002.jpg",
  );
});

test("prepare cards use one full-card image, not an invented second face", () => {
  const selected = selectItalianImage(
    {
      code: "fra",
      number: "049",
      name: "Ancestral Craving (Bloodline Recollector // Ancestral Craving)",
    },
    prepare,
  );
  assert.ok(selected.image);
  assert.equal(selected.image.front, prepare.image_uris.normal);
  assert.equal(selected.image.back, undefined);
  assert.equal(
    resolveCardImages({ code: "fra", number: "049" }, selected.image)
      .hasItalianBack,
    false,
  );
});

test("wrong identity, English images, placeholders and incomplete DFCs are rejected", () => {
  const expected = { code: "mid", number: "027", name: "Lunarch Veteran" };
  assert.equal(
    selectItalianImage(expected, { ...dfc, collector_number: "27a" }).reason,
    "identity-mismatch",
  );
  assert.equal(
    selectItalianImage(expected, { ...dfc, lang: "en" }).reason,
    "identity-mismatch",
  );
  assert.equal(
    selectItalianImage(expected, { ...dfc, image_status: "placeholder" })
      .reason,
    "image-placeholder",
  );
  assert.equal(
    selectItalianImage(expected, {
      ...dfc,
      image_uris: {
        normal: "https://cards.scryfall.io/normal/front/example.jpg",
      },
      card_faces: [dfc.card_faces[0], { name: "Luminous Phantom" }],
    }).reason,
    "missing-back-image",
  );
  assert.equal(
    selectItalianImage({ ...expected, name: "Different Card" }, dfc).reason,
    "name-mismatch",
  );
  assert.equal(
    selectItalianImage(expected, {
      ...dfc,
      card_faces: [
        {
          ...dfc.card_faces[0],
          image_uris: {
            normal: "https://api.scryfall.com/cards/example?format=image",
          },
        },
        dfc.card_faces[1],
      ],
    }).reason,
    "missing-front-image",
  );
});
