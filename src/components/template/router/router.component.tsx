"use client";

import { useLocale } from "@/components/provider/LocaleProvider";
import { localizeTemplate } from "@/i18n/translate";
import { LanguageSwitch } from "@/components/common/language-switch/language-switch.component";
import { PageMetadata } from "@/components/layout/page-metadata/page-metadata.component";

import type { TTemplate } from "@/models";
import { Background, Footer, Header, Mask, Menu } from "@/components/layout";
import {
  TemplateDirectory,
  TemplateGuideGroup,
  TemplateGuide,
  TemplateHome,
  TemplateInfo,
  TemplateNotFound,
} from "@/components/template";

import styles from "./router.module.scss";
import { useMemo } from "react";

export const TemplateRouter = ({
  template: original,
}: {
  template: TTemplate;
}) => {
  const { locale } = useLocale();
  const localized = useMemo(
    () => localizeTemplate(original, locale),
    [original, locale],
  );
  const props = { template: localized };
  const hasMenu = "menu" in props.template;
  const template = useMemo(() => {
    let template = <TemplateNotFound />;
    switch (props.template.type) {
      case "home":
        template = <TemplateHome template={props.template} />;
        break;
      case "directory":
        template = <TemplateDirectory template={props.template} />;
        break;
      case "guide-group":
        template = <TemplateGuideGroup template={props.template} />;
        break;
      case "guide":
        template = <TemplateGuide template={props.template} />;
        break;
      case "info":
        template = <TemplateInfo template={props.template} />;
        break;
    }
    return template;
  }, [props.template]);

  return (
    <div className={styles.site}>
      <PageMetadata template={original} locale={locale} />
      {"menu" in props.template && (
        <>
          <Header />
          <Menu template={props.template} />
        </>
      )}
      <div className="content">
        <Background
          backgroundCaption={props.template.backgroundCaption}
          backgroundImage={props.template.backgroundImage}
          fullWidth={!hasMenu}
        />
        <LanguageSwitch />
        <main role="contentinfo">{template}</main>
        <Footer />
        <Mask />
      </div>
    </div>
  );
};
