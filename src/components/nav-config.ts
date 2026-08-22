import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  CalendarDays,
  CalendarRange,
  Clock,
  Library,
  ClipboardCheck,
  BookOpenCheck,
  Trophy,
  AlertTriangle,
  SlidersHorizontal,
  Award,
  Medal,
  Wallet,
  BarChart3,
  MessageSquare,
  FileQuestion,
  UserCog,
  Bot,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@prisma/client";

export type NavItem = { key: string; href: string; icon: LucideIcon };
export type NavGroup = { groupKey: string; items: NavItem[] };

const item = {
  dashboard: { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  students: { key: "students", href: "/students", icon: Users },
  teachers: { key: "teachers", href: "/teachers", icon: GraduationCap },
  classes: { key: "classes", href: "/classes", icon: School },
  schedule: { key: "schedule", href: "/schedule", icon: CalendarDays },
  attendance: { key: "attendance", href: "/attendance", icon: ClipboardCheck },
  grades: { key: "grades", href: "/grades", icon: BookOpenCheck },
  ranking: { key: "ranking", href: "/ranking", icon: Trophy },
  penalties: { key: "penalties", href: "/penalties", icon: AlertTriangle },
  penaltyCriteria: {
    key: "penaltyCriteria",
    href: "/penalty-criteria",
    icon: SlidersHorizontal,
  },
  rewards: { key: "rewards", href: "/rewards", icon: Award },
  rewardCriteria: {
    key: "rewardCriteria",
    href: "/reward-criteria",
    icon: Medal,
  },
  payments: { key: "payments", href: "/payments", icon: Wallet },
  reports: { key: "reports", href: "/reports", icon: BarChart3 },
  messages: { key: "messages", href: "/messages", icon: MessageSquare },
  tests: { key: "tests", href: "/tests", icon: FileQuestion },
  aiAssistant: { key: "aiAssistant", href: "/ai-assistant", icon: Bot },
  users: { key: "users", href: "/users", icon: UserCog },
  subjects: { key: "subjects", href: "/subjects", icon: Library },
  academicYears: {
    key: "academicYears",
    href: "/academic-years",
    icon: CalendarRange,
  },
  lessonPeriods: { key: "lessonPeriods", href: "/lesson-periods", icon: Clock },
} satisfies Record<string, NavItem>;

export const navGroupsByRole: Record<Role, NavGroup[]> = {
  ADMIN: [
    { groupKey: "overview", items: [item.dashboard] },
    {
      groupKey: "academic",
      items: [
        item.students,
        item.teachers,
        item.classes,
        item.schedule,
        item.attendance,
        item.grades,
        item.ranking,
        item.tests,
      ],
    },
    {
      groupKey: "discipline",
      items: [
        item.penalties,
        item.penaltyCriteria,
        item.rewards,
        item.rewardCriteria,
      ],
    },
    { groupKey: "finance", items: [item.payments, item.reports] },
    {
      groupKey: "system",
      items: [item.messages, item.aiAssistant, item.users],
    },
    {
      groupKey: "settings",
      items: [item.subjects, item.academicYears, item.lessonPeriods],
    },
  ],
  TEACHER: [
    { groupKey: "overview", items: [item.dashboard] },
    {
      groupKey: "academic",
      items: [
        item.students,
        item.classes,
        item.schedule,
        item.attendance,
        item.grades,
        item.ranking,
        item.tests,
      ],
    },
    {
      groupKey: "discipline",
      items: [item.penalties, item.rewards],
    },
    { groupKey: "system", items: [item.aiAssistant] },
  ],
  ACCOUNTANT: [
    { groupKey: "overview", items: [item.dashboard] },
    { groupKey: "academic", items: [item.students] },
    { groupKey: "finance", items: [item.payments, item.reports] },
    { groupKey: "system", items: [item.messages] },
  ],
  PARENT: [
    { groupKey: "overview", items: [item.dashboard] },
    {
      groupKey: "academic",
      items: [item.grades, item.attendance, item.ranking],
    },
    {
      groupKey: "discipline",
      items: [item.penalties, item.rewards],
    },
    { groupKey: "finance", items: [item.payments] },
  ],
};

export const navByRole: Record<Role, NavItem[]> = {
  ADMIN: navGroupsByRole.ADMIN.flatMap((group) => group.items),
  TEACHER: navGroupsByRole.TEACHER.flatMap((group) => group.items),
  ACCOUNTANT: navGroupsByRole.ACCOUNTANT.flatMap((group) => group.items),
  PARENT: navGroupsByRole.PARENT.flatMap((group) => group.items),
};
