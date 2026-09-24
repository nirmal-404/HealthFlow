import * as React from "react";

const Switch = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  return (
    <button
      ref={ref}
      role="switch"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-5 w-10 cursor-pointer items-center rounded-full bg-gray-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 data-[state=checked]:bg-indigo-500 ${className}`}
      {...props}
    >
      <span className="pointer-events-none block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5" />
    </button>
  );
});

Switch.displayName = "Switch";

export { Switch };