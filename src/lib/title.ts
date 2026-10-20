export const SITE_NAME = "MTG Primer";
export const SITE_TAGLINE = "Strategy Guides for Limited Magic: The Gathering";

// Format names are opaque proper names: punctuation is never used as a delimiter.
export function createPageTitle({
  title,
  formatName,
  tagline = SITE_TAGLINE,
}: {
  title: string;
  formatName?: string;
  tagline?: string;
}): string {
  const pageTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} | ${tagline}`;
  return formatName ? `${formatName}: ${pageTitle}` : pageTitle;
}
