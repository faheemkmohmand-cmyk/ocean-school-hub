import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  delay?: number;
}

const StatCard = ({ icon: Icon, value, label, delay = 0 }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay }}
    className="bg-card rounded-2xl p-6 shadow-card text-center hover:shadow-elevated transition-shadow duration-300"
  >
    <div className="w-12 h-12 rounded-xl gradient-accent mx-auto mb-3 flex items-center justify-center">
      <Icon className="w-6 h-6 text-primary-foreground" />
    </div>
    <div className="text-3xl font-heading font-bold text-foreground">{value}</div>
    <div className="text-sm text-muted-foreground mt-1">{label}</div>
  </motion.div>
);

export default StatCard;
