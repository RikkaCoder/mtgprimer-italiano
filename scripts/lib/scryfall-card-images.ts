import type { ICard } from "../../src/models/card.models";
import type { ItalianCardImage } from "../../src/models/card-images.models";
import { normalizeCollectorNumber } from "../../src/lib/card-image-key";

export interface ScryfallImageCard {
  object: string;
  id: string;
  set: string;
  collector_number: string;
  lang: string;
  name: string;
  layout: string;
  image_status: string;
  oracle_id?: string;
  illustration_id?: string;
  frame_effects?: string[];
  border_color?: string;
  full_art?: boolean;
  textless?: boolean;
  promo?: boolean;
  promo_types?: string[];
  variation?: boolean;
  digital?: boolean;
  games?: string[];
  finishes?: string[];
  image_uris?: { normal?: string };
  card_faces?: {
    name: string;
    oracle_id?: string;
    illustration_id?: string;
    image_uris?: { normal?: string };
  }[];
}

const isImageUrl = (value?: string): value is string => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "cards.scryfall.io";
  } catch {
    return false;
  }
};

export function selectItalianImage(
  expected: Pick<ICard, "code" | "number" | "name">,
  card: ScryfallImageCard,
  exactNumber = normalizeCollectorNumber(expected.number),
): { image?: ItalianCardImage; reason?: string } {
  if (
    card.object !== "card" ||
    card.lang !== "it" ||
    card.set !== expected.code.toLowerCase() ||
    card.collector_number !== exactNumber
  )
    return { reason: "identity-mismatch" };
  // Names are only a safety check after exact set/number lookup, never a search.
  const expectedName = expected.name.replace(/ \([^()]* \/\/ [^()]*\)$/, "");
  if (
    ![card.name, ...(card.card_faces?.map((face) => face.name) ?? [])].includes(
      expectedName,
    )
  )
    return { reason: "name-mismatch" };
  if (!["highres_scan", "lowres"].includes(card.image_status))
    return { reason: `image-${card.image_status}` };

  let front = card.image_uris?.normal;
  let back: string | undefined;
  if (
    !front ||
    [
      "transform",
      "modal_dfc",
      "battle",
      "double_faced_token",
      "reversible_card",
    ].includes(card.layout)
  ) {
    // True double-faced cards have an image per face. Prepare, adventure and
    // split cards have one full-card image and must not be treated as DFCs.
    if (card.card_faces?.length !== 2) return { reason: "unsupported-faces" };
    front = card.card_faces[0].image_uris?.normal;
    back = card.card_faces[1].image_uris?.normal;
    if (!isImageUrl(back)) return { reason: "missing-back-image" };
  }
  if (!isImageUrl(front)) return { reason: "missing-front-image" };
  return {
    image: {
      id: card.id,
      set: card.set,
      collectorNumber: card.collector_number,
      language: "it",
      layout: card.layout,
      imageStatus: card.image_status,
      front,
      ...(back ? { back } : {}),
    },
  };
}
