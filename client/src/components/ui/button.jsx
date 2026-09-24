const variants = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
  outline:
    "bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50",
  ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
  link: "bg-transparent text-blue-600 hover:underline p-0",
  danger: "bg-red-600 hover:bg-red-700 text-white",
};

const sizes = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-2 text-base",
  icon: "p-2",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  icon,
  iconPosition = "left",
  disabled = false,
  ...props
}) {
  const baseClasses =
    "font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50";
  const variantClasses = variants[variant] || variants.primary;
  const sizeClasses = sizes[size] || sizes.md;
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${disabledClasses} ${className} flex items-center justify-center`}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === "left" && <span className="mr-2">{icon}</span>}
      {children}
      {icon && iconPosition === "right" && <span className="ml-2">{icon}</span>}
    </button>
  );
}
