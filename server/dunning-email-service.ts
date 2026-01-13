import Handlebars from "handlebars";
import type { PortalCustomer, BhbReceiptsCache, DunningRules, DunningEmailTemplate } from "@shared/schema";

export interface OverdueInvoice {
  invoiceNumber: string;
  receiptDate: Date;
  dueDate: Date;
  amount: number;
  amountOpen: number;
  daysOverdue: number;
  interestRate: number;
  interestAmount: number;
  feeAmount: number;
  totalWithInterest: number;
}

export interface DunningEmailContext {
  kunde: {
    name: string;
    ansprechpartner: string;
    strasse: string;
    plz: string;
    ort: string;
    land: string;
    email: string;
    kundennummer: string;
  };
  rechnungen: OverdueInvoice[];
  summe: {
    offenerBetrag: number;
    zinsen: number;
    gebuehren: number;
    gesamt: number;
  };
  bank: {
    iban: string;
    bic: string;
    kontoinhaber: string;
  };
  mahnung: {
    stufe: string;
    stufeName: string;
    datum: string;
    frist: string;
  };
  unternehmen: {
    name: string;
    strasse: string;
    plz: string;
    ort: string;
    telefon: string;
    email: string;
  };
}

Handlebars.registerHelper("formatCurrency", (value: number) => {
  if (typeof value !== "number" || isNaN(value)) return "0,00 €";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
});

Handlebars.registerHelper("formatDate", (value: Date | string | null) => {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
});

Handlebars.registerHelper("formatNumber", (value: number, decimals: number = 2) => {
  if (typeof value !== "number" || isNaN(value)) return "0";
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
});

Handlebars.registerHelper("eq", (a: any, b: any) => a === b);
Handlebars.registerHelper("gt", (a: number, b: number) => a > b);
Handlebars.registerHelper("lt", (a: number, b: number) => a < b);
Handlebars.registerHelper("add", (a: number, b: number) => a + b);

export function getStageName(stage: string): string {
  const stageNames: Record<string, string> = {
    reminder: "Zahlungserinnerung",
    dunning1: "1. Mahnung",
    dunning2: "2. Mahnung",
    dunning3: "Letzte Mahnung",
  };
  return stageNames[stage] || stage;
}

export function calculateInterest(
  principal: number,
  daysOverdue: number,
  annualRate: number
): number {
  if (daysOverdue <= 0 || annualRate <= 0) return 0;
  return (principal * annualRate * daysOverdue) / (100 * 365);
}

export function calculateBgbInterestRate(
  customerType: string | null,
  ezbBaseRate: number | null | undefined
): number {
  if (!customerType) return 0;
  const baseRate = ezbBaseRate ?? 2.82;
  if (customerType === "business") {
    return baseRate + 9;
  }
  return baseRate + 5;
}

