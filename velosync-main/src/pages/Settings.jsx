import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { User, Shield, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const [user, setUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout("/");
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-heading font-bold">Inställningar</h1>
        <p className="text-muted-foreground mt-1">Hantera ditt konto och appinställningar</p>
      </motion.div>

      {/* Profile */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border/50 p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 text-accent">
            <User className="w-5 h-5" />
          </div>
          <h2 className="font-heading font-semibold text-lg">Profil</h2>
        </div>
        <Separator />
        {user ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Namn</Label>
              <Input value={user.full_name || ""} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label>E-post</Label>
              <Input value={user.email || ""} disabled className="bg-muted/50" />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Laddar profilinformation...</p>
        )}
      </motion.div>

      {/* Data & Privacy */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border/50 p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 text-accent">
            <Shield className="w-5 h-5" />
          </div>
          <h2 className="font-heading font-semibold text-lg">Data & Integritet</h2>
        </div>
        <Separator />
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Din data lagras säkert i molnet och synkas mellan dina enheter.</p>
          <p>Hälsodata hämtas bara med ditt godkännande via mobilappen.</p>
          <p>Platsdata och bilder synkas krypterat.</p>
        </div>
      </motion.div>

      {/* Logout + Delete Account */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3"
      >
        <Button variant="outline" onClick={handleLogout} className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/5 w-fit">
          <LogOut className="w-4 h-4" /> Logga ut
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 w-fit">
              <Trash2 className="w-4 h-4" /> Ta bort konto
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ta bort konto?</AlertDialogTitle>
              <AlertDialogDescription>
                Detta raderar ditt konto och all din data permanent. Åtgärden kan inte ångras.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction asChild>
                <a
                  href="mailto:support@base44.com?subject=Begäran om borttagning av konto"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
                >
                  Ta bort
                </a>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </div>
  );
}