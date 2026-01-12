import { Badge } from "@/components/ui/badge";

type DunningLevel = "none" | "reminder" | "dunning1" | "dunning2" | "dunning3";

interface DunningLevelBadgeProps {
  level: DunningLevel;
}

const levelConfig: Record<DunningLevel, { label: string; className: string }> = {
  none: {
    label: "Keine",
    className: "bg-muted text-muted-foreground hover:bg-muted",
  },
  reminder: {
    label: "Erinnerung",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30",
  },
  dunning1: {
    label: "Mahnung 1",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30",
  },
  dunning2: {
    label: "Mahnung 2",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30",
  },
  dunning3: {
    label: "Mahnung 3",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30",
  },
};

export function DunningLevelBadge({ level }: DunningLevelBadgeProps) {
  const config = levelConfig[level];

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
