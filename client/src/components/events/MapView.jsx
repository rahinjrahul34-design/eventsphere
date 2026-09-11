import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Lightweight vanilla-Leaflet wrapper (no react-leaflet dependency weight).
export default function MapView({ coordinates, label, zoom = 13, className = 'h-72' }) {
  const ref = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!coordinates?.coordinates || mapRef.current || !ref.current) return undefined;
    const [lng, lat] = coordinates.coordinates;
    const map = L.map(ref.current).setView([lat, lng], zoom);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      className: '',
      html: `<div style="background:linear-gradient(135deg,#7c3aed,#2563eb);width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.35)"></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });
    L.marker([lat, lng], { icon }).addTo(map).bindPopup(label || 'Event venue');
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [coordinates, label, zoom]);

  if (!coordinates?.coordinates) {
    return (
      <div className={`grid place-items-center rounded-xl border border-dashed bg-muted/40 text-muted-foreground text-sm ${className}`}>
        Map not available — this is an online-only event
      </div>
    );
  }

  return <div ref={ref} className={`overflow-hidden rounded-xl border ${className}`} />;
}
