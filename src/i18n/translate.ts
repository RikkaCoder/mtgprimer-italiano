import italian from "./it.json";
import type { ITemplate } from "@/models";
import { createPageTitle, SITE_TAGLINE } from "@/lib/title";

export type Locale = "it" | "en";
export const DEFAULT_LOCALE: Locale = "it";
export const LOCALE_STORAGE_KEY = "MTG_PRIMER_LOCALE";

const dictionary: Record<string, string> = italian;

// These terms compose the legacy guide/category labels. Never apply them to cards.
const terms: Record<string, string> = {
  "d20 Dice": "Dadi d20",
  Dragons: "Draghi",
  Dungeon: "Dungeon",
  Equipment: "Equipaggiamenti",
  Lifegain: "Guadagno di punti vita",
  "Life Gain": "Guadagno di punti vita",
  Treasures: "Tesori",
  Treasure: "Tesoro",
  Defender: "Difensore",
  Domain: "Dominio",
  Enlist: "Arruolare",
  Elemental: "Elementale",
  Elf: "Elfo",
  Faerie: "Spiritello",
  Giant: "Gigante",
  Goblin: "Goblin",
  Kithkin: "Kithkin",
  Merfolk: "Tritone",
  Treefolk: "Silvantropo",
  Companion: "Compagno",
  Cycling: "Ciclo",
  Mutate: "Mutazione",
  Boast: "Vanto",
  Changeling: "Cangiante",
  Elves: "Elfi",
  Giants: "Giganti",
  "Modal Double-Faced Cards": "Carte bifronte modali",
  "Second Spell": "Seconda magia",
  Snow: "Neve",
  Energy: "Energia",
  "Fabricate/Servos": "Fabbricare/Servomeccanismi",
  Fabricate: "Fabbricare",
  Servo: "Servomeccanismo",
  Improvise: "Improvvisare",
  Revolt: "Rivolta",
  Vehicles: "Veicoli",
  Vehicle: "Veicoli",
  "4+ Power": "Forza 4 o superiore",
  "Card Draw": "Pescata di carte",
  "+1/+1 Counters": "Segnalini +1/+1",
  "+1/+1 Counter": "Segnalini +1/+1",
  "Non-Combat Damage": "Danni non da combattimento",
  Sacrifice: "Sacrificio",
  Spells: "Magie",
  Spell: "Magie",
  Coven: "Congrega",
  "Day/Night": "Giorno/Notte",
  "Decayed/Zombies": "Decomposto/Zombie",
  "Double Faced Cards": "Carte bifronte",
  Disturb: "Disturbare",
  Flashback: "Flashback",
  Vampires: "Vampiri",
  Vampire: "Vampiri",
  "Wolves/Werewolves": "Lupi/Mannari",
  Werewolf: "Mannari",
  "Artifact/Enchantment Creatures": "Creature artefatto/incantesimo",
  "Artifact/Enchantment Payoff": "Ricompense per artefatti/incantesimi",
  Channel: "Incanalare",
  Modified: "Modificato",
  Ninjutsu: "Ninjutsu",
  Reconfigure: "Riconfigurare",
  "Double Faced Sagas": "Saghe bifronte",
  "Samurai/Warrior": "Samurai/Guerrieri",
  Shrines: "Santuari",
  Blitz: "Blitz",
  Casualty: "Vittima",
  Connive: "Complottare",
  Hideaway: "Nascondiglio",
  "Shield Counter": "Segnalino scudo",
  "8+ Lands": "8 o più terre",
  Graveyard: "Cimitero",
  "Learn/Lesson": "Apprendere/Lezione",
  Learn: "Apprendere",
  Lesson: "Lezione",
  "Lifegain Payoffs": "Ricompense per il guadagno di punti vita",
  Magecraft: "Artemagica",
  "Mascot Tokens/Tribal": "Pedine mascotte/Sinergie di tipo",
  Ward: "Egida",
  "Blood Tokens": "Pedine Sangue",
  Exploit: "Sfruttare",
  "Human Tribal": "Sinergie Umano",
  Humans: "Umani",
  Human: "Umani",
  Toughness: "Costituzione",
  Training: "Addestramento",
  "Vampire Tribal": "Sinergie Vampiro",
  "Zombie Tribal": "Sinergie Zombie",
  Zombies: "Zombie",
  Zombie: "Zombie",
  Clerics: "Chierici",
  Cleric: "Chierici",
  Kicker: "Potenziamento",
  Landfall: "Terraferma",
  "Mill (8 Cards)": "Macinare (8 carte)",
  Mill: "Macinare",
  Party: "Compagnia",
  Rogues: "Farabutti",
  Rogue: "Farabutti",
  Warriors: "Guerrieri",
  Warrior: "Guerrieri",
  Wizards: "Maghi",
  Wizard: "Maghi",
  Foretell: "Predire",
};

