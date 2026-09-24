"use client";

import { createContext, useContext } from "react";
import type { Athlete } from "@/lib/types";

const AthleteDetailContext = createContext<Athlete | null>(null);

export function AthleteDetailProvider({
  athlete,
  children,
}: {
  athlete: Athlete;
  children: React.ReactNode;
}) {
  return (
    <AthleteDetailContext.Provider value={athlete}>{children}</AthleteDetailContext.Provider>
  );
}

export function useAthleteDetail(): Athlete | null {
  return useContext(AthleteDetailContext);
}
