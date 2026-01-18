import { storage } from "./storage";
import crypto from "crypto";

interface SyncResult {
  pulledCount: number;
  createdCount: number;
  updatedCount: number;
  unchangedCount: number;
  errors?: string[];
}

function computeDebtorHash(debtor: any): string {
  const normalized = {
    name: debtor.name || "",
    email: debtor.email || "",
    contact_person: debtor.contact_person || debtor.contactperson || "",
    street: debtor.street || "",
    additional_addressline: debtor.additional_addressline || debtor.addressline2 || "",
    zip: debtor.zip || debtor.postcode || "",
    city: debtor.city || "",
    country: debtor.country || "",
    sales_tax_id_eu: debtor.sales_tax_id_eu || debtor.vat_id || debtor.ustid || "",
    uid_ch: debtor.uid_ch || "",
    iban: debtor.iban || "",
    bic: debtor.bic || "",
  };
  return crypto.createHash("md5").update(JSON.stringify(normalized)).digest("hex");
}

export async function syncDebtors(mode: "manual" | "auto", triggeredBy: string): Promise<SyncResult> {
  const result: SyncResult = {
    pulledCount: 0,
    createdCount: 0,
    updatedCount: 0,
    unchangedCount: 0,
    errors: [],
  };

  const apiKey = await storage.getSetting("BHB_API_KEY");
  const apiClient = await storage.getSetting("BHB_API_CLIENT");
  const apiSecret = await storage.getSetting("BHB_API_SECRET");

  if (!apiKey || !apiClient || !apiSecret) {
    throw new Error("BHB API nicht konfiguriert");
  }

  const baseUrl = await storage.getSetting("BHB_BASE_URL") || "https://webapp.buchhaltungsbutler.de/api/v1";
  const authHeader = "Basic " + Buffer.from(`${apiClient}:${apiSecret}`).toString("base64");

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
    throw new Error(`BHB API Fehler: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || "BHB API Fehler beim Abrufen der Debitoren");
  }

  const debtors = data.data || [];
  result.pulledCount = debtors.length;

  const existingCustomers = await storage.getCustomers();
  const processedCustomerIds = new Set<string>();

  for (const debtor of debtors) {
    try {
      const debtorNumber = parseInt(debtor.postingaccount_number || "0", 10);
      const debtorName = debtor.name || `Debitor ${debtorNumber}`;
      const debtorEmail = debtor.email || "";
      const newHash = computeDebtorHash(debtor);

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
        bhbDataHash: newHash,
        lastBhbSync: new Date(),
      };

      if (debtorNumber > 0) {
        const existingByNumber = await storage.getCustomerByDebtorNumber(debtorNumber);

        if (existingByNumber) {
          processedCustomerIds.add(existingByNumber.id);
          
          // Check if data actually changed using hash
          if (existingByNumber.bhbDataHash === newHash) {
            result.unchangedCount++;
          } else if (existingByNumber.bhbDataHash === null || existingByNumber.bhbDataHash === "") {
            // First sync - just set the hash without counting as "updated"
            // This fixes the issue where all debtors were reported as "updated" on first sync
            await storage.updateCustomer(existingByNumber.id, { bhbDataHash: newHash, lastBhbSync: new Date() });
            result.unchangedCount++;
          } else {
            // Data actually changed
            console.log(`[sync] Updating customer ${existingByNumber.id}, old hash: ${existingByNumber.bhbDataHash}, new hash: ${newHash}`);
            await storage.updateCustomer(existingByNumber.id, bhbData);
            result.updatedCount++;
          }
        } else {
          // Look for existing customer with 80xxx number by name match
          const normalizedDebtorName = debtorName.toLowerCase().trim();
          let matchedCustomer = existingCustomers.find(c =>
            !processedCustomerIds.has(c.id) &&
            c.debtorPostingaccountNumber >= 80000 &&
            c.displayName.toLowerCase().trim() === normalizedDebtorName
          );

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
            processedCustomerIds.add(matchedCustomer.id);
            const oldDebtorNumber = matchedCustomer.debtorPostingaccountNumber;
            await storage.updateCustomerDebtorNumberAtomic(
              matchedCustomer.id,
              oldDebtorNumber,
              debtorNumber,
              bhbData
            );
            result.updatedCount++;
          } else {
            await storage.createCustomer({
              debtorPostingaccountNumber: debtorNumber,
              isActive: true,
              ...bhbData,
            });
            result.createdCount++;
          }
        }
      }
    } catch (error) {
      result.errors?.push(`Fehler bei Debitor ${debtor.postingaccount_number}: ${error}`);
    }
  }

  return result;
}

export async function syncInvoices(mode: "manual" | "auto", triggeredBy: string): Promise<SyncResult> {
  const result: SyncResult = {
    pulledCount: 0,
    createdCount: 0,
    updatedCount: 0,
    unchangedCount: 0,
    errors: [],
  };

  const apiKey = await storage.getSetting("BHB_API_KEY");
  const apiClient = await storage.getSetting("BHB_API_CLIENT");
  const apiSecret = await storage.getSetting("BHB_API_SECRET");

  if (!apiKey || !apiClient || !apiSecret) {
    throw new Error("BHB API nicht konfiguriert");
  }

  const baseUrl = await storage.getSetting("BHB_BASE_URL") || "https://webapp.buchhaltungsbutler.de/api/v1";
  const authHeader = "Basic " + Buffer.from(`${apiClient}:${apiSecret}`).toString("base64");

  // Request ALL outbound invoices (not just unpaid) to detect payment status changes
  const requestBody = {
    api_key: apiKey,
    list_direction: "outbound",
    // Note: Removed payment_status filter to get both paid and unpaid invoices
    // This allows us to update payment status when invoices are paid in BHB
  };
  
  console.log(`[sync] Invoice sync request to ${baseUrl}/receipts/get (all invoices)`);
  
  const response = await fetch(`${baseUrl}/receipts/get`, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    console.error(`[sync] BHB response not JSON: ${responseText.substring(0, 500)}`);
    throw new Error(`BHB API Fehler: ${response.status} - Invalid response`);
  }

  if (!response.ok) {
    console.error(`[sync] BHB API error ${response.status}:`, data);
    throw new Error(`BHB API Fehler: ${response.status} - ${data.message || data.error || 'Unknown error'}`);
  }

  if (!data.success) {
    console.error(`[sync] BHB API returned success=false:`, data);
    throw new Error(data.message || "BHB API Fehler beim Abrufen der Rechnungen");
  }

  const receipts = data.data || [];
  result.pulledCount = receipts.length;

  for (const receipt of receipts) {
    try {
      const idByCustomer = receipt.id_by_customer;
      if (!idByCustomer) continue;

      // Skip deleted receipts
      if (receipt.deleted === "1" || receipt.deleted === 1) {
        console.log(`[sync] Skipping deleted receipt ${idByCustomer}`);
        continue;
      }

      // Calculate open amount from BHB fields
      // For outbound invoices, amount is negative (e.g., -1000), amount_paid is positive
      const amountTotal = parseFloat(receipt.amount || "0");
      const absTotal = Math.abs(amountTotal);
      const amountPaid = parseFloat(receipt.amount_paid || "0");
      const amountPaidFixed = parseFloat(receipt.amount_paid_fixed || "0");
      const totalPaid = amountPaid + amountPaidFixed;
      const amountOpen = Math.max(0, absTotal - totalPaid);
      
      // Determine payment status
      const isPaid = amountOpen <= 0.01;
      const paymentStatus = isPaid ? "paid" : "unpaid";

      // Find customer by counterparty name to get postingaccount_number
      let debtorPostingaccountNumber = 0;
      const counterpartyName = receipt.counterparty;
      if (counterpartyName) {
        const customer = await storage.getCustomerByName(counterpartyName);
        if (customer) {
          debtorPostingaccountNumber = customer.debtorPostingaccountNumber;
        }
      }

      const existingReceipt = await storage.getReceiptByIdByCustomer(idByCustomer);
      const receiptData = {
        idByCustomer,
        debtorPostingaccountNumber,
        invoiceNumber: receipt.invoicenumber || idByCustomer,
        receiptDate: receipt.date ? new Date(receipt.date) : null,
        dueDate: receipt.due_date ? new Date(receipt.due_date) : null,
        amountTotal: absTotal.toString(),
        amountOpen: amountOpen.toFixed(2),
        paymentStatus,
        rawJson: receipt,
        lastSyncedAt: new Date(),
      };

      if (existingReceipt) {
        const existingOpen = parseFloat(existingReceipt.amountOpen?.toString() || "0");
        const invoiceNumberChanged = existingReceipt.invoiceNumber !== receiptData.invoiceNumber;
        const amountChanged = Math.abs(existingOpen - amountOpen) >= 0.01;
        const paymentStatusChanged = existingReceipt.paymentStatus !== paymentStatus;
        const debtorChanged = existingReceipt.debtorPostingaccountNumber !== receiptData.debtorPostingaccountNumber && receiptData.debtorPostingaccountNumber !== 0;
        
        if (amountChanged || invoiceNumberChanged || debtorChanged || paymentStatusChanged) {
          await storage.upsertReceipt(receiptData);
          result.updatedCount++;
          if (paymentStatusChanged) {
            console.log(`[sync] Payment status changed for ${idByCustomer}: ${existingReceipt.paymentStatus} -> ${paymentStatus}`);
          }
          if (invoiceNumberChanged) {
            console.log(`[sync] Updated invoice number: ${existingReceipt.invoiceNumber} -> ${receiptData.invoiceNumber}`);
          }
        } else {
          result.unchangedCount++;
        }
      } else {
        await storage.upsertReceipt(receiptData);
        result.createdCount++;
      }
    } catch (error) {
      result.errors?.push(`Fehler bei Rechnung: ${error}`);
    }
  }

  return result;
}
