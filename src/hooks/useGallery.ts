import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface GalleryAlbum {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  created_at: string;
}

export interface GalleryPhoto {
  id: string;
  album_id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

export function useGalleryAlbums() {
  return useQuery<GalleryAlbum[]>({
    queryKey: ["gallery-albums"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_albums")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}

export function useGalleryPhotos(albumId: string | null) {
  return useQuery<GalleryPhoto[]>({
    queryKey: ["gallery-photos", albumId],
    queryFn: async () => {
      if (!albumId) return [];
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("*")
        .eq("album_id", albumId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!albumId,
    staleTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}

export function useAlbumPhotoCount(albumId: string) {
  return useQuery<number>({
    queryKey: ["gallery-photo-count", albumId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("gallery_photos")
        .select("*", { count: "exact", head: true })
        .eq("album_id", albumId);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });
}
