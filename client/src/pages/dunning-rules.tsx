import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, Plus, Settings, Save, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PortalCustomer, DunningRules, DunningStages } from "@shared/schema";

interface DunningRulesWithCustomer extends DunningRules {
  customer: PortalCustomer;
}

const defaultStages: DunningStages = {
  reminder: { daysAfterDue: 7, fee: 0, enabled: true },
  dunning1: { daysAfterDue: 14, fee: 5, enabled: true },
  dunning2: { daysAfterDue: 28, fee: 10, enabled: true },
  dunning3: { daysAfterDue: 42, fee: 15, enabled: false },
};

const PAGE_SIZE_OPTIONS = [
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 150, label: "150" },
  { value: -1, label: "Alle" },
];

export default function DunningRulesPage() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRules, setEditingRules] = useState<{
    graceDays: number;
    interestRatePercent: string;
    useLegalRate: boolean;
    stages: DunningStages;
  } | null>(null);
  const { toast } = useToast();

  const { data: customers, isLoading: customersLoading } = useQuery<PortalCustomer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: allRules, isLoading: rulesLoading } = useQuery<DunningRulesWithCustomer[]>({
    queryKey: ["/api/dunning-rules"],
  });

  const { data: customerRules } = useQuery<DunningRules>({
    queryKey: ["/api/dunning-rules", selectedCustomerId],
    enabled: !!selectedCustomerId,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { customerId: string; rules: typeof editingRules }) =>
      apiRequest("POST", `/api/dunning-rules/${data.customerId}`, data.rules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dunning-rules"] });
      toast({
        title: "Mahnregeln gespeichert",
        description: "Die Mahnregeln wurden erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Mahnregeln konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    },
  });

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const existingRules = allRules?.find((r) => r.customerId === customerId);
    if (existingRules) {
      setEditingRules({
        graceDays: existingRules.graceDays,
        interestRatePercent: existingRules.interestRatePercent.toString(),
        useLegalRate: existingRules.useLegalRate,
        stages: existingRules.stages as DunningStages,
      });
    } else {
      setEditingRules({
        graceDays: 0,
        interestRatePercent: "5.00",
        useLegalRate: false,
        stages: { ...defaultStages },
      });
    }
  };

  const handleSave = () => {
    if (!selectedCustomerId || !editingRules) return;
    saveMutation.mutate({ customerId: selectedCustomerId, rules: editingRules });
  };

  const updateStage = (
    stage: keyof DunningStages,
    field: "daysAfterDue" | "fee" | "enabled",
    value: number | boolean
  ) => {
    if (!editingRules) return;
    setEditingRules({
      ...editingRules,
      stages: {
        ...editingRules.stages,
        [stage]: {
          ...editingRules.stages[stage],
          [field]: value,
        },
      },
    });
  };

  const isLoading = customersLoading || rulesLoading;

  // Filter and paginate customers
  const filteredCustomers = customers?.filter((customer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.displayName.toLowerCase().includes(query) ||
      customer.debtorPostingaccountNumber.toString().includes(query)
    );
  });

  const totalItems = filteredCustomers?.length || 0;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalItems / pageSize);
  const paginatedCustomers = pageSize === -1 
    ? filteredCustomers 
    : filteredCustomers?.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Clamp page when data shrinks
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight">Mahnregeln</h1>
        <p className="text-muted-foreground mt-1">
          Konfigurieren Sie Mahnstufen und Verzugszinsen pro Debitor
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 flex-1 min-h-0">
        <Card className="lg:col-span-1 flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="text-lg">Debitor auswählen</CardTitle>
            <CardDescription>
              {filteredCustomers?.length || 0} Debitoren
            </CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-dunning-customers"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : paginatedCustomers && paginatedCustomers.length > 0 ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="overflow-auto flex-1 min-h-0 space-y-2">
                  {paginatedCustomers.map((customer) => {
                    const hasRules = allRules?.some((r) => r.customerId === customer.id);
                    return (
                      <button
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer.id)}
                        className={`w-full text-left p-3 rounded-md border transition-colors ${
                          selectedCustomerId === customer.id
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted"
                        }`}
                        data-testid={`button-select-customer-${customer.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{customer.displayName}</p>
                            <p className="text-xs text-muted-foreground">
                              Nr. {customer.debtorPostingaccountNumber}
                            </p>
                          </div>
                          {hasRules && (
                            <Settings className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between border-t pt-3 mt-3 gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <select 
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-7 rounded-md border border-input bg-background px-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      data-testid="select-dunning-page-size"
                    >
                      {PAGE_SIZE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <span>von {totalItems}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1 || pageSize === -1}
                      data-testid="button-dunning-prev-page"
                    >
                      Zurück
                    </Button>
                    <span className="text-xs text-muted-foreground px-1">
                      {currentPage}/{totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages || pageSize === -1}
                      data-testid="button-dunning-next-page"
                    >
                      Weiter
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={AlertTriangle}
                title="Keine Debitoren"
                description={searchQuery ? "Keine Debitoren gefunden." : "Legen Sie zuerst Debitoren an, um Mahnregeln zu konfigurieren."}
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Mahnkonfiguration</CardTitle>
                <CardDescription>
                  {selectedCustomerId
                    ? `Einstellungen für ${customers?.find((c) => c.id === selectedCustomerId)?.displayName}`
                    : "Wählen Sie einen Debitor aus der Liste"}
                </CardDescription>
              </div>
              {selectedCustomerId && editingRules && (
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-rules"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Speichern..." : "Speichern"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedCustomerId ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Wählen Sie einen Debitor, um die Mahnregeln zu bearbeiten
              </div>
            ) : editingRules ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="graceDays">Kulanzzeit (Tage)</Label>
                    <Input
                      id="graceDays"
                      type="number"
                      min="0"
                      value={editingRules.graceDays}
                      onChange={(e) =>
                        setEditingRules({
                          ...editingRules,
                          graceDays: parseInt(e.target.value) || 0,
                        })
                      }
                      data-testid="input-grace-days"
                    />
                    <p className="text-xs text-muted-foreground">
                      Tage nach Fälligkeit, bevor Mahnungen starten
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interestRate">Verzugszinssatz (%)</Label>
                    <Input
                      id="interestRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingRules.interestRatePercent}
                      onChange={(e) =>
                        setEditingRules({
                          ...editingRules,
                          interestRatePercent: e.target.value,
                        })
                      }
                      disabled={editingRules.useLegalRate}
                      data-testid="input-interest-rate"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <Switch
                        id="useLegalRate"
                        checked={editingRules.useLegalRate}
                        onCheckedChange={(checked) =>
                          setEditingRules({ ...editingRules, useLegalRate: checked })
                        }
                        data-testid="switch-legal-rate"
                      />
                      <Label htmlFor="useLegalRate" className="text-xs">
                        Gesetzlichen Zinssatz verwenden
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mahnstufen</Label>
                  <Accordion type="single" collapsible className="w-full">
                    {(
                      [
                        { key: "reminder", label: "Zahlungserinnerung" },
                        { key: "dunning1", label: "1. Mahnung" },
                        { key: "dunning2", label: "2. Mahnung" },
                        { key: "dunning3", label: "3. Mahnung" },
                      ] as const
                    ).map((stage) => (
                      <AccordionItem key={stage.key} value={stage.key}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={editingRules.stages[stage.key].enabled}
                              onCheckedChange={(checked) =>
                                updateStage(stage.key, "enabled", checked)
                              }
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`switch-stage-${stage.key}`}
                            />
                            <span className={!editingRules.stages[stage.key].enabled ? "text-muted-foreground" : ""}>
                              {stage.label}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid gap-4 sm:grid-cols-2 pt-2 pl-10">
                            <div className="space-y-2">
                              <Label>Tage nach Fälligkeit</Label>
                              <Input
                                type="number"
                                min="0"
                                value={editingRules.stages[stage.key].daysAfterDue}
                                onChange={(e) =>
                                  updateStage(
                                    stage.key,
                                    "daysAfterDue",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                disabled={!editingRules.stages[stage.key].enabled}
                                data-testid={`input-days-${stage.key}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Mahngebühr (€)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingRules.stages[stage.key].fee || 0}
                                onChange={(e) =>
                                  updateStage(
                                    stage.key,
                                    "fee",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                disabled={!editingRules.stages[stage.key].enabled}
                                data-testid={`input-fee-${stage.key}`}
                              />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
