"use client";

import { SidebarLeftIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion, AnimatePresence } from "motion/react";
import logo from "@/assets/logo.png";
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
  activeId?: string;
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
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  return (
    <div
      className={`flex bg-base dark:bg-base rounded-none relative h-full w-full overflow-hidden ${className}`}
    >
      <motion.div
        animate={{ width: isOpen ? 240 : 64 }}
        transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
        className={`p-2 pt-11 shrink-0 flex flex-col items-start transition-colors duration-900 ease-out ${
          isOpen ? "bg-raised dark:bg-raised shadow-sm border-r border-subtle" : "bg-transparent"
        }`}
      >
        {/* App branding + sidebar toggle */}
        <div
          className={`flex items-center w-full text-secondary p-4 pt-1 shrink-0 ${isOpen ? "justify-between" : "justify-center"}`}
          data-tauri-drag-region
        >
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2.5"
              >
                <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                  <img 
                    src={logo} 
                    alt="DeClyp Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[16px] font-bold tracking-tight text-primary">DeClyp</span>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div layout className="shrink-0 flex items-center justify-center">
            <HugeiconsIcon
              icon={SidebarLeftIcon}
              className="size-5 cursor-pointer hover:text-primary transition-colors"
              onClick={() => setIsOpen(!isOpen)}
            />
          </motion.div>
        </div>

        {/* Nav items — always rendered; icons-only when collapsed */}
        <div
          className="flex flex-col gap-1.5 mt-4 w-full relative z-10"
          onMouseLeave={() => setHoveredId(null)}
        >
          {items.map((item) => {
            if (item.isSeparator) {
              return (
                <AnimatePresence key={item.id}>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="h-px bg-subtle my-2 mx-3"
                    />
                  )}
                </AnimatePresence>
              );
            }

            const isActive = activeId === item.id;
            const isHovered = hoveredId === item.id;

            return (
              <div
                key={item.id}
                className="relative cursor-pointer group"
                onMouseEnter={() => setHoveredId(item.id)}
                onClick={() => onSelect?.(item)}
                title={!isOpen ? item.label : undefined}
              >
                {/* Active background pill */}
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

                {/* Icon + label row */}
                <div
                  className={`relative z-10 py-2 flex items-center gap-2.5 tracking-tight transition-colors duration-200 ${
                    isOpen ? "px-3" : "justify-center"
                  }`}
                  style={{ color: isActive ? (item.color || "var(--theme-primary)") : "var(--theme-secondary)" }}
                >
                  <div className="shrink-0 transition-transform duration-200 group-hover:scale-110">
                    {item.icon}
                  </div>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={`overflow-hidden whitespace-nowrap block ${isActive ? "font-semibold" : "font-medium"}`}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Hover background pill */}
                <AnimatePresence>
                  {isHovered && !isActive && (
                    <motion.span
                      layoutId="sidebar-hover-bg"
                      className="absolute inset-0 z-0 bg-subtle dark:bg-subtle rounded-md"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>

      <div className="flex-1 w-full h-full min-h-full overflow-hidden z-0 pl-0">
        {children}
      </div>
    </div>
  );
}
