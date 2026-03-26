import { motion } from "framer-motion";
import { Mail, Phone, BookOpen } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import PageBanner from "@/components/shared/PageBanner";

const mockTeachers = [
  { id: "1", full_name: "Mr. Ahmad Khan", subject: "Mathematics", qualification: "M.Sc Mathematics", experience: "10 years" },
  { id: "2", full_name: "Mr. Fazal Rahim", subject: "English", qualification: "MA English", experience: "8 years" },
  { id: "3", full_name: "Mr. Zahid Ullah", subject: "Science", qualification: "M.Sc Physics", experience: "12 years" },
  { id: "4", full_name: "Mr. Sher Bahadur", subject: "Urdu", qualification: "MA Urdu", experience: "15 years" },
  { id: "5", full_name: "Mr. Noor Muhammad", subject: "Islamiat", qualification: "MA Islamic Studies", experience: "9 years" },
  { id: "6", full_name: "Mr. Saeed Khan", subject: "Social Studies", qualification: "MA History", experience: "7 years" },
];

const Teachers = () => {
  return (
    <PageLayout>
      <PageBanner title="Our Teachers" subtitle="Dedicated educators shaping the future" />

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockTeachers.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 group"
              >
                <div className="h-32 gradient-hero relative">
                  <div className="absolute -bottom-10 left-6">
                    <div className="w-20 h-20 rounded-2xl bg-secondary border-4 border-card flex items-center justify-center">
                      <span className="text-2xl font-heading font-bold text-primary">
                        {t.full_name.charAt(0)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pt-14 p-6">
                  <h3 className="font-heading font-semibold text-lg text-foreground">{t.full_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-sm text-primary font-medium">{t.subject}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{t.qualification}</p>
                  <p className="text-sm text-muted-foreground">{t.experience} experience</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Teachers;
