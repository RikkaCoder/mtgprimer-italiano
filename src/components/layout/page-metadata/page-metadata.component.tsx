import { createMetadata } from "@/app/metadata";
import type { Locale } from "@/i18n/translate";
import type { ITemplate } from "@/models";

// React 19 hoists these tags into <head> during SSR and updates them on locale
// changes. A single owner avoids racing Next's streamed metadata on hydration.
export function PageMetadata({
  template,
  locale,
}: {
  template: ITemplate;
  locale: Locale;
}) {
  const metadata = createMetadata(template, locale);
  const graph = metadata.openGraph;
  const twitter = metadata.twitter;
  return (
    <>
      <title>{metadata.title}</title>
      {graph && twitter && (
        <>
          <meta name="description" content={metadata.description} />
          <meta property="og:title" content={graph.title} />
          <meta property="og:description" content={graph.description} />
          <meta property="og:locale" content={graph.locale} />
          <meta
            property="og:locale:alternate"
            content={graph.alternateLocale[0]}
          />
          {graph.images.map((image) => (
            <meta key={image.url} property="og:image" content={image.url} />
          ))}
          {graph.images.map((image) => (
            <meta key={image.url} property="og:image:alt" content={image.alt} />
          ))}
          {graph.images.map((image) => (
            <meta
              key={image.url}
              property="og:image:type"
              content={image.type}
            />
          ))}
          <meta name="twitter:title" content={twitter.title} />
          <meta name="twitter:description" content={twitter.description} />
          {twitter.images.map((url) => (
            <meta key={url} name="twitter:image" content={url} />
          ))}
        </>
      )}
    </>
  );
}