export function calculateOverdueInvoices(
  receipts: BhbReceiptsCache[],
  customer: PortalCustomer,
  dunningRules: DunningRules | null,
  stage: string,
  ezbBaseRate: number = 2.82
): OverdueInvoice[] {
  const today = new Date();
  const paymentTermDays = customer.paymentTermDays || 14;
  const interestRate = calculateBgbInterestRate(customer.customerType || null, ezbBaseRate);
  
  const stageFees: Record<string, number> = {
    reminder: 0,
    dunning1: dunningRules?.stages?.dunning1?.fee || 0,
    dunning2: dunningRules?.stages?.dunning2?.fee || 0,
    dunning3: dunningRules?.stages?.dunning3?.fee || 0,
  };
  
  const feePerInvoice = stageFees[stage] || 0;
  
  return receipts
    .filter(r => {
      const amountOpen = parseFloat(r.amountOpen as string) || 0;
      return amountOpen > 0;
    })
    .map(r => {
      const receiptDate = r.receiptDate ? new Date(r.receiptDate) : new Date();
      let dueDate = r.dueDate ? new Date(r.dueDate) : null;
      
      if (!dueDate) {
        dueDate = new Date(receiptDate);
        dueDate.setDate(dueDate.getDate() + paymentTermDays);
      }
      
      const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      const amountOpen = parseFloat(r.amountOpen as string) || 0;
      const interestAmount = calculateInterest(amountOpen, daysOverdue, interestRate);
      
      return {
        invoiceNumber: r.invoiceNumber || r.idByCustomer,
        receiptDate,
        dueDate,
        amount: parseFloat(r.amountTotal as string) || 0,
        amountOpen,
        daysOverdue,
        interestRate,
        interestAmount,
        feeAmount: feePerInvoice,
        totalWithInterest: amountOpen + interestAmount + feePerInvoice,
      };
    })
    .filter(inv => inv.daysOverdue > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export function buildEmailContext(
  customer: PortalCustomer,
  overdueInvoices: OverdueInvoice[],
  stage: string,
  companySettings: {
    name?: string;
    strasse?: string;
    plz?: string;
    ort?: string;
    telefon?: string;
    email?: string;
    iban?: string;
    bic?: string;
  }
): DunningEmailContext {
  const today = new Date();
  const deadline = new Date(today);
  deadline.setDate(deadline.getDate() + 14);
  
  const totalOffenerBetrag = overdueInvoices.reduce((sum, inv) => sum + inv.amountOpen, 0);
  const totalZinsen = overdueInvoices.reduce((sum, inv) => sum + inv.interestAmount, 0);
  const totalGebuehren = overdueInvoices.reduce((sum, inv) => sum + inv.feeAmount, 0);
  
  return {
    kunde: {
      name: customer.displayName,
      ansprechpartner: customer.contactPersonName || customer.displayName,
      strasse: customer.street || "",
      plz: customer.zip || "",
      ort: customer.city || "",
      land: customer.country || "Deutschland",
      email: customer.emailContact || "",
      kundennummer: String(customer.debtorPostingaccountNumber),
    },
    rechnungen: overdueInvoices,
    summe: {
      offenerBetrag: totalOffenerBetrag,
      zinsen: totalZinsen,
      gebuehren: totalGebuehren,
      gesamt: totalOffenerBetrag + totalZinsen + totalGebuehren,
    },
    bank: {
      iban: companySettings.iban || "",
      bic: companySettings.bic || "",
      kontoinhaber: companySettings.name || "",
    },
    mahnung: {
      stufe: stage,
      stufeName: getStageName(stage),
      datum: new Intl.DateTimeFormat("de-DE").format(today),
      frist: new Intl.DateTimeFormat("de-DE").format(deadline),
    },
    unternehmen: {
      name: companySettings.name || "",
      strasse: companySettings.strasse || "",
      plz: companySettings.plz || "",
      ort: companySettings.ort || "",
      telefon: companySettings.telefon || "",
      email: companySettings.email || "",
    },
  };
}

export function renderTemplate(template: string, context: DunningEmailContext): string {
  const compiled = Handlebars.compile(template);
  return compiled(context);
}

export function renderEmailTemplate(
  template: DunningEmailTemplate,
  context: DunningEmailContext
): { subject: string; html: string; text: string } {
  return {
    subject: renderTemplate(template.subject, context),
    html: renderTemplate(template.htmlBody, context),
    text: template.textBody ? renderTemplate(template.textBody, context) : "",
  };
}

export const defaultTemplates: Omit<DunningEmailTemplate, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "Standard Zahlungserinnerung",
    stage: "reminder",
    isDefault: true,
    isActive: true,
    subject: "Zahlungserinnerung - {{mahnung.stufeName}}",
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { margin-bottom: 20px; }
    .address { margin-bottom: 30px; }
    .content { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background-color: #f5f5f5; }
    .total-row { font-weight: bold; background-color: #f9f9f9; }
    .footer { margin-top: 30px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <strong>{{unternehmen.name}}</strong><br>
    {{unternehmen.strasse}}<br>
    {{unternehmen.plz}} {{unternehmen.ort}}
  </div>
  
  <div class="address">
    {{kunde.name}}<br>
    {{kunde.strasse}}<br>
    {{kunde.plz}} {{kunde.ort}}
  </div>
  
  <p><strong>{{mahnung.stufeName}}</strong></p>
  <p>Datum: {{mahnung.datum}}</p>
  <p>Kundennummer: {{kunde.kundennummer}}</p>
  
  <div class="content">
    <p>Sehr geehrte Damen und Herren,</p>
    
    <p>bei der Überprüfung unserer Buchhaltung haben wir festgestellt, dass die folgenden Rechnungen noch offen sind:</p>
    
    <table>
      <thead>
        <tr>
          <th>Rechnungsnr.</th>
          <th>Rechnungsdatum</th>
          <th>Fällig am</th>
          <th>Tage überfällig</th>
          <th>Offener Betrag</th>
        </tr>
      </thead>
      <tbody>
        {{#each rechnungen}}
        <tr>
          <td>{{this.invoiceNumber}}</td>
          <td>{{formatDate this.receiptDate}}</td>
          <td>{{formatDate this.dueDate}}</td>
          <td>{{this.daysOverdue}}</td>
          <td>{{formatCurrency this.amountOpen}}</td>
        </tr>
        {{/each}}
        <tr class="total-row">
          <td colspan="4">Gesamtsumme</td>
          <td>{{formatCurrency summe.offenerBetrag}}</td>
        </tr>
      </tbody>
    </table>
    
    <p>Wir bitten Sie, den offenen Betrag bis zum <strong>{{mahnung.frist}}</strong> auf folgendes Konto zu überweisen:</p>
    
    <p>
      <strong>Bankverbindung:</strong><br>
      Kontoinhaber: {{bank.kontoinhaber}}<br>
      IBAN: {{bank.iban}}<br>
      BIC: {{bank.bic}}
    </p>
    
    <p>Sollte sich Ihre Zahlung mit diesem Schreiben überschneiden, betrachten Sie diese Erinnerung bitte als gegenstandslos.</p>
    
    <p>Mit freundlichen Grüßen</p>
    <p>{{unternehmen.name}}</p>
  </div>
  
  <div class="footer">
    <p>
      {{unternehmen.name}} | {{unternehmen.strasse}} | {{unternehmen.plz}} {{unternehmen.ort}}<br>
      Tel: {{unternehmen.telefon}} | E-Mail: {{unternehmen.email}}
    </p>
  </div>
</body>
</html>`,
    textBody: `{{unternehmen.name}}
{{unternehmen.strasse}}
{{unternehmen.plz}} {{unternehmen.ort}}

{{kunde.name}}
{{kunde.strasse}}
{{kunde.plz}} {{kunde.ort}}

{{mahnung.stufeName}}
Datum: {{mahnung.datum}}
Kundennummer: {{kunde.kundennummer}}

Sehr geehrte Damen und Herren,

bei der Überprüfung unserer Buchhaltung haben wir festgestellt, dass die folgenden Rechnungen noch offen sind:

{{#each rechnungen}}
- Rechnung {{this.invoiceNumber}} vom {{formatDate this.receiptDate}}, fällig am {{formatDate this.dueDate}}: {{formatCurrency this.amountOpen}} ({{this.daysOverdue}} Tage überfällig)
{{/each}}

Gesamtsumme: {{formatCurrency summe.offenerBetrag}}

Wir bitten Sie, den offenen Betrag bis zum {{mahnung.frist}} auf folgendes Konto zu überweisen:

Bankverbindung:
Kontoinhaber: {{bank.kontoinhaber}}
IBAN: {{bank.iban}}
BIC: {{bank.bic}}

Sollte sich Ihre Zahlung mit diesem Schreiben überschneiden, betrachten Sie diese Erinnerung bitte als gegenstandslos.

Mit freundlichen Grüßen
{{unternehmen.name}}`,
  },
  {
    name: "Standard 1. Mahnung",
    stage: "dunning1",
    isDefault: true,
    isActive: true,
    subject: "1. Mahnung - Zahlungsaufforderung",
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { margin-bottom: 20px; }
    .address { margin-bottom: 30px; }
    .content { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background-color: #f5f5f5; }
    .total-row { font-weight: bold; background-color: #f9f9f9; }
    .warning { color: #c00; font-weight: bold; }
    .footer { margin-top: 30px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <strong>{{unternehmen.name}}</strong><br>
    {{unternehmen.strasse}}<br>
    {{unternehmen.plz}} {{unternehmen.ort}}
  </div>
  
  <div class="address">
    {{kunde.name}}<br>
    {{kunde.strasse}}<br>
    {{kunde.plz}} {{kunde.ort}}
  </div>
  
  <p class="warning"><strong>{{mahnung.stufeName}}</strong></p>
  <p>Datum: {{mahnung.datum}}</p>
  <p>Kundennummer: {{kunde.kundennummer}}</p>
  
  <div class="content">
    <p>Sehr geehrte Damen und Herren,</p>
    
    <p>trotz unserer Zahlungserinnerung konnten wir leider noch keinen Zahlungseingang für die folgenden Rechnungen feststellen:</p>
    
    <table>
      <thead>
        <tr>
          <th>Rechnungsnr.</th>
          <th>Fällig am</th>
          <th>Tage überfällig</th>
          <th>Offener Betrag</th>
          {{#if (gt summe.zinsen 0)}}<th>Zinsen</th>{{/if}}
          {{#if (gt summe.gebuehren 0)}}<th>Mahngebühr</th>{{/if}}
          <th>Gesamt</th>
        </tr>
      </thead>
      <tbody>
        {{#each rechnungen}}
        <tr>
          <td>{{this.invoiceNumber}}</td>
          <td>{{formatDate this.dueDate}}</td>
          <td>{{this.daysOverdue}}</td>
          <td>{{formatCurrency this.amountOpen}}</td>
          {{#if (gt ../summe.zinsen 0)}}<td>{{formatCurrency this.interestAmount}}</td>{{/if}}
          {{#if (gt ../summe.gebuehren 0)}}<td>{{formatCurrency this.feeAmount}}</td>{{/if}}
          <td>{{formatCurrency this.totalWithInterest}}</td>
        </tr>
        {{/each}}
        <tr class="total-row">
          <td colspan="3">Gesamtsumme</td>
          <td>{{formatCurrency summe.offenerBetrag}}</td>
          {{#if (gt summe.zinsen 0)}}<td>{{formatCurrency summe.zinsen}}</td>{{/if}}
          {{#if (gt summe.gebuehren 0)}}<td>{{formatCurrency summe.gebuehren}}</td>{{/if}}
          <td>{{formatCurrency summe.gesamt}}</td>
        </tr>
      </tbody>
    </table>
    
    <p>Wir fordern Sie hiermit auf, den Gesamtbetrag von <strong>{{formatCurrency summe.gesamt}}</strong> unverzüglich, spätestens bis zum <strong>{{mahnung.frist}}</strong>, auf folgendes Konto zu überweisen:</p>
    
    <p>
      <strong>Bankverbindung:</strong><br>
      Kontoinhaber: {{bank.kontoinhaber}}<br>
      IBAN: {{bank.iban}}<br>
      BIC: {{bank.bic}}
    </p>
    
    <p>Sollte die Zahlung nicht fristgerecht eingehen, behalten wir uns weitere Maßnahmen vor.</p>
    
    <p>Mit freundlichen Grüßen</p>
    <p>{{unternehmen.name}}</p>
  </div>
</body>
</html>`,
    textBody: `{{mahnung.stufeName}}

{{kunde.name}}
{{kunde.strasse}}  
{{kunde.plz}} {{kunde.ort}}

Datum: {{mahnung.datum}}
Kundennummer: {{kunde.kundennummer}}

Sehr geehrte Damen und Herren,

trotz unserer Zahlungserinnerung konnten wir leider noch keinen Zahlungseingang feststellen:

{{#each rechnungen}}
- Rechnung {{this.invoiceNumber}}, fällig am {{formatDate this.dueDate}}: {{formatCurrency this.totalWithInterest}} ({{this.daysOverdue}} Tage überfällig)
{{/each}}

Gesamtsumme inkl. Zinsen und Gebühren: {{formatCurrency summe.gesamt}}

Bitte überweisen Sie bis zum {{mahnung.frist}} auf:
IBAN: {{bank.iban}}
BIC: {{bank.bic}}

Mit freundlichen Grüßen
{{unternehmen.name}}`,
  },
];
