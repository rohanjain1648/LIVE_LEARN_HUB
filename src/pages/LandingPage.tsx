import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap,
  BookOpen,
  MessageCircle,
  Trophy,
  Brain,
  Users,
  GraduationCap,
  ArrowRight,
  Sparkles,
  Timer,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Live Quiz Arena",
    description: "Real-time multiplayer quizzes with live leaderboards and instant scoring",
    gradient: "bg-gradient-primary",
  },
  {
    icon: Brain,
    title: "AI Quiz Generator",
    description: "Paste your notes and get instant MCQs, flashcards, and summaries powered by AI",
    gradient: "bg-gradient-accent",
  },
  {
    icon: MessageCircle,
    title: "AI Tutor Chat",
    description: "Ask questions about any topic and get instant, context-aware explanations",
    gradient: "bg-gradient-primary",
  },
  {
    icon: BookOpen,
    title: "Smart Flashcards",
    description: "AI-generated flashcards with spaced repetition for maximum retention",
    gradient: "bg-gradient-warm",
  },
  {
    icon: Trophy,
    title: "Gamified Learning",
    description: "Earn XP, badges, and climb leaderboards as you master new topics",
    gradient: "bg-gradient-accent",
  },
  {
    icon: Users,
    title: "Study Groups",
    description: "Form groups, challenge friends, and learn together in real-time sessions",
    gradient: "bg-gradient-primary",
  },
  {
    icon: Timer,
    title: "Focus Timer",
    description: "Pomodoro-style study sessions with focus tracking and break reminders",
    gradient: "bg-gradient-warm",
  },
  {
    icon: Sparkles,
    title: "Adaptive Learning",
    description: "Content adapts to your learning style — ADHD-friendly, bionic reading, and more",
    gradient: "bg-gradient-accent",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">EduHub</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Log in
            </Button>
            <Button onClick={() => navigate("/dashboard")} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Education Platform
            </div>
            <h1 className="mx-auto max-w-4xl font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl">
              Learn Smarter with{" "}
              <span className="text-gradient-primary">Real-Time AI</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Live quizzes, AI-generated flashcards, intelligent tutoring, and gamified progress tracking — 
              all in one platform built for the way you actually learn.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="bg-gradient-primary text-primary-foreground h-12 px-8 text-base hover:opacity-90 shadow-glow"
              >
                Start Learning Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/quiz")}
                className="h-12 px-8 text-base"
              >
                Try Live Quiz
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-8"
          >
            {[
              { value: "50K+", label: "Questions Generated" },
              { value: "<200ms", label: "Quiz Response Time" },
              { value: "98%", label: "Student Satisfaction" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-3xl font-bold text-primary">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Everything You Need to <span className="text-gradient-primary">Excel</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              Powerful features designed to make studying engaging, efficient, and fun.
            </p>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((f) => (
              <motion.div key={f.title} variants={item}>
                <Card className="group h-full border-border/50 bg-card hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${f.gradient}`}>
                      <f.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-2xl rounded-2xl bg-gradient-primary p-12 shadow-lg">
            <h2 className="font-display text-3xl font-bold text-primary-foreground md:text-4xl">
              Ready to Transform How You Learn?
            </h2>
            <p className="mt-4 text-primary-foreground/80 text-lg">
              Join thousands of students already using EduHub to ace their studies.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/dashboard")}
              className="mt-8 h-12 bg-background text-foreground hover:bg-background/90 px-8 text-base"
            >
              Get Started — It's Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold">EduHub</span>
          </div>
          <p className="text-sm text-muted-foreground">Built for learners, powered by AI.</p>
        </div>
      </footer>
    </div>
  );
}
