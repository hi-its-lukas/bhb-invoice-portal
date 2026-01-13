import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DebtorOption {
  id: string;
  debtorPostingaccountNumber: number;
  displayName: string;
}

interface DebtorComboboxProps {
  debtors: DebtorOption[];
  value: number | null;
  onValueChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

export function DebtorCombobox({
  debtors,
  value,
  onValueChange,
  placeholder = "Debitor wählen...",
  className,
  "data-testid": dataTestId,
}: DebtorComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedDebtor = debtors.find((d) => d.debtorPostingaccountNumber === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[300px] justify-between", className)}
          data-testid={dataTestId}
        >
          {selectedDebtor
            ? `${selectedDebtor.debtorPostingaccountNumber} - ${selectedDebtor.displayName.slice(0, 30)}${selectedDebtor.displayName.length > 30 ? "..." : ""}`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Debitor suchen..." />
          <CommandList>
            <CommandEmpty>Kein Debitor gefunden.</CommandEmpty>
            <CommandGroup>
              {debtors.map((debtor) => (
                <CommandItem
                  key={debtor.id}
                  value={`${debtor.debtorPostingaccountNumber} ${debtor.displayName}`}
                  onSelect={() => {
                    onValueChange(debtor.debtorPostingaccountNumber);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === debtor.debtorPostingaccountNumber ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-mono text-sm mr-2">{debtor.debtorPostingaccountNumber}</span>
                  <span className="truncate">{debtor.displayName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
