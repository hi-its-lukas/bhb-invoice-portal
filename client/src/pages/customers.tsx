import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Plus, Search, Pencil, Trash2, Mail, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Upload, CheckCircle2, AlertCircle, Clock, Link as LinkIcon, EyeOff, Eye, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon, FileText, Printer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { SendDunningDialog } from "@/components/send-dunning-dialog";
import { CustomerInvoicesRow } from "@/components/customer-invoices-row";
import { PDFOrientationDialog } from "@/components/pdf-orientation-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PortalCustomer } from "@shared/schema";

interface CustomerFormData {
  debtorPostingaccountNumber: number;
  displayName: string;
  emailContact: string;
  isActive: boolean;
  customerType: "consumer" | "business" | null;
  paymentTermDays: number;
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

      <div className="space-y-2">
        <Label htmlFor="customerType">Kundentyp *</Label>
        <Select
          value={formData.customerType || ""}
          onValueChange={(value: "consumer" | "business") => setFormData((prev) => ({ ...prev, customerType: value }))}
        >
          <SelectTrigger data-testid="select-customer-type">
            <SelectValue placeholder="Bitte wählen..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="consumer">Privatkunde (§ 288 Abs. 1 BGB)</SelectItem>
            <SelectItem value="business">Geschäftskunde (§ 288 Abs. 2 BGB)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Pflichtfeld für den Mahnversand. Bestimmt den gesetzlichen Zinssatz.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentTermDays">Zahlungsziel (Tage)</Label>
        <Input
          id="paymentTermDays"
          type="number"
          min={0}
          value={formData.paymentTermDays}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, paymentTermDays: parseInt(e.target.value) || 14 }))
          }
          placeholder="14"
          data-testid="input-payment-term"
        />
        <p className="text-xs text-muted-foreground">
          Standard-Zahlungsziel ab Rechnungsdatum (wenn keine Fälligkeit angegeben). Standard: 14 Tage.
        </p>
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

interface CounterpartyException {
  id: string;
  counterpartyName: string;
  status: string;
  note: string | null;
}

const MAPPING_PAGE_SIZE_OPTIONS = [
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 150, label: "150" },
  { value: -1, label: "Alle" },
];

