import type { Express } from "express";
import { createServer, type Server } from "http";
import nodemailer from "nodemailer";
import { storage, type IStorage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated, isInternal, isAdmin } from "./auth";
import {
  insertPortalCustomerSchema,
  updatePortalCustomerSchema,
  inputDunningRulesSchema,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

function getEffectiveDueDate(dueDate: Date | string | null, receiptDate?: Date | string | null, paymentTermDays?: number): Date | null {
  if (dueDate) {
    return new Date(dueDate);
  }
  
  if (receiptDate) {
    const receipt = new Date(receiptDate);
    const termDays = paymentTermDays ?? 14;
    receipt.setDate(receipt.getDate() + termDays);
    return receipt;
  }
  
  return null;
}

function calculateDaysOverdue(dueDate: Date | string | null, receiptDate?: Date | string | null, paymentTermDays?: number): number {
  const effectiveDueDate = getEffectiveDueDate(dueDate, receiptDate, paymentTermDays);
  
  if (!effectiveDueDate) return 0;
  const today = new Date();
  const diffTime = today.getTime() - effectiveDueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function calculateInterest(amount: number, daysOverdue: number, ratePercent: number): number {
  if (daysOverdue <= 0 || amount <= 0 || isNaN(amount) || isNaN(ratePercent)) return 0;
  return (amount * (ratePercent / 100) * daysOverdue) / 365;
}

function determineDunningLevel(daysOverdue: number, stages: any): string {
  if (!stages || typeof stages !== "object") return "none";
  if (daysOverdue <= 0) return "none";
  
  if (stages.dunning3?.enabled && typeof stages.dunning3.daysAfterDue === "number" && daysOverdue >= stages.dunning3.daysAfterDue) {
    return "dunning3";
  }
  if (stages.dunning2?.enabled && typeof stages.dunning2.daysAfterDue === "number" && daysOverdue >= stages.dunning2.daysAfterDue) {
    return "dunning2";
  }
  if (stages.dunning1?.enabled && typeof stages.dunning1.daysAfterDue === "number" && daysOverdue >= stages.dunning1.daysAfterDue) {
    return "dunning1";
  }
  if (stages.reminder?.enabled && typeof stages.reminder.daysAfterDue === "number" && daysOverdue >= stages.reminder.daysAfterDue) {
    return "reminder";
  }
  
  return "none";
}

function extractDebtorNumber(receipt: any): number {
  // Try nested counterparty object first (main location for outbound invoices)
  if (receipt.counterparty?.postingaccount_number) {
    const num = parseInt(receipt.counterparty.postingaccount_number, 10);
    if (num > 0) return num;
  }
  // Try nested debtor object
  if (receipt.debtor?.postingaccount_number) {
    const num = parseInt(receipt.debtor.postingaccount_number, 10);
    if (num > 0) return num;
  }
  // Try counterparty_postingaccount_number (flat field)
  if (receipt.counterparty_postingaccount_number) {
    const num = parseInt(receipt.counterparty_postingaccount_number, 10);
    if (num > 0) return num;
  }
  // Try creditor_debtor (for some invoice types)
  if (receipt.creditor_debtor) {
    const num = parseInt(receipt.creditor_debtor, 10);
    if (num > 0) return num;
  }
  // Try debtor_number directly
  if (receipt.debtor_number) {
    const num = parseInt(receipt.debtor_number, 10);
    if (num > 0) return num;
  }
  return 0;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const role = req.session?.role;
      const userId = req.session?.userId;
      
      if (role === "customer" && userId) {
        const stats = await storage.getDashboardStatsForUser(userId);
        res.json({
          ...stats,
          dunningEmailsSent: 0,
          customersCount: 0,
        });
      } else {
        const stats = await storage.getDashboardStats();
        res.json(stats);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/recent-invoices", isAuthenticated, async (req, res) => {
    try {
      const role = req.session?.role;
      const userId = req.session?.userId;
      
      let invoices;
      let customers;
      
      if (role === "customer" && userId) {
        invoices = (await storage.getReceiptsForUser(userId))
          .filter(r => r.paymentStatus === "unpaid")
          .slice(0, 10);
        customers = await storage.getCustomersForUser(userId);
      } else {
        invoices = await storage.getRecentInvoices(10);
        customers = await storage.getCustomers();
      }
      
      const allRules = await storage.getDunningRules();
      
      const enrichedInvoices = invoices.map((invoice) => {
        const customer = customers.find(
          (c) => c.debtorPostingaccountNumber === invoice.debtorPostingaccountNumber
        );
        const rules = allRules.find((r) => r.customerId === customer?.id);
        const effectiveDueDate = getEffectiveDueDate(invoice.dueDate, invoice.receiptDate, customer?.paymentTermDays);
        const daysOverdue = calculateDaysOverdue(invoice.dueDate, invoice.receiptDate, customer?.paymentTermDays);
        const dunningLevel = determineDunningLevel(daysOverdue, rules?.stages);
        
        return {
          ...invoice,
          customer,
          effectiveDueDate,
          daysOverdue,
          dunningLevel,
        };
      });
      
      res.json(enrichedInvoices);
    } catch (error) {
      console.error("Error fetching recent invoices:", error);
      res.status(500).json({ message: "Failed to fetch recent invoices" });
    }
  });

  app.get("/api/customers", isAuthenticated, isInternal, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/open-invoice-stats", isAuthenticated, isInternal, async (req, res) => {
    try {
      const statsMap = await storage.getCustomerOpenInvoiceStats();
      const stats: Record<number, { count: number; totalOpen: number; overdueCount: number }> = {};
      statsMap.forEach((value, key) => {
        stats[key] = value;
      });
      res.json(stats);
    } catch (error) {
      console.error("Error fetching customer open invoice stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.post("/api/customers", isAuthenticated, isInternal, async (req, res) => {
    try {
      const parsed = insertPortalCustomerSchema.parse(req.body);
      const existing = await storage.getCustomerByDebtorNumber(parsed.debtorPostingaccountNumber);
      if (existing) {
        return res.status(400).json({ message: "Debitor mit dieser Nummer existiert bereits" });
      }
      const customer = await storage.createCustomer(parsed);
      res.status(201).json(customer);
    } catch (error: any) {
      console.error("Error creating customer:", error);
      res.status(400).json({ message: error.message || "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", isAuthenticated, isInternal, async (req, res) => {
    try {
      const { id } = req.params;
      
      const parsed = updatePortalCustomerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: parsed.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") 
        });
      }
      
      const customer = await storage.updateCustomer(id, parsed.data);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: error.message || "Failed to update customer" });
    }
  });

  // Delete all auto-generated 80xxx customers that have no receipts
  // Must be defined BEFORE /api/customers/:id to prevent route collision
  app.delete("/api/customers/cleanup", isAuthenticated, isInternal, async (req, res) => {
    try {
      const result = await storage.deleteAutoGeneratedCustomers();
      let message = `${result.deleted} auto-generierte Debitoren (80xxx) gelöscht.`;
      if (result.skipped > 0) {
        message += ` ${result.skipped} übersprungen (haben noch Rechnungen).`;
      }
      res.json({
        message,
        deleted: result.deleted,
        skipped: result.skipped,
        skippedNames: result.skippedNames,
      });
    } catch (error: any) {
      console.error("Customer cleanup error:", error);
      res.status(500).json({ message: error.message || "Bereinigung fehlgeschlagen" });
    }
  });

  app.delete("/api/customers/:id", isAuthenticated, isInternal, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCustomer(id);
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Sync customer data to BuchhaltungsButler
  app.post("/api/customers/:id/bhb-sync", isAuthenticated, isInternal, async (req, res) => {
    try {
      const { id } = req.params;
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ message: "Debitor nicht gefunden" });
      }
      
      const apiKey = await storage.getSetting("BHB_API_KEY");
      const apiClient = await storage.getSetting("BHB_API_CLIENT");
      const apiSecret = await storage.getSetting("BHB_API_SECRET");
      
      if (!apiKey || !apiClient || !apiSecret) {
        return res.status(400).json({ message: "BHB API nicht konfiguriert" });
      }
      
      const baseUrl = await storage.getSetting("BHB_BASE_URL") || "https://webapp.buchhaltungsbutler.de/api/v1";
      const authHeader = "Basic " + Buffer.from(`${apiClient}:${apiSecret}`).toString("base64");
      
      const bhbPayload: Record<string, string> = {
        api_key: apiKey,
        type: "debitor",
        postingaccount_number: customer.debtorPostingaccountNumber.toString(),
        name: customer.displayName,
      };
      
      if (customer.contactPersonName) bhbPayload.contact_person_name = customer.contactPersonName;
      if (customer.street) bhbPayload.street = customer.street;
      if (customer.additionalAddressline) bhbPayload.additional_addressline = customer.additionalAddressline;
      if (customer.zip) bhbPayload.zip = customer.zip;
      if (customer.city) bhbPayload.city = customer.city;
      if (customer.country) bhbPayload.country = customer.country;
      if (customer.salesTaxIdEu) bhbPayload.sales_tax_id_eu = customer.salesTaxIdEu;
      if (customer.emailContact) bhbPayload.email = customer.emailContact;
      if (customer.uidCh) bhbPayload.uid_ch = customer.uidCh;
      if (customer.iban) bhbPayload.iban = customer.iban;
      if (customer.bic) bhbPayload.bic = customer.bic;
      
      const response = await fetch(`${baseUrl}/settings/update/debtor`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bhbPayload),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.error("BHB update debtor error:", response.status, data);
        return res.status(response.status || 500).json({ 
          message: data.message || "Fehler beim Aktualisieren in BHB" 
        });
      }
      
      // Update last sync timestamp
      await storage.updateCustomer(id, { lastBhbSync: new Date() } as any);
      
      res.json({ 
        success: true,
        message: "Debitor erfolgreich zu BHB übertragen",
        data: data.data,
      });
    } catch (error: any) {
      console.error("BHB sync error:", error);
      res.status(500).json({ message: error.message || "Synchronisation fehlgeschlagen" });
    }
  });

  app.get("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const role = req.session?.role;
      const userId = req.session?.userId;
      const { status, dunning } = req.query;
      
      let invoices;
      let customers;
      
      if (role === "customer" && userId) {
        invoices = await storage.getReceiptsForUser(userId);
        customers = await storage.getCustomersForUser(userId);
        
        if (status && status !== "all") {
          invoices = invoices.filter(i => i.paymentStatus === status);
        }
      } else {
        invoices = await storage.getReceipts({
          status: status as string,
        });
        customers = await storage.getCustomers();
      }
      
      const allRules = await storage.getDunningRules();
      
      const enrichedInvoices = invoices.map((invoice) => {
        const customer = customers.find(
          (c) => c.debtorPostingaccountNumber === invoice.debtorPostingaccountNumber
        );
        const rules = allRules.find((r) => r.customerId === customer?.id);
        const effectiveDueDate = getEffectiveDueDate(invoice.dueDate, invoice.receiptDate, customer?.paymentTermDays);
        const daysOverdue = calculateDaysOverdue(invoice.dueDate, invoice.receiptDate, customer?.paymentTermDays);
        const dunningLevel = determineDunningLevel(daysOverdue, rules?.stages);
        const interestRate = rules?.useLegalRate ? 5.0 : parseFloat(rules?.interestRatePercent?.toString() || "0") || 0;
        const amount = parseFloat(invoice.amountOpen?.toString() || invoice.amountTotal?.toString() || "0") || 0;
        const calculatedInterest = calculateInterest(amount, daysOverdue, interestRate) || 0;
        
        return {
          ...invoice,
          customer,
          effectiveDueDate,
          daysOverdue,
          dunningLevel,
          calculatedInterest,
        };
      });
      
      let filteredInvoices = enrichedInvoices;
      if (dunning && dunning !== "all") {
        filteredInvoices = enrichedInvoices.filter((i) => i.dunningLevel === dunning);
      }
      
      res.json(filteredInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Debug endpoints for admin
  app.get("/api/debug/receipts", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const receipts = await storage.getReceipts();
      const debugData = receipts.map((r) => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        debtorPostingaccountNumber: r.debtorPostingaccountNumber,
        counterpartyName: (r.rawJson as any)?.counterparty || null,
        rawJson: r.rawJson,
      }));
      res.json(debugData);
    } catch (error) {
      console.error("Error fetching debug receipts:", error);
      res.status(500).json({ message: "Failed to fetch debug data" });
    }
  });

  app.get("/api/debug/customers", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      const debugData = customers.map((c) => ({
        id: c.id,
        displayName: c.displayName,
        debtorPostingaccountNumber: c.debtorPostingaccountNumber,
        bhbRawJson: c.bhbRawJson,
      }));
      res.json(debugData);
    } catch (error) {
      console.error("Error fetching debug customers:", error);
      res.status(500).json({ message: "Failed to fetch debug data" });
    }
  });

  // Debug endpoint to test BHB receipt API directly
  app.post("/api/debug/bhb-receipt", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { idByCustomer } = req.body;
      
      if (!idByCustomer) {
        return res.status(400).json({ error: "idByCustomer is required" });
      }

      const apiKey = await storage.getSetting("BHB_API_KEY");
      const apiClient = await storage.getSetting("BHB_API_CLIENT");
      const apiSecret = await storage.getSetting("BHB_API_SECRET");

      if (!apiKey || !apiClient || !apiSecret) {
        return res.status(400).json({ error: "BHB API nicht konfiguriert" });
      }

      const baseUrl = await storage.getSetting("BHB_BASE_URL") || "https://webapp.buchhaltungsbutler.de/api/v1";
      const authHeader = "Basic " + Buffer.from(`${apiClient}:${apiSecret}`).toString("base64");

      const endpoint = `${baseUrl}/receipts/get/${idByCustomer}`;
      const requestBody = {
        api_key: apiKey,
        get_file: true,
      };

      console.log("Debug BHB API test - Endpoint:", endpoint);
      console.log("Debug BHB API test - Body:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log("Debug BHB API test - Status:", response.status);
      console.log("Debug BHB API test - Response length:", responseText.length);

      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return res.json({
          error: "Non-JSON response",
          status: response.status,
          responseText: responseText.substring(0, 2000),
        });
      }

      // Truncate file_content for display (if present)
      if (data.file_content) {
        data.file_content_truncated = data.file_content.substring(0, 200) + "...";
        data.file_content_length = data.file_content.length;
        delete data.file_content;
      }

      res.json({
        status: response.status,
        endpoint,
        requestBody,
        response: data,
      });
    } catch (error) {
      console.error("Error in debug BHB receipt:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Counterparty mapping endpoints
  app.get("/api/counterparty-mappings", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const mappings = await storage.getCounterpartyMappings();
      const customers = await storage.getCustomers();
      
      const enrichedMappings = mappings.map((m) => {
        const customer = customers.find((c) => c.debtorPostingaccountNumber === m.debtorPostingaccountNumber);
        return { ...m, customerName: customer?.displayName };
      });
      
      res.json(enrichedMappings);
    } catch (error) {
      console.error("Error fetching counterparty mappings:", error);
      res.status(500).json({ message: "Failed to fetch mappings" });
    }
  });

  app.get("/api/counterparty-mappings/unmatched", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const unmatched = await storage.getUnmatchedCounterparties();
      res.json(unmatched);
    } catch (error) {
      console.error("Error fetching unmatched counterparties:", error);
      res.status(500).json({ message: "Failed to fetch unmatched data" });
    }
  });

  app.post("/api/counterparty-mappings", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { counterpartyName, debtorPostingaccountNumber, updateBhb } = req.body;
      
      if (!counterpartyName || !debtorPostingaccountNumber) {
        return res.status(400).json({ message: "counterpartyName and debtorPostingaccountNumber are required" });
      }
      
      const mapping = await storage.createCounterpartyMapping({
        counterpartyName,
        debtorPostingaccountNumber,
      });
      
      let bhbUpdateResult: { success: boolean; message?: string } | null = null;
      
      if (updateBhb) {
        try {
          const apiKey = await storage.getSetting("BHB_API_KEY");
          const apiClient = await storage.getSetting("BHB_API_CLIENT");
          const apiSecret = await storage.getSetting("BHB_API_SECRET");
          
          if (apiKey && apiClient && apiSecret) {
            const baseUrl = await storage.getSetting("BHB_BASE_URL") || "https://webapp.buchhaltungsbutler.de/api/v1";
            const authHeader = "Basic " + Buffer.from(`${apiClient}:${apiSecret}`).toString("base64");
            
            const bhbPayload = {
              api_key: apiKey,
              postingaccount_number: debtorPostingaccountNumber,
              name: counterpartyName,
            };
            
            const response = await fetch(`${baseUrl}/settings/update/debtor`, {
              method: "POST",
              headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(bhbPayload),
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
              bhbUpdateResult = { success: true, message: "Debitorname in BHB aktualisiert" };
              
              const customer = await storage.getCustomerByDebtorNumber(debtorPostingaccountNumber);
              if (customer) {
                await storage.updateCustomer(customer.id, { 
                  displayName: counterpartyName,
                  lastBhbSync: new Date() 
                } as any);
              }
            } else {
              bhbUpdateResult = { success: false, message: data.message || "BHB-Update fehlgeschlagen" };
            }
          } else {
            bhbUpdateResult = { success: false, message: "BHB API nicht konfiguriert" };
          }
        } catch (bhbError: any) {
          console.error("BHB update error:", bhbError);
          bhbUpdateResult = { success: false, message: bhbError.message || "BHB-Verbindungsfehler" };
        }
      }
      
      res.json({ ...mapping, bhbUpdateResult });
    } catch (error) {
      console.error("Error creating counterparty mapping:", error);
      res.status(500).json({ message: "Failed to create mapping" });
    }
  });

  app.delete("/api/counterparty-mappings/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCounterpartyMapping(id);
      if (!deleted) {
        return res.status(404).json({ message: "Mapping not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting counterparty mapping:", error);
      res.status(500).json({ message: "Failed to delete mapping" });
    }
  });

  app.post("/api/counterparty-mappings/apply", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const mappings = await storage.getCounterpartyMappings();
      const receipts = await storage.getReceipts();
      
      let applied = 0;
      for (const receipt of receipts) {
        if (receipt.debtorPostingaccountNumber === 0) {
          const counterpartyName = (receipt.rawJson as any)?.counterparty;
          if (counterpartyName) {
            const mapping = mappings.find((m) => m.counterpartyName === counterpartyName);
            if (mapping) {
              await storage.updateReceiptDebtor(receipt.id, mapping.debtorPostingaccountNumber);
              applied++;
            }
          }
        }
      }
      
      res.json({ message: `${applied} Rechnungen wurden zugeordnet`, applied });
    } catch (error) {
      console.error("Error applying mappings:", error);
      res.status(500).json({ message: "Failed to apply mappings" });
    }
  });

  app.get("/api/counterparty-exceptions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const exceptions = await storage.getCounterpartyExceptions();
      res.json(exceptions);
    } catch (error) {
      console.error("Error fetching counterparty exceptions:", error);
      res.status(500).json({ message: "Failed to fetch exceptions" });
    }
  });

  app.post("/api/counterparty-exceptions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { counterpartyName, status, note } = req.body;
      if (!counterpartyName) {
        return res.status(400).json({ message: "counterpartyName is required" });
      }
      const exception = await storage.createCounterpartyException(counterpartyName, status, note);
      res.json(exception);
    } catch (error) {
      console.error("Error creating counterparty exception:", error);
      res.status(500).json({ message: "Failed to create exception" });
    }
  });

  app.delete("/api/counterparty-exceptions/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCounterpartyException(id);
      if (!deleted) {
        return res.status(404).json({ message: "Exception not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting counterparty exception:", error);
      res.status(500).json({ message: "Failed to delete exception" });
    }
  });

  app.patch("/api/invoices/:id", isAuthenticated, isInternal, async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentStatus, dunningLevel } = req.body;
      
      const invoice = await storage.getReceipt(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const updated = await storage.updateReceiptStatus(id, { paymentStatus, dunningLevel });
      res.json(updated);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.get("/api/invoices/:id/pdf", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.getReceipt(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const apiKey = await storage.getSetting("BHB_API_KEY");
      const apiClient = await storage.getSetting("BHB_API_CLIENT");
      const apiSecret = await storage.getSetting("BHB_API_SECRET");

      if (!apiKey || !apiClient || !apiSecret) {
        return res.status(400).json({ message: "BHB API nicht konfiguriert" });
      }

      const baseUrl = await storage.getSetting("BHB_BASE_URL") || "https://webapp.buchhaltungsbutler.de/api/v1";
      const authHeader = "Basic " + Buffer.from(`${apiClient}:${apiSecret}`).toString("base64");

      const invoiceNumber = invoice.invoiceNumber;
      const idByCustomer = invoice.idByCustomer;
      
      console.log("PDF download: Fetching invoice", invoiceNumber, "id_by_customer:", idByCustomer);
      
      if (!idByCustomer) {
        console.log("No id_by_customer found for invoice");
        return res.status(400).json({ message: "Keine BHB-ID für diese Rechnung vorhanden" });
      }
      
      // id_by_customer is a PATH parameter, not a body parameter!
      // Endpoint pattern: POST /receipts/get/{id_by_customer}
      const requestBody = {
        api_key: apiKey,
        get_file: true,
      };
      
      const endpoint = `${baseUrl}/receipts/get/${idByCustomer}`;
      console.log("PDF request to endpoint:", endpoint);
      console.log("PDF request body:", JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log("BHB API response status:", response.status, "Body length:", responseText.length);
      
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("BHB API returned non-JSON response:", responseText.substring(0, 500));
        return res.status(502).json({ message: "BHB API gab ungültige Antwort zurück" });
      }
      
      console.log("BHB API response keys:", Object.keys(data));
      console.log("BHB API response success:", data.success);
      
      if (!response.ok || data.error || data.success === false) {
        console.error("BHB API error - Status:", response.status, "Error code:", data.error_code, "Message:", data.message);
        return res.status(502).json({ message: data.error?.message || data.message || "Fehler beim Abrufen der PDF von BHB" });
      }
      
      // The response should contain the receipt data directly (not in data.data array)
      const receiptData = data.data || data;
      console.log("Receipt data keys:", Object.keys(receiptData));
      console.log("Has file_content:", !!receiptData.file_content);
      console.log("Has file:", !!receiptData.file);
      
      // Try different possible field names for the file content
      const fileContent = receiptData.file_content || receiptData.file || receiptData.content || receiptData.document || receiptData.file_base64;
      
      if (!fileContent) {
        console.log("No file content found. Full response:", JSON.stringify(data).substring(0, 1000));
        return res.status(404).json({ 
          message: "PDF konnte nicht von BHB geladen werden. Die Rechnung hat möglicherweise keine angehängte Datei.",
          filename: receiptData.filename || invoice.invoiceNumber
        });
      }

      const pdfBuffer = Buffer.from(fileContent, "base64");
      const filename = receiptData.filename || invoice.invoiceNumber || `rechnung_${idByCustomer}`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      res.status(500).json({ message: "Failed to download PDF" });
    }
  });

  app.get("/api/dunning-rules", isAuthenticated, isInternal, async (req, res) => {
    try {
      const rules = await storage.getDunningRules();
      const customers = await storage.getCustomers();
      
      const enrichedRules = rules.map((rule) => {
        const customer = customers.find((c) => c.id === rule.customerId);
        return { ...rule, customer };
      });
      
      res.json(enrichedRules);
    } catch (error) {
      console.error("Error fetching dunning rules:", error);
      res.status(500).json({ message: "Failed to fetch dunning rules" });
    }
  });

  app.get("/api/dunning-rules/:customerId", isAuthenticated, isInternal, async (req, res) => {
    try {
      const { customerId } = req.params;
      const rules = await storage.getDunningRulesForCustomer(customerId);
      res.json(rules || null);
    } catch (error) {
      console.error("Error fetching dunning rules:", error);
      res.status(500).json({ message: "Failed to fetch dunning rules" });
    }
  });

  app.post("/api/dunning-rules/:customerId", isAuthenticated, isInternal, async (req, res) => {
    try {
      const { customerId } = req.params;
      
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const parsed = inputDunningRulesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: parsed.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") 
        });
      }
      
      const defaultStages = {
        reminder: { daysAfterDue: 7, fee: 0, enabled: true },
        dunning1: { daysAfterDue: 14, fee: 5, enabled: true },
        dunning2: { daysAfterDue: 28, fee: 10, enabled: true },
        dunning3: { daysAfterDue: 42, fee: 15, enabled: false },
      };
      
      const rules = await storage.upsertDunningRules({
        customerId,
        graceDays: parsed.data.graceDays,
        interestRatePercent: parsed.data.interestRatePercent,
        useLegalRate: parsed.data.useLegalRate,
        stages: parsed.data.stages || defaultStages,
      });
      res.json(rules);
    } catch (error: any) {
      console.error("Error saving dunning rules:", error);
      res.status(500).json({ message: error.message || "Failed to save dunning rules" });
    }
  });

  app.get("/api/settings/bhb", isAuthenticated, isInternal, async (req, res) => {
    try {
      const apiKey = await storage.getSetting("BHB_API_KEY");
      const apiClient = await storage.getSetting("BHB_API_CLIENT");
      const apiSecret = await storage.getSetting("BHB_API_SECRET");
      const baseUrl = await storage.getSetting("BHB_BASE_URL") || "https://webapp.buchhaltungsbutler.de/api/v1";
      const lastSync = await storage.getSetting("BHB_LAST_RECEIPTS_SYNC");
      
      const isConfigured = !!(apiKey && apiClient && apiSecret);
      
      res.json({
        baseUrl,
        isConfigured,
        lastSync,
        hasApiKey: !!apiKey,
        hasApiClient: !!apiClient,
        hasApiSecret: !!apiSecret,
      });
    } catch (error) {
      console.error("Error fetching BHB settings:", error);
      res.status(500).json({ message: "Fehler beim Laden der Einstellungen" });
    }
  });

  app.post("/api/settings/bhb", isAuthenticated, isInternal, async (req, res) => {
    try {
      const { apiKey, apiClient, apiSecret, baseUrl } = req.body;
      const userId = req.session?.userId;
      
      if (apiKey) await storage.setSetting("BHB_API_KEY", apiKey, userId);
      if (apiClient) await storage.setSetting("BHB_API_CLIENT", apiClient, userId);
      if (apiSecret) await storage.setSetting("BHB_API_SECRET", apiSecret, userId);
      if (baseUrl) await storage.setSetting("BHB_BASE_URL", baseUrl, userId);
      
      res.json({ message: "Einstellungen gespeichert" });
    } catch (error) {
      console.error("Error saving BHB settings:", error);
      res.status(500).json({ message: "Fehler beim Speichern der Einstellungen" });
    }
  });

  app.post("/api/settings/bhb/test", isAuthenticated, isInternal, async (req, res) => {
    try {
      const apiKey = await storage.getSetting("BHB_API_KEY");
      const apiClient = await storage.getSetting("BHB_API_CLIENT");
      const apiSecret = await storage.getSetting("BHB_API_SECRET");
      
      if (!apiKey || !apiClient || !apiSecret) {
        return res.json({
          success: false,
          message: "BHB API-Zugangsdaten nicht konfiguriert. Bitte geben Sie die Zugangsdaten in den Einstellungen ein.",
        });
      }
      
      const baseUrl = await storage.getSetting("BHB_BASE_URL") || "https://webapp.buchhaltungsbutler.de/api/v1";
      const authHeader = "Basic " + Buffer.from(`${apiClient}:${apiSecret}`).toString("base64");
      
      const response = await fetch(`${baseUrl}/receipts/get`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          list_direction: "outbound",
          payment_status: "unpaid",
          limit: 10,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return res.json({
          success: false,
          message: `BHB API Fehler: ${response.status} - ${errorText}`,
        });
      }
      
      const data = await response.json();
      const receipts = data.data || data.receipts || [];
      
      res.json({
        success: true,
        message: "Verbindung zu BuchhaltungsButler erfolgreich hergestellt.",
        receiptCount: receipts.length,
        sampleReceipt: receipts[0] || null,
      });
    } catch (error: any) {
      console.error("BHB connection test error:", error);
      res.json({
        success: false,
        message: `Verbindungsfehler: ${error.message}`,
      });
    }
  });

  // SMTP Settings routes
  app.get("/api/settings/smtp", isAuthenticated, isInternal, async (req, res) => {
    try {
      const smtpHost = await storage.getSetting("SMTP_HOST");
      const smtpPort = await storage.getSetting("SMTP_PORT");
      const smtpUser = await storage.getSetting("SMTP_USER");
      const smtpPassword = await storage.getSetting("SMTP_PASSWORD");
      const smtpFrom = await storage.getSetting("SMTP_FROM");
      
      const isConfigured = !!(smtpHost && smtpPort && smtpFrom);
      
      res.json({
        isConfigured,
        hasHost: !!smtpHost,
        hasPort: !!smtpPort,
        hasUser: !!smtpUser,
        hasPassword: !!smtpPassword,
        hasFrom: !!smtpFrom,
        port: smtpPort || "587",
        from: smtpFrom || "",
      });
    } catch (error) {
      console.error("Error fetching SMTP settings:", error);
      res.status(500).json({ message: "Fehler beim Laden der SMTP-Einstellungen" });
    }
  });

  app.post("/api/settings/smtp", isAuthenticated, isInternal, async (req, res) => {
    try {
      const { host, port, user, password, from } = req.body;
      const userId = req.session?.userId;
      
      // Check if any non-empty values were provided
      const hasHost = host && host.trim();
      const hasPort = port && port.trim();
      const hasUser = user && user.trim();
      const hasPassword = password && password.trim();
      const hasFrom = from && from.trim();
      
      if (!hasHost && !hasPort && !hasUser && !hasPassword && !hasFrom) {
        return res.status(400).json({ message: "Keine Einstellungen zum Speichern angegeben." });
      }
      
      // Only save non-empty values (don't overwrite with empty strings)
      if (hasHost) await storage.setSetting("SMTP_HOST", host.trim(), userId);
      if (hasPort) await storage.setSetting("SMTP_PORT", port.trim(), userId);
      if (hasUser) await storage.setSetting("SMTP_USER", user.trim(), userId);
      if (hasPassword) await storage.setSetting("SMTP_PASSWORD", password.trim(), userId);
      if (hasFrom) await storage.setSetting("SMTP_FROM", from.trim(), userId);
      
      res.json({ message: "SMTP-Einstellungen gespeichert" });
    } catch (error) {
      console.error("Error saving SMTP settings:", error);
      res.status(500).json({ message: "Fehler beim Speichern der SMTP-Einstellungen" });
    }
  });

  app.post("/api/settings/smtp/test", isAuthenticated, isInternal, async (req, res) => {
    try {
      const smtpHost = await storage.getSetting("SMTP_HOST");
      const smtpPort = await storage.getSetting("SMTP_PORT");
      const smtpUser = await storage.getSetting("SMTP_USER");
      const smtpPassword = await storage.getSetting("SMTP_PASSWORD");
      const smtpFrom = await storage.getSetting("SMTP_FROM");
      
      if (!smtpHost || !smtpPort || !smtpFrom) {
        return res.json({
          success: false,
          message: "SMTP-Konfiguration unvollständig. Bitte Host, Port und Absenderadresse eingeben.",
        });
      }
      
      const portNum = parseInt(smtpPort, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return res.json({
          success: false,
          message: "Ungültiger Port. Bitte eine Zahl zwischen 1 und 65535 eingeben.",
        });
      }
      
      if (!smtpFrom.includes("@")) {
        return res.json({
          success: false,
          message: "Ungültige Absenderadresse. Bitte eine gültige E-Mail-Adresse eingeben.",
        });
      }
      
      // Use nodemailer to verify SMTP connection including authentication
      const transportConfig: any = {
        host: smtpHost,
        port: portNum,
        secure: portNum === 465, // true for 465, false for other ports (STARTTLS)
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      };
      
      // Add authentication if credentials are provided
      if (smtpUser && smtpPassword) {
        transportConfig.auth = {
          user: smtpUser,
          pass: smtpPassword,
        };
      }
      
      const transporter = nodemailer.createTransport(transportConfig);
      
      await transporter.verify();
      
      res.json({
        success: true,
        message: `SMTP-Verbindung zu ${smtpHost}:${smtpPort} erfolgreich${smtpUser ? " (Authentifizierung OK)" : ""}.`,
      });
    } catch (error: any) {
      console.error("SMTP test error:", error);
      
      let errorMessage = error.message || "Unbekannter Fehler";
      
      // Provide user-friendly error messages
      if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo")) {
        errorMessage = `SMTP-Server "${await storage.getSetting("SMTP_HOST")}" nicht gefunden. Bitte Host überprüfen.`;
      } else if (errorMessage.includes("ECONNREFUSED")) {
        errorMessage = "Verbindung abgelehnt. Bitte Host und Port überprüfen.";
      } else if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("timeout")) {
        errorMessage = "Zeitüberschreitung. Server ist nicht erreichbar.";
      } else if (errorMessage.includes("auth") || errorMessage.includes("535") || errorMessage.includes("534")) {
        errorMessage = "Authentifizierung fehlgeschlagen. Bitte Benutzername und Passwort überprüfen.";
      } else if (errorMessage.includes("certificate") || errorMessage.includes("SSL") || errorMessage.includes("TLS")) {
        errorMessage = "SSL/TLS-Fehler. Möglicherweise falscher Port oder Zertifikatsproblem.";
      }
      
      res.json({
        success: false,
        message: errorMessage,
      });
    }
  });

  // Microsoft Graph OAuth settings
  app.get("/api/settings/msgraph", isAuthenticated, isInternal, async (req, res) => {
    try {
      const tenantId = await storage.getSetting("GRAPH_TENANT_ID");
      const clientId = await storage.getSetting("GRAPH_CLIENT_ID");
      const clientSecret = await storage.getSetting("GRAPH_CLIENT_SECRET");
      const fromAddress = await storage.getSetting("GRAPH_FROM_ADDRESS");
      
      const isConfigured = !!(tenantId && clientId && clientSecret && fromAddress);
      
      res.json({
        isConfigured,
        tenantId: tenantId || "",
        clientId: clientId || "",
        hasClientSecret: !!clientSecret,
        fromAddress: fromAddress || "",
      });
    } catch (error) {
      console.error("Error fetching Microsoft Graph settings:", error);
      res.status(500).json({ message: "Fehler beim Laden der Microsoft Graph Einstellungen" });
    }
  });

  app.post("/api/settings/msgraph", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { tenantId, clientId, clientSecret, fromAddress } = req.body;
      const userId = (req.user as any)?.id;
      
      const hasTenant = typeof tenantId === "string" && tenantId.trim();
      const hasClient = typeof clientId === "string" && clientId.trim();
      const hasSecret = typeof clientSecret === "string" && clientSecret.trim();
      const hasFrom = typeof fromAddress === "string" && fromAddress.trim();
      
      if (hasTenant) await storage.setSetting("GRAPH_TENANT_ID", tenantId.trim(), userId);
      if (hasClient) await storage.setSetting("GRAPH_CLIENT_ID", clientId.trim(), userId);
      if (hasSecret) await storage.setSetting("GRAPH_CLIENT_SECRET", clientSecret.trim(), userId);
      if (hasFrom) await storage.setSetting("GRAPH_FROM_ADDRESS", fromAddress.trim(), userId);
      
      // Clear token cache when credentials change
      const { clearTokenCache } = await import("./msgraph-email-service");
      clearTokenCache();
      
      res.json({ message: "Microsoft Graph Einstellungen gespeichert" });
    } catch (error) {
      console.error("Error saving Microsoft Graph settings:", error);
      res.status(500).json({ message: "Fehler beim Speichern der Microsoft Graph Einstellungen" });
    }
  });

  app.post("/api/settings/msgraph/test", isAuthenticated, isInternal, async (req, res) => {
    try {
      const { getGraphConfigFromStorage, testGraphConnection } = await import("./msgraph-email-service");
      
      const config = await getGraphConfigFromStorage(storage);
      
      if (!config) {
        return res.json({
          success: false,
          message: "Microsoft Graph Konfiguration unvollständig. Bitte alle Felder ausfüllen.",
        });
      }
      
      const result = await testGraphConnection(config);
      res.json(result);
    } catch (error: any) {
      console.error("Microsoft Graph test error:", error);
      res.json({
        success: false,
        message: error.message || "Verbindungsfehler",
      });
    }
  });

  // EZB base rate settings
  app.get("/api/settings/interest", isAuthenticated, isInternal, async (req, res) => {
    try {
      const ezbBaseRate = await storage.getSetting("EZB_BASE_RATE");
      res.json({
        ezbBaseRate: ezbBaseRate ? parseFloat(ezbBaseRate) : 2.82,
        lastUpdated: await storage.getSetting("EZB_BASE_RATE_UPDATED"),
      });
    } catch (error) {
      console.error("Error fetching interest settings:", error);
      res.status(500).json({ message: "Failed to fetch interest settings" });
    }
  });

  app.post("/api/settings/interest", isAuthenticated, isInternal, async (req, res) => {
    try {
      const { ezbBaseRate } = req.body;
      
      if (typeof ezbBaseRate !== "number" || isNaN(ezbBaseRate)) {
        return res.status(400).json({ message: "Ungültiger Basiszinssatz" });
      }
      
      await storage.setSetting("EZB_BASE_RATE", ezbBaseRate.toString());
      await storage.setSetting("EZB_BASE_RATE_UPDATED", new Date().toISOString());
      
      res.json({ success: true, message: "Basiszinssatz gespeichert" });
    } catch (error) {
      console.error("Error saving interest settings:", error);
      res.status(500).json({ message: "Fehler beim Speichern" });
    }
  });

  // Company settings
  app.get("/api/settings/company", isAuthenticated, isInternal, async (req, res) => {
    try {
      res.json({
        name: await storage.getSetting("COMPANY_NAME") || "",
        street: await storage.getSetting("COMPANY_STREET") || "",
        zip: await storage.getSetting("COMPANY_ZIP") || "",
        city: await storage.getSetting("COMPANY_CITY") || "",
        phone: await storage.getSetting("COMPANY_PHONE") || "",
        email: await storage.getSetting("COMPANY_EMAIL") || "",
        iban: await storage.getSetting("BANK_IBAN") || "",
        bic: await storage.getSetting("BANK_BIC") || "",
      });
    } catch (error) {
      console.error("Error fetching company settings:", error);
      res.status(500).json({ message: "Failed to fetch company settings" });
    }
  });

  app.post("/api/settings/company", isAuthenticated, isInternal, async (req, res) => {
    try {
      const { name, street, zip, city, phone, email, iban, bic } = req.body;
      
      if (name !== undefined) await storage.setSetting("COMPANY_NAME", name);
      if (street !== undefined) await storage.setSetting("COMPANY_STREET", street);
      if (zip !== undefined) await storage.setSetting("COMPANY_ZIP", zip);
      if (city !== undefined) await storage.setSetting("COMPANY_CITY", city);
      if (phone !== undefined) await storage.setSetting("COMPANY_PHONE", phone);
      if (email !== undefined) await storage.setSetting("COMPANY_EMAIL", email);
      if (iban !== undefined) await storage.setSetting("BANK_IBAN", iban);
      if (bic !== undefined) await storage.setSetting("BANK_BIC", bic);
      
      res.json({ success: true, message: "Unternehmensdaten gespeichert" });
    } catch (error) {
      console.error("Error saving company settings:", error);
      res.status(500).json({ message: "Fehler beim Speichern" });
    }
  });

  // Sync customers from BHB using /settings/get/debtors endpoint
  app.post("/api/sync/customers", isAuthenticated, isInternal, async (req, res) => {
    try {
      const apiKey = await storage.getSetting("BHB_API_KEY");
      const apiClient = await storage.getSetting("BHB_API_CLIENT");
      const apiSecret = await storage.getSetting("BHB_API_SECRET");
      
      if (!apiKey || !apiClient || !apiSecret) {
        return res.status(400).json({ message: "BHB API nicht konfiguriert. Bitte geben Sie die Zugangsdaten in den Einstellungen ein." });
      }
      
      const baseUrl = await storage.getSetting("BHB_BASE_URL") || "https://webapp.buchhaltungsbutler.de/api/v1";
      const authHeader = "Basic " + Buffer.from(`${apiClient}:${apiSecret}`).toString("base64");
      
      // Use the correct endpoint for debtor master data
      const response = await fetch(`${baseUrl}/settings/get/debtors`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          limit: 1000,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("BHB debtors API error:", response.status, errorText);
        throw new Error(`BHB API Fehler: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "BHB API Fehler beim Abrufen der Debitoren");
      }
      
      const debtors = data.data || [];
      console.log(`BHB returned ${debtors.length} debtors from /settings/get/debtors`);
      if (debtors.length > 0) {
        console.log("Sample debtor:", JSON.stringify(debtors[0], null, 2));
      }
      
      let created = 0;
      let updated = 0;
      
      // Get all existing customers to enable matching
      const existingCustomers = await storage.getCustomers();
      const processedCustomerIds = new Set<string>();
      
      for (const debtor of debtors) {
        const debtorNumber = parseInt(debtor.postingaccount_number || "0", 10);
        const debtorName = debtor.name || `Debitor ${debtorNumber}`;
        const debtorEmail = debtor.email || "";
        
        // Extract all BHB debtor fields + store complete raw JSON
        const bhbData = {
          displayName: debtorName,
          emailContact: debtorEmail || null,
          contactPersonName: debtor.contact_person || debtor.contactperson || null,
          street: debtor.street || null,
          additionalAddressline: debtor.additional_addressline || debtor.addressline2 || null,
          zip: debtor.zip || debtor.postcode || null,
          city: debtor.city || null,
          country: debtor.country || null,
          salesTaxIdEu: debtor.sales_tax_id_eu || debtor.vat_id || debtor.ustid || null,
          uidCh: debtor.uid_ch || null,
          iban: debtor.iban || null,
          bic: debtor.bic || null,
          bhbRawJson: debtor,
          lastBhbSync: new Date(),
        };
        
        if (debtorNumber > 0) {
          // First check if we already have a customer with this debtor number
          const existingByNumber = await storage.getCustomerByDebtorNumber(debtorNumber);
          
          if (existingByNumber) {
            processedCustomerIds.add(existingByNumber.id);
            // Always update with full BHB data
            await storage.updateCustomer(existingByNumber.id, bhbData);
            updated++;
            console.log(`Updated debtor ${debtorNumber}: ${debtorName} with full BHB data`);
          } else {
            // Look for existing customer with 80xxx number by name match
            const normalizedDebtorName = debtorName.toLowerCase().trim();
            let matchedCustomer = existingCustomers.find(c => 
              !processedCustomerIds.has(c.id) &&
              c.debtorPostingaccountNumber >= 80000 &&
              c.displayName.toLowerCase().trim() === normalizedDebtorName
            );
            
            // Try partial match if no exact match
            if (!matchedCustomer) {
              matchedCustomer = existingCustomers.find(c => {
                if (processedCustomerIds.has(c.id) || c.debtorPostingaccountNumber < 80000) {
                  return false;
                }
                const portalName = c.displayName.toLowerCase().trim();
                return portalName.includes(normalizedDebtorName) || 
                       normalizedDebtorName.includes(portalName);
              });
            }
            
            if (matchedCustomer) {
              // Found a customer with auto-generated number - update to real BHB number
              const oldDebtorNumber = matchedCustomer.debtorPostingaccountNumber;
              const customerId = matchedCustomer.id;
              console.log(`Updating customer "${matchedCustomer.displayName}" from ${oldDebtorNumber} to ${debtorNumber}`);
              
              processedCustomerIds.add(customerId);
              
              // Atomically update receipts AND customer in a single transaction with full BHB data
              const result = await storage.updateCustomerDebtorNumberAtomic(
                customerId,
                oldDebtorNumber,
                debtorNumber,
                {
                  debtorPostingaccountNumber: debtorNumber,
                  ...bhbData,
                }
              );
              console.log(`Updated ${result.receiptsUpdated} receipts from debtor ${oldDebtorNumber} to ${debtorNumber}`);
              updated++;
              
              // Update in-place to prevent stale data
              matchedCustomer.debtorPostingaccountNumber = debtorNumber;
              matchedCustomer.displayName = debtorName;
            } else {
              // No matching customer found - create new one with full BHB data
              console.log(`Creating new debtor ${debtorNumber}: ${debtorName}`);
              await storage.createCustomer({
                debtorPostingaccountNumber: debtorNumber,
                ...bhbData,
                isActive: true,
              });
              created++;
            }
          }
        }
      }
      
      res.json({ 
        message: `${created} neue Debitoren erstellt, ${updated} aktualisiert`,
        created,
        updated,
        total: debtors.length,
      });
    } catch (error: any) {
      console.error("Customer sync error:", error);
      res.status(500).json({ message: error.message || "Synchronisation fehlgeschlagen" });
    }
  });

  app.post("/api/sync/receipts", isAuthenticated, isInternal, async (req, res) => {
    try {
      const apiKey = await storage.getSetting("BHB_API_KEY");
      const apiClient = await storage.getSetting("BHB_API_CLIENT");
      const apiSecret = await storage.getSetting("BHB_API_SECRET");
      
      if (!apiKey || !apiClient || !apiSecret) {
        return res.status(400).json({ message: "BHB API nicht konfiguriert. Bitte geben Sie die Zugangsdaten in den Einstellungen ein." });
      }
      
      const baseUrl = await storage.getSetting("BHB_BASE_URL") || "https://webapp.buchhaltungsbutler.de/api/v1";
      const authHeader = "Basic " + Buffer.from(`${apiClient}:${apiSecret}`).toString("base64");
      
      let offset = 0;
      const limit = 500;
      let hasMore = true;
      let totalSynced = 0;
      
      while (hasMore) {
        const response = await fetch(`${baseUrl}/receipts/get`, {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: apiKey,
            list_direction: "outbound",
            limit,
            offset,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`BHB API error: ${response.status}`);
        }
        
        const data = await response.json();
        const receipts = data.data || data.receipts || [];
        
        for (const receipt of receipts) {
          const idByCustomer = receipt.id_by_customer || receipt.id?.toString() || "";
          
          const amountTotal = parseFloat(receipt.amount?.toString() || "0");
          const amountPaid = parseFloat(receipt.amount_paid?.toString() || "0");
          // For outbound invoices (Ausgangsbelege), amount is negative, amount_paid is positive
          // Use absolute values for correct open amount calculation
          const absTotal = Math.abs(amountTotal);
          const amountOpen = Math.max(0, absTotal - amountPaid);
          // Invoice is paid if amount_paid covers the absolute total
          const paymentStatus = amountPaid >= absTotal && absTotal > 0 ? "paid" : "unpaid";
          
          // Extract debtor number from nested counterparty/debtor object (for outbound invoices)
          const debtorNumber = extractDebtorNumber(receipt);
          
          await storage.upsertReceipt({
            idByCustomer,
            debtorPostingaccountNumber: debtorNumber,
            invoiceNumber: receipt.invoicenumber || receipt.invoice_number || null,
            receiptDate: receipt.date ? new Date(receipt.date) : null,
            dueDate: receipt.due_date ? new Date(receipt.due_date) : null,
            amountTotal: absTotal.toFixed(2), // Store absolute value for display
            amountOpen: amountOpen.toFixed(2),
            paymentStatus,
            rawJson: receipt,
          });
          
          totalSynced++;
        }
        
        if (receipts.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
      
      const linkedCount = await linkReceiptsToDebtors(storage);
      
      await storage.setSetting("BHB_LAST_RECEIPTS_SYNC", new Date().toISOString());
      
      res.json({ 
        message: `${totalSynced} Rechnungen synchronisiert, ${linkedCount} mit Debitoren verknüpft`, 
        count: totalSynced,
        linked: linkedCount,
      });
    } catch (error: any) {
      console.error("Sync error:", error);
      res.status(500).json({ message: error.message || "Synchronisation fehlgeschlagen" });
    }
  });

  // =====================
  // Dunning Email Templates API
  // =====================

  app.get("/api/dunning-templates", isAuthenticated, isInternal, async (req, res) => {
    try {
      const templates = await storage.getDunningEmailTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching dunning templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/dunning-templates/:id", isAuthenticated, isInternal, async (req, res) => {
    try {
      const template = await storage.getDunningEmailTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching dunning template:", error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  app.post("/api/dunning-templates", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { name, stage, subject, htmlBody, textBody, isDefault, isActive } = req.body;
      if (!name || !stage || !subject || !htmlBody) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const template = await storage.createDunningEmailTemplate({
        name,
        stage,
        subject,
        htmlBody,
        textBody: textBody || null,
        isDefault: isDefault || false,
        isActive: isActive !== false,
      });
      res.json(template);
    } catch (error) {
      console.error("Error creating dunning template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.patch("/api/dunning-templates/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const template = await storage.updateDunningEmailTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating dunning template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/dunning-templates/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteDunningEmailTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting dunning template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Preview dunning email
  app.post("/api/dunning/preview", isAuthenticated, isInternal, async (req, res) => {
    try {
      const { customerId, templateId, stage } = req.body;
      
      if (!customerId || (!templateId && !stage)) {
        return res.status(400).json({ message: "customerId and either templateId or stage required" });
      }
      
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      let template;
      if (templateId) {
        template = await storage.getDunningEmailTemplate(templateId);
      } else {
        const templates = await storage.getDunningEmailTemplatesByStage(stage);
        template = templates[0];
      }
      
      if (!template) {
        return res.status(404).json({ message: "Template not found for this stage" });
      }
      
      const receipts = await storage.getReceipts({ debtorNumber: customer.debtorPostingaccountNumber });
      const dunningRulesData = await storage.getDunningRulesForCustomer(customerId);
      
      const {
        calculateOverdueInvoices,
        buildEmailContext,
        renderEmailTemplate,
      } = await import("./dunning-email-service");
      
      const ezbBaseRateSetting = await storage.getSetting("EZB_BASE_RATE");
      const ezbBaseRate = ezbBaseRateSetting ? parseFloat(ezbBaseRateSetting) : 2.82;
      const overdueInvoices = calculateOverdueInvoices(receipts, customer, dunningRulesData || null, template.stage, ezbBaseRate);
      
      const companyName = await storage.getSetting("COMPANY_NAME") || "";
      const companyStreet = await storage.getSetting("COMPANY_STREET") || "";
      const companyZip = await storage.getSetting("COMPANY_ZIP") || "";
      const companyCity = await storage.getSetting("COMPANY_CITY") || "";
      const companyPhone = await storage.getSetting("COMPANY_PHONE") || "";
      const companyEmail = await storage.getSetting("COMPANY_EMAIL") || "";
      const bankIban = await storage.getSetting("BANK_IBAN") || "";
      const bankBic = await storage.getSetting("BANK_BIC") || "";
      
      const context = buildEmailContext(customer, overdueInvoices, template.stage, {
        name: companyName,
        strasse: companyStreet,
        plz: companyZip,
        ort: companyCity,
        telefon: companyPhone,
        email: companyEmail,
        iban: bankIban,
        bic: bankBic,
      });
      
      const rendered = renderEmailTemplate(template, context);
      
      res.json({
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        invoiceCount: overdueInvoices.length,
        context,
      });
    } catch (error) {
      console.error("Error previewing dunning email:", error);
      res.status(500).json({ message: "Failed to preview email" });
    }
  });

  // Send dunning email
  app.post("/api/dunning/send", isAuthenticated, isInternal, async (req, res) => {
    try {
      const { customerId, templateId, recipientEmail } = req.body;
      
      if (!customerId || !templateId) {
        return res.status(400).json({ message: "customerId and templateId required" });
      }
      
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      if (!customer.customerType) {
        return res.status(400).json({ 
          message: "Kundentyp nicht gesetzt. Bitte zuerst den Kundentyp (Privat/Geschäftlich) in den Kundenstammdaten festlegen, um BGB-konforme Verzugszinsen berechnen zu können."
        });
      }
      
      const template = await storage.getDunningEmailTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      const email = recipientEmail || customer.emailContact;
      if (!email) {
        return res.status(400).json({ message: "No recipient email address available" });
      }
      
      // Check for Microsoft Graph configuration first
      const { getGraphConfigFromStorage, sendEmailViaGraph } = await import("./msgraph-email-service");
      const graphConfig = await getGraphConfigFromStorage(storage);
      
      const receipts = await storage.getReceipts({ debtorNumber: customer.debtorPostingaccountNumber });
      const dunningRulesData = await storage.getDunningRulesForCustomer(customerId);
      
      const {
        calculateOverdueInvoices,
        buildEmailContext,
        renderEmailTemplate,
      } = await import("./dunning-email-service");
      
      const ezbBaseRateSetting = await storage.getSetting("EZB_BASE_RATE");
      const ezbBaseRate = ezbBaseRateSetting ? parseFloat(ezbBaseRateSetting) : 2.82;
      const overdueInvoices = calculateOverdueInvoices(receipts, customer, dunningRulesData || null, template.stage, ezbBaseRate);
      
      if (overdueInvoices.length === 0) {
        return res.status(400).json({ message: "No overdue invoices found for this customer" });
      }
      
      const companyName = await storage.getSetting("COMPANY_NAME") || "";
      const companyStreet = await storage.getSetting("COMPANY_STREET") || "";
      const companyZip = await storage.getSetting("COMPANY_ZIP") || "";
      const companyCity = await storage.getSetting("COMPANY_CITY") || "";
      const companyPhone = await storage.getSetting("COMPANY_PHONE") || "";
      const companyEmail = await storage.getSetting("COMPANY_EMAIL") || "";
      const bankIban = await storage.getSetting("BANK_IBAN") || "";
      const bankBic = await storage.getSetting("BANK_BIC") || "";
      
      const context = buildEmailContext(customer, overdueInvoices, template.stage, {
        name: companyName,
        strasse: companyStreet,
        plz: companyZip,
        ort: companyCity,
        telefon: companyPhone,
        email: companyEmail,
        iban: bankIban,
        bic: bankBic,
      });
      
      const rendered = renderEmailTemplate(template, context);
      
      // Send email using Microsoft Graph (preferred) or SMTP (fallback)
      if (graphConfig) {
        await sendEmailViaGraph(graphConfig, {
          to: email,
          subject: rendered.subject,
          htmlBody: rendered.html,
          textBody: rendered.text || undefined,
        });
      } else {
        // Fallback to SMTP
        const smtpHost = await storage.getSetting("SMTP_HOST");
        const smtpPort = await storage.getSetting("SMTP_PORT");
        const smtpUser = await storage.getSetting("SMTP_USER");
        const smtpPass = await storage.getSetting("SMTP_PASSWORD");
        const smtpFrom = await storage.getSetting("SMTP_FROM");
        
        if (!smtpHost || !smtpPort) {
          return res.status(400).json({ 
            message: "E-Mail nicht konfiguriert. Bitte Microsoft Graph oder SMTP in den Einstellungen konfigurieren." 
          });
        }
        
        const nodemailer = await import("nodemailer");
        const portNum = parseInt(smtpPort) || 587;
        const transportConfig: any = {
          host: smtpHost,
          port: portNum,
          secure: portNum === 465,
        };
        
        if (smtpUser && smtpPass) {
          transportConfig.auth = {
            user: smtpUser,
            pass: smtpPass,
          };
        }
        
        const transporter = nodemailer.createTransport(transportConfig);
        
        await transporter.sendMail({
          from: smtpFrom || smtpUser,
          to: email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text || undefined,
        });
      }
      
      // Log the dunning event
      const totalAmount = context.summe.gesamt;
      const totalInterest = context.summe.zinsen;
      const totalFees = context.summe.gebuehren;
      
      await storage.createDunningEventForCustomer({
        customerId,
        templateId: template.id,
        stage: template.stage,
        recipientEmail: email,
        subject: rendered.subject,
        interestAmount: String(totalInterest),
        feeAmount: String(totalFees),
        totalAmount: String(totalAmount),
        invoiceCount: overdueInvoices.length,
        sentAt: new Date(),
        status: "sent",
      });
      
      res.json({
        success: true,
        message: `Mahnung erfolgreich an ${email} gesendet`,
        invoiceCount: overdueInvoices.length,
        totalAmount,
      });
    } catch (error) {
      console.error("Error sending dunning email:", error);
      res.status(500).json({ message: "Failed to send email: " + (error as Error).message });
    }
  });

  // Log dunning email opened in Outlook (interim solution before OAuth)
  app.post("/api/dunning/log-opened", isAuthenticated, isInternal, async (req, res) => {
    try {
      const { customerId, templateId, recipientEmail, stage } = req.body;
      
      if (!customerId || !templateId || !recipientEmail || !stage) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const template = await storage.getDunningEmailTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      await storage.createDunningEventForCustomer({
        customerId,
        templateId,
        stage,
        recipientEmail,
        subject: template.subject,
        interestAmount: "0",
        feeAmount: "0",
        totalAmount: "0",
        invoiceCount: 0,
        sentAt: new Date(),
        status: "opened_in_outlook",
      });
      
      res.json({ success: true, message: "Logged successfully" });
    } catch (error) {
      console.error("Error logging dunning opened:", error);
      res.status(500).json({ message: "Failed to log" });
    }
  });

  // Get overdue invoices for a customer (for preview)
  app.get("/api/customers/:id/overdue-invoices", isAuthenticated, isInternal, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const receipts = await storage.getReceipts({ debtorNumber: customer.debtorPostingaccountNumber });
      const dunningRulesData = await storage.getDunningRulesForCustomer(req.params.id);
      
      const { calculateOverdueInvoices } = await import("./dunning-email-service");
      
      const ezbBaseRateSetting = await storage.getSetting("EZB_BASE_RATE");
      const ezbBaseRate = ezbBaseRateSetting ? parseFloat(ezbBaseRateSetting) : 2.82;
      const stage = (req.query.stage as string) || "reminder";
      const overdueInvoices = calculateOverdueInvoices(receipts, customer, dunningRulesData || null, stage, ezbBaseRate);
      
      res.json(overdueInvoices);
    } catch (error) {
      console.error("Error getting overdue invoices:", error);
      res.status(500).json({ message: "Failed to get overdue invoices" });
    }
  });

  // Get dunning history for a customer
  app.get("/api/customers/:id/dunning-history", isAuthenticated, isInternal, async (req, res) => {
    try {
      const events = await storage.getDunningEventsForCustomer(req.params.id);
      res.json(events);
    } catch (error) {
      console.error("Error getting dunning history:", error);
      res.status(500).json({ message: "Failed to get dunning history" });
    }
  });

  // Seed default templates if none exist
  app.post("/api/dunning-templates/seed-defaults", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const existing = await storage.getDunningEmailTemplates();
      if (existing.length > 0) {
        return res.json({ message: "Templates already exist", count: existing.length });
      }
      
      const { defaultTemplates } = await import("./dunning-email-service");
      
      for (const template of defaultTemplates) {
        await storage.createDunningEmailTemplate(template);
      }
      
      res.json({ message: "Default templates created", count: defaultTemplates.length });
    } catch (error) {
      console.error("Error seeding default templates:", error);
      res.status(500).json({ message: "Failed to seed templates" });
    }
  });

  return httpServer;
}

function normalizeNameForMatching(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,\-–\.]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/gmbh|mbh|kg|ag|eg|co\.|& co|ug|ohg/gi, "")
    .trim();
}

function getNormalizedWords(name: string): string[] {
  return normalizeNameForMatching(name).split(" ").filter(w => w.length > 2);
}

function matchScore(name1: string, name2: string): number {
  const words1 = getNormalizedWords(name1);
  const words2 = getNormalizedWords(name2);
  if (words1.length === 0 || words2.length === 0) return 0;
  
  let matches = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matches++;
        break;
      }
    }
  }
  return matches / Math.max(words1.length, words2.length);
}

async function linkReceiptsToDebtors(storage: IStorage): Promise<number> {
  const customers = await storage.getCustomers();
  const receipts = await storage.getReceipts();
  const mappings = await storage.getCounterpartyMappings();
  
  let linkedCount = 0;
  
  for (const receipt of receipts) {
    if (receipt.debtorPostingaccountNumber === 0) {
      const rawJson = receipt.rawJson as any;
      
      // First try to extract debtor number from rawJson
      const extractedNumber = extractDebtorNumber(rawJson || {});
      if (extractedNumber > 0) {
        await storage.updateReceiptDebtor(receipt.id, extractedNumber);
        linkedCount++;
        continue;
      }
      
      const counterparty = rawJson?.counterparty;
      
      if (counterparty) {
        // Second, try manual counterparty mappings (exact match)
        const mapping = mappings.find((m) => m.counterpartyName === counterparty);
        if (mapping) {
          await storage.updateReceiptDebtor(receipt.id, mapping.debtorPostingaccountNumber);
          linkedCount++;
          continue;
        }
        
        // Fall back to fuzzy counterparty name matching
        let bestMatch: { customer: typeof customers[0]; score: number } | null = null;
        
        for (const customer of customers) {
          const score = matchScore(counterparty, customer.displayName);
          if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { customer, score };
          }
        }
        
        if (bestMatch) {
          await storage.updateReceiptDebtor(receipt.id, bestMatch.customer.debtorPostingaccountNumber);
          linkedCount++;
        }
      }
    }
  }
  
  return linkedCount;
}
