import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Camera, Image } from "lucide-react";
import { useGalleryAlbums, useGalleryPhotos } from "@/hooks/useGallery";
import { Skeleton } from "@/components/ui/skeleton";

const GalleryTab = () => {
  const { data: albums = [], isLoading } = useGalleryAlbums();
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const { data: photos = [], isLoading: photosLoading } = useGalleryPhotos(selectedAlbumId);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevPhoto = useCallback(() => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i)), []);
  const nextPhoto = useCallback(() => setLightboxIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : i)), [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevPhoto();
      if (e.key === "ArrowRight") nextPhoto();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, closeLightbox, prevPhoto, nextPhoto]);

  if (selectedAlbumId) {
    const album = albums.find((a) => a.id === selectedAlbumId);
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedAlbumId(null)} className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to Albums
        </button>
        {album && <h3 className="font-heading font-semibold text-foreground">{album.title}</h3>}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {photosLoading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)
            : photos.map((p, i) => (
                <div key={p.id} onClick={() => setLightboxIndex(i)} className="aspect-square rounded-lg overflow-hidden cursor-pointer group">
                  <img src={p.photo_url} alt={p.caption || ""} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                </div>
              ))}
        </div>
        {!photosLoading && photos.length === 0 && (
          <div className="text-center py-12 bg-card rounded-xl shadow-card">
            <Image className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No photos in this album.</p>
          </div>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxIndex !== null && photos[lightboxIndex] && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-foreground/90 backdrop-blur-md flex items-center justify-center" onClick={closeLightbox}>
              <button onClick={closeLightbox} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"><X className="w-6 h-6" /></button>
              {lightboxIndex > 0 && <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }} className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"><ChevronLeft className="w-8 h-8" /></button>}
              {lightboxIndex < photos.length - 1 && <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }} className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"><ChevronRight className="w-8 h-8" /></button>}
              <motion.div key={lightboxIndex} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[85vh]">
                <img src={photos[lightboxIndex].photo_url} alt="" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
                {photos[lightboxIndex].caption && <p className="text-white/80 text-sm mt-2 text-center">{photos[lightboxIndex].caption}</p>}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {isLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl overflow-hidden shadow-card">
              <Skeleton className="aspect-video w-full" />
              <div className="p-4 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div>
            </div>
          ))
        : albums.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-card rounded-xl shadow-card">
              <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No albums yet.</p>
            </div>
          ) : albums.map((album) => (
            <div key={album.id} onClick={() => setSelectedAlbumId(album.id)} className="bg-card rounded-xl overflow-hidden shadow-card hover:shadow-elevated transition-all cursor-pointer group">
              <div className="aspect-video overflow-hidden relative">
                {album.cover_url ? (
                  <img src={album.cover_url} alt={album.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full gradient-hero flex items-center justify-center"><Camera className="w-10 h-10 text-primary-foreground/40" /></div>
                )}
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-center justify-center">
                  <span className="text-white font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">View Photos</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground text-sm">{album.title}</h3>
                {album.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{album.description}</p>}
              </div>
            </div>
          ))}
    </div>
  );
};

export default GalleryTab;
