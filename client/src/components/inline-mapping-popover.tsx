import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DebtorCombobox } from "@/components/debtor-combobox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { PortalCustomer } from "@shared/schema";

interface InlineMappingPopoverProps {
  counterpartyName: string;
  onMappingCreated?: () => void;
}

export function InlineMappingPopover({ counterpartyName, onMappingCreated }: InlineMappingPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers } = useQuery<PortalCustomer[]>({
    queryKey: ["/api/customers"],
    enabled: open,
  });

  const debtorOptions = (customers || []).map((c) => ({
    id: c.id,
    debtorPostingaccountNumber: c.debtorPostingaccountNumber,
    displayName: c.displayName || `Debitor ${c.debtorPostingaccountNumber}`,
  }));

  const createMappingMutation = useMutation({
    mutationFn: async (data: { counterpartyName: string; debtorPostingaccountNumber: number; updateBhbName: boolean }) => {
      const res = await apiRequest("POST", "/api/counterparty-mappings", data) as Response;
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Zuordnung erstellt" });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/counterparty-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/unmatched-counterparties"] });
      setOpen(false);
      setSelectedDebtor(null);
      onMappingCreated?.();
    },
    onError: () => {
      toast({ title: "Fehler beim Erstellen der Zuordnung", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!selectedDebtor) return;
    createMappingMutation.mutate({
      counterpartyName,
      debtorPostingaccountNumber: selectedDebtor,
      updateBhbName: false,
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link2 className="h-3 w-3 mr-1" />
          Zuordnen
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Counterparty:</p>
            <p className="text-sm font-medium truncate" title={counterpartyName}>
              {counterpartyName}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Debitor zuweisen:</p>
            <DebtorCombobox 
              debtors={debtorOptions}
              value={selectedDebtor} 
              onValueChange={setSelectedDebtor} 
              className="w-full"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              size="sm"
              disabled={!selectedDebtor || createMappingMutation.isPending}
              onClick={handleSubmit}
            >
              Zuordnen
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
