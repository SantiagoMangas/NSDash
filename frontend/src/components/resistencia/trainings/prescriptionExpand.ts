"use client";

import { useEffect, useState } from "react";

export const PRESCRIPTION_DESKTOP_MIN_WIDTH = 1024;

export function useIsDesktopPrescriptionLayout() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(min-width: ${PRESCRIPTION_DESKTOP_MIN_WIDTH}px)`).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${PRESCRIPTION_DESKTOP_MIN_WIDTH}px)`);
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

export type PrescriptionExpandControl = {
  isDesktop: boolean;
  isExpanded: (cardId: string) => boolean;
  onActivate: (cardId: string) => void;
};