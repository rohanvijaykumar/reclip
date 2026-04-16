"use client";

import { useState, useId, type ReactNode, type FC } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  color?: string;
}

interface FluidTabsProps {
  tabs: TabItem[];
  defaultActive?: string;
  onChange?: (id: string) => void;
  className?: string;
  layoutId?: string;
}

export const FluidTabs: FC<FluidTabsProps> = ({
  tabs,
  defaultActive = tabs[0]?.id,
  onChange,
  className,
  layoutId: layoutIdProp,
}) => {
  const autoId = useId();
  const layoutId = layoutIdProp || `active-pill-${autoId}`;
  const [active, setActive] = useState<string>(defaultActive);

  const handleChange = (id: string) => {
    setActive(id);
    onChange?.(id);
  };

  return (
    <div className={cn("relative inline-flex items-center gap-1 rounded-full p-1 transition-colors sm:gap-1.5 glass-card", className)}>
      {tabs.map((tab) => {
        const isActive = active === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className="group relative rounded-full px-3.5 py-1 outline-none sm:px-4 sm:py-1.5"
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 25,
                  mass: 0.8,
                }}
                className={cn(
                  "absolute inset-y-0.5 inset-x-0.5 rounded-full border shadow-sm",
                  tab.color ? "" : "border-accent/30 bg-accent/20"
                )}
                style={tab.color ? {
                  backgroundColor: `color-mix(in srgb, ${tab.color} 20%, transparent)`,
                  borderColor: `color-mix(in srgb, ${tab.color} 30%, transparent)`
                } : undefined}
              />
            )}

            <motion.div
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
              animate={{
                filter: isActive
                  ? ["blur(0px)", "blur(2px)", "blur(0px)"]
                  : "blur(0px)",
              }}
              className={`relative z-10 flex items-center justify-center gap-1.5 transition-colors duration-200 sm:gap-2 ${
                isActive
                  ? "font-semibold"
                  : "font-medium text-tertiary hover:text-secondary"
              }`}
              style={isActive ? { color: tab.color || "var(--theme-primary)" } : undefined}
            >
              {tab.icon && (
                <motion.div
                  animate={{ scale: isActive ? 1.05 : 1 }}
                  transition={{
                    scale: { type: "spring", stiffness: 300, damping: 15 },
                  }}
                  className="flex shrink-0 items-center justify-center"
                >
                  {tab.icon}
                </motion.div>
              )}

              <span className="text-[15px] tracking-tight whitespace-nowrap">
                {tab.label}
              </span>
              
              {tab.count !== undefined && (
                <span className={cn(
                  "ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  isActive ? "bg-primary/10 text-primary" : "bg-subtle/50 text-tertiary"
                )}>
                  {tab.count}
                </span>
              )}
            </motion.div>
          </button>
        );
      })}
    </div>
  );
};
