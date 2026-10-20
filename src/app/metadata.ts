import {
  DEFAULT_LOCALE,
  localizeTemplate,
  translate,
  type Locale,
} from "@/i18n/translate";

import { ITemplate } from "@/models";

export const createMetadata = (
  template?: ITemplate,
  locale: Locale = DEFAULT_LOCALE,
) => {
  if (!template) {
    return {
      title: translate("Not Found", locale),
    };
  }

  template = localizeTemplate(template, locale);
  return {
    title: template.titleFull,
    description: template.description,
    openGraph: {
      locale: locale === "it" ? "it_IT" : "en_US",
      alternateLocale: [locale === "it" ? "en_US" : "it_IT"],
      title: template.titleFull,
      description: template.description,
      images: [
        {
          url: template.backgroundImage,
          alt: template.backgroundCaption,
          type: "image/jpg",
        },
      ],
    },
    twitter: {
      title: template.titleFull,
      description: template.description,
      images: [template.backgroundImage],
    },
  };
};
