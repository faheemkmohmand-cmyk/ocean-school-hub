import { motion } from "framer-motion";
import { Bell, AlertTriangle, Calendar } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import PageBanner from "@/components/shared/PageBanner";

const mockNotices = [
  { id: "1", title: "Exam Schedule Announced", content: "Annual examinations for all classes will begin from March 15, 2026. Students must collect their admit cards from the office.", category: "Exams", is_urgent: true, created_at: "2026-03-20" },
  { id: "2", title: "Parent-Teacher Meeting", content: "A parent-teacher meeting is scheduled for March 25, 2026. All parents are requested to attend.", category: "General", is_urgent: false, created_at: "2026-03-18" },
  { id: "3", title: "Holiday Notice - Pakistan Day", content: "School will remain closed on March 23, 2026 on account of Pakistan Day celebrations.", category: "Holiday", is_urgent: false, created_at: "2026-03-15" },
  { id: "4", title: "Science Fair Registration", content: "Students interested in participating in the Science Fair can register by March 30. Contact your class teacher for details.", category: "Events", is_urgent: false, created_at: "2026-03-12" },
];

const Notices = () => {
  return (
    <PageLayout>
      <PageBanner title="Notice Board" subtitle="Stay updated with school announcements" />

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="space-y-4">
            {mockNotices.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`bg-card rounded-2xl p-6 shadow-card border-l-4 ${
                  n.is_urgent ? "border-l-destructive" : "border-l-primary"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {n.is_urgent && (
                        <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive text-xs font-medium px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" /> Urgent
                        </span>
                      )}
                      <span className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                        {n.category}
                      </span>
                    </div>
                    <h3 className="font-heading font-semibold text-foreground mt-2">{n.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.content}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(n.created_at).toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Notices;
