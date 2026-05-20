import React, { useState } from "react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { MapPin, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function PhotoTimeline({ photos }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  if (!photos?.length) return null;

  const sorted = [...photos].sort((a, b) =>
    new Date(a.timestamp || a.created_date) - new Date(b.timestamp || b.created_date)
  );

  return (
    <>
      <div className="space-y-4">
        <h3 className="font-heading font-semibold text-sm uppercase tracking-widest text-muted-foreground">
          Foton längs rutten
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {sorted.map((photo, i) => (
            <motion.button
              key={photo.id || i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedPhoto(photo)}
              className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer border border-border/50 hover:border-accent/50 transition-all"
            >
              <img
                src={photo.thumbnail_url || photo.file_url}
                alt={photo.note || "Aktivitetsfoto"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {photo.timestamp && (
                <div className="absolute bottom-2 left-2 right-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {format(new Date(photo.timestamp), "HH:mm", { locale: sv })}
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Photo Lightbox */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {selectedPhoto && (
            <div>
              <img
                src={selectedPhoto.file_url}
                alt={selectedPhoto.note || "Foto"}
                className="w-full max-h-[70vh] object-contain bg-black"
              />
              <div className="p-4 space-y-2">
                {selectedPhoto.note && (
                  <p className="font-medium">{selectedPhoto.note}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {selectedPhoto.timestamp && (
                    <span>{format(new Date(selectedPhoto.timestamp), "d MMMM yyyy, HH:mm", { locale: sv })}</span>
                  )}
                  {selectedPhoto.lat && selectedPhoto.lng && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedPhoto.lat.toFixed(4)}, {selectedPhoto.lng.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}