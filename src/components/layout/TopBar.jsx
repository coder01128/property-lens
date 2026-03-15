import { useNavigate } from 'react-router-dom';

export default function TopBar({ title, subtitle, back, actions }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-surface/90 backdrop-blur border-b border-gray-200 dark:border-surface-border px-4 py-3">
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        {back && (
          <button
            onClick={() => typeof back === 'function' ? back() : navigate(-1)}
            className="p-1 -ml-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900 dark:text-white truncate">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
