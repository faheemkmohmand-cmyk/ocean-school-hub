import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X, Globe, ExternalLink, Clock, WifiOff, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useNews } from "@/hooks/useNews";
import { useLiveNews, LiveNewsArticle } from "@/hooks/useLiveNews";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDistanceToNow, format } from "date-fns";
import type { NewsItem } from "@/hooks/useNews";

// ─── Live news card (compact for dashboard) ────────────────────────────────────
function LiveCard({ article }: { article: LiveNewsArticle }) {
  const [imgErr, setImgErr] = useState(false);
  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(article.pubDate), { addSuffix: true }); }
    catch { return article.pubDate; }
  })();

  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 bg-card rounded-xl p-3 border border-border/40 hover:border-primary/30 hover:shadow-md transition-all duration-200"
    >
      {/* thumbnail */}
      <div className="w-20 h-16 shrink-0 rounded-lg overflow-hidden bg-secondary">
        {article.image_url && !imgErr ? (
          <img
            src={article.image_url}
            alt=""
            onError={() => setImgErr(true)}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary/40" />
          </div>
        )}
      </div>
      {/* text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
          {article.source_icon && (
            <img src={article.source_icon} alt="" className="w-3 h-3 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
          <span className="font-medium truncate">{article.source_name}</span>
          <span className="mx-0.5 text-muted-foreground/40">·</span>
          <Clock className="w-2.5 h-2.5" />
          <span>{timeAgo}</span>
        </div>
        <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {article.title}
        </h4>
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Read more <ExternalLink className="w-2.5 h-2.5" />
        </span>
      </div>
    </a>
  );
}

const LIVE_PER_PAGE = 6;
const LIVE_CATEGORIES = [
  { label: "🌐 Top", q: "" },
  { label: "🏫 Education", q: "education school students" },
  { label: "🔬 Science", q: "science technology" },
  { label: "🏆 Sports", q: "sports" },
];

function LiveNewsTab() {
  const [activeCat, setActiveCat] = useState(0);
  const [page, setPage] = useState(1);
  const { data: articles = [], isLoading, isError, refetch, isFetching } =
    useLiveNews(LIVE_CATEGORIES[activeCat].q, "en", 10);

  const totalPages = Math.max(1, Math.ceil(articles.length / LIVE_PER_PAGE));
  const paginated = articles.slice((page - 1) * LIVE_PER_PAGE, page * LIVE_PER_PAGE);

  const handleCat = (i: number) => { setActiveCat(i); setPage(1); };

  return (
    <div className="space-y-4">
      {/* Category pills + refresh */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {LIVE_CATEGORIES.map((cat, i) => (
            <button
              key={i}
              onClick={() => handleCat(i)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
                activeCat === i
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh"
          className="p-1.5 bg-card border border-border rounded-lg hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-20 h-16 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-10 bg-card rounded-xl border border-border/40">
          <WifiOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground mb-1">Could not load live news</p>
          <p className="text-xs text-muted-foreground mb-3">Check your connection or try again later.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-10 bg-card rounded-xl border border-border/40">
          <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No articles found.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paginated.map((article) => (
              <LiveCard key={article.article_id} article={article} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-card border border-border text-muted-foreground hover:bg-secondary disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                    page === i + 1
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-card border border-border text-muted-foreground hover:bg-secondary disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <p className="text-center text-[10px] text-muted-foreground">
            Powered by{" "}
            <a href="https://newsdata.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">
              NewsData.io
            </a>
            {" "}· Auto-cached 15 min
          </p>
        </>
      )}
    </div>
  );
}

// ─── School news sub-tab (unchanged logic) ─────────────────────────────────────
function SchoolNewsTab() {
  const { data: news = [], isLoading } = useNews();
  const [selected, setSelected] = useState<NewsItem | null>(null);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl overflow-hidden shadow-card">
              <Skeleton className="h-40 w-full" />
              <div className="p-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl shadow-card">
          <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No school news yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {news.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelected(item)}
              className="bg-card rounded-xl overflow-hidden shadow-card hover:shadow-elevated transition-all cursor-pointer group"
            >
              <div className="h-40 overflow-hidden bg-secondary">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full gradient-hero flex items-center justify-center"><Bell className="w-8 h-8 text-primary-foreground/40" /></div>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{format(new Date(item.created_at), "dd MMM yyyy")}</p>
                <h3 className="font-semibold text-foreground text-sm line-clamp-2">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl shadow-elevated max-w-lg w-full max-h-[80vh] overflow-y-auto">
              {selected.image_url && <img src={selected.image_url} alt="" className="w-full h-48 object-cover rounded-t-2xl" />}
              <div className="p-6">
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{format(new Date(selected.created_at), "dd MMMM yyyy")}</p>
                    <h2 className="text-xl font-heading font-bold text-foreground mt-1">{selected.title}</h2>
                  </div>
                  <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-muted-foreground text-sm whitespace-pre-line">{selected.content || "No content."}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Combined tab with sub-tabs ────────────────────────────────────────────────
const NewsTab = () => (
  <div className="space-y-4">
    <Tabs defaultValue="school" className="w-full">
      <TabsList className="w-full grid grid-cols-2 sm:inline-flex sm:w-auto">
        <TabsTrigger value="school" className="gap-1.5 text-xs sm:text-sm">
          <Bell className="w-3.5 h-3.5" />
          <span>School News</span>
        </TabsTrigger>
        <TabsTrigger value="live" className="gap-1.5 text-xs sm:text-sm">
          <Globe className="w-3.5 h-3.5" />
          <span>World News</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="school" className="mt-4"><SchoolNewsTab /></TabsContent>
      <TabsContent value="live" className="mt-4"><LiveNewsTab /></TabsContent>
    </Tabs>
  </div>
);

export default NewsTab;
    
