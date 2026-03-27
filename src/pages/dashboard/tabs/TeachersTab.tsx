import { useState, useMemo, useRef } from "react";
import { Search, BookOpen } from "lucide-react";
import { useTeachers } from "@/hooks/useTeachers";
import { Skeleton } from "@/components/ui/skeleton";

const TeachersTab = () => {
  const { data: teachers = [], isLoading } = useTeachers();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const filtered = useMemo(
    () => teachers.filter((t) =>
      t.full_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (t.subject && t.subject.toLowerCase().includes(debouncedSearch.toLowerCase()))
    ),
    [teachers, debouncedSearch]
  );

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Search teachers..." className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-2 text-sm shadow-card focus:ring-2 focus:ring-ring outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)
          : filtered.map((t) => (
              <div key={t.id} className="bg-card rounded-xl p-5 shadow-card hover:shadow-elevated transition-shadow text-center">
                {t.photo_url ? (
                  <img src={t.photo_url} alt={t.full_name} loading="lazy" className="w-16 h-16 rounded-full mx-auto mb-3 object-cover ring-2 ring-secondary" />
                ) : (
                  <div className="w-16 h-16 rounded-full mx-auto mb-3 gradient-hero flex items-center justify-center text-primary-foreground font-heading font-bold">
                    {t.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                )}
                <h3 className="font-semibold text-foreground text-sm">{t.full_name}</h3>
                {t.subject && <span className="inline-block mt-1 text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t.subject}</span>}
                {t.qualification && <p className="text-xs text-muted-foreground mt-1">{t.qualification}</p>}
                {t.phone && <p className="text-xs text-muted-foreground mt-1">📞 {t.phone}</p>}
              </div>
            ))}
      </div>

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12 bg-card rounded-xl shadow-card">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No teachers found.</p>
        </div>
      )}
    </div>
  );
};

export default TeachersTab;
