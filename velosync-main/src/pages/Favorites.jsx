import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Star, MapPin, Clock, Camera } from "lucide-react";
import { motion } from "framer-motion";
import ActivityTypeIcon, { getActivityLabel } from "../components/shared/ActivityTypeIcon";

export default function Favorites() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: () => base44.entities.Activity.list("-created_date", 200),
    initialData: [],
  });

  const favorites = activities.filter((a) => a.is_favorite);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-heading font-bold">Favoriter</h1>
        <p className="text-muted-foreground mt-1">{favorites.length} sparade favoriter</p>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />)}
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Star className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Inga favoriter ännu</p>
          <p className="text-sm mt-1">Markera aktiviteter som favoriter för att hitta dem snabbt</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {favorites.map((activity, i) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/activities/${activity.id}`}
                className="flex items-center gap-5 p-5 bg-card rounded-xl border border-border/50 hover:border-accent/30 hover:shadow-md transition-all group"
              >
                <ActivityTypeIcon type={activity.activity_type} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-heading font-semibold truncate">{activity.name}</h3>
                    <Star className="w-4 h-4 text-accent fill-accent flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{getActivityLabel(activity.activity_type)}</span>
                    {activity.start_time && (
                      <span>{format(new Date(activity.start_time), "d MMM yyyy", { locale: sv })}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {activity.distance_km > 0 && (
                    <span className="font-heading font-bold">{activity.distance_km.toFixed(1)} km</span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}