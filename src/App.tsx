import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Layout from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import QuizPage from "./pages/QuizPage";
import StudyPage from "./pages/StudyPage";
import ChatPage from "./pages/ChatPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import FocusTimerPage from "./pages/FocusTimerPage";
import StudyGroupsPage from "./pages/StudyGroupsPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import ScreenshotPage from "./pages/ScreenshotPage";
import VoiceStudyPage from "./pages/VoiceStudyPage";
import CodeReviewPage from "./pages/CodeReviewPage";
import SocraticPage from "./pages/SocraticPage";
import MisconceptionPage from "./pages/MisconceptionPage";
import ConceptMapPage from "./pages/ConceptMapPage";
import VoiceToFlashcardsPage from "./pages/VoiceToFlashcardsPage";
import InstallPage from "./pages/InstallPage";
import NotFound from "./pages/NotFound";
import { PWAInstallBanner } from "./components/PWAInstallBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/install" element={<InstallPage />} />
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/quiz" element={<QuizPage />} />
                <Route path="/study" element={<StudyPage />} />
                <Route path="/focus" element={<FocusTimerPage />} />
                <Route path="/groups" element={<StudyGroupsPage />} />
                <Route path="/flashcards" element={<FlashcardsPage />} />
                <Route path="/screenshot" element={<ScreenshotPage />} />
                <Route path="/voice-study" element={<VoiceStudyPage />} />
                <Route path="/code-review" element={<CodeReviewPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/socratic" element={<SocraticPage />} />
                <Route path="/misconceptions" element={<MisconceptionPage />} />
                <Route path="/concept-map" element={<ConceptMapPage />} />
                <Route path="/voice-to-flashcards" element={<VoiceToFlashcardsPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            <PWAInstallBanner />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
