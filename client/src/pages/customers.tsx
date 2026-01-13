import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Plus, Search, Pencil, Trash2, Mail, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Upload, CheckCircle2, AlertCircle, Clock, Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { DebtorCombobox } from "@/components/debtor-combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DataTableSkeleton } from "@/components/data-table-skeleton";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PortalCustomer } from "@shared/schema";

interface CustomerFormData {
  debtorPostingaccountNumber: number;
  displayName: string;
  emailContact: string;
  isActive: boolean;
  contactPersonName: string;
  street: string;
  additionalAddressline: string;
  zip: string;
  city: string;
  country: string;
  salesTaxIdEu: string;
  uidCh: string;
  iban: string;
  bic: string;
}

interface CustomerFormProps {
  formData: CustomerFormData;
  setFormData: React.Dispatch<React.SetStateAction<CustomerFormData>>;
  editingCustomer: PortalCustomer | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onBhbSync: () => void;
  isSubmitting: boolean;
  isBhbSyncing: boolean;
}

function CustomerForm({
  formData,
  setFormData,
  editingCustomer,
  onSubmit,
  onCancel,
  onBhbSync,
  isSubmitting,
  isBhbSyncing,
}: CustomerFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="debtorNumber">Debitorennummer *</Label>
        <Input
          id="debtorNumber"
          type="number"
          value={formData.debtorPostingaccountNumber || ""}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, debtorPostingaccountNumber: parseInt(e.target.value) || 0 }))
          }
          placeholder="z.B. 70001"
          required
          disabled={!!editingCustomer}
          data-testid="input-debtor-number"
        />
        <p className="text-xs text-muted-foreground">
          Die Debitorennummer aus BuchhaltungsButler (postingaccount_number)
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="displayName">Anzeigename *</Label>
        <Input
          id="displayName"
          value={formData.displayName}
          onChange={(e) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
          placeholder="Firma Mustermann GmbH"
          required
          data-testid="input-display-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-Mail für Mahnungen</Label>
        <Input
          id="email"
          type="email"
          value={formData.emailContact}
          onChange={(e) => setFormData((prev) => ({ ...prev, emailContact: e.target.value }))}
          placeholder="buchhaltung@firma.de"
          data-testid="input-email"
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="isActive">Aktiv</Label>
          <p className="text-xs text-muted-foreground">
            Inaktive Debitoren erhalten keine Mahnungen
          </p>
        </div>
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
          data-testid="switch-is-active"
        />
      </div>

      {editingCustomer && (
        <>
          {editingCustomer.lastBhbSync && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-800 dark:text-green-200">
                Zuletzt von BHB synchronisiert: {new Date(editingCustomer.lastBhbSync).toLocaleString("de-DE")}
              </span>
            </div>
          )}
          {!editingCustomer.lastBhbSync && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-800 dark:text-amber-200">
                Noch nicht von BHB synchronisiert. Klicken Sie "Von BHB laden" um Daten zu aktualisieren.
              </span>
            </div>
          )}
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium mb-3">Adresse (BHB-Stammdaten)</h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="contactPersonName">Ansprechpartner</Label>
                <Input
                  id="contactPersonName"
                  value={formData.contactPersonName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contactPersonName: e.target.value }))}
                  placeholder="Max Mustermann"
                  data-testid="input-contact-person"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="street">Straße</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData((prev) => ({ ...prev, street: e.target.value }))}
                  placeholder="Musterstraße 123"
                  data-testid="input-street"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="additionalAddressline">Adresszusatz</Label>
                <Input
                  id="additionalAddressline"
                  value={formData.additionalAddressline}
                  onChange={(e) => setFormData((prev) => ({ ...prev, additionalAddressline: e.target.value }))}
                  placeholder="Gebäude B, 2. OG"
                  data-testid="input-additional-address"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="zip">PLZ</Label>
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => setFormData((prev) => ({ ...prev, zip: e.target.value }))}
                    placeholder="12345"
                    data-testid="input-zip"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="city">Ort</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="Musterstadt"
                    data-testid="input-city"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Land</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                  placeholder="DE"
                  data-testid="input-country"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium mb-3">Steuer-IDs</h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="salesTaxIdEu">USt-IdNr. (EU)</Label>
                <Input
                  id="salesTaxIdEu"
                  value={formData.salesTaxIdEu}
                  onChange={(e) => setFormData((prev) => ({ ...prev, salesTaxIdEu: e.target.value }))}
                  placeholder="DE123456789"
                  data-testid="input-vat-eu"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uidCh">UID (Schweiz)</Label>
                <Input
                  id="uidCh"
                  value={formData.uidCh}
                  onChange={(e) => setFormData((prev) => ({ ...prev, uidCh: e.target.value }))}
                  placeholder="CHE-123.456.789"
                  data-testid="input-uid-ch"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium mb-3">Bankverbindung</h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  value={formData.iban}
                  onChange={(e) => setFormData((prev) => ({ ...prev, iban: e.target.value }))}
                  placeholder="DE89 3704 0044 0532 0130 00"
                  data-testid="input-iban"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bic">BIC</Label>
                <Input
                  id="bic"
                  value={formData.bic}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bic: e.target.value }))}
                  placeholder="COBADEFFXXX"
                  data-testid="input-bic"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <DialogFooter className="pt-4 flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Abbrechen
        </Button>
        {editingCustomer && (
          <Button
            type="button"
            variant="secondary"
            onClick={onBhbSync}
            disabled={isBhbSyncing}
            data-testid="button-sync-to-bhb"
          >
            <Upload className={`h-4 w-4 mr-2 ${isBhbSyncing ? "animate-pulse" : ""}`} />
            {isBhbSyncing ? "Übertrage..." : "Zu BHB übertragen"}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          data-testid="button-submit-customer"
        >
          {isSubmitting
            ? "Speichern..."
            : editingCustomer
            ? "Speichern"
            : "Erstellen"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type SortColumn = "debtorPostingaccountNumber" | "displayName" | "emailContact" | "isActive";
type SortDirection = "asc" | "desc";

interface CounterpartyMapping {
  id: string;
  counterpartyName: string;
  debtorPostingaccountNumber: number;
  customerName?: string;
}

interface UnmatchedCounterparty {
  counterpartyName: string;
  count: number;
}

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<PortalCustomer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<PortalCustomer | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("debtorPostingaccountNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedMapping, setSelectedMapping] = useState<Record<string, number>>({});
  const [updateBhbFlags, setUpdateBhbFlags] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<CustomerFormData>({
    debtorPostingaccountNumber: 0,
    displayName: "",
    emailContact: "",
    isActive: true,
    contactPersonName: "",
    street: "",
    additionalAddressline: "",
    zip: "",
    city: "",
    country: "",
    salesTaxIdEu: "",
    uidCh: "",
    iban: "",
    bic: "",
  });
  const { toast } = useToast();

  const { data: customers, isLoading } = useQuery<PortalCustomer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: mappings } = useQuery<CounterpartyMapping[]>({
    queryKey: ["/api/counterparty-mappings"],
  });

  const { data: unmatchedCounterparties } = useQuery<UnmatchedCounterparty[]>({
    queryKey: ["/api/counterparty-mappings", "unmatched"],
  });

  const createMappingMutation = useMutation({
    mutationFn: async (data: { counterpartyName: string; debtorPostingaccountNumber: number; updateBhb: boolean }) => {
      return apiRequest<CounterpartyMapping & { bhbUpdateResult?: { success: boolean; message?: string } }>("POST", "/api/counterparty-mappings", data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/counterparty-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      
      if (data?.bhbUpdateResult) {
        if (data.bhbUpdateResult.success) {
          toast({ title: "Zuordnung erstellt & BHB aktualisiert" });
        } else {
          toast({ 
            title: "Zuordnung erstellt", 
            description: `BHB-Update: ${data.bhbUpdateResult.message}`,
            variant: "destructive" 
          });
        }
      } else {
        toast({ title: "Zuordnung erstellt" });
      }
    },
    onError: () => {
      toast({ title: "Fehler beim Erstellen", variant: "destructive" });
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/counterparty-mappings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/counterparty-mappings"] });
      toast({ title: "Zuordnung gelöscht" });
    },
  });

  const applyMappingsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ message?: string; applied: number }>("POST", "/api/counterparty-mappings/apply");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/counterparty-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: data?.message || "Zuordnungen angewendet" });
    },
    onError: () => {
      toast({ title: "Fehler beim Anwenden", variant: "destructive" });
    },
  });

  const handleCreateMapping = (counterpartyName: string) => {
    const debtorNumber = selectedMapping[counterpartyName];
    if (!debtorNumber) return;
    const updateBhb = updateBhbFlags[counterpartyName] ?? true;
    createMappingMutation.mutate({ counterpartyName, debtorPostingaccountNumber: debtorNumber, updateBhb });
  };

  const createMutation = useMutation({
    mutationFn: (data: CustomerFormData) =>
      apiRequest("POST", "/api/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Debitor erstellt",
        description: "Der Debitor wurde erfolgreich angelegt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Debitor konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CustomerFormData & { id: string }) => {
      const { displayName, emailContact, isActive, contactPersonName, street, additionalAddressline, zip, city, country, salesTaxIdEu, uidCh, iban, bic } = data;
      return apiRequest("PATCH", `/api/customers/${data.id}`, { 
        displayName, 
        emailContact: emailContact || null, 
        isActive,
        contactPersonName: contactPersonName || null,
        street: street || null,
        additionalAddressline: additionalAddressline || null,
        zip: zip || null,
        city: city || null,
        country: country || null,
        salesTaxIdEu: salesTaxIdEu || null,
        uidCh: uidCh || null,
        iban: iban || null,
        bic: bic || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setEditingCustomer(null);
      resetForm();
      toast({
        title: "Debitor aktualisiert",
        description: "Die Änderungen wurden gespeichert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Änderungen konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDeletingCustomer(null);
      toast({
        title: "Debitor gelöscht",
        description: "Der Debitor wurde erfolgreich entfernt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Debitor konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sync/customers");
      return res as { created: number; updated: number; total: number; message: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Synchronisation abgeschlossen",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Synchronisation fehlgeschlagen",
        description: error.message || "Debitoren konnten nicht synchronisiert werden.",
        variant: "destructive",
      });
    },
  });

  const bhbSyncMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const res = await apiRequest("POST", `/api/customers/${customerId}/bhb-sync`);
      return res as { success: boolean; message: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Zu BHB übertragen",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Übertragung fehlgeschlagen",
        description: error.message || "Daten konnten nicht zu BHB übertragen werden.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      debtorPostingaccountNumber: 0,
      displayName: "",
      emailContact: "",
      isActive: true,
      contactPersonName: "",
      street: "",
      additionalAddressline: "",
      zip: "",
      city: "",
      country: "",
      salesTaxIdEu: "",
      uidCh: "",
      iban: "",
      bic: "",
    });
  };

  const openEditDialog = (customer: PortalCustomer) => {
    setEditingCustomer(customer);
    setFormData({
      debtorPostingaccountNumber: customer.debtorPostingaccountNumber,
      displayName: customer.displayName,
      emailContact: customer.emailContact || "",
      isActive: customer.isActive,
      contactPersonName: customer.contactPersonName || "",
      street: customer.street || "",
      additionalAddressline: customer.additionalAddressline || "",
      zip: customer.zip || "",
      city: customer.city || "",
      country: customer.country || "",
      salesTaxIdEu: customer.salesTaxIdEu || "",
      uidCh: customer.uidCh || "",
      iban: customer.iban || "",
      bic: customer.bic || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      updateMutation.mutate({ ...formData, id: editingCustomer.id });
    } else {
      createMutation.mutate(formData);
    }
  };

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

  const filteredCustomers = customers
    ?.filter((customer) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        customer.displayName.toLowerCase().includes(query) ||
        customer.debtorPostingaccountNumber.toString().includes(query) ||
        customer.emailContact?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      let aVal: string | number | boolean;
      let bVal: string | number | boolean;
      
      switch (sortColumn) {
        case "debtorPostingaccountNumber":
          aVal = a.debtorPostingaccountNumber;
          bVal = b.debtorPostingaccountNumber;
          break;
        case "displayName":
          aVal = a.displayName.toLowerCase();
          bVal = b.displayName.toLowerCase();
          break;
        case "emailContact":
          aVal = (a.emailContact || "").toLowerCase();
          bVal = (b.emailContact || "").toLowerCase();
          break;
        case "isActive":
          aVal = a.isActive ? 1 : 0;
          bVal = b.isActive ? 1 : 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  const handleCancel = () => {
    setIsCreateOpen(false);
    setEditingCustomer(null);
    resetForm();
  };

  const handleBhbSync = () => {
    if (editingCustomer) {
      bhbSyncMutation.mutate(editingCustomer.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Debitoren</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre Debitoren und deren Mahneinstellungen
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            data-testid="button-sync-customers"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            {syncMutation.isPending ? "Synchronisiere..." : "Von BHB laden"}
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-customer">
                <Plus className="h-4 w-4 mr-2" />
                Debitor anlegen
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Debitor anlegen</DialogTitle>
              <DialogDescription>
                Fügen Sie einen neuen Debitor hinzu, der aus BuchhaltungsButler synchronisiert wird.
              </DialogDescription>
            </DialogHeader>
            <CustomerForm
              formData={formData}
              setFormData={setFormData}
              editingCustomer={null}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              onBhbSync={handleBhbSync}
              isSubmitting={createMutation.isPending}
              isBhbSyncing={false}
            />
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="liste" className="space-y-4">
        <TabsList>
          <TabsTrigger value="liste" data-testid="tab-liste">Übersicht</TabsTrigger>
          <TabsTrigger value="zuordnungen" data-testid="tab-zuordnungen">
            Zuordnungen
            {(unmatchedCounterparties?.length || 0) > 0 && (
              <Badge variant="secondary" className="ml-2">{unmatchedCounterparties?.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="liste">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Debitorenliste</CardTitle>
                  <CardDescription>
                    {filteredCustomers?.length || 0} Debitoren registriert
                  </CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                    data-testid="input-search-customers"
                  />
                </div>
              </div>
            </CardHeader>
        <CardContent>
          {isLoading ? (
            <DataTableSkeleton columns={6} rows={5} />
          ) : filteredCustomers && filteredCustomers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => toggleSort("debtorPostingaccountNumber")}
                  >
                    <div className="flex items-center">
                      Debitorennr.
                      {getSortIcon("debtorPostingaccountNumber")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => toggleSort("displayName")}
                  >
                    <div className="flex items-center">
                      Name
                      {getSortIcon("displayName")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => toggleSort("emailContact")}
                  >
                    <div className="flex items-center">
                      E-Mail
                      {getSortIcon("emailContact")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => toggleSort("isActive")}
                  >
                    <div className="flex items-center">
                      Status
                      {getSortIcon("isActive")}
                    </div>
                  </TableHead>
                  <TableHead>BHB Daten</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                    <TableCell className="font-mono">
                      {customer.debtorPostingaccountNumber}
                    </TableCell>
                    <TableCell className="font-medium">{customer.displayName}</TableCell>
                    <TableCell>
                      {customer.emailContact ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          {customer.emailContact}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.isActive ? "default" : "secondary"}>
                        {customer.isActive ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {customer.lastBhbSync ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(customer.lastBhbSync).toLocaleDateString("de-DE")}
                          </span>
                        </div>
                      ) : customer.debtorPostingaccountNumber >= 80000 ? (
                        <div className="flex items-center gap-1.5" title="Nur Portal-Daten, nicht von BHB synchronisiert">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          <span className="text-xs text-muted-foreground">Lokal</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5" title="Noch nicht synchronisiert">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">-</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(customer)}
                          title="Bearbeiten"
                          data-testid={`button-edit-customer-${customer.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingCustomer(customer)}
                          title="Löschen"
                          data-testid={`button-delete-customer-${customer.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={Users}
              title="Keine Debitoren"
              description={
                searchQuery
                  ? "Keine Debitoren gefunden, die Ihren Suchkriterien entsprechen."
                  : "Legen Sie Ihren ersten Debitor an, um mit dem Mahnwesen zu starten."
              }
              action={
                !searchQuery
                  ? {
                      label: "Debitor anlegen",
                      onClick: () => setIsCreateOpen(true),
                    }
                  : undefined
              }
            />
          )}
        </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zuordnungen" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-4">
                <span>Nicht zugeordnete Rechnungspartner ({unmatchedCounterparties?.length || 0})</span>
                <Button
                  onClick={() => applyMappingsMutation.mutate()}
                  disabled={applyMappingsMutation.isPending || !mappings?.length}
                  data-testid="button-apply-mappings"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${applyMappingsMutation.isPending ? "animate-spin" : ""}`} />
                  Zuordnungen anwenden
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Wählen Sie für jeden unbekannten Rechnungspartner den passenden Debitor aus. 
                Bei aktivierter BHB-Übertragung wird der Name des Debitors in BHB automatisch angepasst.
              </p>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Counterparty (aus Rechnung)</TableHead>
                      <TableHead>Anzahl</TableHead>
                      <TableHead>Zuordnen zu Debitor</TableHead>
                      <TableHead>BHB aktualisieren</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unmatchedCounterparties?.map((item) => {
                      const existingMapping = mappings?.find((m) => m.counterpartyName === item.counterpartyName);
                      return (
                        <TableRow key={item.counterpartyName}>
                          <TableCell className="max-w-xs">
                            <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">
                              {item.counterpartyName}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{item.count}</Badge>
                          </TableCell>
                          <TableCell>
                            {existingMapping ? (
                              <Badge variant="default" className="bg-green-600">
                                {existingMapping.debtorPostingaccountNumber} - {existingMapping.customerName}
                              </Badge>
                            ) : (
                              <DebtorCombobox
                                debtors={customers?.map((c) => ({
                                  id: c.id,
                                  debtorPostingaccountNumber: c.debtorPostingaccountNumber,
                                  displayName: c.displayName,
                                })) || []}
                                value={selectedMapping[item.counterpartyName] || null}
                                onValueChange={(val) =>
                                  setSelectedMapping((prev) => ({ ...prev, [item.counterpartyName]: val }))
                                }
                                data-testid={`select-debtor-${item.counterpartyName.slice(0, 20)}`}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {!existingMapping && (
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`bhb-update-${item.counterpartyName}`}
                                  checked={updateBhbFlags[item.counterpartyName] ?? true}
                                  onCheckedChange={(checked) =>
                                    setUpdateBhbFlags((prev) => ({ ...prev, [item.counterpartyName]: !!checked }))
                                  }
                                  data-testid={`checkbox-bhb-update-${item.counterpartyName.slice(0, 20)}`}
                                />
                                <label
                                  htmlFor={`bhb-update-${item.counterpartyName}`}
                                  className="text-xs text-muted-foreground cursor-pointer"
                                >
                                  Name übertragen
                                </label>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {existingMapping ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteMappingMutation.mutate(existingMapping.id)}
                                data-testid={`button-delete-mapping-${existingMapping.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={!selectedMapping[item.counterpartyName]}
                                onClick={() => handleCreateMapping(item.counterpartyName)}
                                data-testid={`button-create-mapping-${item.counterpartyName.slice(0, 20)}`}
                              >
                                <LinkIcon className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {(!unmatchedCounterparties || unmatchedCounterparties.length === 0) && (
                  <p className="text-center py-8 text-muted-foreground">
                    Alle Rechnungen sind zugeordnet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bestehende Zuordnungen ({mappings?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Counterparty Name</TableHead>
                    <TableHead>Debitor Nr.</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings?.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-sm">{m.counterpartyName}</TableCell>
                      <TableCell><Badge variant="secondary">{m.debtorPostingaccountNumber}</Badge></TableCell>
                      <TableCell>{m.customerName || "-"}</TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMappingMutation.mutate(m.id)}
                          data-testid={`button-delete-saved-mapping-${m.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(!mappings || mappings.length === 0) && (
                <p className="text-center py-4 text-muted-foreground">
                  Keine manuellen Zuordnungen vorhanden.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Debitor bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Daten des Debitors {editingCustomer?.displayName}.
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            formData={formData}
            setFormData={setFormData}
            editingCustomer={editingCustomer}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onBhbSync={handleBhbSync}
            isSubmitting={updateMutation.isPending}
            isBhbSyncing={bhbSyncMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Debitor löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Debitor "{deletingCustomer?.displayName}" wirklich löschen? 
              Alle zugehörigen Mahnregeln werden ebenfalls entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCustomer && deleteMutation.mutate(deletingCustomer.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Löschen..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
