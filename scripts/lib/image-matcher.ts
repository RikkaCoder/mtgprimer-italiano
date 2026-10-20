import type { ItalianCardImage } from "../../src/models/card-images.models";
import { canonical } from "./files";
import type { InventoryPrinting } from "./inventory";
import {
  selectItalianImage,
  type ScryfallImageCard,
} from "./scryfall-card-images";
import { cardImageKey } from "../../src/lib/card-image-key";

// Only identity and image data affect invalidation. Prices and Oracle text do not.
export function projectCard(card: ScryfallImageCard): ScryfallImageCard {
  const {
    object,
    id,
    set,
    collector_number,
    lang,
    name,
    layout,
    image_status,
    oracle_id,
    illustration_id,
    border_color,
    full_art,
    textless,
    promo,
    variation,
    digital,
  } = card;
  return {
    object,
    id,
    set,
    collector_number,
    lang,
    name,
    layout,
    image_status,
    oracle_id,
    illustration_id,
    border_color,
    full_art,
    textless,
    promo,
    variation,
    digital,
    frame_effects: card.frame_effects?.slice().sort(),
    promo_types: card.promo_types?.slice().sort(),
    games: card.games?.slice().sort(),
    finishes: card.finishes?.slice().sort(),
    image_uris: card.image_uris
      ? { normal: card.image_uris.normal }
      : undefined,
    card_faces: card.card_faces?.map(
      ({ name, oracle_id, illustration_id, image_uris }) => ({
        name,
        oracle_id,
        illustration_id,
        image_uris: image_uris ? { normal: image_uris.normal } : undefined,
      }),
    ),
  };
}

export interface MatchResult {
  image?: ItalianCardImage;
  reason?: string;
}
export function matchPrinting(
  source: InventoryPrinting,
  candidates: ScryfallImageCard[],
): MatchResult {
  if (source.invalid) return { reason: source.invalid };
  if (
    candidates.some(
      (card) => cardImageKey(card.set, card.collector_number) !== source.key,
    )
  )
    return { reason: "identity-mismatch" };
  const raw = source.rawNumbers[0];
  const exact = candidates.filter((c) => c.collector_number === raw);
  // Legacy padded numbers can only use a unique, otherwise compatible identity.
  const pool = exact.length ? exact : candidates;
  const italian = pool.filter((c) => c.lang === "it");
  if (!italian.length) return { reason: "no-italian-printing" };
  const english = pool.filter((c) => c.lang === "en");
  if (
    italian.length !== 1 ||
    english.length > 1 ||
    new Set(pool.map((c) => c.collector_number)).size !== 1
  )
    return { reason: "ambiguous-printing" };
  const card = italian[0];
  const reference = english[0];
  if (!reference) return { reason: "unverified-printing" };
  if (
    !card.oracle_id ||
    !reference.oracle_id ||
    card.oracle_id !== reference.oracle_id
  )
    return { reason: "oracle-mismatch" };
  if (
    card.layout !== reference.layout ||
    source.layouts.some((l) => l !== card.layout)
  )
    return { reason: "layout-mismatch" };
  if (card.layout === "meld") return { reason: "unsupported-layout" };
  // New physical layouts need review; single-image layouts are otherwise generic.
  if (
    !card.image_uris?.normal &&
    ![
      "transform",
      "modal_dfc",
      "battle",
      "double_faced_token",
      "reversible_card",
    ].includes(card.layout)
  )
    return { reason: "unsupported-layout" };
  const fields = [
    "illustration_id",
    "frame_effects",
    "border_color",
    "full_art",
    "textless",
    "promo",
    "promo_types",
    "variation",
    "digital",
  ] as const;
  for (const field of fields) {
    if (
      reference[field] !== undefined &&
      card[field] !== undefined &&
      canonical(reference[field]) !== canonical(card[field])
    )
      return { reason: `printing-mismatch:${field}` };
  }
  if (
    card.name !== reference.name ||
    canonical(card.card_faces?.map((f) => f.name)) !==
      canonical(reference.card_faces?.map((f) => f.name))
  )
    return { reason: "face-mismatch" };
  for (let i = 0; i < (card.card_faces?.length ?? 0); i++) {
    const face = card.card_faces![i];
    const other = reference.card_faces?.[i];
    if (
      face.illustration_id &&
      other?.illustration_id &&
      face.illustration_id !== other.illustration_id
    )
      return { reason: "printing-mismatch:face-art" };
  }
  // Missing art prevents verification even if the Oracle card is the same.
  if (
    !(card.illustration_id && reference.illustration_id) &&
    !(
      card.card_faces?.length &&
      card.card_faces.every(
        (f, i) =>
          f.illustration_id && reference.card_faces?.[i]?.illustration_id,
      )
    )
  )
    return { reason: "unverified-printing" };
  for (const name of source.names) {
    const selected = selectItalianImage(
      { code: source.code, number: source.number, name },
      card,
      card.collector_number,
    );
    if (!selected.image) return selected;
  }
  return selectItalianImage(
    { code: source.code, number: source.number, name: source.names[0] },
    card,
    card.collector_number,
  );
}
