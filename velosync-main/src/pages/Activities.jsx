import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "../components/shared/PullToRefresh";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Search, Filter, MapPin, Clock, Star, Camera, Heart, Zap, ArrowUpDown, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import AllRoutesMap from "../components/activity/AllRoutesMap";
import { Input } from "@/components/ui/input";
import MobileSelect from "../components/shared/MobileSelect";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import ActivityTypeIcon, { getActivityLabel } from "../components/shared/ActivityTypeIcon";

const ACTIVITY_TYPES = [
{ value: "all", label: "Alla typer" },
{ value: "cycling", label: "Cykling" },
{ value: "ebike", label: "Elcykel" },
{ value: "mountainbike", label: "Mountainbike" },
{ value: "walking", label: "Promenad" },
{ value: "hiking", label: "Vandring" },
{ value: "running", label: "Löpning" },
{ value: "car", label: "Bilresa" },
{ value: "boat", label: "Båt" },
{ value: "other", label: "Övrigt" }];


export default function Activities() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showMap, setShowMap] = useState(false);

  const queryClient = useQueryClient();
  const { data: activities, isLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: () => base44.entities.Activity.list("-created_date", 200),
    initialData: []
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["activities"] });
  };

  const filtered = useMemo(() => {
    let result = [...activities];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((a) => a.name?.toLowerCase().includes(s) || a.note?.toLowerCase().includes(s));
    }
    if (typeFilter !== "all") {
      result = result.filter((a) => a.activity_type === typeFilter);
    }
    if (sortBy === "newest") result.sort((a, b) => new Date(b.start_time || b.created_date) - new Date(a.start_time || a.created_date));
    if (sortBy === "oldest") result.sort((a, b) => new Date(a.start_time || a.created_date) - new Date(b.start_time || b.created_date));
    if (sortBy === "longest") result.sort((a, b) => (b.distance_km || 0) - (a.distance_km || 0));
    if (sortBy === "shortest") result.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
    return result;
  }, [activities, search, typeFilter, sortBy]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold">Aktiviteter</h1>
            <p className="text-muted-foreground mt-1">{activities.length} aktiviteter totalt</p>
          </div>
          <Button variant={showMap ? "default" : "outline"} onClick={() => setShowMap(!showMap)} className="gap-2">
            <Map className="w-4 h-4" />
            {showMap ? "Dölj karta" : "Visa alla rutter"}
          </Button>
        </div>
      </motion.div>

      {/* All routes map */}
      {showMap &&
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <AllRoutesMap activities={filtered} />
        </motion.div>
        }

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
              type="search"
              placeholder="Sök aktiviteter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10" />
            
        </div>
        <MobileSelect
            value={typeFilter}
            onValueChange={setTypeFilter}
            placeholder="Typ"
            className="w-40"
            options={ACTIVITY_TYPES}>
            
          <><Filter className="w-4 h-4 mr-1" /><span>{ACTIVITY_TYPES.find((t) => t.value === typeFilter)?.label || "Alla typer"}</span></>
        </MobileSelect>
        <MobileSelect
            value={sortBy}
            onValueChange={setSortBy}
            placeholder="Sortering"
            className="w-40"
            options={[
            { value: "newest", label: "Nyast först" },
            { value: "oldest", label: "Äldst först" },
            { value: "longest", label: "Längst först" },
            { value: "shortest", label: "Kortast först" }]
            }>
            
          <><ArrowUpDown className="w-4 h-4 mr-1" /><span>{{ newest: "Nyast", oldest: "Äldst", longest: "Längst", shortest: "Kortast" }[sortBy]}</span></>
        </MobileSelect>
      </div>

      {/* Activity List */}
      {isLoading ?
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) =>
          <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
          )}
        </div> :
        filtered.length === 0 ?
        <div className="text-center py-20 text-muted-foreground">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Inga aktiviteter hittade</p>
          <p className="text-sm mt-1">Prova att ändra dina filter</p>
        </div> :

        <div className="grid gap-3">
          {filtered.map((activity, i) =>
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}>
            
              <Link
              to={`/activities/${activity.id}`}
              className="flex items-center gap-3 sm:gap-5 bg-card rounded-xl border border-border/50 hover:border-accent/30 hover:shadow-md active:bg-muted/80 transition-all px-3 py-4 sm:px-4 sm:py-5">
              
                <ActivityTypeIcon type={activity.activity_type} size="md" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-sm truncate">{activity.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{activity.distance_km > 0 ? `${activity.distance_km.toFixed(1)} km` : ""}</p>
                </div>
                {activity.is_favorite && <Star className="w-4 h-4 text-accent fill-accent flex-shrink-0" />}
              </Link>
            </motion.div>
          )}
        </div>
        }
    </div>
    </PullToRefresh>);

}