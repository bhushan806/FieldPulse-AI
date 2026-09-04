'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useRouter } from 'next/navigation';

const customIcon = (color: string) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function PortfolioMap({ projects }: { projects: any[] }) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Calculate center
  const avgLat = projects.reduce((sum, p) => sum + p.lat, 0) / projects.length || 27.47;
  const avgLng = projects.reduce((sum, p) => sum + p.lng, 0) / projects.length || 94.92;

  return (
    <MapContainer 
      center={[avgLat, avgLng]} 
      zoom={11} 
      style={{ height: '100%', width: '100%', zIndex: 10 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url={process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
      />
      
      {projects.map((proj) => {
        let color = 'green';
        if (proj.status === 'delayed') color = 'red';
        else if (proj.status === 'at_risk') color = 'orange';
        
        return (
          <Marker 
            key={proj.id}
            position={[proj.lat, proj.lng]}
            icon={customIcon(color)}
          >
            <Popup className="custom-popup">
              <div className="font-sans">
                <h3 className="font-bold text-slate-800 text-base">{proj.name}</h3>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden my-2">
                  <div 
                    className={`h-full ${color === 'red' ? 'bg-red-500' : color === 'orange' ? 'bg-orange-500' : 'bg-green-500'}`} 
                    style={{ width: `${proj.percent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-slate-500">{proj.percent}% Complete</span>
                  <button 
                    onClick={() => router.push(`/hq/project/${proj.id}`)}
                    className="text-xs font-semibold text-purple-600 hover:underline"
                  >
                    View Details &rarr;
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
