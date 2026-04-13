"use client";

import { useMemo } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { useThemeStore } from "@/store/theme-store";
import { createMuiTheme } from "@/lib/mui-theme";

export default function Providers({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();
  const muiTheme = useMemo(() => createMuiTheme(theme === "dark" ? "dark" : "light"), [theme]);

  return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
}
