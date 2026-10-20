"use client";

import { useLocale } from "@/components/provider/LocaleProvider";
import styles from "./language-switch.module.scss";

export function LanguageSwitch() {
  const { locale, setLocale } = useLocale();
  return (
    <div
      className={styles.languages}
      role="group"
      aria-label={locale === "it" ? "Lingua" : "Language"}
    >
      <button
        type="button"
        lang="it"
        aria-pressed={locale === "it"}
        onClick={() => setLocale("it")}
      >
        Italiano
      </button>
      <span aria-hidden="true"> / </span>
      <button
        type="button"
        lang="en"
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
      >
        English
      </button>
    </div>
  );
}
