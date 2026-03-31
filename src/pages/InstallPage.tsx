import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Download, Smartphone, WifiOff, Zap, Bell } from "lucide-react";
import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const features = [
    { icon: WifiOff, title: "Works Offline", desc: "Study without internet — your data syncs when you're back online" },
    { icon: Zap, title: "Lightning Fast", desc: "Loads instantly from your home screen, just like a native app" },
    { icon: Bell, title: "Stay on Track", desc: "Get reminders for study streaks and flashcard reviews" },
    { icon: Smartphone, title: "Full Screen", desc: "No browser bars — immersive full-screen study experience" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg">
          <Smartphone className="h-10 w-10 text-white" />
        </div>
        <h1 className="font-display text-3xl font-bold">Install EduHub</h1>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Add EduHub to your home screen for the best study experience — works offline, loads instantly.
        </p>
      </motion.div>

      {isInstalled ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-8">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="font-display text-xl font-bold">Already Installed!</h2>
          <p className="text-muted-foreground mt-1">You're using EduHub as an app. Enjoy!</p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center">
          {deferredPrompt ? (
            <Button onClick={handleInstall} size="lg" className="gap-2 text-lg px-8">
              <Download className="h-5 w-5" /> Install Now
            </Button>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-6 text-center">
                <p className="font-medium mb-2">Install from your browser</p>
                <p className="text-sm text-muted-foreground">
                  <strong>iPhone:</strong> Tap <span className="inline-block">⎙</span> Share → "Add to Home Screen"<br />
                  <strong>Android:</strong> Tap ⋮ Menu → "Install app" or "Add to Home Screen"
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {features.map((f, i) => (
          <motion.div key={f.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
            <Card className="border-border/50 h-full">
              <CardContent className="p-5 flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-display font-bold text-sm">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
