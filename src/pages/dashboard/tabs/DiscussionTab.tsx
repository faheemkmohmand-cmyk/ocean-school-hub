import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Users, Send, Loader2, ShieldCheck, GraduationCap, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DiscussionMessage {
  id: string;
  user_id: string;
  content: string;
  sender_name: string | null;
  sender_role: string | null;
  created_at: string;
}

function RoleBadge({ role }: { role: string | null }) {
  if (role === "admin") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full">
      <ShieldCheck className="w-2.5 h-2.5" /> Admin
    </span>
  );
  if (role === "teacher") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
      <GraduationCap className="w-2.5 h-2.5" /> Teacher
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
      <User className="w-2.5 h-2.5" /> Student
    </span>
  );
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function getAvatarColor(role: string | null) {
  if (role === "admin") return "bg-red-500";
  if (role === "teacher") return "bg-emerald-500";
  return "bg-blue-500";
}

const DiscussionTab = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<DiscussionMessage[]>({
    queryKey: ["discussion-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discussion_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 5000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("discussion-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "discussion_messages",
      }, (payload) => {
        qc.setQueryData<DiscussionMessage[]>(["discussion-messages"], (old = []) => {
          const exists = old.some(m => m.id === payload.new.id);
          if (exists) return old;
          return [...old, payload.new as DiscussionMessage];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    // Ensure sender_name is never a UUID or null
    const safeName = profile?.full_name && !profile.full_name.includes("-")
      ? profile.full_name
      : "User";
    await supabase.from("discussion_messages").insert({
      user_id: user.id,
      content: text.trim(),
      sender_name: safeName,
      sender_role: profile?.role || "user",
    });
    setSending(false);
    setText("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Group consecutive messages from same user
  const grouped = messages.reduce<{ msg: DiscussionMessage; isFirst: boolean }[]>((acc, msg, i) => {
    const prev = messages[i - 1];
    const isFirst = !prev || prev.user_id !== msg.user_id ||
      (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) > 5 * 60 * 1000;
    acc.push({ msg, isFirst });
    return acc;
  }, []);

  const isMe = (msg: DiscussionMessage) => msg.user_id === user?.id;

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-h-[750px]">
      {/* Header */}
      <div className="pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> School Discussion
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Open chat for all students, teachers & admin
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-full px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-secondary/20 rounded-2xl p-4 space-y-1 border border-border">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary/40" />
            </div>
            <p className="font-semibold text-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">Be the first to start the discussion!</p>
          </div>
        ) : (
          grouped.map(({ msg, isFirst }) => {
            const mine = isMe(msg);
            return (
              <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"} ${isFirst ? "mt-3" : "mt-0.5"}`}>
                {/* Avatar for others */}
                {!mine && (
                  <div className="flex flex-col items-center mr-2 mt-auto">
                    {isFirst && (
                      <div className={`w-8 h-8 rounded-full ${getAvatarColor(msg.sender_role)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {getInitials(msg.sender_name)}
                      </div>
                    )}
                    {!isFirst && <div className="w-8" />}
                  </div>
                )}

                <div className={`max-w-[70%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  {/* Name + role badge for first in group — shown for ALL senders */}
                  {isFirst && (
                    <div className={`flex items-center gap-1.5 mb-1 px-1 ${mine ? "justify-end flex-row-reverse" : ""}`}>
                      <span className="text-xs font-semibold text-foreground">
                        {msg.sender_name && !msg.sender_name.includes("-") ? msg.sender_name : (mine ? (profile?.full_name || "Me") : "User")}
                      </span>
                      <RoleBadge role={msg.sender_role} />
                    </div>
                  )}

                  <div className={`rounded-2xl px-4 py-2.5 ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border rounded-tl-sm"
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Timestamp for last in group */}
                  <p className="text-[10px] text-muted-foreground mt-0.5 px-1">
                    {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3 flex gap-2 items-end">
        <div className={`w-8 h-8 rounded-full ${getAvatarColor(profile?.role || null)} flex items-center justify-center text-white text-xs font-bold shrink-0 mb-1`}>
          {getInitials(profile?.full_name || null)}
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message everyone... (Enter to send, Shift+Enter for new line)"
          rows={2}
          className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-ring outline-none resize-none"
        />
        <button
          onClick={sendMessage}
          disabled={sending || !text.trim()}
          className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default DiscussionTab;
