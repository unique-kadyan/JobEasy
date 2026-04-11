import { createTheme, type PaletteMode } from "@mui/material/styles";

export function createMuiTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#6366f1",
        dark: "#4f46e5",
        light: "#818cf8",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#f59e0b",
        dark: "#d97706",
        light: "#fbbf24",
      },
      error: { main: "#ef4444" },
      warning: { main: "#f59e0b" },
      success: { main: "#22c55e" },
      background: {
        default: mode === "dark" ? "#0a0a0f" : "#f2f2f7",
        paper: mode === "dark" ? "#1c1c1e" : "#ffffff",
      },
      text: {
        primary: mode === "dark" ? "#ffffff" : "#1d1d1f",
        secondary: mode === "dark" ? "#8e8e93" : "#86868b",
      },
    },
    typography: {
      fontFamily:
        "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    shape: { borderRadius: 12 },
    components: {
      MuiTooltip: {
        defaultProps: { arrow: true, placement: "top" },
        styleOverrides: {
          tooltip: {
            fontSize: "0.7rem",
            fontWeight: 500,
            padding: "4px 8px",
            backgroundColor: mode === "dark" ? "#2c2c2e" : "#1d1d1f",
            color: "#ffffff",
            borderRadius: 6,
          },
          arrow: {
            color: mode === "dark" ? "#2c2c2e" : "#1d1d1f",
          },
        },
      },
      MuiCircularProgress: {
        defaultProps: { color: "inherit" },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 9999,
            fontWeight: 500,
            fontSize: "0.7rem",
            height: 22,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            backgroundImage: "none",
          },
        },
      },
      MuiSkeleton: {
        defaultProps: { animation: "wave" },
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 9999 },
        },
      },
    },
  });
}
