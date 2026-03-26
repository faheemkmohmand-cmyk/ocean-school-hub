import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import PageBanner from "@/components/shared/PageBanner";

const mockNews = [
  { id: "1", title: "GHS Babi Khel Students Shine in Board Exams", content: "Our students have achieved outstanding results in the latest board examinations with a 98% pass rate. Several students secured positions in the district merit list.", created_at: "2026-03-15" },
  { id: "2", title: "Annual Sports Day Celebration", content: "The school successfully organized its Annual Sports Day with students participating in various athletic events. The chief guest was the District Education Officer.", created_at: "2026-03-10" },
  { id: "3", title: "New Computer Lab Inaugurated", content: "A state-of-the-art computer lab with 20 computers has been inaugurated at the school, enabling students to learn modern IT skills.", created_at: "2026-02-28" },
];

const News = () => {
  return (
    <PageLayout>
      <PageBanner title="News & Updates" subtitle="Latest happenings at GHS Babi Khel" />

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-6">
            {mockNews.map((n, i) => (
              <motion.article
                key={n.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-shadow duration-300"
              >
                <div className="p-6 md:p-8">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(n.created_at).toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}
                  </div>
                  <h2 className="text-xl font-heading font-bold text-foreground">{n.title}</h2>
                  <p className="text-muted-foreground mt-3 leading-relaxed">{n.content}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default News;
