import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Daily Recap",
    short_name: "Recap",
    description: "Catat keuangan, tugas, kebiasaan, dan jurnal — lalu lihat recap harimu.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#171717",
    categories: ["productivity", "lifestyle", "finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Recap hari ini", url: "/recap", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "To-Do", url: "/productivity/todos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
