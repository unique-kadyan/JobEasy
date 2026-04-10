"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Search,
  FileText,
  Send,
  Mail,
  Settings,
  User,
  CreditCard,
  Sparkles,
  X,
} from "lucide-react";

const COMMANDS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Find Jobs", icon: Search, href: "/jobs" },
  { label: "Applications", icon: Send, href: "/applications" },
  { label: "Resumes", icon: FileText, href: "/resumes" },
  { label: "Smart Resume", icon: Sparkles, href: "/smart-resume" },
  { label: "Cover Letters", icon: Mail, href: "/cover-letters" },
  { label: "Profile", icon: User, href: "/profile" },
  { label: "Upgrade Plan", icon: CreditCard, href: "/pricing" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const runCommand = (href: string) => {
    router.push(href);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <Command className="w-full" shouldFilter={true}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search pages, actions..."
              className="flex-1 text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-400"
              autoFocus
            />
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Command.List className="max-h-72 overflow-y-auto py-2">
            <Command.Empty className="py-8 text-center text-sm text-gray-400">
              No results found.
            </Command.Empty>
            <Command.Group heading="Navigation" className="px-2">
              {COMMANDS.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <Command.Item
                    key={cmd.href}
                    value={cmd.label}
                    onSelect={() => runCommand(cmd.href)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {cmd.label}
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>
          <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-3 text-xs text-gray-400">
            <span><kbd className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">↵</kbd> select</span>
            <span><kbd className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">Esc</kbd> close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
