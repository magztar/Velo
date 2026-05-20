import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { parseActivityFile } from "@/utils/parseActivityFile";

export default function Import() {
  const [file, setFile] = useState(null);
  const [activityType, setActivityType] = useState("cycling");
  const [activityName, setActivityName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setResult(null);

    // Auto-detect name and type from file
    if (f) {
      try {
        const parsed = await parseActivityFile(f);
        if (parsed.suggestedName) setActivityName(parsed.suggestedName);
        if (parsed.suggestedActivityType) setActivityType(parsed.suggestedActivityType);
      } catch (_) {
        // Ignore pre-parse errors here, will show on submit
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);

    let parsed;
    try {
      parsed = await parseActivityFile(file);
    } catch (err) {
      setResult({ success: false, message: err.message });
      setImporting(false);
      setTimeout(() => setResult(null), 5000);
      return;
    }

    const { routePoints, startTime, endTime, distanceKm, durationMinutes, avgSpeedKmh, maxSpeedKmh, elevationGainM, avgHeartRate, maxHeartRate, avgCadence, maxCadence, avgPowerW, maxPowerW } = parsed;

    const activity = {
      name: activityName || file.name.replace(/\.[^.]+$/, "") || "Importerad aktivitet",
      activity_type: activityType,
      source: "import",
      distance_km: distanceKm,
      duration_minutes: durationMinutes,
      start_time: startTime || new Date().toISOString(),
      end_time: endTime,
      avg_speed_kmh: avgSpeedKmh,
      max_speed_kmh: maxSpeedKmh,
      elevation_gain_m: elevationGainM,
      avg_heart_rate: avgHeartRate,
      max_heart_rate: maxHeartRate,
      avg_cadence: avgCadence,
      max_cadence: maxCadence,
      avg_power_w: avgPowerW,
      max_power_w: maxPowerW,
      route_data: routePoints,
      start_lat: routePoints[0]?.lat,
      start_lng: routePoints[0]?.lng,
      end_lat: routePoints[routePoints.length - 1]?.lat,
      end_lng: routePoints[routePoints.length - 1]?.lng,
      has_health_data: !!(avgHeartRate || avgCadence || avgPowerW),
      sync_status: "synced",
    };

    await base44.entities.Activity.create(activity);
    queryClient.invalidateQueries({ queryKey: ["activities"] });

    const msg = `Importerade "${activity.name}" — ${distanceKm} km, ${routePoints.length} GPS-punkter`;
    setResult({ success: true, message: msg });
    setFile(null);
    setActivityName("");
    setImporting(false);
    toast({ title: "Import klar", description: msg });
    setTimeout(() => setResult(null), 5000);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-heading font-bold">Importera</h1>
        <p className="text-muted-foreground mt-1">Importera aktiviteter från GPX, TCX, KML, GeoJSON eller CSV</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border/50 p-8 max-w-xl"
      >
        <div className="space-y-6">
          {/* File picker */}
          <div>
            <Label className="mb-2 block">Välj fil</Label>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="w-8 h-8" />
                <p className="text-sm font-medium">
                  {file ? file.name : "Klicka för att välja fil"}
                </p>
                <p className="text-xs">GPX, TCX, KML, GeoJSON, CSV</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".gpx,.tcx,.kml,.geojson,.csv,.json"
                onChange={handleFileChange}
              />
            </label>
          </div>

          {/* Activity name */}
          <div className="space-y-2">
            <Label>Aktivitetsnamn</Label>
            <Input
              placeholder="Valfritt — hämtas automatiskt från filen"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
            />
          </div>

          {/* Activity type */}
          <div className="space-y-2">
            <Label>Aktivitetstyp</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cycling">Cykling</SelectItem>
                <SelectItem value="ebike">Elcykel</SelectItem>
                <SelectItem value="mountainbike">Mountainbike</SelectItem>
                <SelectItem value="walking">Promenad</SelectItem>
                <SelectItem value="hiking">Vandring</SelectItem>
                <SelectItem value="running">Löpning</SelectItem>
                <SelectItem value="car">Bilresa</SelectItem>
                <SelectItem value="boat">Båt</SelectItem>
                <SelectItem value="other">Övrigt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full gap-2"
          >
            {importing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Importerar...</>
            ) : (
              <><FileText className="w-4 h-4" /> Importera aktivitet</>
            )}
          </Button>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-3 p-4 rounded-lg ${
                result.success
                  ? "bg-chart-3/10 text-chart-3"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {result.success
                ? <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                : <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
              <p className="text-sm flex-1">{result.message}</p>
              <button onClick={() => setResult(null)} className="ml-2 opacity-60 hover:opacity-100 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}