import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Plus, Search, Pencil, Trash2, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
}

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<PortalCustomer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<PortalCustomer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>({
    debtorPostingaccountNumber: 0,
    displayName: "",
    emailContact: "",
    isActive: true,
  });
  const { toast } = useToast();

  const { data: customers, isLoading } = useQuery<PortalCustomer[]>({
    queryKey: ["/api/customers"],
  });

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
      const { displayName, emailContact, isActive } = data;
      return apiRequest("PATCH", `/api/customers/${data.id}`, { displayName, emailContact, isActive });
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

  const resetForm = () => {
    setFormData({
      debtorPostingaccountNumber: 0,
      displayName: "",
      emailContact: "",
      isActive: true,
    });
  };

  const openEditDialog = (customer: PortalCustomer) => {
    setEditingCustomer(customer);
    setFormData({
      debtorPostingaccountNumber: customer.debtorPostingaccountNumber,
      displayName: customer.displayName,
      emailContact: customer.emailContact || "",
      isActive: customer.isActive,
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

  const filteredCustomers = customers?.filter((customer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.displayName.toLowerCase().includes(query) ||
      customer.debtorPostingaccountNumber.toString().includes(query) ||
      customer.emailContact?.toLowerCase().includes(query)
    );
  });

  const CustomerForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="debtorNumber">Debitorennummer *</Label>
        <Input
          id="debtorNumber"
          type="number"
          value={formData.debtorPostingaccountNumber || ""}
          onChange={(e) =>
            setFormData({ ...formData, debtorPostingaccountNumber: parseInt(e.target.value) || 0 })
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
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
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
          onChange={(e) => setFormData({ ...formData, emailContact: e.target.value })}
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
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          data-testid="switch-is-active"
        />
      </div>
      <DialogFooter className="pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsCreateOpen(false);
            setEditingCustomer(null);
            resetForm();
          }}
        >
          Abbrechen
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          data-testid="button-submit-customer"
        >
          {createMutation.isPending || updateMutation.isPending
            ? "Speichern..."
            : editingCustomer
            ? "Speichern"
            : "Erstellen"}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Debitoren</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre Debitoren und deren Mahneinstellungen
          </p>
        </div>
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
            <CustomerForm />
          </DialogContent>
        </Dialog>
      </div>

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
            <DataTableSkeleton columns={5} rows={5} />
          ) : filteredCustomers && filteredCustomers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Debitorennr.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Status</TableHead>
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

      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Debitor bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Daten des Debitors {editingCustomer?.displayName}.
            </DialogDescription>
          </DialogHeader>
          <CustomerForm />
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
