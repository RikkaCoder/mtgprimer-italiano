"use client";

import type { ICard } from "@/models";
import { Icon } from "@/components/common";
import { useLocale } from "@/components/provider/LocaleProvider";
import { getCardImages } from "@/lib/card-images";
import { useCardImage } from "@/hooks/useCardImage";
import type { CompactItalianImage } from "@/models/card-images.models";

import styles from "./card-text.module.scss";

export const CardText = ({
  card,
  italianImage,
}: {
  card: ICard;
  italianImage?: CompactItalianImage;
}) => {
  const { locale } = useLocale();
  const images = getCardImages(card, locale, italianImage);
  const image = useCardImage(
    card.isTransformed && images.hasItalianBack ? images.back : images.front,
  );
  return (
    <button
      className={`${styles.cardText} color-${card.color}`}
      title={`${card.number}: ${card.name}`}
    >
      <div>
        <div className="name">
          <Icon type="set" slug={card.code} slugSecondary={card.rarity} />
          {card.name}
        </div>
        <div className="mana">
          {card.cost.map((cost, key) => (
            <Icon
              key={key}
              type="mana"
              slug={cost}
              slugSecondary={cost.length === 2 ? "split" : ""}
            />
          ))}
        </div>
      </div>
      <img
        src={image.url}
        onError={image.onError}
        ref={image.ref}
        alt={`${card.number}: ${card.name}`}
      />
    </button>
  );
};
