import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Link, Trash2, RefreshCw, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DebugReceipt {
  id: string;
  invoiceNumber: string | null;
  debtorPostingaccountNumber: number;
  counterpartyName: string | null;
  rawJson: any;
}

interface DebugCustomer {
  id: string;
  displayName: string;
  debtorPostingaccountNumber: number;
  bhbRawJson: any;
}

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

export default function DebugPage() {
  const [receiptSearch, setReceiptSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedMapping, setSelectedMapping] = useState<Record<string, number>>({});
  const [updateBhbFlags, setUpdateBhbFlags] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const { data: receipts } = useQuery<DebugReceipt[]>({
    queryKey: ["/api/debug/receipts"],
  });

  const { data: customers } = useQuery<DebugCustomer[]>({
    queryKey: ["/api/debug/customers"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/debug/receipts"] });
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

  const filteredReceipts = receipts?.filter((r) => {
    if (!receiptSearch) return true;
    const q = receiptSearch.toLowerCase();
    return (
      r.invoiceNumber?.toLowerCase().includes(q) ||
      r.counterpartyName?.toLowerCase().includes(q) ||
      r.debtorPostingaccountNumber.toString().includes(q)
    );
  });

  const filteredCustomers = customers?.filter((c) => {
    if (!customerSearch) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.debtorPostingaccountNumber.toString().includes(q)
    );
  });

  const unmatchedReceipts = receipts?.filter((r) => r.debtorPostingaccountNumber === 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Debug: Rohdaten-Vergleich</h1>
      
      <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>{unmatchedReceipts?.length || 0} Rechnungen</strong> ohne zugeordnete Debitorennummer (Nr. 0)
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="mappings">
        <TabsList>
          <TabsTrigger value="mappings">Manuelle Zuordnung</TabsTrigger>
          <TabsTrigger value="receipts">Rechnungen (Receipts)</TabsTrigger>
          <TabsTrigger value="customers">Debitoren (Customers)</TabsTrigger>
          <TabsTrigger value="unmatched">Nicht zugeordnet</TabsTrigger>
        </TabsList>

        <TabsContent value="mappings" className="mt-4 space-y-6">
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
                              <Select
                                value={selectedMapping[item.counterpartyName]?.toString() || ""}
                                onValueChange={(val) =>
                                  setSelectedMapping((prev) => ({ ...prev, [item.counterpartyName]: parseInt(val) }))
                                }
                              >
                                <SelectTrigger className="w-[300px]" data-testid={`select-debtor-${item.counterpartyName.slice(0, 20)}`}>
                                  <SelectValue placeholder="Debitor wählen..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {customers?.map((c) => (
                                    <SelectItem key={c.id} value={c.debtorPostingaccountNumber.toString()}>
                                      {c.debtorPostingaccountNumber} - {c.displayName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
                                <Link className="h-4 w-4" />
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

        <TabsContent value="receipts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-4">
                <span>Rechnungen aus BHB ({receipts?.length || 0})</span>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Suchen..."
                    value={receiptSearch}
                    onChange={(e) => setReceiptSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-receipts"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Rechnungsnr.</TableHead>
                      <TableHead>Debitor Nr.</TableHead>
                      <TableHead>Counterparty (aus rawJson)</TableHead>
                      <TableHead>Weitere Felder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts?.slice(0, 100).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.invoiceNumber || "-"}</TableCell>
                        <TableCell>
                          {r.debtorPostingaccountNumber === 0 ? (
                            <Badge variant="destructive">0</Badge>
                          ) : (
                            <Badge variant="secondary">{r.debtorPostingaccountNumber}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">
                            {r.counterpartyName || "-"}
                          </code>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-md">
                          <details>
                            <summary className="cursor-pointer">rawJson anzeigen</summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-48">
                              {JSON.stringify(r.rawJson, null, 2)}
                            </pre>
                          </details>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredReceipts && filteredReceipts.length > 100 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Zeige 100 von {filteredReceipts.length} Ergebnissen
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Debitoren aus Portal ({customers?.length || 0})</span>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Suchen..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-customers"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Debitor Nr.</TableHead>
                      <TableHead>Name (displayName)</TableHead>
                      <TableHead>BHB Raw Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers?.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Badge variant="secondary">{c.debtorPostingaccountNumber}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">
                            {c.displayName}
                          </code>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-md">
                          {c.bhbRawJson ? (
                            <details>
                              <summary className="cursor-pointer">
                                {(c.bhbRawJson as any)?.name || "rawJson anzeigen"}
                              </summary>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-48">
                                {JSON.stringify(c.bhbRawJson, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-amber-600">Kein BHB-Sync</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unmatched" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Rechnungen ohne Debitorenzuordnung ({unmatchedReceipts?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Rechnungsnr.</TableHead>
                      <TableHead>Counterparty Name</TableHead>
                      <TableHead>Mögliche Matches</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unmatchedReceipts?.slice(0, 50).map((r) => {
                      const possibleMatches = customers?.filter((c) => {
                        const cName = c.displayName.toLowerCase();
                        const rName = (r.counterpartyName || "").toLowerCase();
                        return (
                          cName.includes(rName.slice(0, 10)) ||
                          rName.includes(cName.slice(0, 10))
                        );
                      }).slice(0, 3);
                      
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-sm">{r.invoiceNumber || "-"}</TableCell>
                          <TableCell className="max-w-xs">
                            <code className="text-xs bg-red-100 dark:bg-red-900 px-1 py-0.5 rounded break-all">
                              {r.counterpartyName || "-"}
                            </code>
                          </TableCell>
                          <TableCell>
                            {possibleMatches && possibleMatches.length > 0 ? (
                              <div className="space-y-1">
                                {possibleMatches.map((m) => (
                                  <div key={m.id} className="text-xs">
                                    <Badge variant="outline" className="mr-1">{m.debtorPostingaccountNumber}</Badge>
                                    <span className="text-muted-foreground">{m.displayName}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Keine ähnlichen gefunden</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
