import React, { useMemo, useState } from "react";
import { MapContainer, TileLayer, Polyline, Popup, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Maximize2, Minimize2 } from "lucide-react";

function FitBounds({ positions }) {
  const map = useMap();
  useMemo(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  }, [map, positions]);
  return null;
}

export default function ActivityMap({ routeData, photos, className = "" }) {
  const [fullscreen, setFullscreen] = useState(false);

  const positions = useMemo(
    () => (routeData || []).filter((p) => p.lat && p.lng).map((p) => [p.lat, p.lng]),
    [routeData]
  );

  const highPoint = useMemo(
    () => (routeData || []).reduce((max, p) => !max || p.elevation > max.elevation ? p : max, null),
    [routeData]
  );

  const lowPoint = useMemo(
    () => (routeData || []).reduce((min, p) => !min || p.elevation < min.elevation ? p : min, null),
    [routeData]
  );

  const maxSpeedPoint = useMemo(
    () => (routeData || []).reduce((max, p) => !max || (p.speed || 0) > (max.speed || 0) ? p : max, null),
    [routeData]
  );

  const photoMarkers = useMemo(() => (photos || []).filter((p) => p.lat && p.lng), [photos]);

  if (!positions.length) {
    return (
      <div className={`${className} flex items-center justify-center h-96 bg-muted rounded-xl border border-border/50`}>
        <p className="text-muted-foreground text-sm">Ingen GPS-data tillgänglig</p>
      </div>);

  }

  const mapContent =
  <>
      <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    
      <FitBounds positions={positions} />
      <Polyline positions={positions} pathOptions={{ color: "#3b82f6", weight: 3, opacity: 0.8 }} />
      <CircleMarker
      center={positions[0]}
      radius={8}
      pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 1, weight: 2 }}>
      
        <Popup>Start</Popup>
      </CircleMarker>
      <CircleMarker
      center={positions[positions.length - 1]}
      radius={8}
      pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 1, weight: 2 }}>
      
        <Popup>Slut</Popup>
      </CircleMarker>
      {highPoint &&
    <CircleMarker
      center={[highPoint.lat, highPoint.lng]}
      radius={9}
      pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 1, weight: 2 }}>
      
          <Popup>
            <div className="text-center text-sm font-medium">
              ▲ Högst punkt<br />
              <span className="text-base font-bold">{Math.round(highPoint.elevation)} m</span>
            </div>
          </Popup>
        </CircleMarker>
    }
      {lowPoint && lowPoint !== highPoint &&
    <CircleMarker
      center={[lowPoint.lat, lowPoint.lng]}
      radius={9}
      pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 1, weight: 2 }}>
      
          <Popup>
            <div className="text-center text-sm font-medium">
              ▼ Lägst punkt<br />
              <span className="text-base font-bold">{Math.round(lowPoint.elevation)} m</span>
            </div>
          </Popup>
        </CircleMarker>
    }
      {maxSpeedPoint &&
    <CircleMarker
      center={[maxSpeedPoint.lat, maxSpeedPoint.lng]}
      radius={9}
      pathOptions={{ color: "#a855f7", fillColor: "#a855f7", fillOpacity: 1, weight: 2 }}>
      
          <Popup>
            <div className="text-center text-sm font-medium">
              ⚡ Maxhastighet<br />
              <span className="text-base font-bold">{maxSpeedPoint.speed.toFixed(1)} km/h</span>
            </div>
          </Popup>
        </CircleMarker>
    }
      {photoMarkers.map((photo, i) =>
    <CircleMarker
      key={photo.id || i}
      center={[photo.lat, photo.lng]}
      radius={6}
      pathOptions={{ color: "hsl(40, 60%, 58%)", fillColor: "hsl(40, 60%, 58%)", fillOpacity: 1, weight: 2 }}>
      
          <Popup>
            <div className="text-center">
              {photo.file_url &&
          <img src={photo.file_url} alt="" className="w-32 h-24 object-cover rounded mb-1" />
          }
              {photo.note && <p className="text-xs">{photo.note}</p>}
            </div>
          </Popup>
        </CircleMarker>
    )}
    </>;


  const mapStyle = fullscreen ?
  { width: "100vw", height: "100vh" } :
  { width: "100%", minHeight: "320px", zIndex: 1 };

  const mapNode =
  <MapContainer
    key={fullscreen ? "fs" : "normal"}
    center={positions[0]}
    zoom={13}
    style={mapStyle}
    scrollWheelZoom={true}>
    
      {mapContent}
    </MapContainer>;


  if (fullscreen) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", width: "100vw", height: "100vh" }}>
        <button
          onClick={() => setFullscreen(false)}
          style={{ position: "absolute", top: 12, right: 12, zIndex: 10000 }}
          className="bg-white/90 hover:bg-white text-gray-700 rounded-lg p-1.5 shadow-md transition-all"
          title="Avsluta fullscreen">
          
          <Minimize2 className="w-4 h-4" />
        </button>
        {mapNode}
      </div>);

  }

  return (
    <div className={`${className}`}>
      <div className="rounded-xl overflow-hidden border border-border/50 relative opacity-100">
        <button
          onClick={() => setFullscreen(true)}
          className="absolute top-3 right-3 z-[1000] bg-white/90 hover:bg-white text-gray-700 rounded-lg p-1.5 shadow-md transition-all"
          title="Fullscreen">
          
          <Maximize2 className="w-4 h-4" />
        </button>
        {mapNode}
      </div>

      {/* Legend below map */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 px-1 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-green-700 dark:text-green-400 font-medium">Start</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-red-700 dark:text-red-400 font-medium">Slut</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span className="text-orange-700 dark:text-orange-400 font-medium">▲ Högsta punkt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-blue-700 dark:text-blue-400 font-medium">▼ Lägsta punkt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span className="text-purple-700 dark:text-purple-400 font-medium">⚡ Maxhastighet</span>
        </div>
        {photoMarkers.length > 0 &&
        <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-accent"></div>
            <span className="text-accent font-medium">📷 Foto ({photoMarkers.length})</span>
          </div>
        }
      </div>
    </div>);

}