import { Leaf } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Leaf className="w-4 h-4 text-primary" />
            <span className="text-sm">Ernährungsberatung</span>
          </div>
          <p className="text-xs text-gray-400 text-center max-w-lg">
            Hinweis: Diese App ersetzt keine ärztliche Beratung. Bei
            gesundheitlichen Beschwerden wende dich bitte an deinen Arzt oder
            deine Ärztin.
          </p>
        </div>
      </div>
    </footer>
  );
}
