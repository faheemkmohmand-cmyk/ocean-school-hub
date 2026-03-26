import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  GraduationCap, Users, Trophy, BookOpen, Bell, ArrowRight,
  Calendar, MapPin, ChevronRight
} from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import StatCard from "@/components/shared/StatCard";
import SectionHeading from "@/components/shared/SectionHeading";

const stats = [
  { icon: Users, value: "500+", label: "Students" },
  { icon: GraduationCap, value: "25+", label: "Teachers" },
  { icon: Trophy, value: "98%", label: "Pass Rate" },
  { icon: Calendar, value: "2018", label: "Established" },
];

const quickLinks = [
  { to: "/results", label: "Check Results", icon: BookOpen, desc: "View exam results by class" },
  { to: "/notices", label: "Latest Notices", icon: Bell, desc: "Important announcements" },
  { to: "/library", label: "Digital Library", icon: BookOpen, desc: "Past papers & study material" },
  { to: "/gallery", label: "Photo Gallery", icon: Trophy, desc: "School events & activities" },
];

const Home = () => {
  return (
    <PageLayout>
      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-4 py-1.5 text-sm text-primary-foreground mb-6"
            >
              <MapPin className="w-4 h-4" />
              District Mohmand, KPK, Pakistan
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-6xl lg:text-7xl font-heading font-extrabold text-primary-foreground leading-tight"
            >
              GHS Babi Khel
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-4 text-lg md:text-xl text-primary-foreground/85 max-w-xl mx-auto"
            >
              Government High School — Excellence in Education since 2018.
              Nurturing tomorrow's leaders with quality education.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8 flex flex-wrap gap-4 justify-center"
            >
              <Link
                to="/about"
                className="inline-flex items-center gap-2 bg-white text-primary-dark font-semibold px-6 py-3 rounded-xl shadow-elevated hover:shadow-card transition-all duration-200"
              >
                Learn More
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/results"
                className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/30 text-primary-foreground font-semibold px-6 py-3 rounded-xl hover:bg-white/25 transition-all duration-200"
              >
                Check Results
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 -mt-10 relative z-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {stats.map((s, i) => (
              <StatCard key={s.label} {...s} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <SectionHeading title="Quick Access" subtitle="Everything you need in one place" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link, i) => (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={link.to}
                  className="group block bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mb-4">
                    <link.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground">{link.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{link.desc}</p>
                  <div className="flex items-center gap-1 text-primary text-sm font-medium mt-3 group-hover:gap-2 transition-all">
                    View <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="gradient-hero rounded-3xl p-10 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary-foreground">
              Join Our School Community
            </h2>
            <p className="mt-3 text-primary-foreground/80 max-w-lg mx-auto">
              Stay updated with the latest news, results, and events.
            </p>
            <Link
              to="/auth/signup"
              className="inline-flex items-center gap-2 mt-6 bg-white text-primary-dark font-semibold px-6 py-3 rounded-xl shadow-elevated hover:shadow-card transition-all"
            >
              Create Account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Home;
