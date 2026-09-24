export default function Input({
  label,
  id,
  error,
  helperText,
  icon,
  className = "",
  containerClassName = "",
  ...props
}) {
  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          className={`w-full rounded-md border ${
            error ? "border-red-500" : "border-gray-300"
          } shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
            icon ? "pl-10" : "px-3"
          } py-2 ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
