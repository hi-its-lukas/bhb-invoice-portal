import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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

export default function DebugPage() {
  const [receiptSearch, setReceiptSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [bhbIdByCustomer, setBhbIdByCustomer] = useState("");
  const [bhbApiResponse, setBhbApiResponse] = useState<any>(null);

  const bhbTestMutation = useMutation({
    mutationFn: async (idByCustomer: string) => {
      const response = await apiRequest("POST", "/api/debug/bhb-receipt", { idByCustomer });
      return response.json();
    },
    onSuccess: (data: any) => {
      setBhbApiResponse(data);
    },
    onError: (error: Error) => {
      setBhbApiResponse({ error: error.message });
    },
  });

  const { data: receipts } = useQuery<DebugReceipt[]>({
    queryKey: ["/api/debug/receipts"],
  });

  const { data: customers } = useQuery<DebugCustomer[]>({
    queryKey: ["/api/debug/customers"],
  });

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
            <strong>{unmatchedReceipts?.length || 0} Rechnungen</strong> ohne zugeordnete Debitorennummer (Nr. 0).
            Zuordnungen können auf der Debitoren-Seite unter "Zuordnungen" erstellt werden.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="receipts">
        <TabsList>
          <TabsTrigger value="receipts">Rechnungen (Receipts)</TabsTrigger>
          <TabsTrigger value="customers">Debitoren (Customers)</TabsTrigger>
          <TabsTrigger value="unmatched">Nicht zugeordnet</TabsTrigger>
          <TabsTrigger value="bhb-api">BHB API Test</TabsTrigger>
        </TabsList>

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
              <CardTitle className="flex items-center justify-between gap-4">
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

        <TabsContent value="bhb-api" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>BHB API Test: /receipts/get/{"{id_by_customer}"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="bhb-id">id_by_customer</Label>
                  <Input
                    id="bhb-id"
                    placeholder="z.B. 2956"
                    value={bhbIdByCustomer}
                    onChange={(e) => setBhbIdByCustomer(e.target.value)}
                    data-testid="input-bhb-id"
                  />
                </div>
                <Button
                  onClick={() => bhbTestMutation.mutate(bhbIdByCustomer)}
                  disabled={bhbTestMutation.isPending || !bhbIdByCustomer}
                  data-testid="button-bhb-test"
                >
                  {bhbTestMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  API aufrufen
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>Testet: POST {`https://webapp.buchhaltungsbutler.de/api/v1/receipts/get/{id_by_customer}`}</p>
                <p>Body: {`{api_key: "...", get_file: true}`}</p>
              </div>

              {bhbApiResponse && (
                <div className="mt-4">
                  <Label>Antwort:</Label>
                  <Textarea
                    value={JSON.stringify(bhbApiResponse, null, 2)}
                    readOnly
                    className="font-mono text-xs h-96"
                    data-testid="textarea-bhb-response"
                  />
                  {bhbApiResponse.file_content && (
                    <p className="text-sm text-green-600 mt-2">
                      file_content vorhanden ({bhbApiResponse.file_content.length} Zeichen base64)
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
