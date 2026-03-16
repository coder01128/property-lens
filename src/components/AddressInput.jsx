/**
 * AddressInput — Google Places Autocomplete widget attached to the input element.
 * Google manages the suggestions dropdown natively (pac-container).
 * Falls back to plain text input if the API key is absent or script fails.
 */
import { useEffect, useRef } from 'react';

const GKEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let _scriptPromise = null;
function loadPlaces() {
  if (window.google?.maps?.places) return Promise.resolve();
  if (_scriptPromise) return _scriptPromise;
  _scriptPromise = new Promise((resolve, reject) => {
    window.__gmapsInit = resolve;
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GKEY}&libraries=places&callback=__gmapsInit`;
    s.async = true;
    s.onerror = () => { _scriptPromise = null; reject(); };
    document.head.appendChild(s);
  });
  return _scriptPromise;
}

export default function AddressInput({ value, onChange, onSelect, hasError, placeholder, autoFocus }) {
  const inputRef = useRef(null);
  const acRef    = useRef(null);

  useEffect(() => {
    if (!GKEY || !inputRef.current) return;
    loadPlaces()
      .then(() => {
        if (acRef.current) return; // already attached
        const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'za' },
          fields: ['formatted_address', 'name'],
        });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          const addr  = place.formatted_address || place.name || inputRef.current.value;
          onChange(addr);
          if (onSelect) onSelect({ label: addr });
        });
        acRef.current = ac;
      })
      .catch(() => { /* no-op — plain input fallback */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cls = [
    'w-full px-4 py-3 rounded-card text-sm bg-gray-50 dark:bg-surface-card border transition-colors outline-none',
    'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
    hasError
      ? 'border-red-400 focus:border-red-500'
      : 'border-gray-200 dark:border-surface-border focus:border-gold dark:focus:border-gold',
  ].join(' ');

  return (
    <input
      ref={inputRef}
      className={cls}
      placeholder={placeholder || 'e.g. 14 Bree Street, Cape Town'}
      defaultValue={value}
      onChange={e => onChange(e.target.value)}
      autoFocus={autoFocus}
      autoComplete="off"
      type="text"
      inputMode="text"
    />
  );
}