export function translate(text: string, locale: Locale): string {
  if (locale === "en" || !text) return text;
  if (Object.hasOwn(dictionary, text)) return dictionary[text];
  if (Object.hasOwn(terms, text)) return terms[text];
  for (const [prefix, localized] of [
    ["Mechanic: ", "Meccanica: "],
    ["Theme: ", "Tema: "],
    ["Kindred: ", "Affine: "],
  ] as const) {
    if (text.startsWith(prefix))
      return localized + translate(text.slice(prefix.length), locale);
  }
  for (const [suffix, before, after] of [
    [" Payoffs", "Ricompense per: ", ""],
    [" Payoff", "Ricompensa per: ", ""],
    [" Enablers", "Supporto per: ", ""],
    [" Hate Cards", "Carte di contrasto a: ", ""],
  ]) {
    if (text.endsWith(suffix))
      return before + translate(text.slice(0, -suffix.length), locale) + after;
  }
  if (text.startsWith("All ")) {
    const term = text.slice(4).replace(/ Cards$/, "");
    return "Tutte le carte: " + translate(term, locale);
  }
  if (text.endsWith(" Cards") && Object.hasOwn(terms, text.slice(0, -6))) {
    return "Carte: " + translate(text.slice(0, -6), locale);
  }
  if (text.startsWith("Illustrated by "))
    return "Illustrazione di " + text.slice(15);
  // Descriptions have already had the format's proper name interpolated upstream.
  for (const [source, target] of Object.entries(dictionary)) {
    if (!source.includes("%formatName")) continue;
    const [start, end] = source.split("%formatName");
    if (text.startsWith(start) && text.endsWith(end)) {
      return target.replace(
        "%formatName",
        text.slice(start.length, end ? -end.length : undefined),
      );
    }
  }
  return text; // Proper names and future content retain the original English.
}

export function formatReleaseDate(value: string, locale: Locale): string {
  if (locale === "en") return value;
  const normalized = value.replace(/(\d)(st|nd|rd|th)\b/g, "$1");
  // Source dates are calendar days, not local instants. Parse at UTC midnight.
  const date = new Date(`${normalized} UTC`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

// Only presentation fields are visited. Cards, identifiers, paths, sets and defaults
// retain their original values and object references.
export function localizeTemplate<T extends ITemplate>(
  template: T,
  locale: Locale,
): T {
  if (locale === "en") return template;
  const visit = (value: unknown, field = ""): unknown => {
    if (typeof value === "string") {
      if (field === "releaseDate") return formatReleaseDate(value, locale);
      if (
        ["title", "name", "description", "backgroundCaption", "tags"].includes(
          field,
        )
      )
        return translate(value, locale);
      return value;
    }
    if (Array.isArray(value)) return value.map((item) => visit(item, field));
    if (value && typeof value === "object") {
      const localized = Object.fromEntries(
        Object.entries(value).map(([key, item]) => {
          if (["cards", "sets", "defaultSelections"].includes(key))
            return [key, item];
          if (
            [
              "categories",
              "colors",
              "rarities",
              "groupings",
              "orderings",
              "views",
            ].includes(key) &&
            item &&
            typeof item === "object" &&
            !Array.isArray(item)
          ) {
            return [
              key,
              Object.fromEntries(
                Object.entries(item).map(([id, label]) => [
                  id,
                  translate(label as string, locale),
                ]),
              ),
            ];
          }
          return [key, visit(item, key)];
        }),
      );
      // Recompose templates (including nested ones) from their structured fields.
      // Menu entries have no titleFull and retain their existing presentation.
      if ("titleFull" in value && typeof localized.title === "string") {
        localized.titleFull = createPageTitle({
          title: localized.title,
          formatName:
            "formatName" in value && typeof value.formatName === "string"
              ? value.formatName
              : undefined,
          tagline: translate(SITE_TAGLINE, locale),
        });
      }
      return localized;
    }
    return value;
  };
  return visit(template) as T;
}
