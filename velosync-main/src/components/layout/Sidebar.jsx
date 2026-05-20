import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  Bike,
  Heart,
  Upload,
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  Bluetooth,
  Star } from
"lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
{ path: "/", icon: LayoutDashboard, label: "Dashboard" },
{ path: "/activities", icon: Activity, label: "Aktiviteter" },
{ path: "/favorites", icon: Star, label: "Favoriter" },
{ path: "/bikes", icon: Bike, label: "Cyklar" },
{ path: "/health", icon: Heart, label: "Hälsodata" },
{ path: "/import", icon: Upload, label: "Import" },
{ path: "/settings", icon: Settings, label: "Inställningar" }];


export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground z-50 flex flex-col border-r border-sidebar-border">
      
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
          <Map className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        <AnimatePresence>
          {!collapsed &&
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="font-heading font-bold text-lg tracking-tight whitespace-nowrap">
            
              RideTrail
            </motion.span>
          }
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
              isActive ?
              "bg-sidebar-accent text-sidebar-primary" :
              "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`
              }>
              
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 flex items-center">
                  <div className="w-1 h-5 bg-sidebar-primary rounded-r-full" />
                </div>
              )}
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
              <AnimatePresence>
                {!collapsed &&
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="text-sm font-medium whitespace-nowrap">
                  
                    {item.label}
                  </motion.span>
                }
              </AnimatePresence>
            </Link>);

        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground">
          
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>);

}