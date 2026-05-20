import React, { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check } from "lucide-react";

function useIsMobile() {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

/**
 * MobileSelect - renders a bottom-sheet Drawer on mobile, native Select on desktop.
 * Props: value, onValueChange, placeholder, options: [{value, label}], children (trigger content)
 */
export default function MobileSelect({ value, onValueChange, placeholder, options, children, className }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder;

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex items-center gap-2 h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm select-none ${className || ""}`}
        >
          {children || <span className={value ? "" : "text-muted-foreground"}>{selectedLabel || placeholder}</span>}
          {!children && <svg className="ml-auto w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}
        </button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="font-heading">{placeholder || "Välj alternativ"}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-1">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onValueChange(opt.value); setOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-muted text-left transition-colors select-none"
                >
                  <span className={opt.value === value ? "font-semibold text-accent" : ""}>{opt.label}</span>
                  {opt.value === value && <Check className="w-4 h-4 text-accent" />}
                </button>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        {children || <SelectValue placeholder={placeholder} />}
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}