import { Badge } from "@/components/ui/badge";
import { Check, Clock, AlertTriangle, AlertCircle } from "lucide-react";

type PaymentStatus = "paid" | "unpaid" | "overdue" | "urgent";

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  daysOverdue?: number;
}

const statusConfig: Record<PaymentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Check }> = {
  paid: {
    label: "Bezahlt",
    variant: "secondary",
    icon: Check,
  },
  unpaid: {
    label: "Offen",
    variant: "outline",
    icon: Clock,
  },
  overdue: {
    label: "Überfällig",
    variant: "destructive",
    icon: AlertTriangle,
  },
  urgent: {
    label: "Dringend",
    variant: "destructive",
    icon: AlertCircle,
  },
};

export function PaymentStatusBadge({ status, daysOverdue }: PaymentStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
      {daysOverdue !== undefined && daysOverdue > 0 && ` (${daysOverdue}T)`}
    </Badge>
  );
}
