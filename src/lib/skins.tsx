import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export const SKINS = [
  { id: "classic", name: "Classic Blue" },
  { id: "emerald", name: "Emerald" },
  { id: "midnight", name: "Midnight" },
  { id: "indigo", name: "Royal Indigo" },
] as const;

export type SkinId = (typeof SKINS)[number]["id"];

const STORAGE_KEY = "velora.skin";

type SkinContextValue = {
  skin: SkinId;
  setSkin: (skin: SkinId) => void;
};

const SkinContext = createContext<SkinContextValue>({
  skin: "classic",
  setSkin: () => {},
});

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skin, setSkinState] = useState<SkinId>("classic");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as SkinId | null;
    if (stored && SKINS.some((s) => s.id === stored)) setSkinState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.skin = skin;
  }, [skin]);

  const setSkin = useCallback((next: SkinId) => {
    setSkinState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return <SkinContext.Provider value={{ skin, setSkin }}>{children}</SkinContext.Provider>;
}

export function useSkin() {
  return useContext(SkinContext);
}
