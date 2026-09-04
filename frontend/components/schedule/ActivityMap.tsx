'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ScheduleActivity } from '@/types/api';

// Fix for default marker icons in Leaflet with Next.js
const customIcon = (color: string) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function ActivityMap({ activities }: { activities: ScheduleActivity[] }) {
  const [mounted, setMounted] = useState(false);
  const [center, setCenter] = useState<[number, number]>([27.47, 94.92]); // Default coordinates

  useEffect(() => {
    setMounted(true);
    
    // Calculate center based on activities if available
    if (activities.length > 0) {
      const avgLat = activities.reduce((sum, act) => sum + act.location.coordinates[1], 0) / activities.length;
      const avgLng = activities.reduce((sum, act) => sum + act.location.coordinates[0], 0) / activities.length;
      setCenter([avgLat, avgLng]);
    } else {
      // Try to get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
          (err) => console.log('Location access denied', err)
        );
      }
    }
  }, [activities]);

  if (!mounted) return null;

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={center} 
        zoom={14} 
        style={{ height: '100%', width: '100%', zIndex: 10 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
        />
        
        {activities.map((activity) => {
          // Determine color based on status
          let color = 'blue';
          if (activity.status === 'delayed') color = 'red';
          else if (activity.status === 'in_progress') color = 'orange';
          else if (activity.status === 'completed') color = 'green';
          
          return (
            <Marker 
              key={activity.id}
              position={[activity.location.coordinates[1], activity.location.coordinates[0]]}
              icon={customIcon(color)}
            >
              <Popup className="custom-popup">
                <div className="font-sans">
                  <h3 className="font-bold text-slate-800">{activity.activityCode}</h3>
                  <p className="text-sm text-slate-600 mb-2">{activity.activityName}</p>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${color === 'red' ? 'bg-red-500' : color === 'orange' ? 'bg-orange-500' : 'bg-green-500'}`} 
                      style={{ width: `${activity.percentComplete}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{activity.percentComplete}% Complete</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
