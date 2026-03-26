import { motion } from "framer-motion";

interface PageBannerProps {
  title: string;
  subtitle?: string;
}

const PageBanner = ({ title, subtitle }: PageBannerProps) => (
  <div className="gradient-hero py-16 md:py-20">
    <div className="container mx-auto px-4 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl md:text-5xl font-heading font-bold text-primary-foreground"
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-3 text-primary-foreground/80 text-lg max-w-xl mx-auto"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  </div>
);

export default PageBanner;
