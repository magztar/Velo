import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bike, Plus, Zap, Bluetooth, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function Bikes() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", brand: "", model: "", bike_type: "ebike", is_ebike: false, display_type: "", motor_type: "" });
  const queryClient = useQueryClient();

  const { data: bikes, isLoading } = useQuery({
    queryKey: ["bikes"],
    queryFn: () => base44.entities.Bike.list("-created_date", 50),
    initialData: [],
  });

  const createBike = useMutation({
    mutationFn: (data) => base44.entities.Bike.create(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["bikes"] });
      const previous = queryClient.getQueryData(["bikes"]);
      const optimistic = { ...data, id: `temp-${Date.now()}`, total_distance_km: 0, total_activities: 0 };
      queryClient.setQueryData(["bikes"], (old) => [optimistic, ...(old || [])]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["bikes"], ctx.previous);
    },
    onSuccess: () => {
      setShowAdd(false);
      setForm({ name: "", brand: "", model: "", bike_type: "ebike", is_ebike: false, display_type: "", motor_type: "" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["bikes"] }),
  });

  const deleteBike = useMutation({
    mutationFn: (id) => base44.entities.Bike.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["bikes"] });
      const previous = queryClient.getQueryData(["bikes"]);
      queryClient.setQueryData(["bikes"], (old) => (old || []).filter((b) => b.id !== id));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["bikes"], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["bikes"] }),
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-heading font-bold">Cyklar</h1>
          <p className="text-muted-foreground mt-1">Hantera dina cyklar och elcyklar</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Lägg till cykel
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => <div key={i} className="h-48 bg-muted/50 rounded-xl animate-pulse" />)}
        </div>
      ) : bikes.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Bike className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Inga cyklar tillagda</p>
          <p className="text-sm mt-1">Lägg till din cykel för att spåra aktiviteter per cykel</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bikes.map((bike, i) => (
            <motion.div
              key={bike.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl border border-border/50 p-6 hover:border-accent/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-accent/10 text-accent">
                    {bike.is_ebike ? <Zap className="w-6 h-6" /> : <Bike className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg">{bike.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {[bike.brand, bike.model].filter(Boolean).join(" ") || "Ingen modellinfo"}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteBike.mutate(bike.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary">{bike.bike_type}</Badge>
                {bike.is_ebike && <Badge className="bg-accent/10 text-accent border-accent/20">Elcykel</Badge>}
                {bike.display_type && <Badge variant="outline">{bike.display_type}</Badge>}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {bike.total_distance_km?.toFixed(0) || 0} km total
                </span>
                <span>{bike.total_activities || 0} aktiviteter</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Bike Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Lägg till cykel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Namn *</Label>
              <Input placeholder="Min elcykel" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Märke</Label>
                <Input placeholder="t.ex. Bafang" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Modell</Label>
                <Input placeholder="t.ex. M500" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cykeltyp</Label>
              <Select value={form.bike_type} onValueChange={(v) => setForm({ ...form, bike_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="road">Landsväg</SelectItem>
                  <SelectItem value="mountain">Mountainbike</SelectItem>
                  <SelectItem value="ebike">Elcykel</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="gravel">Gravel</SelectItem>
                  <SelectItem value="city">Stadscykel</SelectItem>
                  <SelectItem value="other">Övrigt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Elcykel med display/motor</Label>
              <Switch checked={form.is_ebike} onCheckedChange={(v) => setForm({ ...form, is_ebike: v })} />
            </div>
            {form.is_ebike && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Displaytyp</Label>
                  <Input placeholder="t.ex. DPC-18" value={form.display_type} onChange={(e) => setForm({ ...form, display_type: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Motor/Controller</Label>
                  <Input placeholder="t.ex. BBS02" value={form.motor_type} onChange={(e) => setForm({ ...form, motor_type: e.target.value })} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Avbryt</Button>
            <Button onClick={() => createBike.mutate(form)} disabled={!form.name}>Spara</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}