import { storage } from "./storage";
import { log } from "./index";

let syncIntervalId: NodeJS.Timeout | null = null;
let currentIntervalMinutes: number = 0;

async function performAutoSync() {
  try {
    const apiKey = await storage.getSetting("BHB_API_KEY");
    const apiClient = await storage.getSetting("BHB_API_CLIENT");
    const apiSecret = await storage.getSetting("BHB_API_SECRET");
    
    if (!apiKey || !apiClient || !apiSecret) {
      log("Auto-sync skipped: BHB API credentials not configured", "scheduler");
      return;
    }

    log("Starting automatic BHB sync...", "scheduler");
    
    // Sync both invoices and debtors
    const syncLog = await storage.createSyncLog({
      entityType: "both",
      mode: "auto",
      direction: "pull",
      status: "running",
      triggeredBy: "system",
    });

    try {
      // Import sync functions dynamically to avoid circular dependencies
      const { syncInvoices, syncDebtors } = await import("./sync-functions");
      
      const invoiceResult = await syncInvoices("auto", "system");
      const debtorResult = await syncDebtors("auto", "system");
      
      await storage.updateSyncLog(syncLog.id, {
        status: "success",
        finishedAt: new Date(),
        pulledCount: (invoiceResult.pulledCount || 0) + (debtorResult.pulledCount || 0),
        createdCount: (invoiceResult.createdCount || 0) + (debtorResult.createdCount || 0),
        updatedCount: (invoiceResult.updatedCount || 0) + (debtorResult.updatedCount || 0),
        unchangedCount: (invoiceResult.unchangedCount || 0) + (debtorResult.unchangedCount || 0),
        details: { invoices: invoiceResult, debtors: debtorResult },
      });
      
      log(`Auto-sync completed: ${invoiceResult.createdCount + invoiceResult.updatedCount} invoices, ${debtorResult.createdCount + debtorResult.updatedCount} debtors changed`, "scheduler");
    } catch (error) {
      await storage.updateSyncLog(syncLog.id, {
        status: "error",
        finishedAt: new Date(),
        errors: { message: error instanceof Error ? error.message : String(error) },
      });
      log(`Auto-sync failed: ${error}`, "scheduler");
    }
  } catch (error) {
    log(`Auto-sync error: ${error}`, "scheduler");
  }
}

export async function startScheduler() {
  const intervalSetting = await storage.getSetting("SYNC_INTERVAL_MINUTES");
  const intervalMinutes = intervalSetting ? parseInt(intervalSetting, 10) : 0;
  
  if (intervalMinutes > 0) {
    setSchedulerInterval(intervalMinutes);
    log(`Sync scheduler started with ${intervalMinutes} minute interval`, "scheduler");
  } else {
    log("Sync scheduler disabled (interval = 0)", "scheduler");
  }
}

export function setSchedulerInterval(minutes: number) {
  // Clear existing interval if any
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
  
  currentIntervalMinutes = minutes;
  
  if (minutes > 0) {
    const intervalMs = minutes * 60 * 1000;
    syncIntervalId = setInterval(performAutoSync, intervalMs);
    log(`Sync interval set to ${minutes} minutes`, "scheduler");
  } else {
    log("Sync scheduler disabled", "scheduler");
  }
}

export function getSchedulerStatus() {
  return {
    enabled: syncIntervalId !== null,
    intervalMinutes: currentIntervalMinutes,
  };
}

export async function triggerManualSync(entityType: "invoices" | "debtors" | "both", userId: string) {
  const { syncInvoices, syncDebtors } = await import("./sync-functions");
  
  const syncLog = await storage.createSyncLog({
    entityType,
    mode: "manual",
    direction: "pull",
    status: "running",
    triggeredBy: userId,
  });

  try {
    let invoiceResult = { pulledCount: 0, createdCount: 0, updatedCount: 0, unchangedCount: 0 };
    let debtorResult = { pulledCount: 0, createdCount: 0, updatedCount: 0, unchangedCount: 0 };
    
    if (entityType === "invoices" || entityType === "both") {
      invoiceResult = await syncInvoices("manual", userId);
    }
    if (entityType === "debtors" || entityType === "both") {
      debtorResult = await syncDebtors("manual", userId);
    }
    
    await storage.updateSyncLog(syncLog.id, {
      status: "success",
      finishedAt: new Date(),
      pulledCount: invoiceResult.pulledCount + debtorResult.pulledCount,
      createdCount: invoiceResult.createdCount + debtorResult.createdCount,
      updatedCount: invoiceResult.updatedCount + debtorResult.updatedCount,
      unchangedCount: invoiceResult.unchangedCount + debtorResult.unchangedCount,
      details: { invoices: invoiceResult, debtors: debtorResult },
    });
    
    return {
      success: true,
      syncLogId: syncLog.id,
      invoices: invoiceResult,
      debtors: debtorResult,
    };
  } catch (error) {
    await storage.updateSyncLog(syncLog.id, {
      status: "error",
      finishedAt: new Date(),
      errors: { message: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }
}
