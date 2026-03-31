# EduHub — Smart Study Platform

AI-powered study platform with quizzes, flashcards, voice study, concept maps, and more.

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (auth, database, edge functions)
- PWA support

## Getting Started

```sh
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run test` | Run tests |
| `npm run lint` | Lint code |
