import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Activity, Star, Bike, Heart, Settings } from "lucide-react";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/activities", icon: Activity, label: "Aktiviteter" },
  { path: "/favorites", icon: Star, label: "Favoriter" },
  { path: "/bikes", icon: Bike, label: "Cyklar" },
  { path: "/health", icon: Heart, label: "Hälsa" },
  { path: "/settings", icon: Settings, label: "Inställningar" },
];

const TAB_ROOTS = navItems.map((i) => i.path);

function getTabRoot(pathname) {
  return TAB_ROOTS.find((root) =>
    root === "/" ? pathname === "/" : pathname.startsWith(root)
  ) || null;
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Persist last visited path per tab
  useEffect(() => {
    const root = getTabRoot(location.pathname);
    if (root) {
      sessionStorage.setItem(`tab_last_${root}`, location.pathname);
    }
  }, [location.pathname]);

  const handlePress = (e, item) => {
    e.preventDefault();
    const isActive =
      item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);

    if (isActive) {
      // Re-tapping active tab resets to tab root
      navigate(item.path, { replace: true });
    } else {
      // Restore last visited path within that tab
      const last = sessionStorage.getItem(`tab_last_${item.path}`);
      navigate(last && last !== item.path ? last : item.path);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[9998] bg-sidebar border-t border-sidebar-border flex md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {navItems.map((item) => {
        const isActive =
          item.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.path);
        return (
          <a
            key={item.path}
            href={item.path}
            onClick={(e) => handlePress(e, item)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-1"
            style={{ userSelect: "none" }}
          >
            <item.icon
              className={`w-5 h-5 transition-colors ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"}`}
            />
            <span
              className={`text-[10px] font-medium transition-colors ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"}`}
            >
              {item.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}