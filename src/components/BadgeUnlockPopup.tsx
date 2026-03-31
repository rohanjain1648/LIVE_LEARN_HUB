import { motion, AnimatePresence } from "framer-motion";
import { BadgeNotification } from "@/hooks/useBadgeNotifications";
import { useEffect } from "react";

interface Props {
  badge: BadgeNotification | null;
  onDismiss: () => void;
}

export function BadgeUnlockPopup({ badge, onDismiss }: Props) {
  useEffect(() => {
    if (badge) {
      const timer = setTimeout(onDismiss, 4500);
      return () => clearTimeout(timer);
    }
  }, [badge, onDismiss]);

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          key={badge.id}
          initial={{ opacity: 0, y: 80, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          onClick={onDismiss}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] cursor-pointer"
        >
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card px-6 py-4 shadow-2xl">
            {/* Animated icon */}
            <motion.div
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 15 }}
              className="text-5xl"
            >
              {badge.icon}
            </motion.div>

            <div>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="text-xs font-semibold uppercase tracking-wider text-primary"
              >
                Badge Unlocked!
              </motion.p>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="font-display text-lg font-bold"
              >
                {badge.name}
              </motion.p>
              {badge.description && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="text-sm text-muted-foreground"
                >
                  {badge.description}
                </motion.p>
              )}
            </div>

            {/* Sparkle particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full bg-primary"
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{
                  opacity: 0,
                  x: (Math.random() - 0.5) * 120,
                  y: (Math.random() - 0.5) * 80,
                  scale: 0,
                }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.8 }}
                style={{ left: "20%", top: "50%" }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
