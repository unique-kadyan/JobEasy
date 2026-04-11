"use client";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import { X } from "@/components/ui/icons";
import { useThemeStore } from "@/store/theme-store";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "sm",
}: ModalProps) {
  const { theme } = useThemeStore();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      slotProps={{
        backdrop: { sx: { backdropFilter: "blur(4px)", backgroundColor: "rgba(0,0,0,0.4)" } },
        paper: {
          sx: {
            backgroundColor: theme === "dark" ? "#1c1c1e" : "#ffffff",
            backgroundImage: "none",
            boxShadow:
              theme === "dark"
                ? "0 20px 60px rgba(0,0,0,0.5)"
                : "0 20px 60px rgba(0,0,0,0.15)",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
          fontSize: "0.9375rem",
          fontWeight: 600,
          color: theme === "dark" ? "#ffffff" : "#1d1d1f",
        }}
      >
        {title}
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: theme === "dark" ? "#8e8e93" : "#86868b",
            "&:hover": {
              color: theme === "dark" ? "#ffffff" : "#1d1d1f",
              backgroundColor: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            },
          }}
        >
          <X className="h-4 w-4" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: "8px !important" }}>{children}</DialogContent>
    </Dialog>
  );
}
