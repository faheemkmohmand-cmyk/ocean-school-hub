import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Mic, MicOff, Star, StarOff, Clock, X, BookOpen,
  ExternalLink, ChevronRight, Loader2, Atom, History, Calculator,
  Globe, Sparkles, AlertCircle, Shuffle, ChevronDown
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface WikiArticle {
  title: string;
  extract: string;
  thumbnail?: { source: string; width: number; height: number };
  content_urls?: { desktop: { page: string } };
  related?: RelatedItem[];
}

interface RelatedItem {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls?: { desktop: { page: string } };
}

interface SearchSuggestion {
  title: string;
  snippet: string;
}

interface SavedFavorite {
  title: string;
  extract: string;
  thumbnail?: string;
  url?: string;
  savedAt: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all", label: "All", icon: Globe },
  { id: "science", label: "Science", icon: Atom },
  { id: "history", label: "History", icon: History },
  { id: "math", label: "Math", icon: Calculator },
];

const CATEGORY_SEEDS: Record<string, string[]> = {
  science: ["Photosynthesis", "Gravity", "DNA", "Solar System", "Evolution", "Atom", "Newton's laws of motion"],
  history: ["World War II", "Indus Valley civilization", "Muhammad Ali Jinnah", "Mughal Empire", "Alexander the Great"],
  math: ["Pythagorean theorem", "Prime number", "Algebra", "Pi", "Calculus", "Fibonacci number"],
  all: ["Pakistan", "Water cycle", "Human body", "Electricity", "Internet", "Climate change", "Democracy"],
};

const STORAGE_KEY_RECENTS = "wiki_recent_searches";
const STORAGE_KEY_FAVORITES = "wiki_favorites";

// ─── Helper: localStorage ──────────────────────────────────────────────────────
function loadJSON<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}
function saveJSON(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* noop */ }
}

