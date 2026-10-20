"use client";

import Link from "next/link";

import { Button, Logo } from "@/components/common";

import { useLocale } from "@/components/provider/LocaleProvider";

import styles from "./not-found.module.scss";

export const TemplateNotFound = () => {
  const { t } = useLocale();
  return (
    <section className={styles.notFound}>
      <Link href="/">
        <div className="logo">
          <Logo />
        </div>
      </Link>
      <h2>{t("Not Found")}</h2>
      <h3>{t("That page could not be found.")}</h3>
      <p>
        <Button href="/" size="lg" icon="fas fa-house">
          {t("Go to home page")}
        </Button>
      </p>
    </section>
  );
};
