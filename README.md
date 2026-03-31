# EduHub — Smart Study Platform

> An AI-powered, gamified study platform with real-time quizzes, intelligent tutoring, spaced repetition flashcards, voice study, peer code review, and collaborative study groups — installable as a PWA.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [What The Platform Does](#2-what-the-platform-does)
3. [System Overview](#3-system-overview)
4. [System Architecture](#4-system-architecture)
5. [Code Structure & Reproducibility](#5-code-structure--reproducibility)
6. [Core Logic Deep Dive](#6-core-logic-deep-dive)
7. [Architecture Decisions](#7-architecture-decisions)
8. [Performance Optimizations](#8-performance-optimizations)
9. [Setup Instructions](#9-setup-instructions)
10. [API Reference](#10-api-reference)
11. [Known Limitations](#11-known-limitations)
12. [What I'd Improve With More Time](#12-what-id-improve-with-more-time)

---

## 1. Problem Statement

Students today face a fragmented learning experience: flashcard apps live in one place, quiz tools in another, AI tutors somewhere else, and collaboration tools nowhere near any of them. The result is context-switching overhead, low engagement, and shallow learning.

**Core problems this platform solves:**

- Passive studying (re-reading notes) is ineffective — active recall and spaced repetition are proven to work better, but most tools don't enforce them
- Students don't know *what* they don't know — misconceptions go undetected until exam day
- Learning alone is demotivating — there's no social accountability or competitive drive
- AI tutors that just give answers don't build deep understanding — Socratic questioning does
- Study materials are locked in formats that can't be acted on (PDFs, lecture recordings, screenshots)

EduHub consolidates all of this into one platform: AI that generates study materials from any input, gamification that drives engagement, real-time multiplayer quizzes for social accountability, and diagnostic tools that surface exactly where understanding breaks down.

---

## 2. What The Platform Does

EduHub is a full-stack web application (installable as a PWA) that combines:

| Feature | Description |
|---|---|
| **AI Quiz Generator** | Paste any notes/text → instant multiple-choice quiz |
| **Live Quiz Arena** | Real-time multiplayer quiz rooms with live leaderboards |
| **AI Tutor Chat** | 5 distinct AI personas (friendly peer, hype coach, strict professor, Socratic mentor, default) |
| **Smart Flashcards** | AI-generated decks with spaced repetition (Leitner box system) |
| **Voice Study** | Speak answers to flashcards, get AI scoring and feedback |
| **Voice-to-Flashcards** | Record a lecture → transcribe → auto-generate flashcard deck |
| **Screenshot Analysis** | Upload a textbook page → AI explanation + auto-generated quiz |
| **Socratic Tutor** | AI that never gives answers — only asks probing questions to guide discovery |
| **Misconception Radar** | Analyzes wrong quiz answers to identify exact cognitive errors and generate correction modules |
| **Concept Maps** | AI generates visual knowledge graphs from any text |
| **Code Review** | Submit code → get AI grading + peer reviews with scores |
| **Study Groups** | Create/join groups with real-time messaging and shared notes |
| **Focus Timer** | Pomodoro-style sessions with XP rewards |
| **Gamification** | XP, levels (1–10), streaks, badges, global leaderboard |
| **Mood Check-In** | Daily mood + energy tracking with study recommendations |
| **PWA** | Installable on mobile/desktop, works offline |


---

## 3. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        EduHub Platform                          │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   React SPA  │    │  Supabase    │    │  AI Gateway      │  │
│  │  (Vite/TSX)  │◄──►│  (Postgres + │◄──►│  (Lovable +      │  │
│  │              │    │   Auth +     │    │   Gemini)        │  │
│  │  PWA Ready   │    │   Realtime + │    │                  │  │
│  │              │    │   Edge Fns)  │    │  10 Edge Fns     │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### User Journey Overview

```
Unauthenticated User
        │
        ▼
  ┌─────────────┐
  │ Landing Page│  ──► Sign Up / Log In
  └─────────────┘
        │
        ▼ (authenticated)
  ┌─────────────┐
  │  Dashboard  │  ──► XP, level, streak, mood check-in, quick actions
  └─────────────┘
        │
   ┌────┴────────────────────────────────────────────┐
   │         │          │          │          │       │
   ▼         ▼          ▼          ▼          ▼       ▼
 Quiz     Flashcards  AI Chat   Study      Code    Groups
 Arena    + Voice     + Socratic  Groups   Review  + Notes
   │         │          │
   ▼         ▼          ▼
Leaderboard  Concept  Misconception
 + Badges    Maps     Radar
```

### Feature Interaction Map

```
Notes/Text Input
      │
      ├──► generate-flashcards ──► Flashcard Deck ──► Voice Study
      │                                    │
      ├──► generate-quiz ──► Quiz Room ────┤──► Misconception Radar
      │                                    │
      ├──► concept-map ──► Visual Graph    └──► Spaced Repetition
      │
Screenshot/Image
      │
      └──► analyze-screenshot ──► Explanation + Quiz

Audio/Voice
      │
      └──► voice-to-flashcards ──► Transcript ──► Flashcard Deck
```

---

## 4. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser / PWA)                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    React Application                         │   │
│  │                                                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │   │
│  │  │ AuthContext  │  │ React Query  │  │  React Router v6 │  │   │
│  │  │ (session)    │  │ (cache/fetch)│  │  (20 routes)     │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │   │
│  │                                                             │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │                    Pages (20)                         │  │   │
│  │  │  Dashboard │ Quiz │ Chat │ Flashcards │ CodeReview   │  │   │
│  │  │  Socratic  │ Misconception │ ConceptMap │ VoiceStudy │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                                                             │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │              shadcn/ui + Tailwind CSS                 │  │   │
│  │  │         Radix UI primitives + Framer Motion           │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Service Worker (Workbox / vite-plugin-pwa)       │  │
│  │   Cache: JS/CSS/HTML assets + Supabase API (5min TTL)         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SUPABASE BACKEND                            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Auth        │  │  PostgreSQL  │  │  Realtime                │  │
│  │  (JWT/email) │  │  (25 tables) │  │  (quiz rooms, groups,    │  │
│  │              │  │  RLS enabled │  │   leaderboard)           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  Edge Functions (Deno runtime)                │  │
│  │                                                              │  │
│  │  chat │ generate-quiz │ generate-flashcards │ voice-study   │  │
│  │  code-review │ socratic-chat │ misconception-radar           │  │
│  │  concept-map │ voice-to-flashcards │ analyze-screenshot      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LOVABLE AI GATEWAY                               │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │              Google Gemini Models                            │  │
│   │                                                             │  │
│   │  gemini-3-flash-preview  ──► Chat, Quiz, Flashcards,        │  │
│   │                               ConceptMap, Misconceptions    │  │
│   │                                                             │  │
│   │  gemini-2.5-flash        ──► Code Review                    │  │
│   │                                                             │  │
│   │  gemini-2.5-flash-lite   ──► Voice Study (low latency)      │  │
│   └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Database Schema

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│   profiles   │       │  user_progress   │       │ user_badges  │
│──────────────│       │──────────────────│       │──────────────│
│ id (FK auth) │──────►│ user_id (FK)     │       │ user_id (FK) │
│ display_name │       │ xp               │       │ badge_id(FK) │
│ avatar_url   │       │ quizzes_done     │       │ earned_at    │
│ role_pref    │       │ streak_days      │       └──────┬───────┘
└──────────────┘       │ last_activity    │              │
                       └──────────────────┘       ┌──────▼───────┐
                                                   │    badges    │
┌──────────────┐       ┌──────────────────┐        │──────────────│
│  quiz_rooms  │       │quiz_room_players │        │ id           │
│──────────────│       │──────────────────│        │ name         │
│ id           │──────►│ room_id (FK)     │        │ icon         │
│ host_id      │       │ user_id (FK)     │        │ description  │
│ code (6char) │       │ score            │        │ criteria     │
│ status       │       │ is_ready         │        └──────────────┘
│ current_q    │       └──────────────────┘
└──────┬───────┘
       │               ┌──────────────────┐
       │               │quiz_room_answers │
       └──────────────►│──────────────────│
                       │ room_id (FK)     │
                       │ user_id (FK)     │
                       │ question_id (FK) │
                       │ answer           │
                       │ is_correct       │
                       │ time_taken_ms    │
                       └──────────────────┘

┌──────────────────┐    ┌──────────────┐    ┌──────────────────────┐
│  flashcard_decks │    │  flashcards  │    │  focus_sessions      │
│──────────────────│    │──────────────│    │──────────────────────│
│ id               │───►│ deck_id (FK) │    │ user_id (FK)         │
│ user_id (FK)     │    │ front        │    │ duration_minutes     │
│ title            │    │ back         │    │ xp_earned            │
│ card_count       │    │ box (1-5)    │    │ completed_at         │
│ source_text      │    │ review_count │    └──────────────────────┘
└──────────────────┘    │ next_review  │
                        └──────────────┘

┌──────────────────┐    ┌──────────────────────┐
│  study_groups    │    │ study_group_messages │
│──────────────────│    │──────────────────────│
│ id               │───►│ group_id (FK)        │
│ name             │    │ user_id (FK)         │
│ invite_code      │    │ content              │
│ max_members      │    │ created_at           │
│ created_by (FK)  │    └──────────────────────┘
└──────────────────┘

┌──────────────────────┐    ┌──────────────────────────┐
│  code_submissions    │    │  code_reviews            │
│──────────────────────│    │──────────────────────────│
│ id                   │───►│ submission_id (FK)       │
│ user_id (FK)         │    │ reviewer_id (FK)         │
│ code                 │    │ correctness_score        │
│ language             │    │ efficiency_score         │
│ problem_description  │    │ readability_score        │
│ ai_feedback          │    │ feedback                 │
│ ai_score             │    │ xp_earned                │
└──────────────────────┘    └──────────────────────────┘

┌──────────────────────┐    ┌──────────────────────────┐
│  socratic_sessions   │    │ misconception_corrections│
│──────────────────────│    │──────────────────────────│
│ id                   │    │ user_id (FK)             │
│ user_id (FK)         │    │ topic                    │
│ topic                │    │ misconceptions (JSONB)   │
│ messages (JSONB)     │    │ correction_modules(JSONB)│
│ depth_reached        │    │ created_at               │
└──────────────────────┘    └──────────────────────────┘

┌──────────────────────┐    ┌──────────────────────────┐
│   concept_maps       │    │   mood_checkins          │
│──────────────────────│    │──────────────────────────│
│ id                   │    │ user_id (FK)             │
│ user_id (FK)         │    │ mood (1-5)               │
│ title                │    │ energy (1-5)             │
│ nodes (JSONB)        │    │ notes                    │
│ edges (JSONB)        │    │ checked_in_at            │
│ summary              │    └──────────────────────────┘
└──────────────────────┘
```

### Authentication Flow

```
User visits /dashboard
        │
        ▼
  ProtectedRoute
        │
        ├── session exists? ──► render page
        │
        └── no session ──► redirect to /auth
                                  │
                          ┌───────┴────────┐
                          │   AuthPage     │
                          │  Login/Signup  │
                          └───────┬────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │                            │
               Sign Up                       Sign In
                    │                            │
          supabase.auth.signUp()    supabase.auth.signInWithPassword()
                    │                            │
          DB trigger fires:                      │
          handle_new_user()                      │
          creates: profiles row                  │
                 + user_progress row             │
                    │                            │
                    └────────────┬───────────────┘
                                 │
                    onAuthStateChange() fires
                                 │
                    AuthContext updates:
                    { user, session, loading }
                                 │
                                 ▼
                         redirect /dashboard
```


---

## 5. Code Structure & Reproducibility

```
eduhub/
├── index.html                    # App shell, PWA meta tags, OG tags
├── vite.config.ts                # Vite + PWA plugin config
├── package.json                  # Dependencies & scripts
├── components.json               # shadcn/ui config
├── tailwind.config.ts            # Tailwind theme + custom gradients
├── eslint.config.js              # ESLint rules
├── postcss.config.js             # PostCSS (autoprefixer)
│
├── public/
│   ├── favicon.ico
│   ├── pwa-192.png               # PWA icon (192x192)
│   ├── pwa-512.png               # PWA icon (512x512, maskable)
│   └── robots.txt
│
├── src/
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Router, providers, route tree
│   ├── index.css                 # Global styles, CSS variables
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx       # Global auth state (user, session, signIn/Out/Up)
│   │
│   ├── hooks/
│   │   ├── useBadgeNotifications.ts  # Polls for new badge unlocks
│   │   ├── useQuizRoom.ts            # Real-time quiz room state
│   │   ├── useStudyGroups.ts         # Study group CRUD + messaging
│   │   ├── use-mobile.tsx            # Breakpoint detection
│   │   └── use-toast.ts              # Toast notification hook
│   │
│   ├── components/
│   │   ├── Layout.tsx            # App shell (sidebar + outlet)
│   │   ├── AppSidebar.tsx        # Navigation sidebar
│   │   ├── ProtectedRoute.tsx    # Auth guard wrapper
│   │   ├── MoodCheckIn.tsx       # Daily mood modal
│   │   ├── BadgeUnlockPopup.tsx  # Badge earned animation
│   │   ├── PWAInstallBanner.tsx  # Install prompt banner
│   │   ├── ThemeToggle.tsx       # Dark/light mode toggle
│   │   ├── NavLink.tsx           # Active-aware nav link
│   │   └── ui/                   # 40+ shadcn/ui components
│   │
│   ├── pages/
│   │   ├── LandingPage.tsx       # Marketing / hero page
│   │   ├── AuthPage.tsx          # Login + signup forms
│   │   ├── Dashboard.tsx         # Home hub with stats + charts
│   │   ├── QuizPage.tsx          # Live quiz arena
│   │   ├── StudyPage.tsx         # Study materials hub
│   │   ├── ChatPage.tsx          # AI tutor with persona selector
│   │   ├── FlashcardsPage.tsx    # Deck manager + spaced repetition
│   │   ├── VoiceStudyPage.tsx    # Voice answer scoring
│   │   ├── VoiceToFlashcardsPage.tsx  # Audio → flashcards
│   │   ├── ScreenshotPage.tsx    # Image → explanation + quiz
│   │   ├── SocraticPage.tsx      # Socratic AI tutor
│   │   ├── MisconceptionPage.tsx # Misconception radar
│   │   ├── ConceptMapPage.tsx    # Visual knowledge graphs
│   │   ├── CodeReviewPage.tsx    # Code submission + peer review
│   │   ├── StudyGroupsPage.tsx   # Groups + real-time chat
│   │   ├── FocusTimerPage.tsx    # Pomodoro timer
│   │   ├── LeaderboardPage.tsx   # Global XP rankings
│   │   ├── ProfilePage.tsx       # User profile + settings
│   │   ├── InstallPage.tsx       # PWA install guide
│   │   └── NotFound.tsx          # 404 page
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts         # Supabase client singleton
│   │       └── types.ts          # Auto-generated DB types
│   │
│   └── lib/
│       └── utils.ts              # cn() helper (clsx + tailwind-merge)
│
├── supabase/
│   ├── config.toml               # Project config + function settings
│   ├── migrations/               # Ordered SQL migration files
│   └── functions/
│       ├── chat/                 # AI tutor (streaming, 5 personas)
│       ├── generate-quiz/        # MCQ generation via tool calling
│       ├── generate-flashcards/  # Flashcard generation via tool calling
│       ├── voice-study/          # Answer scoring + explanation
│       ├── voice-to-flashcards/  # Audio transcription → flashcards
│       ├── analyze-screenshot/   # Image analysis + quiz generation
│       ├── socratic-chat/        # Socratic questioning engine
│       ├── misconception-radar/  # Learning gap diagnostics
│       ├── concept-map/          # Knowledge graph generation
│       └── code-review/          # Code grading + feedback
```

### Route Map

```
/                       LandingPage         (public)
/auth                   AuthPage            (public)
/install                InstallPage         (public)
/dashboard              Dashboard           (protected)
/quiz                   QuizPage            (protected)
/study                  StudyPage           (protected)
/chat                   ChatPage            (protected)
/flashcards             FlashcardsPage      (protected)
/voice-study            VoiceStudyPage      (protected)
/voice-to-flashcards    VoiceToFlashcards   (protected)
/screenshot             ScreenshotPage      (protected)
/socratic               SocraticPage        (protected)
/misconceptions         MisconceptionPage   (protected)
/concept-map            ConceptMapPage      (protected)
/code-review            CodeReviewPage      (protected)
/groups                 StudyGroupsPage     (protected)
/focus                  FocusTimerPage      (protected)
/leaderboard            LeaderboardPage     (protected)
/profile                ProfilePage         (protected)
*                       NotFound            (public)
```

---

## 6. Core Logic Deep Dive

### 6.1 AI Chat — Multi-Persona Streaming

The chat system supports 5 distinct AI personas, each with a different system prompt that fundamentally changes the AI's behavior:

```
User selects persona
        │
        ▼
ChatPage sends: { messages[], persona }
        │
        ▼
Edge Function: /functions/v1/chat
        │
        ├── Looks up PERSONAS[persona] system prompt
        │
        ├── Calls Gemini with stream: true
        │
        └── Returns SSE stream ──► Client reads chunks ──► Renders markdown
```

**Persona System Prompts:**

| Persona | Behavior |
|---|---|
| `friendly_peer` | Casual, warm, uses emojis, celebrates wins |
| `hype_coach` | Energetic, motivational, uses CAPS for emphasis |
| `strict_professor` | Rigorous, demands precision, corrects vague language |
| `socratic_mentor` | Never gives answers, only asks probing questions |
| `default` | Balanced tutor with markdown formatting |

### 6.2 Quiz Generation — Structured Tool Calling

```
User pastes notes + selects question count
        │
        ▼
Edge Function: /functions/v1/generate-quiz
        │
        ├── Sends to Gemini with tool_choice: { name: "generate_quiz" }
        │
        ├── Tool schema enforces:
        │   questions[]: {
        │     question: string
        │     options: string[4]
        │     correct_answer: string
        │     explanation: string
        │   }
        │
        └── Returns parsed JSON (no hallucinated format)
```

Tool calling is used instead of prompt-based JSON to guarantee schema compliance — the model is forced to call the function with the exact structure.

### 6.3 Spaced Repetition — Leitner Box System

```
Flashcard has: box (1-5), review_count, next_review_at
        │
        ▼
User reviews card
        │
        ├── Correct answer:
        │   box = min(box + 1, 5)
        │   next_review_at = now + interval[box]
        │   intervals: [1d, 3d, 7d, 14d, 30d]
        │
        └── Wrong answer:
            box = 1 (reset)
            next_review_at = now + 1 day
```

Cards in box 5 are reviewed monthly — effectively graduated from active study.

### 6.4 Misconception Radar — Cognitive Error Detection

```
User completes quiz with wrong answers
        │
        ▼
Edge Function: /functions/v1/misconception-radar
        │
        ├── Input: { topic, wrongAnswers[] }
        │   wrongAnswers: [{ question, studentAnswer, correctAnswer }]
        │
        ├── Gemini analyzes patterns across all wrong answers
        │
        ├── Identifies SPECIFIC cognitive errors:
        │   e.g. "confuses correlation with causation"
        │        "applies Newton's 2nd law instead of 3rd"
        │        "thinks osmosis moves by water concentration not solute"
        │
        └── Returns: {
              misconceptions[]: { concept, error_type, correction, analogy }
              overall_assessment: string
              study_priority: string[]
            }
```

### 6.5 Socratic Tutor — Depth Tracking

The Socratic engine tracks reasoning quality per exchange using metadata embedded in HTML comments:

```
AI response text
<!-- {"depth": 3, "reasoning_quality": "developing", "key_concepts_touched": ["osmosis", "concentration gradient"]} -->
```

**Depth Scale:**
```
1 ── Student restates the question
2 ── Surface definition / recall
3 ── Understands mechanism / process
4 ── Can apply to novel situations
5 ── Can synthesize across concepts
```

The client parses this metadata to show a live reasoning depth indicator without it appearing in the chat UI.

### 6.6 Gamification — XP & Level System

```
XP Sources:
  Quiz correct answer    → +10 XP
  Quiz completion        → +25 XP
  Flashcard review       → +5 XP
  Focus session          → +XP proportional to duration
  Code review submitted  → +15 XP
  Peer review given      → +10 XP

Level Thresholds:
  Level 1  "Beginner"         0 XP
  Level 2  "Curious Mind"     200 XP
  Level 3  "Quick Learner"    500 XP
  Level 4  "Knowledge Seeker" 1,000 XP
  Level 5  "Curious Explorer" 2,000 XP
  Level 6  "Study Pro"        3,500 XP
  Level 7  "Quiz Master"      5,000 XP
  Level 8  "Scholar"          8,000 XP
  Level 9  "Genius"           12,000 XP
  Level 10 "Legend"           20,000 XP
```

### 6.7 Real-Time Quiz Rooms

```
Host creates room ──► generates 6-char code ──► room status: "waiting"
        │
Players join with code ──► added to quiz_room_participants
        │
Host starts quiz ──► status: "playing"
        │
Supabase Realtime subscription fires for all participants
        │
Each question:
  ├── Timer counts down (configurable per question)
  ├── Player submits answer ──► stored in quiz_room_answers
  ├── Score calculated: correct + time_bonus
  └── Live leaderboard updates via Realtime
        │
All questions done ──► status: "finished"
        │
Final leaderboard shown ──► XP awarded ──► badges checked
```

### 6.8 Voice-to-Flashcards Pipeline

```
User records audio (MediaRecorder API)
        │
        ▼
Audio blob sent to edge function
        │
        ▼
Edge Function: /functions/v1/voice-to-flashcards
        │
        ├── Gemini transcribes audio
        │
        ├── Extracts key concepts from transcript
        │
        └── Generates flashcard deck via tool calling:
            { transcript, title, cards[]: { front, back } }
        │
        ▼
Deck saved to flashcard_decks + flashcards tables
        │
        ▼
User can immediately start studying
```

---

## 7. Architecture Decisions

### Why Supabase?

Supabase provides auth, database, realtime, and edge functions in one platform — eliminating the need for a separate backend server. Row-Level Security (RLS) policies enforce data isolation at the database level, so even if edge function auth is bypassed, users can only access their own data.

```
Alternative considered: Firebase
Reason rejected: Less control over SQL queries, no native Postgres,
                 harder to do complex joins for leaderboards/analytics
```

### Why Edge Functions over a Traditional API?

```
Traditional API Server          Edge Functions (Deno)
─────────────────────           ─────────────────────
Always running (cost)     vs    Pay-per-invocation
Cold start: ~0ms (warm)   vs    Cold start: ~50-200ms
Stateful possible         vs    Stateless only
Deploy separately         vs    Co-located with DB
```

For an AI-heavy app where most endpoints call an external LLM (which takes 1-5s anyway), the edge function cold start is negligible.

### Why Tool Calling for Structured Outputs?

Prompt-based JSON extraction is fragile — models sometimes add markdown fences, extra text, or deviate from the schema. Tool calling forces the model to return data in the exact schema defined, making parsing reliable and eliminating defensive JSON cleaning code.

```
Prompt-based:                    Tool calling:
"Return JSON like this: {...}"   tool_choice: { name: "generate_quiz" }
  → sometimes works              → always returns valid schema
  → needs try/catch + cleanup    → parse once, done
```

### Why React Query over raw useEffect?

```
useEffect + fetch                React Query
────────────────                 ────────────
Manual loading states      vs    Built-in isLoading/isError
No caching                 vs    Automatic cache + stale-while-revalidate
Manual refetch logic       vs    refetchOnWindowFocus, retry
Race conditions possible   vs    Request deduplication
```

### Why shadcn/ui over a component library?

shadcn/ui copies component source into the project rather than installing a black-box library. This means:
- Full control over styling and behavior
- No version lock-in
- Tree-shakeable by default
- Components are owned code, not a dependency

### PWA vs Native App

```
Native App                       PWA
──────────                       ───
App store approval needed  vs    Deploy instantly
Separate iOS/Android builds vs   One codebase
~100MB install             vs    ~2MB cached assets
Push notifications (native) vs   Web Push API
Camera/mic access          vs    MediaRecorder API (same capability)
```

For an education app targeting students on any device, PWA provides near-native experience without the friction of app store installs.

---

## 8. Performance Optimizations

### Frontend

**Code Splitting**
React Router v6 with lazy loading means each page is a separate chunk — users only download code for pages they visit.

**React Query Caching**
All Supabase queries are cached with stale-while-revalidate. Dashboard stats, leaderboard, and flashcard decks load instantly on revisit.

**Framer Motion**
Animations use CSS transforms (GPU-accelerated) rather than layout-triggering properties. Stagger animations use `staggerChildren` to avoid layout thrashing.

**Recharts**
Charts use `ResponsiveContainer` which observes resize events rather than polling, and only re-renders when data changes via React Query's referential equality check.

### PWA Caching Strategy

```
Asset Type              Strategy          TTL
──────────────────────  ────────────────  ──────────
JS/CSS/HTML/fonts       CacheFirst        Indefinite (versioned)
Supabase API calls      NetworkFirst      5 minutes, max 50 entries
Images                  CacheFirst        Indefinite
```

NetworkFirst for Supabase means fresh data when online, cached fallback when offline.

### AI Response Streaming

Chat and Socratic functions stream responses via Server-Sent Events (SSE). This means:
- First token appears in ~300ms instead of waiting 3-8s for full response
- Perceived performance is dramatically better
- Users can start reading while the model is still generating

### Database

**Indexes** on frequently queried columns:
- `user_progress.user_id` — dashboard stats lookup
- `quiz_room_participants.room_id` — live quiz queries
- `flashcards.deck_id + next_review_at` — spaced repetition queue
- `study_group_messages.group_id + created_at` — chat history

**RLS Policies** use `auth.uid()` which is resolved at query time from the JWT — no extra round-trip to verify identity.

### Bundle Size

```
Dependency          Size (gzipped)   Purpose
──────────────────  ──────────────   ───────────────────────────
react + react-dom   ~45KB            Core framework
@xyflow/react       ~85KB            Concept map visualization
recharts            ~65KB            Dashboard charts
framer-motion       ~40KB            Animations
react-markdown      ~25KB            Chat message rendering
```

Heavy dependencies (xyflow, recharts) are only loaded on the pages that need them via route-level code splitting.

---

## 9. Setup Instructions

### Prerequisites

- Node.js 18+ or Bun
- Supabase account
- Lovable AI Gateway API key (for AI features)

### 1. Clone & Install

```bash
git clone <repo-url>
cd eduhub
npm install
# or
bun install
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

### 3. Supabase Setup

**Option A — Use existing project:**
The project is already configured. Just add your credentials to `.env`.

**Option B — New Supabase project:**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Run all migrations
supabase db push

# Deploy all edge functions
supabase functions deploy chat
supabase functions deploy generate-quiz
supabase functions deploy generate-flashcards
supabase functions deploy voice-study
supabase functions deploy voice-to-flashcards
supabase functions deploy analyze-screenshot
supabase functions deploy socratic-chat
supabase functions deploy misconception-radar
supabase functions deploy concept-map
supabase functions deploy code-review
```

### 4. Set Edge Function Secrets

```bash
supabase secrets set LOVABLE_API_KEY=your-lovable-api-key
```

### 5. Run Locally

```bash
npm run dev
# App runs at http://localhost:8080
```

### 6. Build for Production

```bash
npm run build
# Output in /dist — deploy to any static host (Vercel, Netlify, Cloudflare Pages)
```

### 7. Run Tests

```bash
npm run test
```

### Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/public key |
| `LOVABLE_API_KEY` | Yes (edge functions) | Lovable AI Gateway key for Gemini access |

---

## 10. API Reference

All AI features are powered by Supabase Edge Functions. Base URL: `https://<project-id>.supabase.co/functions/v1/`

### POST `/chat`

AI tutor chat with streaming response.

```json
Request:
{
  "messages": [
    { "role": "user", "content": "Explain photosynthesis" }
  ],
  "persona": "friendly_peer"
}

Personas: "friendly_peer" | "hype_coach" | "strict_professor" | "socratic_mentor" | "default"

Response: SSE stream of text chunks
```

### POST `/generate-quiz`

Generate multiple-choice questions from text.

```json
Request:
{
  "content": "Photosynthesis is the process by which...",
  "count": 5
}

Response:
{
  "questions": [
    {
      "question": "What is the primary product of photosynthesis?",
      "options": ["Oxygen", "Glucose", "Carbon dioxide", "Water"],
      "correct_answer": "Glucose",
      "explanation": "Glucose is the main sugar produced..."
    }
  ]
}
```

### POST `/generate-flashcards`

Generate flashcard deck from text.

```json
Request:
{
  "text": "The mitochondria is the powerhouse of the cell...",
  "count": 10
}

Response:
{
  "cards": [
    { "front": "What is the mitochondria?", "back": "The powerhouse of the cell — produces ATP via cellular respiration" }
  ]
}
```

### POST `/voice-study`

Score a spoken answer against a flashcard.

```json
Request:
{
  "cardFront": "What is osmosis?",
  "cardBack": "Movement of water across a semipermeable membrane from low to high solute concentration",
  "userAnswer": "Water moves through a membrane to balance concentration",
  "command": "score"
}

Commands: "score" | "explain"

Response:
{
  "content": "{\"correct\": true, \"feedback\": \"Great answer! You got the core concept.\", \"score\": 85}"
}
```

### POST `/socratic-chat`

Socratic questioning engine with depth tracking.

```json
Request:
{
  "messages": [{ "role": "user", "content": "What is gravity?" }],
  "topic": "Newtonian mechanics"
}

Response: SSE stream
// Response text ends with:
// <!-- {"depth": 2, "reasoning_quality": "surface", "key_concepts_touched": ["gravity", "force"]} -->
```

### POST `/misconception-radar`

Identify cognitive errors from wrong quiz answers.

```json
Request:
{
  "topic": "Newton's Laws of Motion",
  "wrongAnswers": [
    {
      "question": "A book rests on a table. What force does the book exert on the table?",
      "studentAnswer": "No force — the book is stationary",
      "correctAnswer": "Equal and opposite force to gravity (Newton's 3rd Law)"
    }
  ]
}

Response:
{
  "misconceptions": [
    {
      "concept": "Newton's Third Law",
      "error_type": "Confuses static equilibrium with absence of force",
      "correction": "Stationary objects still exert forces — they are balanced, not absent",
      "analogy": "Like two people pushing against each other — both push even if neither moves"
    }
  ],
  "overall_assessment": "Student understands Newton's 1st Law but conflates it with 3rd Law",
  "study_priority": ["Newton's Third Law", "Action-reaction pairs"]
}
```

### POST `/concept-map`

Generate a visual knowledge graph.

```json
Request:
{
  "text": "The water cycle involves evaporation, condensation, and precipitation...",
  "title": "The Water Cycle"
}

Response:
{
  "title": "The Water Cycle",
  "summary": "...",
  "nodes": [{ "id": "1", "label": "Evaporation", "type": "process" }],
  "edges": [{ "source": "1", "target": "2", "label": "leads to" }]
}
```

### POST `/code-review`

AI code grading and feedback.

```json
Request:
{
  "action": "review",
  "code": "def fibonacci(n):\n    if n <= 1: return n\n    return fibonacci(n-1) + fibonacci(n-2)",
  "language": "python",
  "problemDescription": "Implement fibonacci sequence"
}

Response:
{
  "score": 72,
  "feedback": "Correct implementation but exponential time complexity O(2^n). Consider memoization.",
  "correctness": 95,
  "efficiency": 40,
  "readability": 85,
  "issues": ["No memoization — will timeout for n > 35", "Missing input validation"]
}
```

### POST `/analyze-screenshot`

Analyze an image and generate explanation or quiz.

```json
Request:
{
  "imageUrl": "https://...",
  "mode": "explain"  // or "quiz"
}

Response (explain mode):
{
  "content": "This diagram shows the structure of a plant cell..."
}

Response (quiz mode):
{
  "questions": [...]  // same format as generate-quiz
}
```

### POST `/voice-to-flashcards`

Transcribe audio and generate flashcards.

```json
Request: multipart/form-data
  audio: <audio file>
  count: 10

Response:
{
  "transcript": "Today we're covering the krebs cycle...",
  "title": "Krebs Cycle",
  "cards": [{ "front": "...", "back": "..." }]
}
```

---

## 11. Known Limitations

**AI Rate Limits**
All edge functions share the same `LOVABLE_API_KEY`. Under heavy concurrent usage, requests may hit rate limits (HTTP 429). There is no per-user rate limiting or queuing — requests fail fast with an error message.

**Voice Transcription Accuracy**
The voice-to-flashcards feature depends on Gemini's audio transcription. Heavy accents, background noise, or domain-specific terminology (e.g., chemical names) may reduce accuracy.

**Real-Time Quiz Scalability**
Quiz rooms use Supabase Realtime which has connection limits on the free tier (~200 concurrent connections). Large-scale simultaneous quiz sessions could hit this ceiling.

**Spaced Repetition is Client-Driven**
The next review date is calculated and written by the client. A malicious user could manipulate review intervals. For a production system, this logic should move to a database trigger or edge function.

**No Offline AI**
While the PWA caches static assets and recent API responses, AI features (quiz generation, chat, etc.) require an active internet connection. There is no offline fallback for AI functionality.

**Audio Recording Browser Support**
The `MediaRecorder` API used for voice features is not supported in all browsers (notably Safari on iOS has limited support). Users on unsupported browsers will see a graceful error but cannot use voice features.

**Mock Dashboard Data**
Weekly XP chart and quiz score history on the dashboard currently use generated mock data based on total XP. Real per-day XP tracking requires a `xp_events` table with timestamps, which is not yet implemented.

**No Email Verification Enforcement**
Supabase Auth is configured with `emailRedirectTo` but email confirmation is not enforced — users can log in immediately after signup without verifying their email.

---

## 12. What I'd Improve With More Time

### Real Per-Day XP Tracking
Replace the mock weekly XP chart with a proper `xp_events` table:
```sql
CREATE TABLE xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  amount integer NOT NULL,
  source text NOT NULL,  -- 'quiz', 'flashcard', 'focus', etc.
  created_at timestamptz DEFAULT now()
);
```
This enables real streak calculation, daily XP charts, and XP breakdowns by activity type.

### Per-User AI Rate Limiting
Add a `ai_usage` table tracking requests per user per hour. Edge functions check this before calling Gemini, returning a friendly "you've used your hourly limit" message instead of a raw 429.

### Push Notifications
Implement Web Push API for:
- Flashcard review reminders (spaced repetition due cards)
- Study group messages when app is closed
- Quiz room invites from friends

### Offline AI with On-Device Models
Integrate WebLLM or Transformers.js to run a small model (e.g., Phi-3 mini) in the browser for basic Q&A when offline. Full AI features would still require connectivity.

### Proper Spaced Repetition Algorithm
Replace the simple Leitner box system with SM-2 (SuperMemo 2) algorithm which uses ease factor and interval multipliers for more accurate review scheduling based on individual performance.

### Social Features
- Friend system with follow/unfollow
- Share quiz results to social media
- Public study group discovery
- Collaborative concept maps (multi-user editing via Supabase Realtime)

### Analytics Dashboard for Instructors
Users with `instructor` role should see aggregate analytics across their students:
- Class-wide misconception patterns
- Average quiz scores by topic
- Engagement metrics (sessions per week, streak distributions)

### Mobile-Native Voice UX
The current voice study uses browser speech synthesis (TTS) which sounds robotic. Integrating ElevenLabs or a similar service would provide natural-sounding voice feedback, significantly improving the voice study experience.

### Test Coverage
The test setup exists (`src/test/setup.ts`, Vitest configured) but test files are not yet written. Priority areas:
- Auth flow (sign up, sign in, protected routes)
- Spaced repetition interval calculation
- XP/level calculation logic
- Edge function input validation

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui (Radix UI) |
| Routing | React Router v6 |
| State / Data | TanStack React Query v5 |
| Animation | Framer Motion |
| Charts | Recharts |
| Graph Visualization | @xyflow/react |
| Forms | React Hook Form + Zod |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL (RLS enabled) |
| Realtime | Supabase Realtime |
| Edge Functions | Deno (Supabase) |
| AI Models | Google Gemini 3-Flash, 2.5-Flash, 2.5-Flash-Lite |
| AI Gateway | Lovable AI Gateway |
| PWA | vite-plugin-pwa + Workbox |
| Testing | Vitest + Testing Library |
| Linting | ESLint + typescript-eslint |
