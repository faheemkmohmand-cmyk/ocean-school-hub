import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ArrowRight, X, Bell } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import PageBanner from "@/components/shared/PageBanner";
import { useNews } from "@/hooks/useNews";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { NewsItem } from "@/hooks/useNews";

const PER_PAGE = 9;

const News = () => {
  const { data: allNews = [], isLoading } = useNews();
  const [page, setPage] = useState(1);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const featured = allNews[0];
  const rest = allNews.slice(1);
  const totalPages = Math.max(1, Math.ceil(rest.length / PER_PAGE));
  const paginated = rest.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <PageLayout>
      <PageBanner title="News & Updates" subtitle="Latest happenings at GHS Babi Khel" />

      <section className="py-16">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="space-y-8">
              <Skeleton className="h-72 w-full rounded-2xl" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-card">
                    <Skeleton className="h-48 w-full" />
                    <div className="p-5 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedNews(featured)}
                  className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 mb-10 cursor-pointer group"
                >
                  <div className="md:flex">
                    <div className="md:w-1/2 h-64 md:h-auto overflow-hidden bg-secondary">
                      {featured.image_url ? (
                        <img
                          src={featured.image_url}
                          alt={featured.title}
                          loading="eager"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full gradient-hero flex items-center justify-center min-h-[16rem]">
                          <Bell className="w-16 h-16 text-primary-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="md:w-1/2 p-8 flex flex-col justify-center">
                      <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Featured</span>
                      <p className="text-sm text-muted-foreground mb-2">
                        {format(new Date(featured.created_at), "dd MMM yyyy")}
                      </p>
                      <h2 className="text-2xl font-heading font-bold text-foreground">{featured.title}</h2>
                      {featured.content && (
                        <p className="text-muted-foreground mt-3 line-clamp-3">{featured.content}</p>
                      )}
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-4 group-hover:gap-2 transition-all">
                        Read Full Story <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {paginated.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    onClick={() => setSelectedNews(item)}
                    className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer group"
                  >
                    <div className="h-48 overflow-hidden bg-secondary">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full gradient-hero flex items-center justify-center">
                          <Bell className="w-10 h-10 text-primary-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-muted-foreground mb-2">
                        {format(new Date(item.created_at), "dd MMM yyyy")}
                      </p>
                      <h3 className="font-heading font-semibold text-foreground line-clamp-2">{item.title}</h3>
                      {item.content && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {allNews.length === 0 && (
                <div className="text-center py-16 bg-card rounded-2xl shadow-card">
                  <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No news articles yet.</p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        page === i + 1
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-muted"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Modal */}
      <AnimatePresence>
        {selectedNews && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedNews(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl shadow-elevated max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            >
              {selectedNews.image_url && (
                <img
                  src={selectedNews.image_url}
                  alt={selectedNews.title}
                  className="w-full h-56 object-cover rounded-t-2xl"
                />
              )}
              <div className="p-6 md:p-8">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {format(new Date(selectedNews.created_at), "dd MMMM yyyy")}
                    </p>
                    <h2 className="text-2xl font-heading font-bold text-foreground">{selectedNews.title}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedNews(null)}
                    className="shrink-0 p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
                <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {selectedNews.content || "No content available."}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
};

export default News;