const CUSTOMER_PAGE_SIZE_OPTIONS = [
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 150, label: "150" },
  { value: -1, label: "Alle" },
];

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mappingSearch, setMappingSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [mappingPageSize, setMappingPageSize] = useState(25);
  const [customerPageSize, setCustomerPageSize] = useState(25);
  const [customerCurrentPage, setCustomerCurrentPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<PortalCustomer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<PortalCustomer | null>(null);
  const [dunningCustomer, setDunningCustomer] = useState<PortalCustomer | null>(null);
  const [dunningStage, setDunningStage] = useState<string>("reminder");
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("debtorPostingaccountNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [openInvoiceFilter, setOpenInvoiceFilter] = useState<"all" | "with" | "overdue" | "without">("all");
  const [selectedMapping, setSelectedMapping] = useState<Record<string, number>>({});
  const [updateBhbFlags, setUpdateBhbFlags] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<CustomerFormData>({
    debtorPostingaccountNumber: 0,
    displayName: "",
    emailContact: "",
    isActive: true,
    customerType: null,
    paymentTermDays: 14,
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
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "user";

  const { data: customers, isLoading } = useQuery<PortalCustomer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: openInvoiceStats } = useQuery<Record<number, { count: number; totalOpen: number; overdueCount: number }>>({
    queryKey: ["/api/customers/open-invoice-stats"],
  });

  const { data: mappings } = useQuery<CounterpartyMapping[]>({
    queryKey: ["/api/counterparty-mappings"],
  });

  const { data: unmatchedCounterparties } = useQuery<UnmatchedCounterparty[]>({
    queryKey: ["/api/counterparty-mappings", "unmatched"],
  });

  const { data: exceptions } = useQuery<CounterpartyException[]>({
    queryKey: ["/api/counterparty-exceptions"],
  });

  const createExceptionMutation = useMutation({
    mutationFn: async (data: { counterpartyName: string }) => {
      return apiRequest<CounterpartyException>("POST", "/api/counterparty-exceptions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/counterparty-exceptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/counterparty-mappings"] });
      toast({ title: "Eintrag ignoriert" });
    },
    onError: () => {
      toast({ title: "Fehler beim Ignorieren", variant: "destructive" });
    },
  });

  const deleteExceptionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/counterparty-exceptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/counterparty-exceptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/counterparty-mappings"] });
      toast({ title: "Eintrag wiederhergestellt" });
    },
  });

  // Auto-suggest matching debtors when names match exactly
  const normalizeForComparison = (name: string) => 
    name.toLowerCase().trim().replace(/\s+/g, " ");

  const getExactMatchDebtor = (counterpartyName: string) => {
    if (!customers) return null;
    const normalizedCounterparty = normalizeForComparison(counterpartyName);
    return customers.find(c => normalizeForComparison(c.displayName) === normalizedCounterparty);
  };

  // Auto-populate suggestions for exact matches when data loads (using useEffect to avoid render-cycle issues)
  const [autoSuggestionsApplied, setAutoSuggestionsApplied] = useState(false);
  
  useEffect(() => {
    if (customers && unmatchedCounterparties && !autoSuggestionsApplied && mappings) {
      const suggestions: Record<string, number> = {};
      unmatchedCounterparties.forEach(item => {
        const existingMapping = mappings.find(m => m.counterpartyName === item.counterpartyName);
        if (!existingMapping) {
          const normalizedCounterparty = normalizeForComparison(item.counterpartyName);
          const matchedDebtor = customers.find(c => normalizeForComparison(c.displayName) === normalizedCounterparty);
          if (matchedDebtor) {
            suggestions[item.counterpartyName] = matchedDebtor.debtorPostingaccountNumber;
          }
        }
      });
      if (Object.keys(suggestions).length > 0) {
        setSelectedMapping(prev => ({ ...prev, ...suggestions }));
      }
      setAutoSuggestionsApplied(true);
    }
  }, [customers, unmatchedCounterparties, mappings, autoSuggestionsApplied]);

  const filteredUnmatched = unmatchedCounterparties?.filter((item) => {
    if (!mappingSearch) return true;
    return item.counterpartyName.toLowerCase().includes(mappingSearch.toLowerCase());
  });

  const effectiveMappingPageSize = mappingPageSize === -1 ? (filteredUnmatched?.length || 1000) : mappingPageSize;
  
  const paginatedUnmatched = filteredUnmatched?.slice(
    (currentPage - 1) * effectiveMappingPageSize,
    currentPage * effectiveMappingPageSize
  );

  const totalPages = mappingPageSize === -1 ? 1 : Math.ceil((filteredUnmatched?.length || 0) / mappingPageSize);

  const createMappingMutation = useMutation({
    mutationFn: async (data: { counterpartyName: string; debtorPostingaccountNumber: number; updateBhb: boolean }) => {
      const result = await apiRequest<CounterpartyMapping & { bhbUpdateResult?: { success: boolean; message?: string } }>("POST", "/api/counterparty-mappings", data);
      await apiRequest("POST", "/api/counterparty-mappings/apply");
      return result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/counterparty-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      
      setSelectedMapping((prev) => {
        const copy = { ...prev };
        delete copy[variables.counterpartyName];
        return copy;
      });
      setUpdateBhbFlags((prev) => {
        const copy = { ...prev };
        delete copy[variables.counterpartyName];
        return copy;
      });
      
      if (data?.bhbUpdateResult) {
        if (data.bhbUpdateResult.success) {
          toast({ title: "Zuordnung gespeichert & BHB aktualisiert" });
        } else {
          toast({ 
            title: "Zuordnung gespeichert", 
            description: `BHB-Update: ${data.bhbUpdateResult.message}`,
            variant: "destructive" 
          });
        }
      } else {
        toast({ title: "Zuordnung gespeichert" });
      }
    },
    onError: () => {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
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
      customerType: null,
      paymentTermDays: 14,
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
      customerType: (customer.customerType as "consumer" | "business" | null) || null,
      paymentTermDays: customer.paymentTermDays ?? 14,
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
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
          customer.displayName.toLowerCase().includes(query) ||
          customer.debtorPostingaccountNumber.toString().includes(query) ||
          customer.emailContact?.toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }
      
      if (openInvoiceFilter !== "all" && openInvoiceStats) {
        const stats = openInvoiceStats[customer.debtorPostingaccountNumber];
        switch (openInvoiceFilter) {
          case "with":
            if (!stats || stats.count === 0) return false;
            break;
          case "overdue":
            if (!stats || stats.overdueCount === 0) return false;
            break;
          case "without":
            if (stats && stats.count > 0) return false;
            break;
        }
      }
      
      return true;
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

  // Customer table pagination
  const customerTotalItems = filteredCustomers?.length || 0;
  const customerTotalPages = customerPageSize === -1 ? 1 : Math.ceil(customerTotalItems / customerPageSize);
  const paginatedCustomers = customerPageSize === -1 
    ? filteredCustomers 
    : filteredCustomers?.slice((customerCurrentPage - 1) * customerPageSize, customerCurrentPage * customerPageSize);

  // Reset customer page when filters change
  React.useEffect(() => {
    setCustomerCurrentPage(1);
  }, [searchQuery, openInvoiceFilter, sortColumn, sortDirection]);

  // Clamp customer page when data shrinks
  React.useEffect(() => {
    if (customerTotalPages > 0 && customerCurrentPage > customerTotalPages) {
      setCustomerCurrentPage(Math.max(1, customerTotalPages));
    }
  }, [customerTotalPages, customerCurrentPage]);

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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0 pb-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Debitoren</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre Debitoren und deren Mahneinstellungen
          </p>
        </div>
        <div className="flex gap-2">
          <PDFOrientationDialog
            title="Sammel-PDF Format"
            description="Wählen Sie das Seitenformat für den Sammel-Kontoauszug. Querformat eignet sich besser für viele Spalten."
            onDownload={(orientation) => {
              window.open(`/api/customers/report-pdf?onlyOverdue=true&orientation=${orientation}`, "_blank");
            }}
            trigger={
              <Button variant="outline" data-testid="button-download-report-pdf">
                <Printer className="h-4 w-4 mr-2" />
                Sammel-PDF
              </Button>
            }
          />
          {canEdit && (
            <>
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
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="liste" className="flex-1 flex flex-col min-h-0">
        <TabsList className="flex-shrink-0">
          <TabsTrigger value="liste" data-testid="tab-liste">Übersicht</TabsTrigger>
          <TabsTrigger value="zuordnungen" data-testid="tab-zuordnungen">
            Zuordnungen
            {(unmatchedCounterparties?.length || 0) > 0 && (
              <Badge variant="secondary" className="ml-2">{unmatchedCounterparties?.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="liste" className="flex-1 flex flex-col min-h-0 mt-4 data-[state=active]:flex">
          <Card className="flex-1 flex flex-col min-h-0 h-0">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Debitorenliste</CardTitle>
                  <CardDescription>
                    {filteredCustomers?.length || 0} Debitoren registriert
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select
                    value={openInvoiceFilter}
                    onValueChange={(value: "all" | "with" | "overdue" | "without") => setOpenInvoiceFilter(value)}
                  >
                    <SelectTrigger className="w-full sm:w-48" data-testid="select-open-invoice-filter">
                      <SelectValue placeholder="Offene Posten Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Debitoren</SelectItem>
                      <SelectItem value="with">Mit offenen Posten</SelectItem>
                      <SelectItem value="overdue">Mit überfälligen Posten</SelectItem>
                      <SelectItem value="without">Ohne offene Posten</SelectItem>
                    </SelectContent>
                  </Select>
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
              </div>
            </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden p-0">
          {isLoading ? (
            <div className="p-6"><DataTableSkeleton columns={6} rows={5} /></div>
          ) : filteredCustomers && filteredCustomers.length > 0 ? (
            <div className="flex flex-col flex-1 min-h-0 h-0">
              <div className="overflow-auto flex-1 min-h-0 h-0">
              <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-10"></TableHead>
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
                  <TableHead>Offene Posten</TableHead>
                  <TableHead>BHB Daten</TableHead>
                  {canEdit && <TableHead className="text-right">Aktionen</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers?.map((customer) => (
                  <React.Fragment key={customer.id}>
                    <TableRow 
                      data-testid={`row-customer-${customer.id}`}
                      className={expandedCustomerId === customer.id ? "border-b-0" : ""}
                    >
                      <TableCell className="p-0 w-10">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpandedCustomerId(
                            expandedCustomerId === customer.id ? null : customer.id
                          )}
                          title={expandedCustomerId === customer.id ? "Einklappen" : "Rechnungen anzeigen"}
                          data-testid={`button-expand-customer-${customer.id}`}
                        >
                          {expandedCustomerId === customer.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
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
                        {(() => {
                          const stats = openInvoiceStats?.[customer.debtorPostingaccountNumber];
                          if (!stats || stats.count === 0) {
                            return <span className="text-muted-foreground text-sm">-</span>;
                          }
                          return (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <Badge variant={stats.overdueCount > 0 ? "destructive" : "secondary"} className="text-xs">
                                  {stats.count} Rechnung{stats.count !== 1 ? "en" : ""}
                                </Badge>
                              </div>
                              <span className="text-xs font-medium">
                                {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(stats.totalOpen)}
                              </span>
                              {stats.overdueCount > 0 && (
                                <span className="text-xs text-red-600 dark:text-red-400">
                                  {stats.overdueCount} überfällig
                                </span>
                              )}
                            </div>
                          );
                        })()}
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
                      {canEdit && (
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
                      )}
                    </TableRow>
                    <CustomerInvoicesRow
                      key={`invoices-${customer.id}`}
                      customer={customer}
                      isExpanded={expandedCustomerId === customer.id}
                      onToggleExpand={() => setExpandedCustomerId(
                        expandedCustomerId === customer.id ? null : customer.id
                      )}
                      onSendDunning={(stage) => {
                        setDunningStage(stage);
                        setDunningCustomer(customer);
                      }}
                      colSpan={8}
                    />
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
              </div>
              <div className="flex items-center justify-between border-t px-4 py-3 gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Zeige</span>
                  <select 
                    value={customerPageSize}
                    onChange={(e) => {
                      setCustomerPageSize(Number(e.target.value));
                      setCustomerCurrentPage(1);
                    }}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    data-testid="select-customer-page-size"
                  >
                    {CUSTOMER_PAGE_SIZE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <span>von {customerTotalItems} Ergebnissen</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomerCurrentPage(1)}
                    disabled={customerCurrentPage === 1 || customerPageSize === -1}
                    data-testid="button-customer-first-page"
                  >
                    Erste
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomerCurrentPage(customerCurrentPage - 1)}
                    disabled={customerCurrentPage === 1 || customerPageSize === -1}
                    data-testid="button-customer-prev-page"
                  >
                    Zurück
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Seite {customerCurrentPage} von {customerTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomerCurrentPage(customerCurrentPage + 1)}
                    disabled={customerCurrentPage === customerTotalPages || customerPageSize === -1}
                    data-testid="button-customer-next-page"
                  >
                    Weiter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomerCurrentPage(customerTotalPages)}
                    disabled={customerCurrentPage === customerTotalPages || customerPageSize === -1}
                    data-testid="button-customer-last-page"
                  >
                    Letzte
                  </Button>
                </div>
              </div>
            </div>
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

        <TabsContent value="zuordnungen" className="flex-1 flex flex-col min-h-0 overflow-auto mt-4 space-y-6">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="flex-shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Nicht zugeordnete Rechnungspartner</CardTitle>
                  <CardDescription>
                    {filteredUnmatched?.length || 0} von {unmatchedCounterparties?.length || 0} Einträgen
                    {mappingSearch && " (gefiltert)"}
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Suchen..."
                      value={mappingSearch}
                      onChange={(e) => {
                        setMappingSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-9 w-full sm:w-48"
                      data-testid="input-search-mappings"
                    />
                  </div>
                  <Select
                    value={String(mappingPageSize)}
                    onValueChange={(val) => {
                      setMappingPageSize(Number(val));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAPPING_PAGE_SIZE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {canEdit && (
                <p className="text-sm text-muted-foreground mb-4 flex-shrink-0">
                  Wählen Sie einen Debitor und klicken Sie auf das Verknüpfungs-Symbol - die Zuordnung wird sofort gespeichert.
                  Mit "Ignorieren" blenden Sie irrelevante Einträge aus.
                  <span className="text-green-600 dark:text-green-400 ml-2">Bei 100% Namensübereinstimmung wird der Debitor automatisch vorgeschlagen.</span>
                </p>
              )}
              <div className="flex-1 overflow-y-auto border rounded-md min-h-0">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Counterparty (aus Rechnung)</TableHead>
                    <TableHead className="w-20">Anz.</TableHead>
                    <TableHead>Debitor zuordnen</TableHead>
                    {canEdit && <TableHead className="w-28">BHB</TableHead>}
                    {canEdit && <TableHead className="w-24 text-right">Aktionen</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUnmatched?.map((item) => {
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
                          ) : canEdit ? (
                            <div className="flex items-center gap-2">
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
                              />
                              {getExactMatchDebtor(item.counterpartyName) && selectedMapping[item.counterpartyName] && (
                                <Badge variant="outline" className="text-green-600 border-green-600 text-xs whitespace-nowrap">
                                  100% Match
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            {!existingMapping && (
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`bhb-update-${item.counterpartyName}`}
                                  checked={updateBhbFlags[item.counterpartyName] ?? true}
                                  onCheckedChange={(checked) =>
                                    setUpdateBhbFlags((prev) => ({ ...prev, [item.counterpartyName]: !!checked }))
                                  }
                                />
                                <label
                                  htmlFor={`bhb-update-${item.counterpartyName}`}
                                  className="text-xs text-muted-foreground cursor-pointer"
                                >
                                  Sync
                                </label>
                              </div>
                            )}
                          </TableCell>
                        )}
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {existingMapping ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => deleteMappingMutation.mutate(existingMapping.id)}
                                  title="Zuordnung löschen"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    disabled={!selectedMapping[item.counterpartyName]}
                                    onClick={() => handleCreateMapping(item.counterpartyName)}
                                    title="Zuordnung erstellen"
                                  >
                                    <LinkIcon className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => createExceptionMutation.mutate({ counterpartyName: item.counterpartyName })}
                                    title="Ignorieren"
                                  >
                                    <EyeOff className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
              {(!paginatedUnmatched || paginatedUnmatched.length === 0) && (
                <p className="text-center py-8 text-muted-foreground">
                  {mappingSearch ? "Keine Einträge gefunden." : "Alle Rechnungen sind zugeordnet."}
                </p>
              )}
              {(filteredUnmatched?.length || 0) > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Zeigt {((currentPage - 1) * effectiveMappingPageSize) + 1} bis {Math.min(currentPage * effectiveMappingPageSize, filteredUnmatched?.length || 0)} von {filteredUnmatched?.length || 0} Einträgen
                  </span>
                  {totalPages > 1 && (
                    <div className="flex gap-2 items-center">
                      <span className="text-sm text-muted-foreground">
                        Seite {currentPage} von {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
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
                    {canEdit && <TableHead></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings?.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-sm">{m.counterpartyName}</TableCell>
                      <TableCell><Badge variant="secondary">{m.debtorPostingaccountNumber}</Badge></TableCell>
                      <TableCell>{m.customerName || "-"}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMappingMutation.mutate(m.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
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

          {exceptions && exceptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ignorierte Einträge ({exceptions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Counterparty Name</TableHead>
                      {canEdit && <TableHead className="w-32"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exceptions.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-sm text-muted-foreground">{e.counterpartyName}</TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteExceptionMutation.mutate(e.id)}
                              title="Wiederherstellen"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Anzeigen
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
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

      <SendDunningDialog
        open={!!dunningCustomer}
        onOpenChange={(open) => {
          if (!open) {
            setDunningCustomer(null);
            setDunningStage("reminder");
          }
        }}
        customer={dunningCustomer}
        initialStage={dunningStage}
      />
    </div>
  );
}
