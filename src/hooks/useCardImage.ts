"use client";

import { useCallback, useState } from "react";
import type { CardImageSource } from "@/lib/card-images";

// The img load event also switches the CSS background to the original URL.
// Remember failures for this mounted card without retry loops on language changes.
export function useCardImage(source: CardImageSource) {
  const [failed, setFailed] = useState<string>();
  const onError = useCallback(() => {
    if (source.src !== source.fallback) setFailed(source.src);
  }, [source.src, source.fallback]);
  const ref = useCallback(
    (image: HTMLImageElement | null) => {
      // A server-rendered image can fail before React attaches its event handlers.
      if (
        image?.complete &&
        image.naturalWidth === 0 &&
        image.src === source.src
      )
        onError();
    },
    [source.src, onError],
  );
  return {
    url: failed === source.src ? source.fallback : source.src,
    onError,
    ref,
  };
}
