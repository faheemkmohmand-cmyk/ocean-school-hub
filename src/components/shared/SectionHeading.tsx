import { motion } from "framer-motion";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  className?: string;
}

const SectionHeading = ({ title, subtitle, className = "" }: SectionHeadingProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className={`text-center mb-10 ${className}`}
  >
    <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">{title}</h2>
    {subtitle && <p className="mt-2 text-muted-foreground max-w-xl mx-auto">{subtitle}</p>}
    <div className="mx-auto mt-4 w-16 h-1 rounded-full gradient-accent" />
  </motion.div>
);

export default SectionHeading;
