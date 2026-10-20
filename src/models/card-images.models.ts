export interface ItalianCardImage {
  id: string;
  set: string;
  collectorNumber: string;
  language: "it";
  layout: string;
  imageStatus: string;
  front: string;
  back?: string;
}

// Validation/provenance stay in the generator checkpoint, outside client bundles.
export type CompactItalianImage = [id: string, front: string, back?: string];
export type ItalianImageMap = Record<string, CompactItalianImage>;
export interface GlobalItalianImageManifest {
  schemaVersion: 2;
  generation: string;
  cards: ItalianImageMap;
}
