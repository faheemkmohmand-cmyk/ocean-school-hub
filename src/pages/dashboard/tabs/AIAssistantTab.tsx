import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import {
  Sparkles, Send, Loader2, BookOpen, Calculator, FlaskConical,
  Globe, MessageSquare, RotateCcw, Copy, Check, ChevronDown, Atom, Scroll
} from "lucide-react";

const GEMINI_API_KEY = "AIzaSyAQc7S-wvwQEApgzc5V8yu7k79Ci7I8qg0";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { icon: Calculator, label: "Math Problem", text: "Solve this math problem step by step: " },
  { icon: Atom, label: "Physics Help", text: "Explain this Physics concept simply: " },
  { icon: FlaskConical, label: "Chemistry", text: "Explain this Chemistry topic: " },
  { icon: BookOpen, label: "English Grammar", text: "Explain this English grammar rule: " },
  { icon: Globe, label: "Pakistan Studies", text: "Tell me about this Pakistan Studies topic: " },
  { icon: Scroll, label: "Islamiyat", text: "Explain this Islamiyat topic: " },
];

const SYSTEM_PROMPT = `You are GHS Babi Khel's AI Study Assistant — a friendly, smart, and encouraging tutor for students at Government High School Babi Khel, District Mohmand, KPK, Pakistan.

Your role:
- Help students with their studies: Mathematics, Physics, Chemistry, Biology, English, Urdu, Islamiyat, Pakistan Studies, Computer Science
- Answer in simple, clear language appropriate for 6th to 10th grade students
- When explaining math or science, always show step-by-step solutions
- You can respond in English or Urdu depending on what the student uses
- Be warm, encouraging, and motivating — these students are from rural KPK and need confidence
- For BISE Peshawar exam preparation, focus on important topics and past paper patterns
- Keep answers concise but complete — no unnecessary long paragraphs
- Use bullet points and numbered steps when explaining procedures
- Always end with an encouraging note when a student seems struggling

Important: You are NOT a general chatbot. If someone asks something unrelated to education, politely redirect them to ask study questions.`;

function formatContent(text: string) {
  // Convert **bold** to <strong>
  let html = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, `<code class="bg-primary/10 text-primary px-1 py-0.5 rounded text-sm font-mono">$1</code>`)
    .replace(/\n\n/g, "</p><p class='mt-2'>")
    .replace(/\n/g, "<br/>");

  // Convert numbered lists
  html = html.replace(/(\d+\.\s)/g, "<br/>$1");

  // Convert bullet points
  html = html.replace(/•\s/g, "<br/>• ");

  return `<p>${html}</p>`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/20"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-white/60" />}
    </button>
  );
}

const AIAssistantTab = () => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [history, setHistory] = useState<{ role: string; parts: { text: string }[] }[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setShowQuick(false);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const newHistory = [
      ...history,
      { role: "user", parts: [{ text: text.trim() }] },
    ];

    try {
      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: newHistory,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't understand that. Please try again.";

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setHistory([
        ...newHistory,
        { role: "model", parts: [{ text: reply }] },
      ]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, something went wrong. Please check your internet connection and try again.",
        timestamp: new Date(),
      }]);
    }
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const clearChat = () => {
    setMessages([]);
    setHistory([]);
    setShowQuick(true);
  };

  const firstName = profile?.full_name?.split(" ")[0] || "Student";

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-4 shrink-0">
        <div className="flex items-center gap-3">
          {/* Animated logo */}
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 animate-pulse" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
              AI Study Assistant
              <span className="text-[10px] font-bold bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-2 py-0.5 rounded-full">BETA</span>
            </h2>
            <p className="text-xs text-muted-foreground">Powered by Google Gemini • GHS Babi Khel</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary px-3 py-1.5 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> New Chat
          </button>
        )}
      </div>

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">

        {/* Welcome + Quick prompts */}
        <AnimatePresence>
          {showQuick && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Welcome card */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 p-6 text-white">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm font-semibold opacity-90">Hello, {firstName}! 👋</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Your AI Study Buddy</h3>
                  <p className="text-sm opacity-80 leading-relaxed">
                    Ask me anything about your subjects — Math, Physics, Chemistry, English, Urdu, Islamiyat, Pakistan Studies and more. I'm here to help you excel! 🎓
                  </p>
                </div>
              </div>

              {/* Quick prompt chips */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Start</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {QUICK_PROMPTS.map((q) => (
                    <motion.button
                      key={q.label}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setInput(q.text); inputRef.current?.focus(); }}
                      className="flex items-center gap-2.5 p-3 bg-card border border-border rounded-xl text-left hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 flex items-center justify-center shrink-0 group-hover:from-violet-200 group-hover:to-indigo-200 transition-colors">
                        <q.icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">{q.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">💡 Tips for better answers</p>
                <ul className="text-xs text-amber-700/80 dark:text-amber-400/80 space-y-0.5">
                  <li>• Be specific — "Explain Newton's 2nd law with example"</li>
                  <li>• Share your class — "I'm in Class 10"</li>
                  <li>• Ask in Urdu if you prefer — main Urdu mein bhi jawab de sakta hoon</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat messages */}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* AI avatar */}
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-1">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}

              <div className={`group max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                {/* Bubble */}
                <div className={`relative rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-tr-sm"
                    : "bg-card border border-border rounded-tl-sm shadow-sm"
                }`}>
                  {msg.role === "user" ? (
                    <div className="flex items-start gap-2">
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <CopyButton text={msg.content} />
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div
                        className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                      />
                      <CopyButton text={msg.content} />
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <p className="text-[10px] text-muted-foreground px-1">
                  {msg.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              {/* User avatar */}
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 mt-1 text-primary-foreground text-xs font-bold">
                  {firstName[0]}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 items-start"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="text-xs text-muted-foreground ml-1">Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="pt-4 shrink-0">
        <div className="relative bg-card border border-border rounded-2xl shadow-sm focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-400/20 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask me anything about your studies... (Enter to send)"
            rows={2}
            disabled={loading}
            className="w-full bg-transparent px-4 pt-3 pb-2 text-sm resize-none outline-none text-foreground placeholder:text-muted-foreground disabled:opacity-50"
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <p className="text-[10px] text-muted-foreground">
              Shift+Enter for new line • Answers may not always be perfect
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="flex items-center gap-1.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-40 transition-opacity"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {loading ? "Thinking..." : "Send"}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantTab;
