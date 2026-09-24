import { createContext, useContext, useState } from "react";

// Create the context
const HoverPanelContext = createContext(null);

// Provider component
export function HoverPanelProvider({ children }) {
  const [state, setState] = useState({
    isOpen: false,
    title: "",
    content: null,
    shouldReset: false,
  });

  const openPanel = (title, content) => {
    setState({
      isOpen: true,
      title,
      content,
      shouldReset: false,
    });
  };

  const closePanel = (reset = false) => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
      shouldReset: reset,
    }));

    // Clear content after animation completes if reset is true
    if (reset) {
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          content: null,
        }));
      }, 500); // Match the new transition duration
    }
  };

  return (
    <HoverPanelContext.Provider
      value={{
        ...state,
        openPanel,
        closePanel,
      }}
    >
      {children}
    </HoverPanelContext.Provider>
  );
}

// Hook for components to use the panel
export const useHoverPanel = () => {
  const context = useContext(HoverPanelContext);
  if (!context) {
    throw new Error("useHoverPanel must be used within a HoverPanelProvider");
  }
  return context;
};
