import React from "react";
import { MapPin, Clock, Gauge, TrendingUp, Mountain, Flame, Heart, Zap, RefreshCw } from "lucide-react";

function StatItem({ icon: Icon, label, value, unit }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="p-2 rounded-lg bg-accent/10 text-accent">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading font-semibold">
          {typeof value === "number" ? value.toFixed(1) : value}
          {unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

export default function ActivityStats({ activity }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
      <StatItem icon={MapPin} label="Distans" value={activity.distance_km} unit="km" />
      <StatItem
        icon={Clock}
        label="Tid"
        value={activity.duration_minutes ? `${Math.floor(activity.duration_minutes / 60)}:${String(Math.round(activity.duration_minutes % 60)).padStart(2, "0")}` : null}
      />
      <StatItem icon={Gauge} label="Snittfart" value={activity.avg_speed_kmh} unit="km/h" />
      <StatItem icon={TrendingUp} label="Maxfart" value={activity.max_speed_kmh} unit="km/h" />
      <StatItem icon={Mountain} label="Höjdmeter" value={activity.elevation_gain_m} unit="m" />
      <StatItem icon={Flame} label="Kalorier" value={activity.calories} unit="kcal" />
      <StatItem icon={Heart} label="Snittpuls" value={activity.avg_heart_rate} unit="bpm" />
      <StatItem icon={Heart} label="Maxpuls" value={activity.max_heart_rate} unit="bpm" />
      <StatItem icon={RefreshCw} label="Snitt-kadans" value={activity.avg_cadence} unit="rpm" />
      <StatItem icon={RefreshCw} label="Max-kadans" value={activity.max_cadence} unit="rpm" />
      <StatItem icon={Zap} label="Snitteffekt" value={activity.avg_power_w} unit="W" />
      <StatItem icon={Zap} label="Maxeffekt" value={activity.max_power_w} unit="W" />
    </div>
  );
}