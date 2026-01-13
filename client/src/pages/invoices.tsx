import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, Filter, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { DunningLevelBadge } from "@/components/dunning-level-badge";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { DataTableSkeleton } from "@/components/data-table-skeleton";
import { EmptyState } from "@/components/empty-state";
import type { BhbReceiptsCache, PortalCustomer } from "@shared/schema";

interface Invoice extends BhbReceiptsCache {
  customer?: PortalCustomer;
  effectiveDueDate?: string | Date | null;
  dunningLevel: string;
  daysOverdue: number;
  calculatedInterest: number;
}

type SortColumn = "invoiceNumber" | "debtor" | "receiptDate" | "dueDate" | "amountTotal" | "amountOpen" | "daysOverdue";
type SortDirection = "asc" | "desc";

function getCounterpartyName(invoice: Invoice): string {
  if (invoice.customer?.displayName) {
    return invoice.customer.displayName;
  }
  const raw = invoice.rawJson as any;
  if (raw?.counterparty) {
    return raw.counterparty;
  }
  return "-";
}

function getDebtorNumber(invoice: Invoice): number | null {
  // First check the stored debtor number
  if (invoice.debtorPostingaccountNumber && invoice.debtorPostingaccountNumber > 0) {
    return invoice.debtorPostingaccountNumber;
  }
  // Fall back to rawJson fields
  const raw = invoice.rawJson as any;
  const fromRaw = raw?.creditor_debtor || raw?.postingaccount_number || raw?.debtor_number;
  if (fromRaw && parseInt(fromRaw, 10) > 0) {
    return parseInt(fromRaw, 10);
  }
  return null;
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

const STATUS_OPTIONS = [
  { value: "unpaid", label: "Offen" },
  { value: "overdue", label: "Überfällig" },
  { value: "paid", label: "Bezahlt" },
];

const DUNNING_OPTIONS = [
  { value: "none", label: "Keine Mahnung" },
  { value: "reminder", label: "Erinnerung" },
  { value: "dunning1", label: "Mahnung 1" },
  { value: "dunning2", label: "Mahnung 2" },
  { value: "dunning3", label: "Mahnung 3" },
];

export default function InvoicesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [dunningFilters, setDunningFilters] = useState<string[]>([]);
  const [debtorFilters, setDebtorFilters] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<SortColumn>("dueDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    const savedStatus = localStorage.getItem("invoice-status-filter");
    const savedDunning = localStorage.getItem("invoice-dunning-filter");
    const savedDebtor = localStorage.getItem("invoice-debtor-filter");
    if (savedStatus) {
      try { setStatusFilters(JSON.parse(savedStatus)); } catch {}
    }
    if (savedDunning) {
      try { setDunningFilters(JSON.parse(savedDunning)); } catch {}
    }
    if (savedDebtor) {
      try { setDebtorFilters(JSON.parse(savedDebtor)); } catch {}
    }
  }, []);

  const { data: invoices, isLoading, refetch, isFetching } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const debtorOptions = invoices
    ? Array.from(
        new Map(
          invoices
            .filter((inv) => inv.debtorPostingaccountNumber && inv.debtorPostingaccountNumber > 0)
            .map((inv) => {
              const name = getCounterpartyName(inv);
              const num = inv.debtorPostingaccountNumber!;
              return [num, { value: num.toString(), label: `${name} (${num})` }];
            })
        ).values()
      ).sort((a, b) => a.label.localeCompare(b.label, "de"))
    : [];

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const filteredInvoices = invoices
    ?.filter((invoice) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const counterpartyName = getCounterpartyName(invoice).toLowerCase();
        const matchesNumber = invoice.invoiceNumber?.toLowerCase().includes(query);
        const matchesCustomer = counterpartyName.includes(query);
        const matchesDebtor = invoice.debtorPostingaccountNumber?.toString().includes(query);
        if (!matchesNumber && !matchesCustomer && !matchesDebtor) return false;
      }
      
      if (statusFilters.length > 0) {
        const invoiceStatus = invoice.paymentStatus === "paid" 
          ? "paid" 
          : invoice.daysOverdue > 0 
            ? "overdue" 
            : "unpaid";
        if (!statusFilters.includes(invoiceStatus)) return false;
      }
      
      const invoiceDunning = invoice.dunningLevel || "none";
      if (dunningFilters.length > 0 && !dunningFilters.includes(invoiceDunning)) return false;
      
      if (debtorFilters.length > 0) {
        const debtorNum = invoice.debtorPostingaccountNumber?.toString() || "";
        if (!debtorFilters.includes(debtorNum)) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      let aVal: string | number | Date;
      let bVal: string | number | Date;
      
      switch (sortColumn) {
        case "invoiceNumber":
          aVal = (a.invoiceNumber || "").toLowerCase();
          bVal = (b.invoiceNumber || "").toLowerCase();
          break;
        case "debtor":
          aVal = getCounterpartyName(a).toLowerCase();
          bVal = getCounterpartyName(b).toLowerCase();
          break;
        case "receiptDate":
          aVal = a.receiptDate ? new Date(a.receiptDate).getTime() : 0;
          bVal = b.receiptDate ? new Date(b.receiptDate).getTime() : 0;
          break;
        case "dueDate":
          aVal = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          bVal = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          break;
        case "amountTotal":
          aVal = parseFloat(String(a.amountTotal || 0));
          bVal = parseFloat(String(b.amountTotal || 0));
          break;
        case "amountOpen":
          aVal = parseFloat(String(a.amountOpen || 0));
          bVal = parseFloat(String(b.amountOpen || 0));
          break;
        case "daysOverdue":
          aVal = a.daysOverdue || 0;
          bVal = b.daysOverdue || 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  // Calculate dynamic sums for filtered invoices
  const filteredSums = (filteredInvoices || []).reduce(
    (acc: { total: number; paid: number; open: number; interest: number }, invoice: Invoice) => {
      const total = parseFloat(String(invoice.amountTotal || 0));
      const open = parseFloat(String(invoice.amountOpen || 0));
      const paid = total - open;
      const interest = invoice.calculatedInterest || 0;
      
      return {
        total: acc.total + total,
        paid: acc.paid + (paid > 0 ? paid : 0),
        open: acc.open + open,
        interest: acc.interest + interest,
      };
    },
    { total: 0, paid: 0, open: 0, interest: 0 }
  );

  const handleDownloadPdf = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      if (!response.ok) {
        const error = await response.json();
        toast({
          title: "PDF-Download fehlgeschlagen",
          description: error.message || "Die PDF konnte nicht heruntergeladen werden.",
          variant: "destructive",
        });
        return;
      }
      
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "rechnung.pdf";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "PDF-Download fehlgeschlagen",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    }
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
              <MultiSelectFilter
                options={STATUS_OPTIONS}
                selected={statusFilters}
                onChange={setStatusFilters}
                placeholder="Alle Status"
                storageKey="invoice-status-filter"
                className="w-full sm:w-40"
              />
              <MultiSelectFilter
                options={DUNNING_OPTIONS}
                selected={dunningFilters}
                onChange={setDunningFilters}
                placeholder="Alle Stufen"
                storageKey="invoice-dunning-filter"
                className="w-full sm:w-40"
              />
              <MultiSelectFilter
                options={debtorOptions}
                selected={debtorFilters}
                onChange={setDebtorFilters}
                placeholder="Alle Debitoren"
                storageKey="invoice-debtor-filter"
                className="w-full sm:w-48"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <DataTableSkeleton columns={12} rows={8} />
          ) : filteredInvoices && filteredInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("invoiceNumber")}
                    >
                      <div className="flex items-center">
                        Rechnungsnr.
                        {getSortIcon("invoiceNumber")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("debtor")}
                    >
                      <div className="flex items-center">
                        Debitor
                        {getSortIcon("debtor")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("receiptDate")}
                    >
                      <div className="flex items-center">
                        Rechnungsdatum
                        {getSortIcon("receiptDate")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => toggleSort("dueDate")}
                    >
                      <div className="flex items-center">
                        Fälligkeit
                        {getSortIcon("dueDate")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none text-right"
                      onClick={() => toggleSort("amountTotal")}
                    >
                      <div className="flex items-center justify-end">
                        Gesamt
                        {getSortIcon("amountTotal")}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Bezahlt</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none text-right"
                      onClick={() => toggleSort("amountOpen")}
                    >
                      <div className="flex items-center justify-end">
                        Offen
                        {getSortIcon("amountOpen")}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Zinsen</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none text-right"
                      onClick={() => toggleSort("daysOverdue")}
                    >
                      <div className="flex items-center justify-end">
                        Fällig in
                        {getSortIcon("daysOverdue")}
                      </div>
                    </TableHead>
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
                            {getCounterpartyName(invoice)}
                          </p>
                          {getDebtorNumber(invoice) && (
                            <p className="text-xs text-muted-foreground">
                              Nr. {getDebtorNumber(invoice)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(invoice.receiptDate)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(invoice.effectiveDueDate || invoice.dueDate)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-sm">
                        {formatCurrency(invoice.amountTotal)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-sm text-muted-foreground">
                        {(() => {
                          const total = parseFloat(String(invoice.amountTotal || 0));
                          const open = parseFloat(String(invoice.amountOpen || 0));
                          const paid = total - open;
                          return paid > 0 ? formatCurrency(paid) : "-";
                        })()}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-medium">
                        {formatCurrency(invoice.amountOpen)}
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
                      <TableCell className="text-right font-mono tabular-nums text-sm">
                        {invoice.paymentStatus === "paid" ? (
                          "-"
                        ) : invoice.daysOverdue > 0 ? (
                          <span className="text-red-600 dark:text-red-400">
                            +{invoice.daysOverdue}T
                          </span>
                        ) : invoice.daysOverdue < 0 ? (
                          <span className="text-muted-foreground">
                            {Math.abs(invoice.daysOverdue)}T
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">Heute</span>
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
                <TableFooter>
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={4} className="text-right text-sm">
                      Summe ({filteredInvoices?.length || 0} Rechnungen):
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(filteredSums.total)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {filteredSums.paid > 0 ? formatCurrency(filteredSums.paid) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(filteredSums.open)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {filteredSums.interest > 0 ? (
                        <span className="text-red-600 dark:text-red-400">
                          +{formatCurrency(filteredSums.interest)}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell colSpan={4}></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="Keine Rechnungen gefunden"
              description={
                searchQuery || statusFilters.length > 0 || dunningFilters.length > 0 || debtorFilters.length > 0
                  ? "Versuchen Sie, Ihre Filterkriterien anzupassen."
                  : "Es wurden noch keine Rechnungen aus BuchhaltungsButler synchronisiert."
              }
              action={
                !searchQuery && statusFilters.length === 0 && dunningFilters.length === 0 && debtorFilters.length === 0
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
