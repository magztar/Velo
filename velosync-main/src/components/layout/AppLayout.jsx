import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import DarkModeSync from "./DarkModeSync";
import { motion } from "framer-motion";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <DarkModeSync />
      {/* Sidebar: hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>
      <motion.main
        initial={false}
        animate={{ marginLeft: typeof window !== "undefined" && window.innerWidth >= 768 ? (collapsed ? 72 : 260) : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="min-h-screen"
      >
        {/* On mobile: no left margin */}
        <div
          className="p-4 pb-24 md:p-6 lg:p-8 max-w-[1600px] mx-auto"
          style={{ paddingTop: "env(safe-area-inset-top, 16px)" }}
        >
          <Outlet />
        </div>
      </motion.main>
      {/* Bottom nav: visible on mobile only */}
      <BottomNav />
    </div>
  );
}