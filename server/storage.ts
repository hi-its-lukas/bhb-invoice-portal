import {
  portalCustomers,
  portalUserCustomers,
  bhbReceiptsCache,
  dunningRules,
  dunningEvents,
  type PortalCustomer,
  type InsertPortalCustomer,
  type PortalUserCustomer,
  type InsertPortalUserCustomer,
  type BhbReceiptsCache,
  type InsertBhbReceiptsCache,
  type DunningRules,
  type InsertDunningRules,
  type DunningEvent,
  type InsertDunningEvent,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, lte, isNull, or } from "drizzle-orm";

export interface IStorage {
  getCustomers(): Promise<PortalCustomer[]>;
  getCustomer(id: string): Promise<PortalCustomer | undefined>;
  getCustomerByDebtorNumber(debtorNumber: number): Promise<PortalCustomer | undefined>;
  createCustomer(customer: InsertPortalCustomer): Promise<PortalCustomer>;
  updateCustomer(id: string, customer: Partial<InsertPortalCustomer>): Promise<PortalCustomer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  
  getUserCustomers(userId: string): Promise<PortalUserCustomer[]>;
  assignUserToCustomer(data: InsertPortalUserCustomer): Promise<PortalUserCustomer>;
  removeUserFromCustomer(userId: string, customerId: string): Promise<boolean>;
  
  getReceipts(filters?: { debtorNumber?: number; status?: string }): Promise<BhbReceiptsCache[]>;
  getReceipt(id: string): Promise<BhbReceiptsCache | undefined>;
  getReceiptByIdByCustomer(idByCustomer: string): Promise<BhbReceiptsCache | undefined>;
  upsertReceipt(receipt: InsertBhbReceiptsCache): Promise<BhbReceiptsCache>;
  
  getDunningRules(customerId?: string): Promise<DunningRules[]>;
  getDunningRulesForCustomer(customerId: string): Promise<DunningRules | undefined>;
  upsertDunningRules(rules: InsertDunningRules): Promise<DunningRules>;
  
  getDunningEvents(receiptId: string): Promise<DunningEvent[]>;
  createDunningEvent(event: InsertDunningEvent): Promise<DunningEvent>;
  updateDunningEvent(id: string, data: Partial<InsertDunningEvent>): Promise<DunningEvent | undefined>;
  
  getDashboardStats(): Promise<{
    totalOpenAmount: number;
    overdueAmount: number;
    overdueCount: number;
    totalInvoices: number;
    dunningEmailsSent: number;
    customersCount: number;
  }>;
  getRecentInvoices(limit?: number): Promise<BhbReceiptsCache[]>;
}

export class DatabaseStorage implements IStorage {
  async getCustomers(): Promise<PortalCustomer[]> {
    return db.select().from(portalCustomers).orderBy(portalCustomers.displayName);
  }

  async getCustomer(id: string): Promise<PortalCustomer | undefined> {
    const [customer] = await db.select().from(portalCustomers).where(eq(portalCustomers.id, id));
    return customer;
  }

  async getCustomerByDebtorNumber(debtorNumber: number): Promise<PortalCustomer | undefined> {
    const [customer] = await db
      .select()
      .from(portalCustomers)
      .where(eq(portalCustomers.debtorPostingaccountNumber, debtorNumber));
    return customer;
  }

