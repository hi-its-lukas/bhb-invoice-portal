import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, Download, Filter, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { DunningLevelBadge } from "@/components/dunning-level-badge";
import { DataTableSkeleton } from "@/components/data-table-skeleton";
import { EmptyState } from "@/components/empty-state";
import type { BhbReceiptsCache, PortalCustomer } from "@shared/schema";

interface Invoice extends BhbReceiptsCache {
  customer?: PortalCustomer;
  dunningLevel: string;
  daysOverdue: number;
  calculatedInterest: number;
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

export default function InvoicesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dunningFilter, setDunningFilter] = useState<string>("all");

  const { data: invoices, isLoading, refetch, isFetching } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices", { status: statusFilter, dunning: dunningFilter }],
  });

  const filteredInvoices = invoices?.filter((invoice) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesNumber = invoice.invoiceNumber?.toLowerCase().includes(query);
      const matchesCustomer = invoice.customer?.displayName?.toLowerCase().includes(query);
      const matchesDebtor = invoice.debtorPostingaccountNumber?.toString().includes(query);
      if (!matchesNumber && !matchesCustomer && !matchesDebtor) return false;
    }
    return true;
  });

  const handleDownloadPdf = async (invoiceId: string) => {
    window.open(`/api/invoices/${invoiceId}/pdf`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Rechnungen</h1>
          <p className="text-muted-foreground mt-1">
            Alle offenen Posten aus BuchhaltungsButler
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-sync-invoices"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Synchronisieren
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Rechnungsübersicht</CardTitle>
              <CardDescription>
                {filteredInvoices?.length || 0} Rechnungen gefunden
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                  data-testid="input-search-invoices"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="unpaid">Offen</SelectItem>
                  <SelectItem value="overdue">Überfällig</SelectItem>
                  <SelectItem value="paid">Bezahlt</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dunningFilter} onValueChange={setDunningFilter}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-dunning-filter">
                  <SelectValue placeholder="Mahnstufe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Stufen</SelectItem>
                  <SelectItem value="none">Keine Mahnung</SelectItem>
                  <SelectItem value="reminder">Erinnerung</SelectItem>
                  <SelectItem value="dunning1">Mahnung 1</SelectItem>
                  <SelectItem value="dunning2">Mahnung 2</SelectItem>
                  <SelectItem value="dunning3">Mahnung 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <DataTableSkeleton columns={8} rows={8} />
          ) : filteredInvoices && filteredInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rechnungsnr.</TableHead>
                    <TableHead>Debitor</TableHead>
                    <TableHead>Rechnungsdatum</TableHead>
                    <TableHead>Fälligkeit</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead className="text-right">Zinsen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mahnstufe</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                      <TableCell className="font-mono text-sm">
                        {invoice.invoiceNumber || "-"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {invoice.customer?.displayName || "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Nr. {invoice.debtorPostingaccountNumber}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(invoice.receiptDate)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(invoice.dueDate)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(invoice.amountOpen || invoice.amountTotal)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-sm">
                        {invoice.calculatedInterest > 0 ? (
                          <span className="text-red-600 dark:text-red-400">
                            +{formatCurrency(invoice.calculatedInterest)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge
                          status={
                            invoice.paymentStatus === "paid"
                              ? "paid"
                              : invoice.daysOverdue > 0
                              ? "overdue"
                              : "unpaid"
                          }
                          daysOverdue={invoice.daysOverdue > 0 ? invoice.daysOverdue : undefined}
                        />
                      </TableCell>
                      <TableCell>
                        <DunningLevelBadge level={invoice.dunningLevel as any || "none"} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadPdf(invoice.id)}
                          title="PDF herunterladen"
                          data-testid={`button-download-pdf-${invoice.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="Keine Rechnungen gefunden"
              description={
                searchQuery || statusFilter !== "all" || dunningFilter !== "all"
                  ? "Versuchen Sie, Ihre Filterkriterien anzupassen."
                  : "Es wurden noch keine Rechnungen aus BuchhaltungsButler synchronisiert."
              }
              action={
                !searchQuery && statusFilter === "all" && dunningFilter === "all"
                  ? {
                      label: "Jetzt synchronisieren",
                      onClick: () => refetch(),
                    }
                  : undefined
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
