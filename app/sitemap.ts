import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.nutriva-ai.de";
  const now = new Date();
  return [
    { url: baseUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/hilfe`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/sign-up`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/sign-in`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/datenschutz`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/impressum`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/agb`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
