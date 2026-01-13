import { useQuery } from "@tanstack/react-query";
import { FileText, AlertTriangle, Euro, Mail, Clock, TrendingUp } from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { DunningLevelBadge } from "@/components/dunning-level-badge";
import { DataTableSkeleton } from "@/components/data-table-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { BhbReceiptsCache, PortalCustomer } from "@shared/schema";

interface DashboardStats {
  totalOpenAmount: number;
  overdueAmount: number;
  overdueCount: number;
  totalInvoices: number;
  dunningEmailsSent: number;
  customersCount: number;
  notDueCount: number;
  notDueAmount: number;
  overdue1to30Count: number;
  overdue1to30Amount: number;
  overdue30plusCount: number;
  overdue30plusAmount: number;
}

interface RecentInvoice extends BhbReceiptsCache {
  customer?: PortalCustomer;
  dunningLevel: string;
  daysOverdue: number;
  effectiveDueDate?: string | Date | null;
}

function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num === null || num === undefined || isNaN(num)) return "0,00 €";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(num);
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentInvoices, isLoading: invoicesLoading } = useQuery<RecentInvoice[]>({
    queryKey: ["/api/dashboard/recent-invoices"],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Übersicht über Ihre offenen Posten und das Mahnwesen
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-20 mt-2" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Offene Posten"
              value={formatCurrency(stats?.totalOpenAmount || 0)}
              description={`${stats?.totalInvoices || 0} offene Rechnungen`}
              icon={Euro}
            />
            <StatsCard
              title="Überfällig"
              value={formatCurrency(stats?.overdueAmount || 0)}
              description={`${stats?.overdueCount || 0} überfällige Rechnungen`}
              icon={AlertTriangle}
            />
            <StatsCard
              title="Debitoren"
              value={stats?.customersCount || 0}
              description="Aktive Debitoren"
              icon={FileText}
            />
            <StatsCard
              title="Mahnungen (Monat)"
              value={stats?.dunningEmailsSent || 0}
              description="Versendete Mahnungen"
              icon={Mail}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Letzte Rechnungen</CardTitle>
              <CardDescription>Die neuesten offenen Posten</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild data-testid="button-view-all-invoices">
              <Link href="/invoices">Alle anzeigen</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <DataTableSkeleton columns={4} rows={5} />
            ) : recentInvoices && recentInvoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rechnung</TableHead>
                    <TableHead>Fälligkeit</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.slice(0, 5).map((invoice) => (
                    <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-mono text-sm">{invoice.invoiceNumber || "-"}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.customer?.displayName || `Debitor ${invoice.debtorPostingaccountNumber}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(invoice.effectiveDueDate || invoice.dueDate)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(invoice.amountOpen || invoice.amountTotal)}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge
                          status={invoice.daysOverdue > 0 ? "overdue" : "unpaid"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={FileText}
                title="Keine Rechnungen"
                description="Es wurden noch keine Rechnungen synchronisiert. Starten Sie die BHB-Synchronisation."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Fälligkeitsübersicht</CardTitle>
              <CardDescription>Verteilung nach Fälligkeitsstatus</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium">Noch nicht fällig</p>
                    <p className="text-xs text-muted-foreground">Rechnungen innerhalb Zahlungsziel</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg tabular-nums">{stats?.notDueCount || 0}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(stats?.notDueAmount || 0)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium">1-30 Tage überfällig</p>
                    <p className="text-xs text-muted-foreground">Erinnerung erforderlich</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg tabular-nums">{stats?.overdue1to30Count || 0}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(stats?.overdue1to30Amount || 0)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <TrendingUp className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium">Über 30 Tage überfällig</p>
                    <p className="text-xs text-muted-foreground">Mahnung erforderlich</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg tabular-nums">{stats?.overdue30plusCount || 0}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(stats?.overdue30plusAmount || 0)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
