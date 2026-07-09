import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationPickerProps {
  onChange: (data: { formatted: string; lat: number; lng: number; components: Record<string, string> }) => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

const pinIcon = L.divIcon({
  className: 'custom-pin-icon',
  html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="12" cy="9" r="3" fill="#ffffff"/>
  </svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const LocationPicker: React.FC<LocationPickerProps> = ({ onChange }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [ready, setReady] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const defaultPos: [number, number] = [23.0225, 72.5714]; // fallback: Ahmedabad

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false
    }).setView(defaultPos, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(defaultPos, {
      icon: pinIcon,
      draggable: true
    }).addTo(map);

    mapInstance.current = map;
    markerInstance.current = marker;
    setReady(true);

    const emit = (lat: number, lng: number, formatted = '', components: any = {}) => {
      onChange({ formatted, lat, lng, components });
    };

    // Geocode helper
    const reverseGeocode = async (lat: number, lng: number) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
        if (res.ok) {
          const data = await res.json();
          const addr = data.display_name || '';
          const address = data.address || {};
          const comps = {
            city: address.city || address.town || address.village || address.suburb || '',
            state: address.state || '',
            country: address.country || '',
            zipCode: address.postcode || '',
          };
          emit(lat, lng, addr, comps);
        } else {
          emit(lat, lng, `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, {});
        }
      } catch (err) {
        console.error('Reverse geocoding error:', err);
        emit(lat, lng, `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, {});
      }
    };

    // Marker drag end event
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      reverseGeocode(position.lat, position.lng);
    });

    // Clean up
    return () => {
      map.remove();
      mapInstance.current = null;
      markerInstance.current = null;
    };
  }, [onChange]);

  // Handle Search Input Change with simple timeout debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (mapInstance.current && markerInstance.current) {
      mapInstance.current.setView([lat, lng], 14);
      markerInstance.current.setLatLng([lat, lng]);
    }
    const address = result.address || {};
    const comps = {
      city: address.city || address.town || address.village || address.suburb || '',
      state: address.state || '',
      country: address.country || '',
      zipCode: address.postcode || '',
    };
    onChange({ formatted: result.display_name, lat, lng, components: comps });
    setSearchQuery(result.display_name);
    setShowDropdown(false);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      if (mapInstance.current && markerInstance.current) {
        mapInstance.current.setView([latitude, longitude], 14);
        markerInstance.current.setLatLng([latitude, longitude]);
      }
      // Reverse geocode
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`)
        .then(res => res.json())
        .then(data => {
          const addr = data.display_name || '';
          const address = data.address || {};
          const comps = {
            city: address.city || address.town || address.village || address.suburb || '',
            state: address.state || '',
            country: address.country || '',
            zipCode: address.postcode || '',
          };
          onChange({ formatted: addr, lat: latitude, lng: longitude, components: comps });
          setSearchQuery(addr);
        })
        .catch(err => {
          console.error(err);
          onChange({ formatted: `Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, lat: latitude, lng: longitude, components: {} });
        });
    });
  };

  return (
    <div className="space-y-2 relative">
      <div className="flex gap-2 relative" ref={dropdownRef}>
        <div className="flex-1 relative">
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search company address..."
            className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {showDropdown && (searchResults.length > 0 || searching) && (
            <div className="absolute left-0 right-0 mt-1 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-[1000] max-h-60 overflow-y-auto divide-y divide-[#30363d]">
              {searching ? (
                <div className="p-3 text-xs text-slate-400">Searching...</div>
              ) : (
                searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectResult(res)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-800 text-xs text-slate-200 transition-colors block truncate"
                    title={res.display_name}
                  >
                    {res.display_name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={useCurrentLocation}
          className="px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg text-xs text-slate-300 hover:bg-slate-800 shrink-0"
        >
          Use current location
        </button>
      </div>
      <div ref={mapRef} className="w-full h-64 rounded-lg border border-[#30363d] bg-[#0d1117] z-[1]" />
      {!ready && <p className="text-xs text-slate-400">Loading map…</p>}
      <p className="text-[10px] text-slate-500">Drag the pin to fine-tune the exact spot — this is what geofencing and the live map will use.</p>
    </div>
  );
};

export default LocationPicker;
