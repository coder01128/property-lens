/**
 * AddressInput — address autocomplete using OpenStreetMap Nominatim.
 * Free, no API key required, restricted to South African addresses.
 * Falls back gracefully to plain input on network failure.
 */
import { useEffect, useRef, useState, useCallback } from 'react';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

export default function AddressInput({ value, onChange, onSelect, hasError, placeholder, autoFocus }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  const fetchSuggestions = useCallback(async (query) => {
    if (query.length < 4) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q:            query,
        countrycodes: 'za',
        format:       'json',
        limit:        '6',
        addressdetails: '1',
      });
      const res  = await fetch(`${NOMINATIM}?${params}`, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'PropertyLens/1.0' },
      });
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(data.map(r => ({
        label:    r.display_name,
        lat:      parseFloat(r.lat),
        lng:      parseFloat(r.lon),
        place_id: r.place_id,
      })));
      setOpen(data.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 350);
  };

  const handleSelect = (s) => {
    onChange(s.label);
    setSuggestions([]);
    setOpen(false);
    if (onSelect) onSelect(s);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
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
