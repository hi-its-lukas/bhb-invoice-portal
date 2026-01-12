import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import {
  insertPortalCustomerSchema,
  updatePortalCustomerSchema,
  inputDunningRulesSchema,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

function calculateDaysOverdue(dueDate: Date | string | null): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/recent-invoices", isAuthenticated, async (req, res) => {
    try {
      const invoices = await storage.getRecentInvoices(10);
      const customers = await storage.getCustomers();
      const allRules = await storage.getDunningRules();
      
      const enrichedInvoices = invoices.map((invoice) => {
        const customer = customers.find(
          (c) => c.debtorPostingaccountNumber === invoice.debtorPostingaccountNumber
        );
        const rules = allRules.find((r) => r.customerId === customer?.id);
        const daysOverdue = calculateDaysOverdue(invoice.dueDate);
        const dunningLevel = determineDunningLevel(daysOverdue, rules?.stages);
        
        return {
          ...invoice,
          customer,
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

  app.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", isAuthenticated, async (req, res) => {
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

  app.patch("/api/customers/:id", isAuthenticated, async (req, res) => {
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

  app.delete("/api/customers/:id", isAuthenticated, async (req, res) => {
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

  app.get("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const { status, dunning } = req.query;
      const invoices = await storage.getReceipts({
        status: status as string,
      });
      const customers = await storage.getCustomers();
      const allRules = await storage.getDunningRules();
      
      const enrichedInvoices = invoices.map((invoice) => {
        const customer = customers.find(
          (c) => c.debtorPostingaccountNumber === invoice.debtorPostingaccountNumber
        );
        const rules = allRules.find((r) => r.customerId === customer?.id);
        const daysOverdue = calculateDaysOverdue(invoice.dueDate);
        const dunningLevel = determineDunningLevel(daysOverdue, rules?.stages);
        const interestRate = rules?.useLegalRate ? 5.0 : parseFloat(rules?.interestRatePercent?.toString() || "0") || 0;
        const amount = parseFloat(invoice.amountOpen?.toString() || invoice.amountTotal?.toString() || "0") || 0;
        const calculatedInterest = calculateInterest(amount, daysOverdue, interestRate) || 0;
        
        return {
          ...invoice,
          customer,
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

  app.get("/api/invoices/:id/pdf", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.getReceipt(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.status(501).json({ message: "PDF download requires BHB API configuration" });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      res.status(500).json({ message: "Failed to download PDF" });
    }
  });

  app.get("/api/dunning-rules", isAuthenticated, async (req, res) => {
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

  app.get("/api/dunning-rules/:customerId", isAuthenticated, async (req, res) => {
    try {
      const { customerId } = req.params;
      const rules = await storage.getDunningRulesForCustomer(customerId);
      res.json(rules || null);
    } catch (error) {
      console.error("Error fetching dunning rules:", error);
      res.status(500).json({ message: "Failed to fetch dunning rules" });
    }
  });

  app.post("/api/dunning-rules/:customerId", isAuthenticated, async (req, res) => {
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

  app.get("/api/settings/bhb", isAuthenticated, async (req, res) => {
    const isConfigured = !!(
      process.env.BHB_API_KEY &&
      process.env.BHB_API_CLIENT &&
      process.env.BHB_API_SECRET
    );
    
    res.json({
      baseUrl: process.env.BHB_BASE_URL || "https://webapp.buchhaltungsbutler.de/api/v1",
      isConfigured,
      lastSync: null,
    });
  });

  app.post("/api/settings/bhb/test", isAuthenticated, async (req, res) => {
    try {
      const apiKey = process.env.BHB_API_KEY;
      const apiClient = process.env.BHB_API_CLIENT;
      const apiSecret = process.env.BHB_API_SECRET;
      
      if (!apiKey || !apiClient || !apiSecret) {
        return res.json({
          success: false,
          message: "BHB API-Zugangsdaten nicht konfiguriert. Bitte setzen Sie BHB_API_KEY, BHB_API_CLIENT und BHB_API_SECRET.",
        });
      }
      
      const baseUrl = process.env.BHB_BASE_URL || "https://webapp.buchhaltungsbutler.de/api/v1";
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

  app.post("/api/sync/receipts", isAuthenticated, async (req, res) => {
    try {
      const apiKey = process.env.BHB_API_KEY;
      const apiClient = process.env.BHB_API_CLIENT;
      const apiSecret = process.env.BHB_API_SECRET;
      
      if (!apiKey || !apiClient || !apiSecret) {
        return res.status(400).json({ message: "BHB API nicht konfiguriert" });
      }
      
      const baseUrl = process.env.BHB_BASE_URL || "https://webapp.buchhaltungsbutler.de/api/v1";
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
          
          await storage.upsertReceipt({
            idByCustomer,
            debtorPostingaccountNumber: receipt.creditor_debtor || receipt.postingaccount_number || 0,
            invoiceNumber: receipt.invoicenumber || receipt.invoice_number || null,
            receiptDate: receipt.date ? new Date(receipt.date) : null,
            dueDate: receipt.due_date ? new Date(receipt.due_date) : null,
            amountTotal: receipt.amount_total?.toString() || receipt.amount?.toString() || "0",
            amountOpen: receipt.amount_open?.toString() || receipt.amount_total?.toString() || "0",
            paymentStatus: receipt.payment_status || "unpaid",
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
      
      res.json({ message: `${totalSynced} Rechnungen synchronisiert`, count: totalSynced });
    } catch (error: any) {
      console.error("Sync error:", error);
      res.status(500).json({ message: error.message || "Synchronisation fehlgeschlagen" });
    }
  });

  return httpServer;
}
