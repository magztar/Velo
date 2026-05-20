import React from "react";
import { motion } from "framer-motion";

export default function StatCard({ title, value, unit, icon: Icon, trend, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-card rounded-xl p-6 border border-border/50 hover:border-accent/30 transition-all duration-300 hover:shadow-lg group"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-heading font-bold text-foreground">{value}</span>
            {unit && <span className="text-sm text-muted-foreground font-medium">{unit}</span>}
          </div>
          {trend && (
            <p className="text-xs text-accent font-medium">{trend}</p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}