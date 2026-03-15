/**
 * AddressInput — progressive enhancement component.
 *
 * If VITE_GOOGLE_PLACES_KEY is set in the environment, this component loads
 * the Google Places Autocomplete widget and restricts suggestions to South
 * African addresses (componentRestrictions: { country: 'za' }).
 *
 * When the key is absent (offline, not configured) it renders a plain <input>
 * — the manual fallback — so the form always works.
 */
import { useEffect, useRef, useState } from 'react';

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_PLACES_KEY;

export default function AddressInput({ value, onChange, onSelect, hasError, placeholder, autoFocus }) {
  const inputRef  = useRef(null);
  const acRef     = useRef(null);
  const [ready, setReady] = useState(false);

  // Load Google Places Autocomplete script once, only if key is configured
  useEffect(() => {
    if (!GOOGLE_KEY) return;
    if (window.google?.maps?.places) { initAC(); return; }

    const existing = document.querySelector('script[data-pl-places]');
    if (existing) { existing.addEventListener('load', initAC); return; }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.plPlaces = '1';
    script.addEventListener('load', initAC);
    document.head.appendChild(script);

    return () => script.removeEventListener('load', initAC);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function initAC() {
    if (!inputRef.current || acRef.current) return;
    try {
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'za' },
        fields: ['formatted_address', 'geometry', 'place_id'],
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        const addr  = place.formatted_address || place.name || '';
        onChange(addr);
        if (onSelect) onSelect(place);
      });
      acRef.current = ac;
      setReady(true);
    } catch {
      // silently ignore — falls back to plain input
    }
  }

  const cls = `w-full px-4 py-3 rounded-card text-sm bg-gray-50 dark:bg-surface-card border transition-colors outline-none
    text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
    ${hasError
      ? 'border-red-400 focus:border-red-500'
      : 'border-gray-200 dark:border-surface-border focus:border-gold dark:focus:border-gold'
    }`;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className={cls}
        placeholder={placeholder || 'e.g. 14 Bree Street, Cape Town'}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoFocus={autoFocus}
        autoComplete={GOOGLE_KEY ? 'off' : 'street-address'}
        type="text"
        inputMode="text"
      />
      {GOOGLE_KEY && !ready && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          Loading…
        </span>
      )}
    </div>
  );
}
