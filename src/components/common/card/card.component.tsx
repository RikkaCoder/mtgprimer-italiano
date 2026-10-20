"use client";

import { useMemo, useState } from "react";

import type { ICard } from "@/models";
import { Icon } from "@/components/common";

import { useLocale } from "@/components/provider/LocaleProvider";
import { getCardImages } from "@/lib/card-images";
import { useCardImage } from "@/hooks/useCardImage";
import type { CompactItalianImage } from "@/models/card-images.models";

import styles from "./card.module.scss";

export const Card = (props: {
  card: ICard;
  stack: boolean;
  italianImage?: CompactItalianImage;
}) => {
  const { t, locale } = useLocale();
  const [isTransformed, setIsTransformed] = useState(props.card.isTransformed);

  const images = getCardImages(props.card, locale, props.italianImage);
  const front = useCardImage(images.front);
  const back = useCardImage(images.back);

  const isTransformable = useMemo(
    () =>
      ["transform", "modal_dfc"].findIndex(
        (layout) => layout === props.card.layout,
      ) > -1,
    [props.card.layout],
  );

  return (
    <div className={`${styles.card}${props.stack ? " isStack" : ""}`}>
      <p>{props.card.name}</p>
      <div>
        <div
          style={{
            backgroundImage: `url('${front.url}')`,
          }}
        >
          <img src={front.url} alt="" onError={front.onError} ref={front.ref} />
        </div>
        {isTransformable && (
          <div
            className={`transformFace${isTransformed ? " isTransformed" : ""}`}
            style={{
              backgroundImage: `url('${back.url}')`,
            }}
          >
            <img src={back.url} alt="" onError={back.onError} ref={back.ref} />
          </div>
        )}
        <button
          className="expandButton"
          title={`${props.card.number}: ${props.card.name}`}
        >
          <span className="screen-reader-text">{t("Expand")}</span>
        </button>
        {isTransformable && (
          <button
            className={`transformButton`}
            title={t("Transform Card")}
            onClick={() => setIsTransformed(!isTransformed)}
          >
            <span className={`icon${isTransformed ? " isTransformed" : ""}`}>
              <span>
                <Icon slug="fas fa-sync-alt" />
              </span>
            </span>
            <span className="screen-reader-text">{t("Transform Card")}</span>
          </button>
        )}
      </div>
    </div>
  );
};
