/**
 * Central icon layer — re-exports MUI icons using the same names as
 * lucide-react so all existing imports only need one line changed:
 *   from "lucide-react"  →  from "@/components/ui/icons"
 *
 * Supports Tailwind className sizing (className="h-5 w-5") and the
 * lucide `size` prop (size={20} → style.fontSize).
 * Color is always inherited so Tailwind text-* classes work as-is.
 */

import React from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import CircularProgress from "@mui/material/CircularProgress";

// ─── MUI Icon imports (individual paths = tree-shaken) ─────────────────────
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SendIcon from "@mui/icons-material/Send";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import MailIcon from "@mui/icons-material/Mail";
import DescriptionIcon from "@mui/icons-material/Description";
import WorkIcon from "@mui/icons-material/Work";
import SettingsIcon from "@mui/icons-material/Settings";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SecurityIcon from "@mui/icons-material/Security";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SearchIcon from "@mui/icons-material/Search";
import ForumIcon from "@mui/icons-material/Forum";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import BusinessIcon from "@mui/icons-material/Business";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkAddedIcon from "@mui/icons-material/BookmarkAdded";
import StarIcon from "@mui/icons-material/Star";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LockIcon from "@mui/icons-material/Lock";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import BarChartIcon from "@mui/icons-material/BarChart";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import SaveIcon from "@mui/icons-material/Save";
import InsertLinkIcon from "@mui/icons-material/InsertLink";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import LanguageIcon from "@mui/icons-material/Language";
import SchoolIcon from "@mui/icons-material/School";
import CodeIcon from "@mui/icons-material/Code";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";

// ─── Icon wrapper ───────────────────────────────────────────────────────────
type WrappedIconProps = Omit<SvgIconProps, "fontSize"> & {
  size?: number;
  strokeWidth?: number; // lucide compat — ignored, MUI uses fills
};

function wrap(MuiIcon: React.ComponentType<SvgIconProps>) {
  const WrappedIcon = ({
    size,
    strokeWidth: _sw,
    style,
    className,
    ...rest
  }: WrappedIconProps) => (
    <MuiIcon
      className={className}
      style={size ? { fontSize: size, ...style } : style}
      {...rest}
    />
  );
  WrappedIcon.displayName = MuiIcon.displayName;
  return WrappedIcon;
}

// ─── Named exports (lucide-compatible names) ───────────────────────────────
export const Zap            = wrap(BoltRoundedIcon);
export const Sparkles       = wrap(AutoAwesomeIcon);
export const Send           = wrap(SendIcon);
export const TrendingUp     = wrap(TrendingUpIcon);
export const CheckCircle    = wrap(CheckCircleIcon);
export const CheckCircle2   = wrap(CheckCircleOutlineIcon);
export const CheckCheck     = wrap(DoneAllIcon);
export const Mail           = wrap(MailIcon);
export const FileText       = wrap(DescriptionIcon);
export const Briefcase      = wrap(WorkIcon);
export const Settings       = wrap(SettingsIcon);
export const Moon           = wrap(DarkModeIcon);
export const Sun            = wrap(LightModeIcon);
export const ChevronDown    = wrap(KeyboardArrowDownIcon);
export const ChevronLeft    = wrap(ChevronLeftIcon);
export const ChevronRight   = wrap(ChevronRightIcon);
export const Bell           = wrap(NotificationsIcon);
export const Shield         = wrap(SecurityIcon);
export const CreditCard     = wrap(CreditCardIcon);
export const LayoutDashboard = wrap(DashboardIcon);
export const Search         = wrap(SearchIcon);
export const MessageSquare  = wrap(ForumIcon);
export const Crown          = wrap(WorkspacePremiumIcon);
export const LogOut         = wrap(LogoutIcon);
export const User           = wrap(PersonIcon);
export const MapPin         = wrap(LocationOnIcon);
export const Building2      = wrap(BusinessIcon);
export const Clock          = wrap(AccessTimeIcon);
export const DollarSign     = wrap(AttachMoneyIcon);
export const ExternalLink   = wrap(OpenInNewIcon);
export const Bookmark       = wrap(BookmarkIcon);
export const BookmarkCheck  = wrap(BookmarkAddedIcon);
export const Star           = wrap(StarIcon);
export const Upload         = wrap(CloudUploadIcon);
export const Trash2         = wrap(DeleteIcon);
export const Eye            = wrap(VisibilityIcon);
export const X              = wrap(CloseIcon);
export const ArrowRight     = wrap(ArrowForwardIcon);
export const Lock           = wrap(LockIcon);
export const AlertCircle    = wrap(ErrorOutlineIcon);
export const Trophy         = wrap(EmojiEventsIcon);
export const XCircle        = wrap(HighlightOffIcon);
export const BarChart3      = wrap(BarChartIcon);
export const Target         = wrap(TrackChangesIcon);
export const Rocket         = wrap(RocketLaunchIcon);
export const ChevronUp     = wrap(KeyboardArrowUpIcon);
export const ArrowLeft     = wrap(ArrowBackIcon);
export const KeyRound      = wrap(VpnKeyIcon);
export const BookOpen      = wrap(MenuBookIcon);
export const Plus          = wrap(AddIcon);
export const Edit2         = wrap(EditIcon);
export const Play          = wrap(PlayArrowIcon);
export const IndianRupee   = wrap(CurrencyRupeeIcon);
export const Save          = wrap(SaveIcon);
export const Link2         = wrap(InsertLinkIcon);
export const GitBranch     = wrap(AccountTreeIcon);
export const Globe         = wrap(LanguageIcon);
export const GraduationCap = wrap(SchoolIcon);
export const Code2         = wrap(CodeIcon);
export const Info          = wrap(InfoOutlinedIcon);
export const Download      = wrap(DownloadIcon);
export const RefreshCw     = wrap(RefreshIcon);
export const ReceiptText   = wrap(ReceiptLongIcon);
export const Mic           = wrap(MicIcon);
export const MicOff        = wrap(MicOffIcon);
export const Video         = wrap(VideocamIcon);
export const VideoOff      = wrap(VideocamOffIcon);
export const Keyboard      = wrap(KeyboardIcon);
export const ListChecks    = wrap(PlaylistAddCheckIcon);
export const AlertTriangle = wrap(WarningAmberIcon);
export const Copy          = wrap(ContentCopyRoundedIcon);
export const Inbox         = wrap(InboxRoundedIcon);
export const RotateCcw     = wrap(RotateLeftIcon);

// ─── LucideIcon type compat — used as prop type in EmptyState etc. ─────────
export type LucideIcon = React.ComponentType<WrappedIconProps>;

/**
 * Loader2 — replaces lucide Loader2 with MUI CircularProgress.
 * Usage:  <Loader2 className="h-4 w-4 animate-spin" />
 *     or: <Loader2 size={16} />
 * `animate-spin` is kept as a className for compat but MUI spins natively.
 */
export function Loader2({
  size,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const px = size ?? (className?.includes("h-3") ? 12 : className?.includes("h-5") ? 20 : 16);
  return (
    <CircularProgress
      size={px}
      color="inherit"
      className={className?.replace(/animate-spin\s?/g, "") ?? ""}
    />
  );
}
