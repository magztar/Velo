import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, MapPin, Clock, Flame } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import RecentActivities from "../components/dashboard/RecentActivities";
import WeeklyChart from "../components/dashboard/WeeklyChart";
import PullToRefresh from "../components/shared/PullToRefresh";
import { motion } from "framer-motion";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: activities, isLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: () => base44.entities.Activity.list("-created_date", 50),
    initialData: [],
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["activities"] });
  };

  const totalDistance = activities.reduce((s, a) => s + (a.distance_km || 0), 0);
  const totalDuration = activities.reduce((s, a) => s + (a.duration_minutes || 0), 0);
  const totalCalories = activities.reduce((s, a) => s + (a.calories || 0), 0);
  const avgSpeed = activities.length
    ? activities.reduce((s, a) => s + (a.avg_speed_kmh || 0), 0) / activities.filter(a => a.avg_speed_kmh).length || 0
    : 0;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-heading font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Översikt över dina aktiviteter och statistik</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total distans"
          value={totalDistance.toFixed(1)}
          unit="km"
          icon={MapPin}
          delay={0}
        />
        <StatCard
          title="Aktiviteter"
          value={activities.length}
          icon={Activity}
          delay={0.1}
        />
        <StatCard
          title="Total tid"
          value={`${Math.floor(totalDuration / 60)}h ${Math.round(totalDuration % 60)}m`}
          icon={Clock}
          delay={0.2}
        />
        <StatCard
          title="Kalorier"
          value={Math.round(totalCalories).toLocaleString()}
          unit="kcal"
          icon={Flame}
          delay={0.3}
        />
      </div>

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Weekly Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-card rounded-xl border border-border/50 p-6"
        >
          <h2 className="font-heading font-semibold mb-4">Senaste 7 dagarna</h2>
          <WeeklyChart activities={activities} />
        </motion.div>

        {/* Recent Activities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-3 bg-card rounded-xl border border-border/50 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold">Senaste aktiviteter</h2>
          </div>
          <RecentActivities activities={activities} isLoading={isLoading} />
        </motion.div>
      </div>
    </div>
    </PullToRefresh>
  );
}