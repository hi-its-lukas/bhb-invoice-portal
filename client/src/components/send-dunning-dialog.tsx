import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, FileText, Eye, Send, AlertCircle, CheckCircle } from "lucide-react";

interface DunningTemplate {
  id: string;
  name: string;
  stage: string;
  subject: string;
  htmlBody: string;
  isDefault: boolean;
  isActive: boolean;
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

interface PreviewResponse {
  subject: string;
  html: string;
  text: string;
  invoiceCount: number;
  context: {
    summe: {
      offenerBetrag: number;
      zinsen: number;
      gebuehren: number;
      gesamt: number;
    };
  };
}

const stageLabels: Record<string, string> = {
  reminder: "Zahlungserinnerung",
  dunning1: "1. Mahnung",
  dunning2: "2. Mahnung",
  dunning3: "Letzte Mahnung",
};

interface SendDunningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export function SendDunningDialog({ open, onOpenChange, customer }: SendDunningDialogProps) {
  const { toast } = useToast();
  const [selectedStage, setSelectedStage] = useState("reminder");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [activeTab, setActiveTab] = useState("invoices");

  const { data: templates } = useQuery<DunningTemplate[]>({
    queryKey: ["/api/dunning-templates"],
    enabled: open,
  });

  const { data: overdueInvoices, isLoading: loadingInvoices } = useQuery<OverdueInvoice[]>({
    queryKey: ["/api/customers", customer?.id, "overdue-invoices", selectedStage],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${customer?.id}/overdue-invoices?stage=${selectedStage}`);
      if (!res.ok) throw new Error("Failed to load overdue invoices");
      return res.json();
    },
    enabled: open && !!customer?.id,
  });

  useEffect(() => {
    if (customer?.emailContact) {
      setRecipientEmail(customer.emailContact);
    }
  }, [customer]);

  useEffect(() => {
    if (templates) {
      const stageTemplates = templates.filter(t => t.stage === selectedStage && t.isActive);
      const defaultTemplate = stageTemplates.find(t => t.isDefault) || stageTemplates[0];
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
      }
    }
  }, [templates, selectedStage]);

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!customer || !selectedTemplateId) return null;
      return await apiRequest<PreviewResponse>("POST", "/api/dunning/preview", {
        customerId: customer.id,
        templateId: selectedTemplateId,
      });
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setActiveTab("preview");
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!customer || !selectedTemplateId || !recipientEmail) return null;
      return await apiRequest("POST", "/api/dunning/send", {
        customerId: customer.id,
        templateId: selectedTemplateId,
        recipientEmail,
      });
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Mahnung gesendet", 
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer?.id, "dunning-history"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Fehler beim Senden", description: error.message, variant: "destructive" });
    },
  });

  const stageTemplates = templates?.filter(t => t.stage === selectedStage && t.isActive) || [];
  const totalOpen = overdueInvoices?.reduce((sum, inv) => sum + inv.amountOpen, 0) || 0;
  const totalInterest = overdueInvoices?.reduce((sum, inv) => sum + inv.interestAmount, 0) || 0;
  const totalFees = overdueInvoices?.reduce((sum, inv) => sum + inv.feeAmount, 0) || 0;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Mahnung versenden
          </DialogTitle>
          <DialogDescription>
            {customer?.displayName} - Debitor {customer?.debtorPostingaccountNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mahnstufe</Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger data-testid="select-dunning-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reminder">Zahlungserinnerung</SelectItem>
                  <SelectItem value="dunning1">1. Mahnung</SelectItem>
                  <SelectItem value="dunning2">2. Mahnung</SelectItem>
                  <SelectItem value="dunning3">Letzte Mahnung</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vorlage</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger data-testid="select-dunning-template">
                  <SelectValue placeholder="Vorlage auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {stageTemplates.length === 0 ? (
                    <SelectItem value="" disabled>Keine Vorlagen für diese Stufe</SelectItem>
                  ) : (
                    stageTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.isDefault && "(Standard)"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Empfänger E-Mail</Label>
            <Input
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              type="email"
              placeholder="empfaenger@example.com"
              data-testid="input-recipient-email"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="invoices">
                Überfällige Rechnungen ({overdueInvoices?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="preview" disabled={!previewData}>
                E-Mail-Vorschau
              </TabsTrigger>
            </TabsList>
            <TabsContent value="invoices">
              {loadingInvoices ? (
                <div className="text-center py-8 text-muted-foreground">Lade Rechnungen...</div>
              ) : !overdueInvoices || overdueInvoices.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p className="text-muted-foreground">Keine überfälligen Rechnungen für diesen Kunden</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3">Rechnung</th>
                        <th className="text-left p-3">Fällig am</th>
                        <th className="text-right p-3">Tage</th>
                        <th className="text-right p-3">Offen</th>
                        <th className="text-right p-3">Zinsen</th>
                        <th className="text-right p-3">Gebühr</th>
                        <th className="text-right p-3">Gesamt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueInvoices.map((inv, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                          <td className="p-3">
                            {new Date(inv.dueDate).toLocaleDateString("de-DE")}
                          </td>
                          <td className="p-3 text-right">
                            <Badge variant={inv.daysOverdue > 30 ? "destructive" : "secondary"}>
                              {inv.daysOverdue}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">{formatCurrency(inv.amountOpen)}</td>
                          <td className="p-3 text-right text-muted-foreground">
                            {formatCurrency(inv.interestAmount)}
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            {formatCurrency(inv.feeAmount)}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(inv.totalWithInterest)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t bg-muted font-medium">
                        <td className="p-3" colSpan={3}>Gesamt</td>
                        <td className="p-3 text-right">{formatCurrency(totalOpen)}</td>
                        <td className="p-3 text-right">{formatCurrency(totalInterest)}</td>
                        <td className="p-3 text-right">{formatCurrency(totalFees)}</td>
                        <td className="p-3 text-right">{formatCurrency(totalOpen + totalInterest + totalFees)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
            <TabsContent value="preview">
              {previewData && (
                <div className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <Label className="text-xs text-muted-foreground">Betreff</Label>
                    <p className="font-medium">{previewData.subject}</p>
                  </div>
                  <div 
                    className="border rounded-lg p-4 bg-white max-h-[400px] overflow-auto"
                    dangerouslySetInnerHTML={{ __html: previewData.html }}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button 
            variant="outline" 
            onClick={() => previewMutation.mutate()}
            disabled={!selectedTemplateId || previewMutation.isPending}
            data-testid="button-preview-email"
          >
            <Eye className="w-4 h-4 mr-2" />
            {previewMutation.isPending ? "Lade..." : "Vorschau"}
          </Button>
          <Button 
            onClick={() => sendMutation.mutate()}
            disabled={!selectedTemplateId || !recipientEmail || !overdueInvoices?.length || sendMutation.isPending}
            data-testid="button-send-dunning"
          >
            <Send className="w-4 h-4 mr-2" />
            {sendMutation.isPending ? "Sende..." : "Mahnung senden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
