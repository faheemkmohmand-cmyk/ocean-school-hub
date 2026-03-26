import { motion } from "framer-motion";
import { GraduationCap, Target, Eye, MapPin, Calendar, Users, Award } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import PageBanner from "@/components/shared/PageBanner";
import StatCard from "@/components/shared/StatCard";

const About = () => {
  return (
    <PageLayout>
      <PageBanner title="About Our School" subtitle="Learning today, leading tomorrow" />

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-heading font-bold text-foreground mb-4">
                Government High School Babi Khel
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Established in 2018, GHS Babi Khel is a government high school located in
                Babi Khel, District Mohmand, Khyber Pakhtunkhwa, Pakistan. The school serves
                as a beacon of education in the region, providing quality education from
                Class 6 to Class 10.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                With an EMIS Code of 60673, our school is officially registered with the
                Education Management Information System of KPK. We are committed to
                academic excellence with a remarkable 98% pass rate.
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm">
                  <MapPin className="w-4 h-4" /> District Mohmand
                </div>
                <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm">
                  <Calendar className="w-4 h-4" /> Est. 2018
                </div>
                <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm">
                  <GraduationCap className="w-4 h-4" /> EMIS: 60673
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="bg-card rounded-2xl p-6 shadow-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground">Our Mission</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To provide accessible, quality education that empowers students
                  with knowledge, skills, and values to become responsible citizens
                  and future leaders of Pakistan.
                </p>
              </div>

              <div className="bg-card rounded-2xl p-6 shadow-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
                    <Eye className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground">Our Vision</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To be a model government school that sets the standard for academic
                  excellence and character development in District Mohmand.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-secondary/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} value="500+" label="Students" delay={0} />
            <StatCard icon={GraduationCap} value="25+" label="Teachers" delay={0.1} />
            <StatCard icon={Award} value="98%" label="Pass Rate" delay={0.2} />
            <StatCard icon={Calendar} value="5" label="Classes (6-10)" delay={0.3} />
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default About;