  async createCustomer(customer: InsertPortalCustomer): Promise<PortalCustomer> {
    const [created] = await db.insert(portalCustomers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: string, customer: Partial<InsertPortalCustomer>): Promise<PortalCustomer | undefined> {
    const [updated] = await db
      .update(portalCustomers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(portalCustomers.id, id))
      .returning();
    return updated;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const existing = await this.getCustomer(id);
    if (!existing) {
      return false;
    }
    await db.delete(portalCustomers).where(eq(portalCustomers.id, id));
    return true;
  }

  async getUserCustomers(userId: string): Promise<PortalUserCustomer[]> {
    return db
      .select()
      .from(portalUserCustomers)
      .where(eq(portalUserCustomers.userId, userId));
  }

  async assignUserToCustomer(data: InsertPortalUserCustomer): Promise<PortalUserCustomer> {
    const [created] = await db.insert(portalUserCustomers).values(data).returning();
    return created;
  }

  async removeUserFromCustomer(userId: string, customerId: string): Promise<boolean> {
    await db
      .delete(portalUserCustomers)
      .where(
        and(
          eq(portalUserCustomers.userId, userId),
          eq(portalUserCustomers.customerId, customerId)
        )
      );
    return true;
  }

  async getReceipts(filters?: { debtorNumber?: number; status?: string }): Promise<BhbReceiptsCache[]> {
    let query = db.select().from(bhbReceiptsCache);
    
    if (filters?.debtorNumber) {
      query = query.where(eq(bhbReceiptsCache.debtorPostingaccountNumber, filters.debtorNumber)) as any;
    }
    if (filters?.status && filters.status !== "all") {
      query = query.where(eq(bhbReceiptsCache.paymentStatus, filters.status)) as any;
    }
    
    return query.orderBy(desc(bhbReceiptsCache.dueDate));
  }

  async getReceipt(id: string): Promise<BhbReceiptsCache | undefined> {
    const [receipt] = await db.select().from(bhbReceiptsCache).where(eq(bhbReceiptsCache.id, id));
    return receipt;
  }

  async getReceiptByIdByCustomer(idByCustomer: string): Promise<BhbReceiptsCache | undefined> {
    const [receipt] = await db
      .select()
      .from(bhbReceiptsCache)
      .where(eq(bhbReceiptsCache.idByCustomer, idByCustomer));
    return receipt;
  }

  async upsertReceipt(receipt: InsertBhbReceiptsCache): Promise<BhbReceiptsCache> {
    const [upserted] = await db
      .insert(bhbReceiptsCache)
      .values({ ...receipt, lastSyncedAt: new Date() })
      .onConflictDoUpdate({
        target: bhbReceiptsCache.idByCustomer,
        set: {
          ...receipt,
          lastSyncedAt: new Date(),
        },
      })
      .returning();
    return upserted;
  }

  async getDunningRules(customerId?: string): Promise<DunningRules[]> {
    if (customerId) {
      return db.select().from(dunningRules).where(eq(dunningRules.customerId, customerId));
    }
    return db.select().from(dunningRules);
  }

  async getDunningRulesForCustomer(customerId: string): Promise<DunningRules | undefined> {
    const [rules] = await db.select().from(dunningRules).where(eq(dunningRules.customerId, customerId));
    return rules;
  }

  async upsertDunningRules(rules: InsertDunningRules): Promise<DunningRules> {
    const existing = await this.getDunningRulesForCustomer(rules.customerId);
    
    if (existing) {
      const [updated] = await db
        .update(dunningRules)
        .set({ ...rules, updatedAt: new Date() })
        .where(eq(dunningRules.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(dunningRules).values(rules).returning();
    return created;
  }

  async getDunningEvents(receiptId: string): Promise<DunningEvent[]> {
    return db
      .select()
      .from(dunningEvents)
      .where(eq(dunningEvents.receiptId, receiptId))
      .orderBy(desc(dunningEvents.createdAt));
  }

  async createDunningEvent(event: InsertDunningEvent): Promise<DunningEvent> {
    const [created] = await db.insert(dunningEvents).values(event).returning();
    return created;
  }

  async updateDunningEvent(id: string, data: Partial<InsertDunningEvent>): Promise<DunningEvent | undefined> {
    const [updated] = await db
      .update(dunningEvents)
      .set(data)
      .where(eq(dunningEvents.id, id))
      .returning();
    return updated;
  }

  async getDashboardStats() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const receipts = await db.select().from(bhbReceiptsCache).where(eq(bhbReceiptsCache.paymentStatus, "unpaid"));
    const customers = await db.select().from(portalCustomers).where(eq(portalCustomers.isActive, true));
    const monthlyEvents = await db
      .select()
      .from(dunningEvents)
      .where(
        and(
          eq(dunningEvents.status, "sent"),
          sql`${dunningEvents.sentAt} >= ${startOfMonth}`
        )
      );

    let totalOpenAmount = 0;
    let overdueAmount = 0;
    let overdueCount = 0;

    for (const receipt of receipts) {
      const amount = parseFloat(receipt.amountOpen?.toString() || receipt.amountTotal?.toString() || "0");
      totalOpenAmount += amount;
      
      if (receipt.dueDate && new Date(receipt.dueDate) < today) {
        overdueAmount += amount;
        overdueCount++;
      }
    }

    return {
      totalOpenAmount,
      overdueAmount,
      overdueCount,
      totalInvoices: receipts.length,
      dunningEmailsSent: monthlyEvents.length,
      customersCount: customers.length,
    };
  }

  async getRecentInvoices(limit = 10): Promise<BhbReceiptsCache[]> {
    return db
      .select()
      .from(bhbReceiptsCache)
      .where(eq(bhbReceiptsCache.paymentStatus, "unpaid"))
      .orderBy(desc(bhbReceiptsCache.dueDate))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
