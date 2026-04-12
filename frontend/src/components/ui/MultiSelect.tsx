"use client";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

interface MultiSelectOption {
  value: string;
  label: string;
  group?: string;
}

interface MultiSelectProps {
  label?: string;
  placeholder?: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  searchable?: boolean;
  className?: string;
}

export default function MultiSelect({
  label,
  placeholder = "Select…",
  options,
  selected,
  onChange,
  className,
}: MultiSelectProps) {
  const selectedOptions = options.filter((o) => selected.includes(o.value));

  return (
    <Autocomplete
      className={className}
      multiple
      options={options}
      groupBy={(option) => option.group ?? ""}
      getOptionLabel={(option) => option.label}
      value={selectedOptions}
      onChange={(_, newValue) => onChange(newValue.map((v) => v.value))}
      isOptionEqualToValue={(option, value) => option.value === value.value}
      disableCloseOnSelect
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return (
            <Chip
              key={key}
              label={option.label}
              size="small"
              deleteIcon={
                <CloseRoundedIcon sx={{ fontSize: "14px !important" }} />
              }
              sx={{
                height: 24,
                fontSize: "0.75rem",
                fontWeight: 500,
                bgcolor: "rgba(99,102,241,0.1)",
                color: "primary.main",
                border: "1px solid rgba(99,102,241,0.25)",
                "& .MuiChip-deleteIcon": {
                  color: "primary.main",
                  opacity: 0.6,
                  "&:hover": { opacity: 1 },
                },
              }}
              {...tagProps}
            />
          );
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={selectedOptions.length === 0 ? placeholder : undefined}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "primary.main",
              },
            },
          }}
        />
      )}
      slotProps={{
        paper: {
          elevation: 0,
          sx: {
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            mt: 0.5,
          },
        },
        listbox: {
          sx: {
            py: 0.5,
            maxHeight: 260,
            "& .MuiAutocomplete-option": {
              borderRadius: 1.5,
              mx: 0.5,
              my: 0.125,
              fontSize: "0.875rem",
              fontWeight: 500,
              "&[aria-selected='true']": {
                bgcolor: "rgba(99,102,241,0.08)",
                color: "primary.main",
              },
              "&.Mui-focused": {
                bgcolor: "action.hover",
              },
              "&[aria-selected='true'].Mui-focused": {
                bgcolor: "rgba(99,102,241,0.12)",
              },
            },
            "& .MuiAutocomplete-groupLabel": {
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: "text.disabled",
              lineHeight: 2.5,
            },
          },
        },
      }}
    />
  );
}
