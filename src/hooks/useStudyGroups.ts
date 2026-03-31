import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  max_members: number;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  display_name: string;
  role: string;
  joined_at: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  display_name: string;
  content: string;
  created_at: string;
}

export interface GroupNote {
  id: string;
  group_id: string;
  user_id: string;
  display_name: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function useStudyGroups() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [myGroups, setMyGroups] = useState<(StudyGroup & { member_count: number })[]>([]);
  const [currentGroup, setCurrentGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [notes, setNotes] = useState<GroupNote[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMyGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get groups I'm a member of
    const { data: memberships } = await supabase
      .from("study_group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setMyGroups([]);
      setLoading(false);
      return;
    }

    const groupIds = memberships.map((m: any) => m.group_id);
    const { data: groups } = await supabase
      .from("study_groups")
      .select("*")
      .in("id", groupIds)
      .order("created_at", { ascending: false });

    if (groups) {
      // Get member counts
      const withCounts = await Promise.all(
        groups.map(async (g: any) => {
          const { count } = await supabase
            .from("study_group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", g.id);
          return { ...g, member_count: count || 0 };
        })
      );
      setMyGroups(withCounts as any);
    }
    setLoading(false);
  }, [user]);

  const createGroup = useCallback(async (name: string, description?: string) => {
    if (!user) return;
    const inviteCode = generateInviteCode();
    const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Owner";

    const { data: group, error } = await supabase
      .from("study_groups")
      .insert({ name, description: description || null, invite_code: inviteCode, created_by: user.id })
      .select()
      .single();

    if (error || !group) {
      toast({ title: "Error", description: error?.message || "Failed to create group", variant: "destructive" });
      return;
    }

    // Add creator as owner
    await supabase.from("study_group_members").insert({
      group_id: group.id,
      user_id: user.id,
      display_name: displayName,
      role: "owner",
    });

    await fetchMyGroups();
    toast({ title: "Group created!", description: `Invite code: ${inviteCode}` });
    return group as StudyGroup;
  }, [user, toast, fetchMyGroups]);

  const joinGroup = useCallback(async (inviteCode: string) => {
    if (!user) return;

    const { data: group, error } = await supabase
      .from("study_groups")
      .select("*")
      .eq("invite_code", inviteCode.toUpperCase())
      .single();

    if (error || !group) {
      toast({ title: "Group not found", description: "Check the invite code and try again.", variant: "destructive" });
      return;
    }

    const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Member";
    const { error: joinErr } = await supabase.from("study_group_members").upsert({
      group_id: group.id,
      user_id: user.id,
      display_name: displayName,
    }, { onConflict: "group_id,user_id" });

    if (joinErr) {
      toast({ title: "Error joining", description: joinErr.message, variant: "destructive" });
      return;
    }

    await fetchMyGroups();
    toast({ title: "Joined!", description: `Welcome to ${group.name}` });
    return group as StudyGroup;
  }, [user, toast, fetchMyGroups]);

  const enterGroup = useCallback(async (groupId: string) => {
    const { data: group } = await supabase
      .from("study_groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (!group) return;
    setCurrentGroup(group as StudyGroup);

    // Load members, messages, notes in parallel
    const [mRes, msgRes, nRes] = await Promise.all([
      supabase.from("study_group_members").select("*").eq("group_id", groupId).order("joined_at"),
      supabase.from("study_group_messages").select("*").eq("group_id", groupId).order("created_at").limit(100),
      supabase.from("study_group_notes").select("*").eq("group_id", groupId).order("updated_at", { ascending: false }),
    ]);

    if (mRes.data) setMembers(mRes.data as GroupMember[]);
    if (msgRes.data) setMessages(msgRes.data as GroupMessage[]);
    if (nRes.data) setNotes(nRes.data as GroupNote[]);
  }, []);

  const leaveGroup = useCallback(() => {
    setCurrentGroup(null);
    setMembers([]);
    setMessages([]);
    setNotes([]);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !currentGroup) return;
    const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

    await supabase.from("study_group_messages").insert({
      group_id: currentGroup.id,
      user_id: user.id,
      display_name: displayName,
      content,
    });
  }, [user, currentGroup]);

  const addNote = useCallback(async (title: string, content: string) => {
    if (!user || !currentGroup) return;
    const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

    const { data, error } = await supabase.from("study_group_notes").insert({
      group_id: currentGroup.id,
      user_id: user.id,
      display_name: displayName,
      title,
      content,
    }).select().single();

    if (data) setNotes((prev) => [data as GroupNote, ...prev]);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
  }, [user, currentGroup, toast]);

  const deleteNote = useCallback(async (noteId: string) => {
    await supabase.from("study_group_notes").delete().eq("id", noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  // Realtime subscriptions for current group
  useEffect(() => {
    if (!currentGroup) return;

    const channel = supabase
      .channel(`study-group-${currentGroup.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "study_group_messages",
        filter: `group_id=eq.${currentGroup.id}`,
      }, (payload) => {
        if (payload.new) {
          setMessages((prev) => [...prev, payload.new as GroupMessage]);
        }
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "study_group_members",
        filter: `group_id=eq.${currentGroup.id}`,
      }, async () => {
        const { data } = await supabase
          .from("study_group_members")
          .select("*")
          .eq("group_id", currentGroup.id)
          .order("joined_at");
        if (data) setMembers(data as GroupMember[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentGroup?.id]);

  useEffect(() => {
    fetchMyGroups();
  }, [fetchMyGroups]);

  return {
    myGroups, currentGroup, members, messages, notes, loading,
    createGroup, joinGroup, enterGroup, leaveGroup, sendMessage, addNote, deleteNote, fetchMyGroups,
  };
}
