import { useState, useRef, useEffect } from "react";

export function DropdownMenuTrigger({ children, asChild }) {
  return asChild ? children : <button>{children}</button>;
}

export function DropdownMenuItem({ children, onClick }) {
  return (
    <button
      className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({ children, align = "start" }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-md shadow-lg py-1 ${align === "end" ? "right-0" : "left-0"}`}>
      {children}
    </div>
  );
}

export default function DropdownMenu({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {children.map((child) => {
        if (child.type === DropdownMenuTrigger) {
          return (
            <div key="trigger" onClick={() => setIsOpen(!isOpen)}>
              {child}
            </div>
          );
        }
        if (child.type === DropdownMenuContent && isOpen) {
          return (
            <div key="content" className="absolute mt-1 min-w-[8rem] z-50">
              {child}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}