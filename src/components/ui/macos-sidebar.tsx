"use client";

import { PlusSignIcon, SidebarLeftIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion, AnimatePresence } from "motion/react";
import { useState, type ReactNode } from "react";

export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  color?: string;
  isSeparator?: boolean;
}

export interface MacOSSidebarProps {
  items: SidebarItem[];
  defaultOpen?: boolean;
  activeId?: string; // Control active state externally
  children?: ReactNode;
  className?: string;
  onSelect?: (item: SidebarItem) => void;
}

export function MacOSSidebar({
  items,
  defaultOpen = true,
  activeId,
  children,
  className = "",
  onSelect,
}: MacOSSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const activeItem = items.find(i => i.id === activeId);
  const activeColor = activeItem?.color || "var(--theme-primary)";
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  return (
    <div
      className={`flex bg-base dark:bg-base rounded-none relative h-full w-full overflow-hidden ${className}`}
    >
      <motion.div
        animate={{
          width: isOpen ? 240 : 64,
        }}
        transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
        className={`p-2 rounded-2xl shrink-0 flex flex-col items-start transition-colors duration-900 ease-out ${
          isOpen ? "bg-raised dark:bg-raised shadow-sm border border-subtle" : "bg-transparent"
        }`}
      >
        <div
          className={`flex items-center w-full justify-end text-secondary dark:text-secondary p-4 shrink-0`}
        >
          <motion.div
            layout
            className="shrink-0 flex items-center justify-center"
          >
            <HugeiconsIcon
              icon={SidebarLeftIcon}
              className="size-5 cursor-pointer hover:text-primary transition-colors"
              onClick={() => setIsOpen(!isOpen)}
            />
          </motion.div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col gap-1.5 mt-4 w-full relative z-10 whitespace-nowrap"
              onMouseLeave={() => setHoveredId(null)}
            >
              {items.map((item) => {
                if (item.isSeparator) {
                  return <div key={item.id} className="h-px bg-subtle my-2 mx-3" />;
                }
                const isActive = activeId === item.id;
                const isHovered = hoveredId === item.id;
                
                return (
                  <div
                    key={item.id}
                    className="relative cursor-pointer group"
                    onMouseEnter={() => setHoveredId(item.id)}
                    onClick={() => onSelect?.(item)}
                  >
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          className="absolute inset-0 z-0 rounded-md shadow-sm border border-subtle backdrop-blur-sm"
                          style={{ backgroundColor: `color-mix(in srgb, ${item.color || "var(--theme-accent)"} 15%, transparent)` }}
                          layoutId="sidebar-active-bg"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        />
                      )}
                    </AnimatePresence>
                    <div
                      className="relative z-10 px-3 py-2 flex items-center gap-2.5 tracking-tight transition-colors duration-200"
                      style={{ color: isActive ? (item.color || "var(--theme-primary)") : "var(--theme-secondary)" }}
                    >
                      <div className="shrink-0 transition-transform duration-200 group-hover:scale-110">
                        {item.icon}
                      </div>
                      <span className={isActive ? "font-semibold" : "font-medium"}>
                        {item.label}
                      </span>
                    </div>
                    <AnimatePresence>
                      {isHovered && !isActive && (
                        <motion.span
                          layoutId="sidebar-hover-bg"
                          className="absolute inset-0 z-0 bg-subtle dark:bg-subtle rounded-md"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 350,
                            damping: 30,
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex-1 w-full h-full min-h-full overflow-hidden z-0 pl-0">
        {children}
      </div>
    </div>
  );
}
