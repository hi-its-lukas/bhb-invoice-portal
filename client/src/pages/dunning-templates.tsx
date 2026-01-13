import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Copy, Eye, FileText, Mail } from "lucide-react";

interface DunningTemplate {
  id: string;
  name: string;
  stage: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const stageLabels: Record<string, string> = {
  reminder: "Zahlungserinnerung",
  dunning1: "1. Mahnung",
  dunning2: "2. Mahnung",
  dunning3: "Letzte Mahnung",
};

const stageColors: Record<string, string> = {
  reminder: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  dunning1: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  dunning2: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  dunning3: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function DunningTemplatesPage() {
  const { toast } = useToast();
  const [editingTemplate, setEditingTemplate] = useState<DunningTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery<DunningTemplate[]>({
    queryKey: ["/api/dunning-templates"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<DunningTemplate>) => 
      apiRequest("POST", "/api/dunning-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dunning-templates"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Vorlage erstellt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DunningTemplate> }) =>
      apiRequest("PATCH", `/api/dunning-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dunning-templates"] });
      setEditingTemplate(null);
      toast({ title: "Vorlage aktualisiert" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dunning-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dunning-templates"] });
      toast({ title: "Vorlage gelöscht" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const seedDefaultsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/dunning-templates/seed-defaults"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dunning-templates"] });
      toast({ title: "Standard-Vorlagen erstellt", description: data.message });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const groupedTemplates = templates?.reduce((acc, t) => {
    if (!acc[t.stage]) acc[t.stage] = [];
    acc[t.stage].push(t);
    return acc;
  }, {} as Record<string, DunningTemplate[]>) || {};

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Mahnvorlagen</h1>
          <p className="text-muted-foreground">E-Mail-Vorlagen für Zahlungserinnerungen und Mahnungen</p>
        </div>
        <div className="flex gap-2">
          {(!templates || templates.length === 0) && (
            <Button 
              variant="outline" 
              onClick={() => seedDefaultsMutation.mutate()}
              disabled={seedDefaultsMutation.isPending}
              data-testid="button-seed-defaults"
            >
              <FileText className="w-4 h-4 mr-2" />
              Standard-Vorlagen laden
            </Button>
          )}
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-template">
            <Plus className="w-4 h-4 mr-2" />
            Neue Vorlage
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Lade Vorlagen...</div>
      ) : templates?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Keine Vorlagen vorhanden</h3>
            <p className="text-muted-foreground mb-4">
              Erstellen Sie Vorlagen für Zahlungserinnerungen und Mahnungen
            </p>
            <Button onClick={() => seedDefaultsMutation.mutate()} disabled={seedDefaultsMutation.isPending}>
              Standard-Vorlagen laden
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {["reminder", "dunning1", "dunning2", "dunning3"].map((stage) => (
            <Card key={stage}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge className={stageColors[stage]}>{stageLabels[stage]}</Badge>
                  <span className="text-muted-foreground text-sm font-normal">
                    {groupedTemplates[stage]?.length || 0} Vorlage(n)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!groupedTemplates[stage] || groupedTemplates[stage].length === 0 ? (
                  <p className="text-muted-foreground text-sm">Keine Vorlagen für diese Stufe</p>
                ) : (
                  <div className="space-y-3">
                    {groupedTemplates[stage].map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                        data-testid={`card-template-${template.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {template.name}
                              {template.isDefault && (
                                <Badge variant="secondary" className="text-xs">Standard</Badge>
                              )}
                              {!template.isActive && (
                                <Badge variant="outline" className="text-xs">Inaktiv</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Betreff: {template.subject}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setPreviewHtml(template.htmlBody)}
                            data-testid={`button-preview-${template.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingTemplate(template)}
                            data-testid={`button-edit-${template.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Vorlage wirklich löschen?")) {
                                deleteMutation.mutate(template.id);
                              }
                            }}
                            data-testid={`button-delete-${template.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      <TemplateDialog
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        template={editingTemplate || undefined}
        onSave={(data) => editingTemplate && updateMutation.mutate({ id: editingTemplate.id, data })}
        isPending={updateMutation.isPending}
      />

      <Dialog open={!!previewHtml} onOpenChange={(open) => !open && setPreviewHtml(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Vorlagen-Vorschau</DialogTitle>
          </DialogHeader>
          <div 
            className="border rounded-lg p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: previewHtml || "" }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateDialog({
  open,
  onOpenChange,
  template,
  onSave,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: DunningTemplate;
  onSave: (data: Partial<DunningTemplate>) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(template?.name || "");
  const [stage, setStage] = useState(template?.stage || "reminder");
  const [subject, setSubject] = useState(template?.subject || "");
  const [htmlBody, setHtmlBody] = useState(template?.htmlBody || "");
  const [textBody, setTextBody] = useState(template?.textBody || "");
  const [isDefault, setIsDefault] = useState(template?.isDefault || false);
  const [isActive, setIsActive] = useState(template?.isActive !== false);

  const handleSave = () => {
    if (!name || !stage || !subject || !htmlBody) {
      return;
    }
    onSave({ name, stage, subject, htmlBody, textBody, isDefault, isActive });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Vorlage bearbeiten" : "Neue Vorlage erstellen"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Standard Zahlungserinnerung"
                data-testid="input-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage">Mahnstufe</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger data-testid="select-template-stage">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Betreff</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="z.B. Zahlungserinnerung - {{mahnung.stufeName}}"
              data-testid="input-template-subject"
            />
            <p className="text-xs text-muted-foreground">
              Platzhalter: {"{{kunde.name}}"}, {"{{mahnung.stufeName}}"}, {"{{summe.gesamt}}"}
            </p>
          </div>

          <Tabs defaultValue="html">
            <TabsList>
              <TabsTrigger value="html">HTML-Inhalt</TabsTrigger>
              <TabsTrigger value="text">Text-Inhalt (optional)</TabsTrigger>
              <TabsTrigger value="help">Platzhalter-Hilfe</TabsTrigger>
            </TabsList>
            <TabsContent value="html" className="space-y-2">
              <Textarea
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                className="font-mono text-sm min-h-[300px]"
                placeholder="HTML-Inhalt der E-Mail..."
                data-testid="textarea-template-html"
              />
            </TabsContent>
            <TabsContent value="text" className="space-y-2">
              <Textarea
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
                className="font-mono text-sm min-h-[300px]"
                placeholder="Text-Version der E-Mail (für E-Mail-Clients ohne HTML)..."
                data-testid="textarea-template-text"
              />
            </TabsContent>
            <TabsContent value="help">
              <div className="border rounded-lg p-4 space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Kunde</h4>
                  <code className="block bg-muted p-2 rounded text-xs">
                    {"{{kunde.name}}"} - Kundenname<br/>
                    {"{{kunde.strasse}}"} - Straße<br/>
                    {"{{kunde.plz}}"} - PLZ<br/>
                    {"{{kunde.ort}}"} - Ort<br/>
                    {"{{kunde.email}}"} - E-Mail<br/>
                    {"{{kunde.kundennummer}}"} - Kundennummer
                  </code>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Rechnungstabelle</h4>
                  <code className="block bg-muted p-2 rounded text-xs">
                    {"{{#each rechnungen}}"}<br/>
                    {"  {{this.invoiceNumber}}"} - Rechnungsnummer<br/>
                    {"  {{formatDate this.receiptDate}}"} - Rechnungsdatum<br/>
                    {"  {{formatDate this.dueDate}}"} - Fälligkeitsdatum<br/>
                    {"  {{this.daysOverdue}}"} - Tage überfällig<br/>
                    {"  {{formatCurrency this.amountOpen}}"} - Offener Betrag<br/>
                    {"  {{formatCurrency this.interestAmount}}"} - Zinsen<br/>
                    {"  {{formatCurrency this.feeAmount}}"} - Mahngebühr<br/>
                    {"  {{formatCurrency this.totalWithInterest}}"} - Gesamt<br/>
                    {"{{/each}}"}
                  </code>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Summen</h4>
                  <code className="block bg-muted p-2 rounded text-xs">
                    {"{{formatCurrency summe.offenerBetrag}}"} - Offener Betrag gesamt<br/>
                    {"{{formatCurrency summe.zinsen}}"} - Zinsen gesamt<br/>
                    {"{{formatCurrency summe.gebuehren}}"} - Gebühren gesamt<br/>
                    {"{{formatCurrency summe.gesamt}}"} - Gesamtsumme
                  </code>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Bankverbindung</h4>
                  <code className="block bg-muted p-2 rounded text-xs">
                    {"{{bank.kontoinhaber}}"} - Kontoinhaber<br/>
                    {"{{bank.iban}}"} - IBAN<br/>
                    {"{{bank.bic}}"} - BIC
                  </code>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Mahnung</h4>
                  <code className="block bg-muted p-2 rounded text-xs">
                    {"{{mahnung.stufeName}}"} - Bezeichnung (z.B. "1. Mahnung")<br/>
                    {"{{mahnung.datum}}"} - Heutiges Datum<br/>
                    {"{{mahnung.frist}}"} - Zahlungsfrist
                  </code>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch id="isDefault" checked={isDefault} onCheckedChange={setIsDefault} />
              <Label htmlFor="isDefault">Als Standard setzen</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="isActive">Aktiv</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={isPending || !name || !subject || !htmlBody}>
            {isPending ? "Speichern..." : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
