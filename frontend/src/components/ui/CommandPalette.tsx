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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#161b22] rounded-[4px] border-2 border-black dark:border-white overflow-hidden"
        style={{ boxShadow: "6px 6px 0 #000" }}
      >
        <Command className="w-full" shouldFilter={true}>
          <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-black dark:border-[#30363d]">
            <Search className="h-4 w-4 text-gray-400 dark:text-[#8b949e] shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search pages, actions..."
              className="flex-1 text-sm font-medium outline-none bg-transparent text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#8b949e]"
              autoFocus
            />
            <button
              onClick={onClose}
              className="flex items-center justify-center w-6 h-6 rounded-[3px] border-2 border-black dark:border-[#30363d] text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <Command.List className="max-h-72 overflow-y-auto py-2">
            <Command.Empty className="py-8 text-center text-xs font-black text-gray-400 dark:text-[#8b949e] uppercase tracking-wide">
              No results found.
            </Command.Empty>
            <Command.Group
              heading="Navigation"
              className="px-2 [&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:text-[10px] [&>[cmdk-group-heading]]:font-black [&>[cmdk-group-heading]]:text-gray-400 [&>[cmdk-group-heading]]:dark:text-[#8b949e] [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-widest"
            >
              {COMMANDS.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <Command.Item
                    key={cmd.href}
                    value={cmd.label}
                    onSelect={() => runCommand(cmd.href)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-[3px] text-sm font-medium text-black dark:text-white cursor-pointer aria-selected:bg-indigo-50 aria-selected:dark:bg-indigo-900/20 aria-selected:text-indigo-700 aria-selected:dark:text-indigo-400 transition-colors"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {cmd.label}
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>
          <div className="border-t-2 border-black dark:border-[#30363d] px-4 py-2 flex items-center gap-3 text-xs font-bold text-gray-400 dark:text-[#8b949e] bg-gray-50 dark:bg-[#0d1117]">
            <span>
              <kbd className="font-mono bg-white dark:bg-[#21262d] border border-black dark:border-[#30363d] px-1.5 py-0.5 rounded-[2px] text-black dark:text-white text-[10px]">↑↓</kbd>
              {" "}navigate
            </span>
            <span>
              <kbd className="font-mono bg-white dark:bg-[#21262d] border border-black dark:border-[#30363d] px-1.5 py-0.5 rounded-[2px] text-black dark:text-white text-[10px]">↵</kbd>
              {" "}select
            </span>
            <span>
              <kbd className="font-mono bg-white dark:bg-[#21262d] border border-black dark:border-[#30363d] px-1.5 py-0.5 rounded-[2px] text-black dark:text-white text-[10px]">Esc</kbd>
              {" "}close
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
