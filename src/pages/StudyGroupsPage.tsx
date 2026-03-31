import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, LogIn, ArrowLeft, Send, StickyNote, MessageCircle, Crown,
  Copy, Zap, UserPlus, Trash2,
} from "lucide-react";
import { useStudyGroups } from "@/hooks/useStudyGroups";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function StudyGroupsPage() {
  const {
    myGroups, currentGroup, members, messages, notes, loading,
    createGroup, joinGroup, enterGroup, leaveGroup, sendMessage, addNote, deleteNote,
  } = useStudyGroups();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (currentGroup) {
    return (
      <GroupRoom
        group={currentGroup}
        members={members}
        messages={messages}
        notes={notes}
        user={user}
        onLeave={leaveGroup}
        onSendMessage={sendMessage}
        onAddNote={addNote}
        onDeleteNote={deleteNote}
        onStartQuiz={() => navigate("/quiz")}
        toast={toast}
      />
    );
  }

  return <GroupLobby myGroups={myGroups} loading={loading} onCreateGroup={createGroup} onJoinGroup={joinGroup} onEnterGroup={enterGroup} />;
}

/* ========== LOBBY ========== */
function GroupLobby({
  myGroups, loading, onCreateGroup, onJoinGroup, onEnterGroup,
}: {
  myGroups: any[];
  loading: boolean;
  onCreateGroup: (name: string, desc?: string) => Promise<any>;
  onJoinGroup: (code: string) => Promise<any>;
  onEnterGroup: (id: string) => Promise<void>;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    await onCreateGroup(groupName, groupDesc);
    setGroupName("");
    setGroupDesc("");
    setCreateOpen(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    await onJoinGroup(joinCode);
    setJoinCode("");
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold">Study Groups</h1>
        <p className="mt-1 text-muted-foreground">Collaborate, chat, and learn together in real-time.</p>
      </motion.div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" /> Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Create Study Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Group Name</Label>
                <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Biology Study Crew" />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder="What will you study?" rows={2} />
              </div>
              <Button onClick={handleCreate} disabled={!groupName.trim()} className="w-full bg-gradient-primary text-primary-foreground">
                Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex gap-2">
          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter invite code"
            className="w-40"
            maxLength={6}
          />
          <Button variant="outline" onClick={handleJoin} disabled={joinCode.length < 4}>
            <LogIn className="h-4 w-4 mr-2" /> Join
          </Button>
        </div>
      </div>

      {/* My Groups */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading groups...</div>
      ) : myGroups.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">You haven't joined any groups yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Create one or join with an invite code!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {myGroups.map((g) => (
            <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className="border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => onEnterGroup(g.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display font-semibold text-lg">{g.name}</h3>
                      {g.description && <p className="text-sm text-muted-foreground mt-1">{g.description}</p>}
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      <Users className="h-3 w-3 mr-1" /> {g.member_count}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========== ROOM ========== */
function GroupRoom({
  group, members, messages, notes, user, onLeave, onSendMessage, onAddNote, onDeleteNote, onStartQuiz, toast,
}: {
  group: any;
  members: any[];
  messages: any[];
  notes: any[];
  user: any;
  onLeave: () => void;
  onSendMessage: (content: string) => void;
  onAddNote: (title: string, content: string) => void;
  onDeleteNote: (id: string) => void;
  onStartQuiz: () => void;
  toast: any;
}) {
  const [msgInput, setMsgInput] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    if (!msgInput.trim()) return;
    onSendMessage(msgInput.trim());
    setMsgInput("");
  };

  const handleAddNote = () => {
    if (!noteTitle.trim()) return;
    onAddNote(noteTitle, noteContent);
    setNoteTitle("");
    setNoteContent("");
    setNoteDialogOpen(false);
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.invite_code);
    toast({ title: "Copied!", description: `Invite code: ${group.invite_code}` });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onLeave}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold truncate">{group.name}</h1>
          <p className="text-xs text-muted-foreground">{members.length} members</p>
        </div>
        <Button variant="outline" size="sm" onClick={copyInviteCode}>
          <Copy className="h-3.5 w-3.5 mr-1.5" /> {group.invite_code}
        </Button>
        <Button size="sm" className="bg-gradient-primary text-primary-foreground" onClick={onStartQuiz}>
          <Zap className="h-3.5 w-3.5 mr-1.5" /> Quiz
        </Button>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat"><MessageCircle className="h-4 w-4 mr-1.5" /> Chat</TabsTrigger>
          <TabsTrigger value="notes"><StickyNote className="h-4 w-4 mr-1.5" /> Notes</TabsTrigger>
          <TabsTrigger value="members"><Users className="h-4 w-4 mr-1.5" /> Members</TabsTrigger>
        </TabsList>

        {/* CHAT TAB */}
        <TabsContent value="chat">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] p-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-16 text-sm">
                    No messages yet. Say hi! 👋
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m) => {
                      const isMe = m.user_id === user?.id;
                      return (
                        <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            {!isMe && <p className="text-xs font-medium mb-0.5 opacity-70">{m.display_name}</p>}
                            <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                            <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </ScrollArea>
              <Separator />
              <div className="p-3 flex gap-2">
                <Input
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-1"
                />
                <Button size="icon" onClick={handleSend} disabled={!msgInput.trim()} className="bg-gradient-primary text-primary-foreground">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTES TAB */}
        <TabsContent value="notes">
          <div className="space-y-4">
            <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1.5" /> Add Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Add Shared Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Note title" />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Write your notes..." rows={6} />
                  </div>
                  <Button onClick={handleAddNote} disabled={!noteTitle.trim()} className="w-full bg-gradient-primary text-primary-foreground">
                    Save Note
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {notes.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center">
                  <StickyNote className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No notes yet. Share something useful!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {notes.map((n) => (
                  <Card key={n.id} className="border-border/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base font-display">{n.title}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">by {n.display_name}</p>
                        </div>
                        {n.user_id === user?.id && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteNote(n.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.content || "No content"}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* MEMBERS TAB */}
        <TabsContent value="members">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="space-y-3">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium">{m.display_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.display_name}</p>
                        <p className="text-xs text-muted-foreground">Joined {new Date(m.joined_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {m.role === "owner" && (
                      <Badge variant="secondary" className="text-xs">
                        <Crown className="h-3 w-3 mr-1" /> Owner
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
