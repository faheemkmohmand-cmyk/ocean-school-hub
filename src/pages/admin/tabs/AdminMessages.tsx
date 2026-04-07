import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { MessageSquare, Send, Loader2, User, Search, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Conversation {
  user_id: string;
  sender_name: string | null;
  last_message: string;
  last_time: string;
  unread: number;
}

interface Message {
  id: string;
  user_id: string;
  content: string;
  is_admin_reply: boolean;
  created_at: string;
  sender_name: string | null;
}

const AdminMessages = () => {
  const qc = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch all conversations (one per user)
  const { data: conversations = [], isLoading: loadingConvs } = useQuery<Conversation[]>({
    queryKey: ["admin-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_messages")
        .select("user_id, sender_name, content, created_at, is_admin_reply")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Group by user_id
      const map = new Map<string, Conversation>();
      for (const msg of (data ?? [])) {
        if (!map.has(msg.user_id)) {
          map.set(msg.user_id, {
            user_id: msg.user_id,
            sender_name: msg.sender_name,
            last_message: msg.content,
            last_time: msg.created_at,
            unread: 0,
          });
        }
        if (!msg.is_admin_reply) {
          const c = map.get(msg.user_id)!;
          c.unread++;
        }
      }
      return Array.from(map.values());
    },
    refetchInterval: 10000,
  });

  // Fetch messages for selected user
  const { data: messages = [], isLoading: loadingMsgs } = useQuery<Message[]>({
    queryKey: ["admin-messages", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const { data, error } = await supabase
        .from("user_messages")
        .select("*")
        .eq("user_id", selectedUserId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedUserId,
    refetchInterval: 5000,
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-conversations"] });
        qc.invalidateQueries({ queryKey: ["admin-messages", selectedUserId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedUserId, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = async () => {
    if (!reply.trim() || !selectedUserId) return;
    setSending(true);
    const conv = conversations.find(c => c.user_id === selectedUserId);
    await supabase.from("user_messages").insert({
      user_id: selectedUserId,
      content: reply.trim(),
      is_admin_reply: true,
      sender_name: "Admin",
    });
    setSending(false);
    setReply("");
    qc.invalidateQueries({ queryKey: ["admin-messages", selectedUserId] });
    qc.invalidateQueries({ queryKey: ["admin-conversations"] });
  };

  const deleteMessage = async (msgId: string) => {
    await supabase.from("user_messages").delete().eq("id", msgId);
    qc.invalidateQueries({ queryKey: ["admin-messages", selectedUserId] });
    qc.invalidateQueries({ queryKey: ["admin-conversations"] });
  };

  const deleteConversation = async (userId: string) => {
    await supabase.from("user_messages").delete().eq("user_id", userId);
    qc.invalidateQueries({ queryKey: ["admin-conversations"] });
    if (selectedUserId === userId) setSelectedUserId(null);
  };

  const filteredConvs = search
    ? conversations.filter(c => c.sender_name?.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const selectedConv = conversations.find(c => c.user_id === selectedUserId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" /> User Messages
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Private messages from students and users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        {/* Conversations list */}
        <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="p-3 space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No messages yet</div>
            ) : (
              filteredConvs.map(conv => (
                <div
                  key={conv.user_id}
                  className={`group relative border-b border-border hover:bg-secondary/50 transition-colors ${
                    selectedUserId === conv.user_id ? "bg-primary/10" : ""
                  }`}
                >
                  <button
                    onClick={() => setSelectedUserId(conv.user_id)}
                    className="w-full text-left p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {conv.sender_name || "Unknown User"}
                          </p>
                          {conv.unread > 0 && (
                            <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0 ml-1 shrink-0">
                              {conv.unread}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
                      </div>
                    </div>
                  </button>
                  {/* Delete entire conversation */}
                  <button
                    onClick={() => deleteConversation(conv.user_id)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
          {!selectedUserId ? (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-semibold text-foreground">Select a conversation</p>
                <p className="text-sm text-muted-foreground mt-1">Choose a user from the left to view messages</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedConv?.sender_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">Private conversation</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/20">
                {loadingMsgs ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                  </div>
                ) : messages.map(msg => (
                  <div key={msg.id} className={`flex items-end gap-2 ${msg.is_admin_reply ? "justify-end" : "justify-start"}`}>
                    {!msg.is_admin_reply && (
                      <button onClick={() => deleteMessage(msg.id)} title="Delete"
                        className="p-1 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all mb-5 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.is_admin_reply
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-border rounded-tl-sm"
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.is_admin_reply ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {msg.is_admin_reply && (
                      <button onClick={() => deleteMessage(msg.id)} title="Delete"
                        className="p-1 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all mb-5 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply input */}
              <div className="p-3 border-t border-border flex gap-2">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Type your reply... (Enter to send)"
                  rows={2}
                  className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="w-12 h-12 self-end rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMessages;
      const { data, error } = await supabase
        .from("user_messages")
        .select("user_id, sender_name, content, created_at, is_admin_reply")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Group by user_id
      const map = new Map<string, Conversation>();
      for (const msg of (data ?? [])) {
        if (!map.has(msg.user_id)) {
          map.set(msg.user_id, {
            user_id: msg.user_id,
            sender_name: msg.sender_name,
            last_message: msg.content,
            last_time: msg.created_at,
            unread: 0,
          });
        }
        if (!msg.is_admin_reply) {
          const c = map.get(msg.user_id)!;
          c.unread++;
        }
      }
      return Array.from(map.values());
    },
    refetchInterval: 10000,
  });

  // Fetch messages for selected user
  const { data: messages = [], isLoading: loadingMsgs } = useQuery<Message[]>({
    queryKey: ["admin-messages", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const { data, error } = await supabase
        .from("user_messages")
        .select("*")
        .eq("user_id", selectedUserId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedUserId,
    refetchInterval: 5000,
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-conversations"] });
        qc.invalidateQueries({ queryKey: ["admin-messages", selectedUserId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedUserId, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = async () => {
    if (!reply.trim() || !selectedUserId) return;
    setSending(true);
    const conv = conversations.find(c => c.user_id === selectedUserId);
    await supabase.from("user_messages").insert({
      user_id: selectedUserId,
      content: reply.trim(),
      is_admin_reply: true,
      sender_name: "Admin",
    });
    setSending(false);
    setReply("");
    qc.invalidateQueries({ queryKey: ["admin-messages", selectedUserId] });
    qc.invalidateQueries({ queryKey: ["admin-conversations"] });
  };

  const filteredConvs = search
    ? conversations.filter(c => c.sender_name?.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const selectedConv = conversations.find(c => c.user_id === selectedUserId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" /> User Messages
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Private messages from students and users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        {/* Conversations list */}
        <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="p-3 space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No messages yet</div>
            ) : (
              filteredConvs.map(conv => (
                <button
                  key={conv.user_id}
                  onClick={() => setSelectedUserId(conv.user_id)}
                  className={`w-full text-left p-3 border-b border-border hover:bg-secondary/50 transition-colors ${
                    selectedUserId === conv.user_id ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {conv.sender_name || "Unknown User"}
                        </p>
                        {conv.unread > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0 ml-1 shrink-0">
                            {conv.unread}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
          {!selectedUserId ? (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-semibold text-foreground">Select a conversation</p>
                <p className="text-sm text-muted-foreground mt-1">Choose a user from the left to view messages</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedConv?.sender_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">Private conversation</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/20">
                {loadingMsgs ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                  </div>
                ) : messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.is_admin_reply ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.is_admin_reply
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-border rounded-tl-sm"
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.is_admin_reply ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply input */}
              <div className="p-3 border-t border-border flex gap-2">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Type your reply... (Enter to send)"
                  rows={2}
                  className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="w-12 h-12 self-end rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMessages;
