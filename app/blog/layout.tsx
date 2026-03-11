import { Navbar } from "@/components/layout/navbar";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-bg">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
