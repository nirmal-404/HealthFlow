export default function Tabs({ tabs, activeTab, onChange, className = "" }) {
  return (
    <div className={`flex border-b border-gray-200 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id || tab}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === (tab.id || tab)
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
          onClick={() => onChange(tab.id || tab)}
        >
          {tab.label || tab}
        </button>
      ))}
    </div>
  );
}
