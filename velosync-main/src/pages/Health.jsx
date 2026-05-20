import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Heart, Activity, Watch, Smartphone, Link2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const platformInfo = {
  apple_health: { name: "Apple Health", icon: Heart, desc: "Puls, kalorier, steg och mer från Apple Health" },
  health_connect: { name: "Health Connect", icon: Activity, desc: "Hälsodata via Android Health Connect" },
  google_fit: { name: "Google Fit", icon: Activity, desc: "Aktivitetsdata från Google Fit" },
  garmin: { name: "Garmin Connect", icon: Watch, desc: "Data från Garmin-enheter" },
  polar: { name: "Polar Flow", icon: Watch, desc: "Data från Polar-enheter" },
  fitbit: { name: "Fitbit", icon: Watch, desc: "Data från Fitbit-enheter" },
  strava: { name: "Strava", icon: Activity, desc: "Aktiviteter och data från Strava" },
  wahoo: { name: "Wahoo", icon: Watch, desc: "Data från Wahoo-enheter" },
  suunto: { name: "Suunto", icon: Watch, desc: "Data från Suunto-enheter" },
  samsung_health: { name: "Samsung Health", icon: Smartphone, desc: "Data från Samsung Health" },
};

export default function Health() {
  const { data: sources, isLoading } = useQuery({
    queryKey: ["healthSources"],
    queryFn: () => base44.entities.HealthSource.list("-created_date", 50),
    initialData: [],
  });

  const connectedSources = sources.filter((s) => s.is_connected);
  const availablePlatforms = Object.entries(platformInfo).filter(
    ([key]) => !sources.some((s) => s.platform === key)
  );

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-heading font-bold">Hälsodata</h1>
        <p className="text-muted-foreground mt-1">Hantera dina hälsodatakällor och integrationer</p>
      </motion.div>

      {/* Connected Sources */}
      <div>
        <h2 className="font-heading font-semibold text-lg mb-4">Anslutna källor</h2>
        {connectedSources.length === 0 ? (
          <div className="bg-card rounded-xl border border-border/50 p-8 text-center text-muted-foreground">
            <Heart className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Inga hälsokällor anslutna ännu</p>
            <p className="text-sm mt-1">Hälsodata kopplas automatiskt från mobilappen</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {connectedSources.map((source, i) => {
              const info = platformInfo[source.platform] || {};
              const Icon = info.icon || Heart;
              return (
                <motion.div
                  key={source.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-xl border border-border/50 p-5 flex items-center gap-4"
                >
                  <div className="p-3 rounded-xl bg-chart-3/10 text-chart-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{source.source_name}</h3>
                    <p className="text-sm text-muted-foreground">{info.desc}</p>
                  </div>
                  <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Ansluten
                  </Badge>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Platforms */}
      <div>
        <h2 className="font-heading font-semibold text-lg mb-4">Tillgängliga integrationer</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Dessa ansluts automatiskt via mobilappen. Stöd för fler plattformar läggs till löpande.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availablePlatforms.map(([key, info], i) => {
            const Icon = info.icon;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3 opacity-60"
              >
                <div className="p-2.5 rounded-lg bg-muted text-muted-foreground">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{info.name}</h3>
                  <p className="text-xs text-muted-foreground">{info.desc}</p>
                </div>
                <Badge variant="outline" className="text-xs">Kommande</Badge>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}