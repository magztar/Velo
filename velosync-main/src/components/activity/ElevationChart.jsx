import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ElevationChart({ routeData }) {
  const data = useMemo(() => {
    if (!routeData?.length) return [];
    let totalDist = 0;
    return routeData.
    filter((p) => p.elevation != null).
    map((p, i, arr) => {
      if (i > 0) {
        const prev = arr[i - 1];
        const dLat = p.lat - prev.lat;
        const dLng = p.lng - prev.lng;
        totalDist += Math.sqrt(dLat * dLat + dLng * dLng) * 111;
      }
      return {
        distance: parseFloat(totalDist.toFixed(2)),
        elevation: Math.round(p.elevation),
        speed: p.speed ? parseFloat(p.speed.toFixed(1)) : null,
        heartRate: p.heart_rate || null
      };
    });
  }, [routeData]);

  if (!data.length) return null;

  return (
    <div className="space-y-3 py-1">
      <h3 className="font-heading font-semibold text-sm uppercase tracking-widest text-muted-foreground">
        Höjdprofil
      </h3>
      <div className="h-48 bg-card rounded-xl border border-border/50">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="distance"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={(v) => `${v} km`} />
            
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={(v) => `${v}m`}
              width={40} />
            
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.75rem",
                fontSize: "12px"
              }}
              formatter={(value, name) => {
                if (name === "elevation") return [`${value} m`, "Höjd"];
                return [value, name];
              }} />
            
            <Area
              type="monotone"
              dataKey="elevation"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              fill="url(#elevGrad)" />
            
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>);

}