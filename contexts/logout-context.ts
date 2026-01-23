"use client";

import * as React from "react";

// State interface
interface LogoutState {
  isLoggingOut: boolean;
}

// Action types
const actionTypes = {
  SHOW_LOGOUT: "SHOW_LOGOUT",
  HIDE_LOGOUT: "HIDE_LOGOUT",
} as const;

type Action =
  | { type: typeof actionTypes.SHOW_LOGOUT }
  | { type: typeof actionTypes.HIDE_LOGOUT };

// Reducer
const reducer = (state: LogoutState, action: Action): LogoutState => {
  switch (action.type) {
    case "SHOW_LOGOUT":
      return { isLoggingOut: true };
    case "HIDE_LOGOUT":
      return { isLoggingOut: false };
  }
};

// Module-level state (following use-toast.ts pattern)
const listeners: Array<(state: LogoutState) => void> = [];
let memoryState: LogoutState = { isLoggingOut: false };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

// Public API functions
export function showLogoutOverlay() {
  dispatch({ type: "SHOW_LOGOUT" });
}

export function hideLogoutOverlay() {
  dispatch({ type: "HIDE_LOGOUT" });
}

// Hook for components to subscribe to state changes
export function useLogout() {
  const [state, setState] = React.useState<LogoutState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    isLoggingOut: state.isLoggingOut,
    showLogoutOverlay,
    hideLogoutOverlay,
  };
}
