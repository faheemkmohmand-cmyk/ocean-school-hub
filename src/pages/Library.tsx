import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, BookOpen, Search } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import PageBanner from "@/components/shared/PageBanner";

const categories = ["All", "Past Papers", "Books", "Notes", "Assignments"];
const classOptions = ["All", "6", "7", "8", "9", "10"];

const mockFiles = [
  { id: "1", title: "Mathematics Past Paper 2025 - Class 10", category: "Past Papers", class: "10", subject: "Mathematics", file_type: "PDF", download_count: 45 },
  { id: "2", title: "English Grammar Notes", category: "Notes", class: "9", subject: "English", file_type: "PDF", download_count: 32 },
  { id: "3", title: "Science Assignment - Chapter 5", category: "Assignments", class: "8", subject: "Science", file_type: "PDF", download_count: 18 },
  { id: "4", title: "Urdu Literature Book", category: "Books", class: "10", subject: "Urdu", file_type: "PDF", download_count: 56 },
  { id: "5", title: "Pakistan Studies Past Paper 2025", category: "Past Papers", class: "9", subject: "Pak Studies", file_type: "PDF", download_count: 67 },
];

const Library = () => {
  const [category, setCategory] = useState("All");
  const [classFilter, setClassFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = mockFiles.filter((f) => {
    if (category !== "All" && f.category !== category) return false;
    if (classFilter !== "All" && f.class !== classFilter) return false;
    if (search && !f.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <PageLayout>
      <PageBanner title="Digital Library" subtitle="Download study materials, past papers & more" />

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Filters */}
          <div className="bg-card rounded-2xl p-6 shadow-card mb-8">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files..."
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-ring outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    category === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
                  }`}
                >
                  {c}
                </button>
              ))}
              <div className="ml-auto">
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
                >
                  {classOptions.map((c) => (
                    <option key={c} value={c}>{c === "All" ? "All Classes" : `Class ${c}`}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Files */}
          <div className="space-y-3">
            {filtered.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl p-4 shadow-card flex items-center gap-4 hover:shadow-elevated transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground text-sm truncate">{f.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{f.subject}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">Class {f.class}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{f.download_count} downloads</span>
                  </div>
                </div>
                <button className="shrink-0 p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary-dark transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 bg-card rounded-2xl shadow-card">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No files found.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Library;
