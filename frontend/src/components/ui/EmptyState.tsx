"use client";

import { LucideIcon } from "@/components/ui/icons";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import MuiButton from "@mui/material/Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 10,
        px: 3,
        textAlign: "center",
      }}
    >
      {/* Icon circle */}
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))",
          border: "1px solid rgba(99,102,241,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 2.5,
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: -6,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)",
          },
        }}
      >
        <Icon style={{ fontSize: 32, color: "#6366f1" }} />
      </Box>

      <Typography
        variant="h6"
        fontWeight={700}
        color="text.primary"
        mb={0.75}
      >
        {title}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 380, lineHeight: 1.6, mb: action || secondaryAction ? 3.5 : 0 }}
      >
        {description}
      </Typography>

      {(action || secondaryAction) && (
        <Stack direction="row" spacing={1.5}>
          {action && (
            <MuiButton
              variant="contained"
              onClick={action.onClick}
              disableElevation
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                "&:hover": { background: "linear-gradient(135deg, #4338ca, #4f46e5)" },
              }}
            >
              {action.label}
            </MuiButton>
          )}
          {secondaryAction && (
            <MuiButton
              variant="outlined"
              onClick={secondaryAction.onClick}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                borderColor: "divider",
                color: "text.secondary",
                "&:hover": { borderColor: "primary.main", color: "primary.main" },
              }}
            >
              {secondaryAction.label}
            </MuiButton>
          )}
        </Stack>
      )}
    </Box>
  );
}
