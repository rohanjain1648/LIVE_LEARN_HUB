import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Outlet } from "react-router-dom";
import { useBadgeNotifications } from "@/hooks/useBadgeNotifications";
import { BadgeUnlockPopup } from "@/components/BadgeUnlockPopup";

export default function Layout() {
  const { current, dismiss } = useBadgeNotifications();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border bg-card/80 backdrop-blur-sm px-4 sticky top-0 z-30">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
      <BadgeUnlockPopup badge={current} onDismiss={dismiss} />
    </SidebarProvider>
  );
}
