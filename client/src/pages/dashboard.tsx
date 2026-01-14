import { useQuery } from "@tanstack/react-query";
import { FileText, AlertTriangle, Euro, Mail, Clock, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
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
import { Link, useLocation } from "wouter";
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

interface OverdueInvoice extends BhbReceiptsCache {
  customer?: PortalCustomer;
  dunningLevel: string;
  daysOverdue: number;
  effectiveDueDate?: string | Date | null;
}

interface TopDebtor {
  debtorPostingaccountNumber: number;
  displayName: string;
  openAmount: number;
  overdueAmount: number;
  invoiceCount: number;
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
  const [, setLocation] = useLocation();
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: overdueInvoices, isLoading: invoicesLoading } = useQuery<OverdueInvoice[]>({
    queryKey: ["/api/dashboard/top-overdue-invoices"],
  });

  const { data: topDebtors, isLoading: debtorsLoading } = useQuery<TopDebtor[]>({
    queryKey: ["/api/dashboard/top-debtors"],
  });

  const navigateToInvoices = (filter: string, value?: string) => {
    const params = new URLSearchParams();
    if (filter === "status") {
      params.set("status", value || "unpaid");
    } else if (filter === "overdueAge") {
      params.set("overdueAge", value || "");
    } else if (filter === "debtor") {
      params.set("debtor", value || "");
    }
    setLocation(`/invoices?${params.toString()}`);
  };

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
            <Card 
              className="cursor-pointer hover-elevate transition-colors"
              onClick={() => navigateToInvoices("status", "unpaid")}
              data-testid="stats-card-open"
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Offene Posten</p>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(stats?.totalOpenAmount || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats?.totalInvoices || 0} offene Rechnungen</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover-elevate transition-colors"
              onClick={() => navigateToInvoices("status", "overdue")}
              data-testid="stats-card-overdue"
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Überfällig</p>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(stats?.overdueAmount || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats?.overdueCount || 0} überfällige Rechnungen</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover-elevate transition-colors"
              onClick={() => setLocation("/customers")}
              data-testid="stats-card-debtors"
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Debitoren</p>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{stats?.customersCount || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Aktive Debitoren</p>
              </CardContent>
            </Card>

            <Card data-testid="stats-card-dunning">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Mahnungen (Monat)</p>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{stats?.dunningEmailsSent || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Versendete Mahnungen</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Top 10 Überfällige Rechnungen</CardTitle>
              <CardDescription>Rechnungen mit der längsten Überfälligkeit</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild data-testid="button-view-all-invoices">
              <Link href="/invoices?status=overdue">Alle anzeigen</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <DataTableSkeleton columns={4} rows={5} />
            ) : overdueInvoices && overdueInvoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rechnung</TableHead>
                    <TableHead>Fälligkeit</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead className="text-right">Tage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueInvoices.slice(0, 10).map((invoice) => (
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
                      <TableCell className="text-right">
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          +{invoice.daysOverdue}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={FileText}
                title="Keine überfälligen Rechnungen"
                description="Es gibt derzeit keine überfälligen Rechnungen."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Top 10 Debitoren</CardTitle>
              <CardDescription>Debitoren mit höchsten offenen Beträgen</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild data-testid="button-view-all-customers">
              <Link href="/customers">Alle anzeigen</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {debtorsLoading ? (
              <DataTableSkeleton columns={3} rows={5} />
            ) : topDebtors && topDebtors.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Debitor</TableHead>
                    <TableHead className="text-right">Offen</TableHead>
                    <TableHead className="text-right">Überfällig</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDebtors.slice(0, 10).map((debtor) => (
                    <TableRow 
                      key={debtor.debtorPostingaccountNumber} 
                      className="cursor-pointer hover-elevate"
                      onClick={() => navigateToInvoices("debtor", debtor.debtorPostingaccountNumber.toString())}
                      data-testid={`row-debtor-${debtor.debtorPostingaccountNumber}`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{debtor.displayName}</p>
                          <p className="text-xs text-muted-foreground">
                            {debtor.invoiceCount} Rechnungen
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(debtor.openAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {debtor.overdueAmount > 0 ? (
                          <span className="text-red-600 dark:text-red-400">
                            {formatCurrency(debtor.overdueAmount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={Users}
                title="Keine Debitoren"
                description="Es gibt derzeit keine Debitoren mit offenen Rechnungen."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Fälligkeitsübersicht</CardTitle>
            <CardDescription>Verteilung nach Fälligkeitsstatus</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div 
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50 cursor-pointer hover-elevate transition-colors"
              onClick={() => navigateToInvoices("overdueAge", "notdue")}
              data-testid="overdue-status-notdue"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium">Noch nicht fällig</p>
                  <p className="text-xs text-muted-foreground">Innerhalb Zahlungsziel</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg tabular-nums">{stats?.notDueCount || 0}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(stats?.notDueAmount || 0)}</p>
              </div>
            </div>

            <div 
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50 cursor-pointer hover-elevate transition-colors"
              onClick={() => navigateToInvoices("overdueAge", "1to30")}
              data-testid="overdue-status-1to30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium">1-30 Tage</p>
                  <p className="text-xs text-muted-foreground">Erinnerung erforderlich</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg tabular-nums">{stats?.overdue1to30Count || 0}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(stats?.overdue1to30Amount || 0)}</p>
              </div>
            </div>

            <div 
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50 cursor-pointer hover-elevate transition-colors"
              onClick={() => navigateToInvoices("overdueAge", "30plus")}
              data-testid="overdue-status-30plus"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <TrendingUp className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-medium">Über 30 Tage</p>
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
  );
}
