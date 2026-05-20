import React from "react";
import { Bike, Zap, Mountain, Footprints, TreePine, PersonStanding, Car, Ship } from "lucide-react";

const typeConfig = {
  cycling: { icon: Bike, bg: "bg-chart-1/10", text: "text-chart-1", label: "Cykling" },
  ebike: { icon: Zap, bg: "bg-chart-2/10", text: "text-chart-2", label: "Elcykel" },
  mountainbike: { icon: Mountain, bg: "bg-chart-3/10", text: "text-chart-3", label: "Mountainbike" },
  walking: { icon: Footprints, bg: "bg-chart-4/10", text: "text-chart-4", label: "Promenad" },
  hiking: { icon: TreePine, bg: "bg-chart-3/10", text: "text-chart-3", label: "Vandring" },
  running: { icon: PersonStanding, bg: "bg-chart-5/10", text: "text-chart-5", label: "Löpning" },
  car: { icon: Car, bg: "bg-muted", text: "text-muted-foreground", label: "Bilresa" },
  motorcycle: { icon: Car, bg: "bg-muted", text: "text-muted-foreground", label: "Motorcykel" },
  boat: { icon: Ship, bg: "bg-chart-1/10", text: "text-chart-1", label: "Båt" },
  other: { icon: Footprints, bg: "bg-muted", text: "text-muted-foreground", label: "Övrigt" },
};

const sizes = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const iconSizes = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export default function ActivityTypeIcon({ type, size = "md" }) {
  const config = typeConfig[type] || typeConfig.other;
  const Icon = config.icon;

  return (
    <div className={`${sizes[size]} rounded-xl ${config.bg} ${config.text} flex items-center justify-center flex-shrink-0`}>
      <Icon className={iconSizes[size]} />
    </div>
  );
}

export function getActivityLabel(type) {
  return (typeConfig[type] || typeConfig.other).label;
}