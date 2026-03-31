import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export interface BadgeNotification {
  id: string;
  name: string;
  icon: string;
  description: string | null;
}

export function useBadgeNotifications() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<BadgeNotification[]>([]);
  const [current, setCurrent] = useState<BadgeNotification | null>(null);
  const knownBadgeIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const queryClient = useQueryClient();

  // Load existing badges on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) {
          data.forEach((b) => knownBadgeIds.current.add(b.badge_id));
        }
        initialized.current = true;
      });
  }, [user]);

  // Poll for new badges every 5 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      if (!initialized.current) return;
      const { data } = await supabase
        .from("user_badges")
        .select("badge_id, badges(name, icon, description)")
        .eq("user_id", user.id);
      if (!data) return;

      const newBadges: BadgeNotification[] = [];
      for (const ub of data) {
        if (!knownBadgeIds.current.has(ub.badge_id)) {
          knownBadgeIds.current.add(ub.badge_id);
          const badge = ub.badges as any;
          if (badge) {
            newBadges.push({
              id: ub.badge_id,
              name: badge.name,
              icon: badge.icon,
              description: badge.description,
            });
          }
        }
      }
      if (newBadges.length > 0) {
        setQueue((prev) => [...prev, ...newBadges]);
        queryClient.invalidateQueries({ queryKey: ["user_badges"] });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [user, queryClient]);

  // Show one badge at a time from queue
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((prev) => prev.slice(1));
    }
  }, [current, queue]);

  const dismiss = () => setCurrent(null);

  return { current, dismiss };
}
