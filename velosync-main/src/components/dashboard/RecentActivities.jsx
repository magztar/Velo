import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { MapPin, Clock, ArrowRight, Star, Camera, Heart } from "lucide-react";
import { motion } from "framer-motion";
import ActivityTypeIcon from "../shared/ActivityTypeIcon";

export default function RecentActivities({ activities, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!activities?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MapPin className="w-8 h-8 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Inga aktiviteter ännu</p>
        <p className="text-sm mt-1">Starta en aktivitet i mobilappen eller importera en fil</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.slice(0, 6).map((activity, i) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Link
            to={`/activities/${activity.id}`}
            className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 active:bg-muted/80 transition-all duration-200 group border border-transparent hover:border-border/50"
          >
            <ActivityTypeIcon type={activity.activity_type} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{activity.name}</p>
                {activity.is_favorite && <Star className="w-3.5 h-3.5 text-accent fill-accent" />}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {activity.start_time && (
                  <span>{format(new Date(activity.start_time), "d MMM yyyy", { locale: sv })}</span>
                )}
                {activity.distance_km > 0 && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {activity.distance_km.toFixed(1)} km
                  </span>
                )}
                {activity.duration_minutes > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.floor(activity.duration_minutes / 60)}h {Math.round(activity.duration_minutes % 60)}m
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activity.photo_count > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Camera className="w-3 h-3" />{activity.photo_count}
                </span>
              )}
              {activity.has_health_data && (
                <Heart className="w-3 h-3 text-destructive/60" />
              )}
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}