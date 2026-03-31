import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface QuizRoom {
  id: string;
  code: string;
  title: string;
  host_id: string;
  status: "waiting" | "playing" | "finished";
  current_question_index: number;
  question_end_time: string | null;
}

export interface Participant {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  score: number;
  last_answer_correct: boolean | null;
}

export interface RoomQuestion {
  id: string;
  room_id: string;
  question: string;
  options: string[];
  correct_answer: number;
  order_index: number;
  time_limit_seconds: number;
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function useQuizRoom() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [room, setRoom] = useState<QuizRoom | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [questions, setQuestions] = useState<RoomQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<RoomQuestion | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeRooms, setActiveRooms] = useState<QuizRoom[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const isHost = room?.host_id === user?.id;

  // Fetch active rooms
  const fetchActiveRooms = useCallback(async () => {
    const { data } = await supabase
      .from("quiz_rooms")
      .select("*")
      .in("status", ["waiting", "playing"])
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setActiveRooms(data as QuizRoom[]);
  }, []);

  // Create room
  const createRoom = useCallback(async (title: string, questionsData: Array<{ question: string; options: string[]; correct_answer: number }>) => {
    if (!user) return;
    const code = generateCode();

    const { data: roomData, error: roomErr } = await supabase
      .from("quiz_rooms")
      .insert({ code, title, host_id: user.id })
      .select()
      .single();

    if (roomErr || !roomData) {
      toast({ title: "Error", description: roomErr?.message || "Failed to create room", variant: "destructive" });
      return;
    }

    // Insert questions
    const qs = questionsData.map((q, i) => ({
      room_id: roomData.id,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      order_index: i,
    }));

    const { error: qErr } = await supabase.from("quiz_room_questions").insert(qs);
    if (qErr) {
      toast({ title: "Error", description: "Failed to add questions", variant: "destructive" });
      return;
    }

    // Host joins as participant
    const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Host";
    await supabase.from("quiz_room_participants").insert({
      room_id: roomData.id,
      user_id: user.id,
      display_name: displayName,
    });

    setRoom(roomData as QuizRoom);
    await loadRoomData(roomData.id);
  }, [user, toast]);

  // Join room by code
  const joinRoom = useCallback(async (code: string) => {
    if (!user) return;

    const { data: roomData, error } = await supabase
      .from("quiz_rooms")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (error || !roomData) {
      toast({ title: "Room not found", description: "Check the code and try again.", variant: "destructive" });
      return;
    }

    if (roomData.status === "finished") {
      toast({ title: "Room ended", description: "This quiz has already finished.", variant: "destructive" });
      return;
    }

    const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Player";
    await supabase.from("quiz_room_participants").upsert({
      room_id: roomData.id,
      user_id: user.id,
      display_name: displayName,
    }, { onConflict: "room_id,user_id" });

    setRoom(roomData as QuizRoom);
    await loadRoomData(roomData.id);
  }, [user, toast]);

  // Join room by ID
  const joinRoomById = useCallback(async (roomId: string) => {
    if (!user) return;

    const { data: roomData } = await supabase
      .from("quiz_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (!roomData) return;

    const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Player";
    await supabase.from("quiz_room_participants").upsert({
      room_id: roomData.id,
      user_id: user.id,
      display_name: displayName,
    }, { onConflict: "room_id,user_id" });

    setRoom(roomData as QuizRoom);
    await loadRoomData(roomData.id);
  }, [user, toast]);

  // Load room data
  const loadRoomData = async (roomId: string) => {
    const [pRes, qRes] = await Promise.all([
      supabase.from("quiz_room_participants").select("*").eq("room_id", roomId).order("score", { ascending: false }),
      supabase.from("quiz_room_questions").select("*").eq("room_id", roomId).order("order_index"),
    ]);
    if (pRes.data) setParticipants(pRes.data as Participant[]);
    if (qRes.data) setQuestions(qRes.data as RoomQuestion[]);
  };

  // Start quiz (host only)
  const startQuiz = useCallback(async () => {
    if (!room || !isHost) return;
    const endTime = new Date(Date.now() + (questions[0]?.time_limit_seconds || 20) * 1000).toISOString();
    await supabase.from("quiz_rooms").update({
      status: "playing",
      current_question_index: 0,
      question_end_time: endTime,
    }).eq("id", room.id);
  }, [room, isHost, questions]);

  // Next question (host only)
  const nextQuestion = useCallback(async () => {
    if (!room || !isHost) return;
    const nextIdx = room.current_question_index + 1;
    if (nextIdx >= questions.length) {
      await supabase.from("quiz_rooms").update({
        status: "finished",
        current_question_index: nextIdx,
        question_end_time: null,
      }).eq("id", room.id);
    } else {
      const endTime = new Date(Date.now() + (questions[nextIdx]?.time_limit_seconds || 20) * 1000).toISOString();
      await supabase.from("quiz_rooms").update({
        current_question_index: nextIdx,
        question_end_time: endTime,
      }).eq("id", room.id);
    }
  }, [room, isHost, questions]);

  // Submit answer
  const submitAnswer = useCallback(async (optionIndex: number) => {
    if (!room || !user || !currentQuestion || hasAnswered) return;

    const isCorrect = optionIndex === currentQuestion.correct_answer;
    const points = isCorrect ? 100 + Math.max(0, timeLeft * 5) : 0;

    await supabase.from("quiz_room_answers").insert({
      room_id: room.id,
      question_id: currentQuestion.id,
      user_id: user.id,
      selected_option: optionIndex,
      is_correct: isCorrect,
    });

    if (isCorrect) {
      const myParticipant = participants.find(p => p.user_id === user.id);
      if (myParticipant) {
        await supabase.from("quiz_room_participants").update({
          score: myParticipant.score + points,
          last_answer_correct: true,
        }).eq("id", myParticipant.id);
      }
    } else {
      const myParticipant = participants.find(p => p.user_id === user.id);
      if (myParticipant) {
        await supabase.from("quiz_room_participants").update({
          last_answer_correct: false,
        }).eq("id", myParticipant.id);
      }
    }

    setHasAnswered(true);
  }, [room, user, currentQuestion, hasAnswered, timeLeft, participants]);

  // Leave room
  const leaveRoom = useCallback(() => {
    setRoom(null);
    setParticipants([]);
    setQuestions([]);
    setCurrentQuestion(null);
    setHasAnswered(false);
    setTimeLeft(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`quiz-room-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as QuizRoom;
            setRoom(updated);
          }
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_room_participants", filter: `room_id=eq.${room.id}` },
        async () => {
          const { data } = await supabase.from("quiz_room_participants").select("*").eq("room_id", room.id).order("score", { ascending: false });
          if (data) setParticipants(data as Participant[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  // Update current question when room changes
  useEffect(() => {
    if (!room || room.status !== "playing") {
      setCurrentQuestion(null);
      return;
    }
    const q = questions.find(q => q.order_index === room.current_question_index);
    setCurrentQuestion(q || null);
    setHasAnswered(false);
  }, [room?.current_question_index, room?.status, questions]);

  // Timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!room?.question_end_time || room.status !== "playing") {
      setTimeLeft(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((new Date(room.question_end_time!).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    timerRef.current = setInterval(tick, 250);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [room?.question_end_time, room?.status]);

  useEffect(() => { fetchActiveRooms(); }, [fetchActiveRooms]);

  return {
    room, participants, questions, currentQuestion, hasAnswered, timeLeft, activeRooms, isHost,
    createRoom, joinRoom, joinRoomById, startQuiz, nextQuestion, submitAnswer, leaveRoom, fetchActiveRooms,
  };
}
