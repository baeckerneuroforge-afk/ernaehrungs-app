"use client";

import { useEffect } from "react";
import { MessageCircle, X } from "lucide-react";

interface Props {
  onClose: () => void;
  onOpen: () => void;
}

export function DmToast({ onClose, onOpen }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-white border border-gray-100 rounded-2xl shadow-xl px-4 py-3 max-w-xs animate-in slide-in-from-top-2 duration-300">
      <div className="w-9 h-9 rounded-full bg-primary-bg flex items-center justify-center flex-shrink-0">
        <MessageCircle className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">Janine hat geantwortet!</p>
        <button
          onClick={() => { onOpen(); onClose(); }}
          className="text-xs text-primary hover:text-primary-light transition"
        >
          Jetzt lesen →
        </button>
      </div>
      <button
        onClick={onClose}
        className="p-1 text-gray-300 hover:text-gray-500 transition flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
