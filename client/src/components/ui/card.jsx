export default function Card({
  children,
  title,
  className = "",
  headerAction,
  footer,
}) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
    >
      {title && (
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium">{title}</h3>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t border-gray-200">{footer}</div>
      )}
    </div>
  );
}
