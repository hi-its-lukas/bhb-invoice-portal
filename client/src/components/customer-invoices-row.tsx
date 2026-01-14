import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Mail, FileText, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num === null || num === undefined || isNaN(num)) return "0,00 €";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(num);
}

interface OverdueInvoice {
  invoiceNumber: string;
  receiptDate: string;
  dueDate: string;
  amount: number;
  amountOpen: number;
  daysOverdue: number;
  interestRate: number;
  interestAmount: number;
  feeAmount: number;
  totalWithInterest: number;
}

interface Customer {
  id: string;
  displayName: string;
  emailContact: string | null;
  debtorPostingaccountNumber: number;
}

interface CustomerInvoicesRowProps {
  customer: Customer;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSendDunning: (stage: string) => void;
  colSpan: number;
}

const stageConfig = [
  { stage: "reminder", label: "Zahlungserinnerung", minDays: 0 },
  { stage: "dunning1", label: "1. Mahnung", minDays: 14 },
  { stage: "dunning2", label: "2. Mahnung", minDays: 28 },
  { stage: "dunning3", label: "Letzte Mahnung", minDays: 42 },
];

export function CustomerInvoicesRow({
  customer,
  isExpanded,
  onToggleExpand,
  onSendDunning,
  colSpan,
}: CustomerInvoicesRowProps) {
  const [selectedStage, setSelectedStage] = useState("reminder");

  const { data: invoices, isLoading } = useQuery<OverdueInvoice[]>({
    queryKey: ["/api/customers", customer.id, "overdue-invoices", selectedStage],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${customer.id}/overdue-invoices?stage=${selectedStage}`);
      if (!res.ok) throw new Error("Failed to load invoices");
      return res.json();
    },
    enabled: isExpanded,
  });

  const totalOpen = invoices?.reduce((sum, inv) => sum + inv.amountOpen, 0) || 0;
  const totalWithInterest = invoices?.reduce((sum, inv) => sum + inv.totalWithInterest, 0) || 0;

  if (!isExpanded) {
    return null;
  }

  return (
    <TableRow className="bg-muted/30">
      <TableCell colSpan={colSpan} className="p-0">
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm font-medium mr-2">Mahnstufe:</span>
            {stageConfig.map((config) => (
              <Button
                key={config.stage}
                variant={selectedStage === config.stage ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStage(config.stage)}
                data-testid={`button-stage-${config.stage}-${customer.id}`}
              >
                {config.label}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : invoices && invoices.length > 0 ? (
            <>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Rechnung</th>
                      <th className="px-3 py-2 text-left font-medium">Rechnungsdatum</th>
                      <th className="px-3 py-2 text-left font-medium">Fällig</th>
                      <th className="px-3 py-2 text-right font-medium">Überfällig</th>
                      <th className="px-3 py-2 text-right font-medium">Offen</th>
                      <th className="px-3 py-2 text-right font-medium">Zinsen</th>
                      <th className="px-3 py-2 text-right font-medium">Gesamt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.invoiceNumber} className="border-t">
                        <td className="px-3 py-2 font-mono">{inv.invoiceNumber}</td>
                        <td className="px-3 py-2">
                          {new Date(inv.receiptDate).toLocaleDateString("de-DE")}
                        </td>
                        <td className="px-3 py-2">
                          {new Date(inv.dueDate).toLocaleDateString("de-DE")}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Badge variant={inv.daysOverdue > 30 ? "destructive" : "secondary"}>
                            {inv.daysOverdue} Tage
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(inv.amountOpen)}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {formatCurrency(inv.interestAmount)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(inv.totalWithInterest)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50 font-medium">
                    <tr className="border-t">
                      <td colSpan={4} className="px-3 py-2 text-right">Summe:</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(totalOpen)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {formatCurrency(totalWithInterest - totalOpen)}
                      </td>
                      <td className="px-3 py-2 text-right">{formatCurrency(totalWithInterest)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-muted-foreground">
                  {invoices.length} überfällige Rechnung{invoices.length !== 1 ? "en" : ""} für {stageConfig.find(s => s.stage === selectedStage)?.label}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const url = `/api/customers/${customer.id}/statement-pdf?stage=${selectedStage}`;
                      window.open(url, "_blank");
                    }}
                    data-testid={`button-download-statement-${customer.id}`}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Kontoauszug PDF
                  </Button>
                  <Button
                    onClick={() => onSendDunning(selectedStage)}
                    disabled={!customer.emailContact}
                    data-testid={`button-send-dunning-${customer.id}`}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Mahnung mit Vorschau öffnen
                  </Button>
                </div>
              </div>
              
              {!customer.emailContact && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                  <AlertTriangle className="h-4 w-4" />
                  Keine E-Mail-Adresse hinterlegt. Bitte bearbeiten Sie den Debitor.
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Keine überfälligen Rechnungen für {stageConfig.find(s => s.stage === selectedStage)?.label}</p>
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
