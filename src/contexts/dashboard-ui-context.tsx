"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

type DashboardUIContextValue = {
  isMobile: boolean;
  isSidebarVisible: boolean;
  isFilterVisible: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  toggleFilters: () => void;
};

const DashboardUIContext = createContext<DashboardUIContextValue | undefined>(undefined);

const SIDEBAR_STORAGE_KEY = "medgrupo.dashboard.sidebar";
const FILTER_STORAGE_KEY = "medgrupo.dashboard.filters";

export function DashboardUIProvider({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(true);
  const [mobileSidebarVisible, setMobileSidebarVisible] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedSidebarState = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    const savedFilterState = window.localStorage.getItem(FILTER_STORAGE_KEY);

    if (savedSidebarState !== null) {
      setDesktopSidebarVisible(savedSidebarState === "1");
    }

    if (savedFilterState !== null) {
      setIsFilterVisible(savedFilterState === "1");
    }

    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    const syncViewport = () => {
      const mobile = mediaQuery.matches;
      setIsMobile(mobile);

      if (!mobile) {
        setMobileSidebarVisible(false);
      }
    };

    syncViewport();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);

      return () => {
        mediaQuery.removeEventListener("change", syncViewport);
      };
    }

    mediaQuery.addListener(syncViewport);

    return () => {
      mediaQuery.removeListener(syncViewport);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      desktopSidebarVisible ? "1" : "0"
    );
  }, [desktopSidebarVisible]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(FILTER_STORAGE_KEY, isFilterVisible ? "1" : "0");
  }, [isFilterVisible]);

  const value = useMemo<DashboardUIContextValue>(
    () => ({
      isMobile,
      isSidebarVisible: isMobile ? mobileSidebarVisible : desktopSidebarVisible,
      isFilterVisible,
      toggleSidebar() {
        if (isMobile) {
          setMobileSidebarVisible((current) => !current);
          return;
        }

        setDesktopSidebarVisible((current) => !current);
      },
      closeSidebar() {
        setMobileSidebarVisible(false);
      },
      toggleFilters() {
        setIsFilterVisible((current) => !current);
      }
    }),
    [desktopSidebarVisible, isFilterVisible, isMobile, mobileSidebarVisible]
  );

  return (
    <DashboardUIContext.Provider value={value}>
      {children}
    </DashboardUIContext.Provider>
  );
}

export function useDashboardUI() {
  const context = useContext(DashboardUIContext);

  if (!context) {
    throw new Error("useDashboardUI must be used inside DashboardUIProvider.");
  }

  return context;
}
