import React, { useMemo, useState } from "react";
import { MapContainer, TileLayer, Polyline, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Maximize2, Minimize2 } from "lucide-react";

const COLORS = [
  "#f59e0b", "#3b82f6", "#22c55e", "#ef4444", "#a855f7",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

function FitAllBounds({ routes }) {
  const map = useMap();
  useMemo(() => {
    const allPositions = routes.flatMap((r) => r.positions);
    if (allPositions.length > 1) {
      map.fitBounds(allPositions, { padding: [40, 40] });
    }
  }, [map, routes]);
  return null;
}

export default function AllRoutesMap({ activities }) {
  const [fullscreen, setFullscreen] = useState(false);

  const routes = useMemo(() => {
    return activities
      .filter((a) => a.route_data?.length > 1)
      .map((a, i) => ({
        id: a.id,
        name: a.name,
        positions: a.route_data
          .filter((p) => p.lat && p.lng)
          .map((p) => [p.lat, p.lng]),
        color: COLORS[i % COLORS.length],
      }))
      .filter((r) => r.positions.length > 1);
  }, [activities]);

  const center = useMemo(() => {
    for (const r of routes) {
      if (r.positions.length) return r.positions[Math.floor(r.positions.length / 2)];
    }
    return [59.33, 18.07];
  }, [routes]);

  if (routes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Inga rutter med GPS-data hittades
      </div>
    );
  }

  const mapContent = (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitAllBounds routes={routes} />
      {routes.map((route) => (
        <Polyline
          key={route.id}
          positions={route.positions}
          pathOptions={{ color: route.color, weight: 3, opacity: 0.8 }}
        >
          <Tooltip sticky>{route.name}</Tooltip>
        </Polyline>
      ))}
    </>
  );

  const mapStyle = fullscreen
    ? { width: "100vw", height: "100vh" }
    : { width: "100%", minHeight: "500px" };

  const mapNode = (
    <MapContainer
      key={fullscreen ? "fs" : "normal"}
      center={center}
      zoom={11}
      style={mapStyle}
      scrollWheelZoom={true}
    >
      {mapContent}
    </MapContainer>
  );

  if (fullscreen) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", width: "100vw", height: "100vh" }}>
        <button
          onClick={() => setFullscreen(false)}
          style={{ position: "absolute", top: 12, right: 12, zIndex: 10000 }}
          className="bg-white/90 hover:bg-white text-gray-700 rounded-lg p-1.5 shadow-md transition-all"
          title="Avsluta fullscreen"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
        {mapNode}
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border/50 relative">
      <button
        onClick={() => setFullscreen(true)}
        className="absolute top-3 right-3 z-[1000] bg-white/90 hover:bg-white text-gray-700 rounded-lg p-1.5 shadow-md transition-all"
        title="Fullscreen"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
      {mapNode}
    </div>
  );
}