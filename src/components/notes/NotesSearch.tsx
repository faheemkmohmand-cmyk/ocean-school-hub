import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight, CircleAlert as AlertCircle } from "lucide-react";
import { useNoteSubjects, useNoteChapters } from "@/hooks/useNotes";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchResult {
  chapter: any;
  subject: any;
  matchText: string;
}

const NotesSearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const { data: subjects = [] } = useNoteSubjects();
  const { data: allChapters = [] } = useNoteChapters();

  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const q = debouncedQuery.toLowerCase();
    const hits: SearchResult[] = [];

    allChapters.forEach(chapter => {
      const subject = subjects.find(s => s.id === chapter.subject_id);
      if (!subject) return;

      const titleMatch = chapter.title.toLowerCase().includes(q);
      const descMatch = chapter.description?.toLowerCase().includes(q);
      const contentMatch = chapter.content?.toLowerCase().includes(q);

      if (titleMatch) {
        hits.push({
          chapter,
          subject,
          matchText: chapter.title,
        });
      } else if (descMatch && chapter.description) {
        const start = Math.max(0, chapter.description.toLowerCase().indexOf(q) - 30);
        const snippet = chapter.description.substring(start, start + 100);
        hits.push({
          chapter,
          subject,
          matchText: `${snippet}...`,
        });
      } else if (contentMatch) {
        hits.push({
          chapter,
          subject,
          matchText: `Found in chapter content`,
        });
      }
    });

    return hits.slice(0, 8);
  }, [debouncedQuery, allChapters, subjects]);

  const handleSelect = (chapter: any, subject: any) => {
    navigate(`/notes/${subject.slug}/${chapter.slug}`);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search chapters..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
        />
      </div>

      <AnimatePresence>
        {open && (query || searchResults.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
          >
            {searchResults.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(result.chapter, result.subject)}
                    className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors border-b border-border last:border-0"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-3 h-3 rounded-full mt-1 shrink-0"
                        style={{ backgroundColor: result.subject.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {result.chapter.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.subject.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {result.matchText}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            ) : query ? (
              <div className="p-6 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No chapters found</p>
                <p className="text-xs text-muted-foreground mt-1">Try searching by title or topic</p>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
};

export default NotesSearch;
