import {
  LayoutDashboard,
  Swords,
  CalendarRange,
  Dumbbell,
  ScrollText,
  LineChart,
  Trophy,
  Users,
  User,
  Settings,
  Apple,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  mobileLabel?: string;
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobileLabel: "HOME", mobile: true },
  { href: "/quest", label: "Daily Quest", icon: Swords, mobileLabel: "QUEST", mobile: true },
  { href: "/routine", label: "Routine", icon: CalendarRange },
  { href: "/exercises", label: "Exercise Library", icon: Dumbbell },
  { href: "/quest-log", label: "Quest Log", icon: ScrollText },
  { href: "/progress", label: "Progress", icon: LineChart, mobileLabel: "PROGRESS", mobile: true },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/party", label: "Party", icon: Users, mobileLabel: "PARTY", mobile: true },
  { href: "/player", label: "Profile", icon: User, mobileLabel: "PLAYER", mobile: true },
  { href: "/diet", label: "Diet & Body", icon: Apple },
  { href: "/settings", label: "Settings", icon: Settings },
];
