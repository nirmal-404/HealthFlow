export default function Avatar({
  src,
  alt,
  size = "md",
  initials,
  className = "",
}) {
  const sizes = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
    xl: "w-16 h-16 text-xl",
  };

  const sizeClass = sizes[size] || sizes.md;

  if (src) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden ${className}`}>
        <img
          src={src || "/placeholder.svg"}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // If no image, show initials
  return (
    <div
      className={`${sizeClass} rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-medium ${className}`}
    >
      {initials}
    </div>
  );
}
