import type { Locale } from "@/i18n/translate";
import type { ICard } from "@/models";
import type {
  ItalianCardImage,
  CompactItalianImage,
  ItalianImageMap,
} from "@/models/card-images.models";
import { cardImageKey } from "./card-image-key";

export interface CardImageSource {
  src: string;
  fallback: string;
}

export function resolveCardImages(
  card: Pick<ICard, "code" | "number">,
  italian?: ItalianCardImage | CompactItalianImage,
) {
  const base = `https://s3-us-west-2.amazonaws.com/mtgprimer/cards/normal/${card.code}/${card.number}`;
  const front = `${base}.jpg`;
  const back = `${base}b.jpg`;
  // Even callers supplying a record must match the exact printing.
  const record = Array.isArray(italian) ? undefined : italian;
  const match =
    Array.isArray(italian) ||
    (record?.language === "it" &&
      cardImageKey(record.set, record.collectorNumber) ===
        cardImageKey(card.code, card.number));
  const italianFront = Array.isArray(italian) ? italian[1] : record?.front;
  const italianBack = Array.isArray(italian) ? italian[2] : record?.back;
  return {
    front: {
      src: match ? italianFront : front,
      fallback: front,
    } as CardImageSource,
    back: {
      src: match && italianBack ? italianBack : back,
      fallback: back,
    } as CardImageSource,
    hasItalianBack: !!(match && italianBack),
  };
}

export function getCardImages(
  card: Pick<ICard, "code" | "number">,
  locale: Locale,
  image?: CompactItalianImage,
) {
  return resolveCardImages(card, locale === "it" ? image : undefined);
}

export function selectGuideImages(
  cards: Pick<ICard, "code" | "number">[],
  all: ItalianImageMap,
): ItalianImageMap {
  const selected: ItalianImageMap = {};
  for (const card of cards) {
    const key = cardImageKey(card.code, card.number);
    if (all[key]) selected[key] = all[key];
  }
  return selected;
}
