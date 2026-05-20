import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import {
  ArrowLeft, Star, Pencil, Trash2, Share2, Download, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import ActivityTypeIcon, { getActivityLabel } from "../components/shared/ActivityTypeIcon";
import ActivityMap from "../components/activity/ActivityMap";
import ActivityStats from "../components/activity/ActivityStats";
import PhotoTimeline from "../components/activity/PhotoTimeline";
import ElevationChart from "../components/activity/ElevationChart";

export default function ActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: activity, isLoading } = useQuery({
    queryKey: ["activity", id],
    queryFn: async () => {
      const activities = await base44.entities.Activity.filter({ id });
      return activities[0] || null;
    },
    enabled: !!id,
  });

  const { data: photos } = useQuery({
    queryKey: ["activityPhotos", id],
    queryFn: () => base44.entities.ActivityPhoto.filter({ activity_id: id }),
    enabled: !!id,
    initialData: [],
  });

  const toggleFavorite = useMutation({
    mutationFn: () =>
      base44.entities.Activity.update(id, { is_favorite: !activity.is_favorite }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["activity", id] });
      const previous = queryClient.getQueryData(["activity", id]);
      queryClient.setQueryData(["activity", id], (old) =>
        old ? { ...old, is_favorite: !old.is_favorite } : old
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["activity", id], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", id] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });

  const deleteActivity = useMutation({
    mutationFn: () => base44.entities.Activity.delete(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["activities"] });
      const previous = queryClient.getQueryData(["activities"]);
      queryClient.setQueryData(["activities"], (old) =>
        old ? old.filter((a) => a.id !== id) : old
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["activities"], ctx.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      navigate("/activities");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Aktiviteten hittades inte</p>
        <Link to="/activities" className="text-accent mt-2 inline-block">Tillbaka till aktiviteter</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 sticky top-0 z-[100] bg-background/95 backdrop-blur-sm -mx-4 px-4 py-2 md:static md:bg-transparent md:backdrop-blur-none md:mx-0 md:px-0 md:py-0"
      >
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-1 hidden md:flex">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <ActivityTypeIcon type={activity.activity_type} size="lg" />
              <div>
                <h1 className="text-2xl font-heading font-bold">{activity.name}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                  <Badge variant="secondary" className="font-normal">
                    {getActivityLabel(activity.activity_type)}
                  </Badge>
                  {activity.start_time && (
                    <span>{format(new Date(activity.start_time), "d MMMM yyyy, HH:mm", { locale: sv })}</span>
                  )}
                  {activity.bike_name && <span>· {activity.bike_name}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleFavorite.mutate()}
            className={activity.is_favorite ? "text-accent" : "text-muted-foreground"}
          >
            <Star className={`w-5 h-5 ${activity.is_favorite ? "fill-accent" : ""}`} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => deleteActivity.mutate()} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Radera aktivitet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Note */}
      {activity.note && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card rounded-xl border border-border/50 p-4"
        >
          <p className="text-sm text-muted-foreground italic">{activity.note}</p>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border/50"
      >
        <ActivityStats activity={activity} />
      </motion.div>

      {/* Map */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ActivityMap
          routeData={activity.route_data}
          photos={photos}
          className="h-[500px]"
        />
      </motion.div>

      {/* Elevation Chart */}
      {activity.route_data?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ElevationChart routeData={activity.route_data} />
        </motion.div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <PhotoTimeline photos={photos} />
        </motion.div>
      )}
    </div>
  );
}