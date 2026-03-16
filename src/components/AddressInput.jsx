/**
 * AddressInput — address autocomplete using Google Places AutocompleteService.
 * Loads the Maps JS SDK once, restricted to South African addresses (country: za).
 * Falls back to plain text input if the API key is absent or the script fails.
 */
import { useEffect, useRef, useState, useCallback } from 'react';

const GKEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let _scriptPromise = null;
function loadPlaces() {
  if (window.google?.maps?.places) return Promise.resolve();
  if (_scriptPromise) return _scriptPromise;
  _scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GKEY}&libraries=places`;
    s.async = true;
    s.onload  = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _scriptPromise;
}

export default function AddressInput({ value, onChange, onSelect, hasError, placeholder, autoFocus }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const svcRef      = useRef(null);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Load Google Maps script once and initialise AutocompleteService
  useEffect(() => {
    if (!GKEY) return;
    loadPlaces()
      .then(() => { svcRef.current = new window.google.maps.places.AutocompleteService(); })
      .catch(() => { /* no-op — falls back to plain input */ });
  }, []);

  const fetchSuggestions = useCallback((query) => {
    if (!svcRef.current || query.length < 3) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    svcRef.current.getPlacePredictions(
      { input: query, componentRestrictions: { country: 'za' } },
      (predictions, status) => {
        setLoading(false);
        const ok = window.google.maps.places.PlacesServiceStatus.OK;
        if (status !== ok || !predictions?.length) { setSuggestions([]); setOpen(false); return; }
        setSuggestions(predictions.map(p => ({ label: p.description, place_id: p.place_id })));
        setOpen(true);
      }
    );
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 300);
  };

  const handleSelect = (s) => {
    onChange(s.label);
    setSuggestions([]);
    setOpen(false);
    if (onSelect) onSelect(s);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const cls = `w-full px-4 py-3 rounded-card text-sm bg-gray-50 dark:bg-surface-card border transition-colors outline-none
    text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
    ${hasError
      ? 'border-red-400 focus:border-red-500'
      : 'border-gray-200 dark:border-surface-border focus:border-gold dark:focus:border-gold'
    }`;

  return (
    <div ref={containerRef} className="relative">
      <input
        className={cls}
        placeholder={placeholder || 'e.g. 14 Bree Street, Cape Town'}
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoFocus={autoFocus}
        autoComplete="off"
        type="text"
        inputMode="text"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          Searching…
        </span>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 rounded-card border border-gray-200 dark:border-surface-border bg-white dark:bg-surface-card shadow-sheet overflow-hidden max-h-56 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              onMouseDown={() => handleSelect(s)}
              className="px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 cursor-pointer hover:bg-gold/10 active:bg-gold/20 border-b border-gray-100 dark:border-surface-border last:border-0 leading-snug"
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
