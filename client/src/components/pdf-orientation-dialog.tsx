import { useState } from "react";
import { FileImage, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface PDFOrientationDialogProps {
  onDownload: (orientation: "portrait" | "landscape") => void;
  trigger: React.ReactNode;
  title?: string;
  description?: string;
}

export function PDFOrientationDialog({
  onDownload,
  trigger,
  title = "PDF-Format wählen",
  description = "Wählen Sie das gewünschte Seitenformat für den PDF-Export.",
}: PDFOrientationDialogProps) {
  const [open, setOpen] = useState(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");

  const handleDownload = () => {
    onDownload(orientation);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup
            value={orientation}
            onValueChange={(value) => setOrientation(value as "portrait" | "landscape")}
            className="grid grid-cols-2 gap-4"
          >
            <Label
              htmlFor="portrait"
              className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                orientation === "portrait"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/50"
              }`}
            >
              <RadioGroupItem value="portrait" id="portrait" className="sr-only" />
              <div className="w-12 h-16 border-2 rounded-sm border-current flex items-center justify-center">
                <FileImage className="h-6 w-6 opacity-50" />
              </div>
              <span className="font-medium">Hochformat</span>
              <span className="text-xs text-muted-foreground">Portrait (A4)</span>
            </Label>
            <Label
              htmlFor="landscape"
              className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                orientation === "landscape"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/50"
              }`}
            >
              <RadioGroupItem value="landscape" id="landscape" className="sr-only" />
              <div className="w-16 h-12 border-2 rounded-sm border-current flex items-center justify-center">
                <FileImage className="h-6 w-6 opacity-50" />
              </div>
              <span className="font-medium">Querformat</span>
              <span className="text-xs text-muted-foreground">Landscape (A4)</span>
            </Label>
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleDownload} data-testid="button-confirm-pdf-download">
            <Download className="h-4 w-4 mr-2" />
            PDF herunterladen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
