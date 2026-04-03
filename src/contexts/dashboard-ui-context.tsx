"use client";

import React from "react";

type DashboardUIState = {
  isMobile: boolean;
  desktopSidebarVisible: boolean;
  mobileSidebarVisible: boolean;
  isFilterVisible: boolean;
};

type DashboardUIContextValue = {
  isMobile: boolean;
  isSidebarVisible: boolean;
  isFilterVisible: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  toggleFilters: () => void;
};

const SIDEBAR_STORAGE_KEY = "medgrupo.dashboard.sidebar";
const FILTER_STORAGE_KEY = "medgrupo.dashboard.filters";

let globalState: DashboardUIState = {
  isMobile: false,
  desktopSidebarVisible: true,
  mobileSidebarVisible: false,
  isFilterVisible: true,
};

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function setGlobalState(
  updater: DashboardUIState | ((current: DashboardUIState) => DashboardUIState)
) {
  globalState =
    typeof updater === "function"
      ? (updater as (current: DashboardUIState) => DashboardUIState)(globalState)
      : updater;

  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return globalState;
}

function getUiValue(): DashboardUIContextValue {
  return {
    isMobile: globalState.isMobile,
    isSidebarVisible: globalState.isMobile
      ? globalState.mobileSidebarVisible
      : globalState.desktopSidebarVisible,
    isFilterVisible: globalState.isFilterVisible,
    toggleSidebar() {
      if (globalState.isMobile) {
        setGlobalState((current) => ({
          ...current,
          mobileSidebarVisible: !current.mobileSidebarVisible,
        }));
        return;
      }

      setGlobalState((current) => ({
        ...current,
        desktopSidebarVisible: !current.desktopSidebarVisible,
      }));
    },
    closeSidebar() {
      setGlobalState((current) => ({
        ...current,
        mobileSidebarVisible: false,
      }));
    },
    toggleFilters() {
      setGlobalState((current) => ({
        ...current,
        isFilterVisible: !current.isFilterVisible,
      }));
    },
  };
}

type DashboardUIProviderProps = {
  children: any;
};

export function DashboardUIProvider({ children }: DashboardUIProviderProps) {
  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedSidebarState = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    const savedFilterState = window.localStorage.getItem(FILTER_STORAGE_KEY);

    setGlobalState((current) => ({
      ...current,
      desktopSidebarVisible:
        savedSidebarState !== null ? savedSidebarState === "1" : current.desktopSidebarVisible,
      isFilterVisible:
        savedFilterState !== null ? savedFilterState === "1" : current.isFilterVisible,
    }));

    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    const syncViewport = () => {
      const mobile = mediaQuery.matches;

      setGlobalState((current) => ({
        ...current,
        isMobile: mobile,
        mobileSidebarVisible: mobile ? current.mobileSidebarVisible : false,
      }));
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

  React.useEffect(() => {
    const unsubscribe = subscribe(() => {
      if (typeof window === "undefined") {
        return;
      }

      const state = getSnapshot();

      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        state.desktopSidebarVisible ? "1" : "0"
      );
      window.localStorage.setItem(
        FILTER_STORAGE_KEY,
        state.isFilterVisible ? "1" : "0"
      );
    });

    return unsubscribe;
  }, []);

  return children;
}

export function useDashboardUI(): DashboardUIContextValue {
  const [, forceUpdate] = React.useState(0);

  React.useEffect(() => {
    return subscribe(() => {
      forceUpdate((value: number) => value + 1);
    });
  }, []);

  return getUiValue();
}