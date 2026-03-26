import { motion } from "framer-motion";
import { Image } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import PageBanner from "@/components/shared/PageBanner";

const mockAlbums = [
  { id: "1", title: "Annual Sports Day 2026", description: "Students competing in various sports events", photo_count: 12 },
  { id: "2", title: "Science Fair 2025", description: "Innovative projects by our students", photo_count: 8 },
  { id: "3", title: "Pakistan Day Celebrations", description: "Commemorating March 23rd with pride", photo_count: 15 },
  { id: "4", title: "Tree Plantation Drive", description: "Making our school campus green", photo_count: 6 },
];

const Gallery = () => {
  return (
    <PageLayout>
      <PageBanner title="Photo Gallery" subtitle="Moments captured at GHS Babi Khel" />

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockAlbums.map((album, i) => (
              <motion.div
                key={album.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer"
              >
                <div className="aspect-video gradient-hero flex items-center justify-center relative">
                  <Image className="w-12 h-12 text-primary-foreground/50" />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors duration-300" />
                </div>
                <div className="p-5">
                  <h3 className="font-heading font-semibold text-foreground">{album.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{album.description}</p>
                  <span className="text-xs text-primary font-medium mt-2 inline-block">{album.photo_count} photos</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Gallery;
