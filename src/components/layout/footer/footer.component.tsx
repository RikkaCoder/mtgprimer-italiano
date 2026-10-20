"use client";

import { useLocale } from "@/components/provider/LocaleProvider";
import { Logo } from "@/components/common";

import styles from "./footer.module.scss";

export const Footer = () => {
  const { t } = useLocale();
  return (
    <footer className={styles.footer}>
      <div className="logoWrap">
        <Logo />
      </div>
      <p>
        {t("MTG Primer was created by")}{" "}
        <a href="https://garrett-gardner.com/" target="_blank">
          {t("Garrett Gardner")}
        </a>
        {t(". This website is possible thanks to")}{" "}
        <a href="https://scryfall.com/" target="_blank">
          {t("Scryfall")}
        </a>
        {t(",")}{" "}
        <a href="https://17lands.com" target="_blank">
          {t("17Lands.com")}
        </a>{" "}
        {t("(under")}{" "}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank">
          {t("Creative Commons Attribution 4.0 Interational License")}
        </a>
        {t(") and Andrew Gioia’s")}{" "}
        <a href="https://github.com/andrewgioia/Keyrune" target="_blank">
          {t("Keyrune")}
        </a>{" "}
        {t("and")}{" "}
        <a href="https://github.com/andrewgioia/mana" target="_blank">
          {t("Mana")}
        </a>
        {t(".")}
      </p>
      <p>
        {t("Found an error or have some feedback? Email")}{" "}
        <a href="mailto:mtgprimer@gmail.com" title="Email" target="_blank">
          {t("mtgprimer@gmail.com")}
        </a>{" "}
        {t("anytime! Or, better yet, become a contributor")}{" "}
        <a href="https://github.com/GarrettGardner/mtgprimer" target="_blank">
          {t("on GitHub!")}
        </a>
      </p>
      <p>
        {t(
          "MTG Primer is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.",
        )}
      </p>
    </footer>
  );
};
