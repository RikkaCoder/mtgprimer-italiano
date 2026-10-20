import "server-only";
import manifest from "@/content/card-images/italian.json";
import type { GlobalItalianImageManifest } from "@/models/card-images.models";
import type { TTemplate } from "@/models";
import { selectGuideImages } from "./card-images";

export function withItalianImages(template: TTemplate): TTemplate {
  const cards =
    template.type === "guide"
      ? template.guide.cards
      : template.type === "guide-group"
        ? template.guides.flatMap((guide) => guide.cards)
        : undefined;
  if (!cards) return template;
  return {
    ...template,
    italianImages: selectGuideImages(
      cards,
      (manifest as unknown as GlobalItalianImageManifest).cards,
    ),
  };
}
