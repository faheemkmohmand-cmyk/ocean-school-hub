import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, Send, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  id: string;
  user_id: string;
  content: string;
  is_admin_reply: boolean;
  created_at: string;
  sender_name: string | null;
}

const MessagesTab = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["user-messages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_messages")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user-messages-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "user_messages",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["user-messages", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from("user_messages").insert({
      user_id: user.id,
      content: text.trim(),
      is_admin_reply: false,
      sender_name: profile?.full_name || "User",
    });
    setSending(false);
    if (!error) setText("");
  };

  const deleteMessage = async (msgId: string) => {
    // Users can only delete their own non-admin-reply messages
    if (!user) return;
    await supabase.from("user_messages").delete().eq("id", msgId).eq("user_id", user.id);
    qc.invalidateQueries({ queryKey: ["user-messages", user.id] });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-h-[700px] space-y-0">
      {/* Header */}
      <div className="pb-4">
        <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" /> Message Admin
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Send a private message to the school admin</p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-secondary/30 rounded-2xl p-4 space-y-3 border border-border">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-primary/40" />
            </div>
            <p className="font-semibold text-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">Send a message below and admin will reply here</p>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = !msg.is_admin_reply;
            return (
              <div
                key={msg.id}
                className={`flex items-end gap-1.5 ${isOwn ? "justify-end" : "justify-start"}`}
              >
                {/* Delete button — only for own messages, shown on left of bubble */}
                {isOwn && (
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="p-1 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive opacity-0 hover:opacity-100 group-hover:opacity-100 transition-all shrink-0 order-first"
                    title="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <div
                  className={`group max-w-[75%] rounded-2xl px-4 py-3 space-y-1 ${
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border rounded-tl-sm"
                  }`}
                >
                  {msg.is_admin_reply && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary">Admin</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[10px] ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3 flex gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type your message... (Enter to send)"
          rows={2}
          className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-ring outline-none resize-none"
        />
        <button
          onClick={sendMessage}
          disabled={sending || !text.trim()}
          className="w-12 h-12 self-end rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default MessagesTab;
      