// ─── Wikipedia API ─────────────────────────────────────────────────────────────
async function fetchSuggestions(query: string): Promise<SearchSuggestion[]> {
  if (!query.trim()) return [];
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=6&namespace=0&format=json&origin=*`;
  const res = await fetch(url);
  const [, titles, snippets] = await res.json();
  return (titles as string[]).map((title: string, i: number) => ({ title, snippet: (snippets as string[])[i] || "" }));
}

async function fetchArticle(title: string): Promise<WikiArticle | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function fetchRelated(title: string): Promise<RelatedItem[]> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/related/${encodeURIComponent(title)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.pages || []).slice(0, 4);
  } catch { return []; }
}

async function fetchRandomArticle(): Promise<WikiArticle | null> {
  const res = await fetch("https://en.wikipedia.org/api/rest_v1/page/random/summary");
  if (!res.ok) return null;
  return res.json();
}

// ─── Main Component ────────────────────────────────────────────────────────────
interface WikipediaSearchProps {
  compact?: boolean; // for widget mode
}

const WikipediaSearch = ({ compact = false }: WikipediaSearchProps) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [article, setArticle] = useState<WikiArticle | null>(null);
  const [related, setRelated] = useState<RelatedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [isRandomLoading, setIsRandomLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadJSON(STORAGE_KEY_RECENTS, []));
  const [favorites, setFavorites] = useState<SavedFavorite[]>(() => loadJSON(STORAGE_KEY_FAVORITES, []));
  const [view, setView] = useState<"search" | "recents" | "favorites">("search");
  const [isListening, setIsListening] = useState(false);
  const [dailyFact, setDailyFact] = useState<WikiArticle | null>(null);
  const [showFullExtract, setShowFullExtract] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const recognitionRef = useRef<any>(null);

  // ── Daily Fact ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const seeds = CATEGORY_SEEDS[activeCategory] || CATEGORY_SEEDS.all;
    const idx = new Date().getDate() % seeds.length;
    fetchArticle(seeds[idx]).then((a) => { if (a) setDailyFact(a); });
  }, [activeCategory]);

  // ── Suggestions debounce ──────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const s = await fetchSuggestions(query);
      setSuggestions(s);
      setShowSuggestions(true);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // ── Search ────────────────────────────────────────────────────────────────────
  const doSearch = useCallback(async (term: string) => {
    if (!term.trim()) return;
    setShowSuggestions(false);
    setIsLoading(true);
    setError(null);
    setArticle(null);
    setRelated([]);
    setShowFullExtract(false);
    try {
      const art = await fetchArticle(term);
      if (!art) { setError(`No Wikipedia article found for "${term}".`); }
      else {
        setArticle(art);
        const updated = [term, ...recentSearches.filter((r) => r !== term)].slice(0, 10);
        setRecentSearches(updated);
        saveJSON(STORAGE_KEY_RECENTS, updated);
        setIsLoadingRelated(true);
        fetchRelated(term).then((r) => { setRelated(r); setIsLoadingRelated(false); });
      }
    } catch {
      setError("Failed to fetch article. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, [recentSearches]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { doSearch(query); }
    if (e.key === "Escape") { setShowSuggestions(false); }
  };

  // ── Random ────────────────────────────────────────────────────────────────────
  const handleRandom = async () => {
    setIsRandomLoading(true);
    setError(null);
    const art = await fetchRandomArticle();
    if (art) {
      setArticle(art);
      setQuery(art.title);
      setIsLoadingRelated(true);
      fetchRelated(art.title).then((r) => { setRelated(r); setIsLoadingRelated(false); });
    }
    setIsRandomLoading(false);
  };

  // ── Voice Search ─────────────────────────────────────────────────────────────
  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice search not supported in this browser."); return; }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
      doSearch(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  // ── Favorites ─────────────────────────────────────────────────────────────────
  const isFavorited = article ? favorites.some((f) => f.title === article.title) : false;

  const toggleFavorite = () => {
    if (!article) return;
    let updated: SavedFavorite[];
    if (isFavorited) {
      updated = favorites.filter((f) => f.title !== article.title);
    } else {
      updated = [
        { title: article.title, extract: article.extract.slice(0, 200), thumbnail: article.thumbnail?.source, url: article.content_urls?.desktop.page, savedAt: Date.now() },
        ...favorites,
      ].slice(0, 20);
    }
    setFavorites(updated);
    saveJSON(STORAGE_KEY_FAVORITES, updated);
  };

  const clearRecents = () => { setRecentSearches([]); saveJSON(STORAGE_KEY_RECENTS, []); };

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="wiki-search-root font-sans text-foreground">
      <style>{`
        .wiki-search-root {
          --wiki-accent: #3b82f6;
          --wiki-accent-dark: #2563eb;
          --wiki-glass: rgba(255,255,255,0.05);
          --wiki-border: rgba(148,163,184,0.15);
        }
        .dark .wiki-search-root {
          --wiki-glass: rgba(0,0,0,0.2);
        }
        .wiki-hero-gradient {
          background: linear-gradient(135deg, #1e3a5f 0%, #042C53 50%, #0f172a 100%);
        }
        .wiki-card {
          background: var(--card);
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06);
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .wiki-card:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.12); transform: translateY(-1px); }
        .wiki-input-wrap { position: relative; }
        .wiki-suggestions {
          position: absolute; top: calc(100% + 6px); left: 0; right: 0;
          background: var(--card); border: 1px solid hsl(var(--border));
          border-radius: 12px; z-index: 50;
          box-shadow: 0 8px 32px rgba(0,0,0,0.16);
          overflow: hidden;
        }
        .wiki-suggestion-item {
          padding: 10px 14px; cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid hsl(var(--border));
        }
        .wiki-suggestion-item:last-child { border-bottom: none; }
        .wiki-suggestion-item:hover { background: hsl(var(--accent)); }
        .wiki-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 12px; border-radius: 999px; font-size: 12px;
          font-weight: 600; cursor: pointer; transition: all 0.15s;
          border: 1.5px solid transparent;
        }
        .wiki-chip-active {
          background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
          border-color: hsl(var(--primary));
        }
        .wiki-chip-inactive {
          background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground));
        }
        .wiki-chip-inactive:hover { border-color: hsl(var(--primary)); color: hsl(var(--primary)); }
        .wiki-skeleton {
          background: linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--accent)) 50%, hsl(var(--muted)) 100%);
          background-size: 200% 100%;
          animation: wiki-shimmer 1.4s infinite;
          border-radius: 8px;
        }
        @keyframes wiki-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .wiki-pulse { animation: wiki-pulse-anim 1.5s ease-in-out infinite; }
        @keyframes wiki-pulse-anim { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .wiki-fade-in { animation: wiki-fade 0.3s ease; }
        @keyframes wiki-fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .wiki-related-card {
          display: flex; gap: 10px; padding: 12px;
          background: hsl(var(--secondary)); border-radius: 12px;
          cursor: pointer; transition: all 0.15s; text-decoration: none;
        }
        .wiki-related-card:hover { background: hsl(var(--accent)); transform: translateY(-1px); }
        .wiki-extract-text { line-height: 1.7; font-size: 14px; color: hsl(var(--foreground)/0.85); }
        .wiki-img { border-radius: 12px; object-fit: cover; }
        .wiki-voice-active { background: #ef4444 !important; color: white !important; animation: wiki-pulse-anim 1s infinite; }
      `}</style>

      {/* ── Header / Hero ─────────────────────────────────────────────── */}
      {!compact && (
        <div className="wiki-hero-gradient rounded-2xl p-6 mb-5 text-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Wikipedia Research</h2>
              <p className="text-xs text-white/60">Instant knowledge for students</p>
            </div>
            <button
              onClick={handleRandom}
              disabled={isRandomLoading}
              title="Random article"
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
            >
              {isRandomLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shuffle className="w-3.5 h-3.5" />}
              Random
            </button>
          </div>
        </div>
      )}

      {/* ── Category Filters ──────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap mb-4">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`wiki-chip ${activeCategory === cat.id ? "wiki-chip-active" : "wiki-chip-inactive"}`}
            >
              <Icon className="w-3 h-3" />
              {cat.label}
            </button>
          );
        })}
        {/* View toggles */}
        <div className="ml-auto flex gap-1.5">
          {["search", "recents", "favorites"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v as any)}
              className={`wiki-chip text-[11px] ${view === v ? "wiki-chip-active" : "wiki-chip-inactive"}`}
            >
              {v === "search" && <Search className="w-3 h-3" />}
              {v === "recents" && <Clock className="w-3 h-3" />}
              {v === "favorites" && <Star className="w-3 h-3" />}
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search Bar ────────────────────────────────────────────────── */}
      <div className="wiki-input-wrap mb-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search Wikipedia… (press Enter)"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary transition-shadow"
            />
            {query && (
              <button onClick={() => { setQuery(""); setSuggestions([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Voice */}
          <button
            onClick={toggleVoice}
            title="Voice search"
            className={`px-3 rounded-xl border border-input bg-background hover:bg-secondary transition-colors ${isListening ? "wiki-voice-active" : ""}`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          {/* Search btn */}
          <button
            onClick={() => doSearch(query)}
            disabled={isLoading || !query.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="wiki-suggestions">
            {suggestions.map((s) => (
              <div key={s.title} className="wiki-suggestion-item" onMouseDown={() => { setQuery(s.title); doSearch(s.title); }}>
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                {s.snippet && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{s.snippet}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RECENTS VIEW ─────────────────────────────────────────────── */}
      {view === "recents" && (
        <div className="wiki-card p-4 wiki-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Recent Searches</h3>
            {recentSearches.length > 0 && <button onClick={clearRecents} className="text-xs text-destructive hover:underline">Clear all</button>}
          </div>
          {recentSearches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No recent searches yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((r) => (
                <button key={r} onClick={() => { setQuery(r); doSearch(r); setView("search"); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent text-sm transition-colors">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" /> {r}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FAVORITES VIEW ────────────────────────────────────────────── */}
      {view === "favorites" && (
        <div className="wiki-fade-in space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Saved Favorites</h3>
          {favorites.length === 0 ? (
            <div className="wiki-card p-8 text-center">
              <Star className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No favorites saved yet. Star an article to save it here!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {favorites.map((fav) => (
                <div key={fav.title} className="wiki-card p-4 flex gap-3">
                  {fav.thumbnail && <img src={fav.thumbnail} alt="" className="w-14 h-14 wiki-img shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <button onClick={() => { setQuery(fav.title); doSearch(fav.title); setView("search"); }}
                      className="text-sm font-bold text-primary hover:underline text-left">{fav.title}</button>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{fav.extract}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {fav.url && <a href={fav.url} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Open</a>}
                      <button onClick={() => { setFavorites(p => { const u = p.filter(f => f.title !== fav.title); saveJSON(STORAGE_KEY_FAVORITES, u); return u; }); }}
                        className="text-[11px] text-destructive hover:underline ml-auto">Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SEARCH VIEW ──────────────────────────────────────────────── */}
      {view === "search" && (
        <div className="space-y-5">
          {/* Loading state */}
          {isLoading && (
            <div className="wiki-card p-5 wiki-fade-in space-y-3">
              <div className="wiki-skeleton h-6 w-2/5" />
              <div className="flex gap-4">
                <div className="wiki-skeleton h-28 w-28 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="wiki-skeleton h-3 w-full" />
                  <div className="wiki-skeleton h-3 w-full" />
                  <div className="wiki-skeleton h-3 w-4/5" />
                  <div className="wiki-skeleton h-3 w-3/5" />
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="wiki-card p-5 flex items-start gap-3 wiki-fade-in border-destructive/30">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Not Found</p>
                <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
                <button onClick={handleRandom} className="mt-2 text-xs text-primary hover:underline flex items-center gap-1">
                  <Shuffle className="w-3 h-3" /> Try a random article
                </button>
              </div>
            </div>
          )}

          {/* Article result */}
          {article && !isLoading && (
            <div className="wiki-card p-5 wiki-fade-in">
              {/* Title row */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{article.title}</h3>
                  <a href={article.content_urls?.desktop.page} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5">
                    <ExternalLink className="w-3 h-3" /> Open full article on Wikipedia
                  </a>
                </div>
                <button onClick={toggleFavorite} title={isFavorited ? "Remove from favorites" : "Save to favorites"}
                  className={`p-2 rounded-lg transition-colors shrink-0 ${isFavorited ? "bg-amber-100 dark:bg-amber-900/30 text-amber-500" : "bg-secondary text-muted-foreground hover:text-amber-500"}`}>
                  {isFavorited ? <Star className="w-5 h-5 fill-amber-400" /> : <StarOff className="w-5 h-5" />}
                </button>
              </div>

              {/* Image + extract */}
              <div className={`flex gap-4 ${article.thumbnail ? "flex-col sm:flex-row" : ""}`}>
                {article.thumbnail && (
                  <img src={article.thumbnail.source} alt={article.title}
                    className="wiki-img w-full sm:w-36 h-36 object-cover shrink-0" />
                )}
                <div className="flex-1">
                  <p className="wiki-extract-text">
                    {showFullExtract ? article.extract : article.extract.slice(0, 400)}
                    {article.extract.length > 400 && !showFullExtract && "…"}
                  </p>
                  {article.extract.length > 400 && (
                    <button onClick={() => setShowFullExtract(!showFullExtract)}
                      className="mt-2 text-xs text-primary hover:underline flex items-center gap-0.5">
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFullExtract ? "rotate-180" : ""}`} />
                      {showFullExtract ? "Show less" : "Read more"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Related articles */}
          {(isLoadingRelated || related.length > 0) && !isLoading && (
            <div className="wiki-fade-in">
              <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Related Topics
              </h4>
              {isLoadingRelated ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((i) => <div key={i} className="wiki-skeleton h-16 rounded-xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {related.map((r) => (
                    <a key={r.title} href={r.content_urls?.desktop?.page || "#"} target="_blank" rel="noopener noreferrer"
                      className="wiki-related-card" onClick={(e) => { e.preventDefault(); setQuery(r.title); doSearch(r.title); }}>
                      {r.thumbnail && <img src={r.thumbnail.source} alt="" className="w-12 h-12 wiki-img shrink-0 object-cover" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground line-clamp-1">{r.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{r.extract}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 self-center" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Daily Fact (when no search result) */}
          {!article && !isLoading && !error && dailyFact && (
            <div className="wiki-fade-in">
              <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> Daily Knowledge Fact
              </h4>
              <div className="wiki-card p-4 border-l-4 border-amber-400">
                <div className="flex gap-3">
                  {dailyFact.thumbnail && (
                    <img src={dailyFact.thumbnail.source} alt="" className="w-16 h-16 wiki-img shrink-0 object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{dailyFact.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3 mt-1">{dailyFact.extract.slice(0, 200)}…</p>
                    <button onClick={() => { setQuery(dailyFact.title); doSearch(dailyFact.title); }}
                      className="mt-2 text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                      <ChevronRight className="w-3.5 h-3.5" /> Learn more
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!article && !isLoading && !error && !dailyFact && (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Search for any topic to explore Wikipedia.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WikipediaSearch;
