"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-lg rounded-[4px] bg-white dark:bg-[#161b22] border-2 border-black dark:border-white p-6 mx-4"
        style={{ boxShadow: "var(--nb-shadow-lg)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-black text-black dark:text-white uppercase tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-[3px] border-2 border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors nb-lift nb-shadow-sm"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
