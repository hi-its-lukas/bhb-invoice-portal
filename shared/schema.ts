import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const portalCustomers = pgTable("portal_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  debtorPostingaccountNumber: integer("debtor_postingaccount_number").notNull().unique(),
  displayName: text("display_name").notNull(),
  emailContact: text("email_contact"),
  isActive: boolean("is_active").default(true).notNull(),
  customerType: text("customer_type"),
  paymentTermDays: integer("payment_term_days").default(14).notNull(),
  contactPersonName: text("contact_person_name"),
  street: text("street"),
  additionalAddressline: text("additional_addressline"),
  zip: text("zip"),
  city: text("city"),
  country: text("country"),
  salesTaxIdEu: text("sales_tax_id_eu"),
  uidCh: text("uid_ch"),
  iban: text("iban"),
  bic: text("bic"),
  bhbRawJson: jsonb("bhb_raw_json"),
  lastBhbSync: timestamp("last_bhb_sync"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const portalCustomersRelations = relations(portalCustomers, ({ many }) => ({
  userCustomers: many(portalUserCustomers),
  receiptsCache: many(bhbReceiptsCache),
  dunningRules: many(dunningRules),
}));

export const portalUserCustomers = pgTable("portal_user_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  customerId: varchar("customer_id").notNull().references(() => portalCustomers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_customers_user").on(table.userId),
  index("idx_user_customers_customer").on(table.customerId),
]);

export const portalUserCustomersRelations = relations(portalUserCustomers, ({ one }) => ({
  customer: one(portalCustomers, {
    fields: [portalUserCustomers.customerId],
    references: [portalCustomers.id],
  }),
}));

export const bhbReceiptsCache = pgTable("bhb_receipts_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  idByCustomer: text("id_by_customer").notNull().unique(),
  debtorPostingaccountNumber: integer("debtor_postingaccount_number").notNull(),
  invoiceNumber: text("invoice_number"),
  receiptDate: timestamp("receipt_date"),
  dueDate: timestamp("due_date"),
  amountTotal: decimal("amount_total", { precision: 12, scale: 2 }),
  amountOpen: decimal("amount_open", { precision: 12, scale: 2 }),
  paymentStatus: text("payment_status").default("unpaid"),
  dunningLevel: text("dunning_level").default("none"),
  rawJson: jsonb("raw_json"),
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
}, (table) => [
  index("idx_receipts_debtor").on(table.debtorPostingaccountNumber),
  index("idx_receipts_status").on(table.paymentStatus),
  index("idx_receipts_due_date").on(table.dueDate),
]);

export const bhbReceiptsCacheRelations = relations(bhbReceiptsCache, ({ one, many }) => ({
  customer: one(portalCustomers, {
    fields: [bhbReceiptsCache.debtorPostingaccountNumber],
    references: [portalCustomers.debtorPostingaccountNumber],
  }),
  dunningEvents: many(dunningEvents),
}));

// Mapping table for counterparty names to debtor numbers
export const counterpartyMappings = pgTable("counterparty_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  counterpartyName: text("counterparty_name").notNull().unique(),
  debtorPostingaccountNumber: integer("debtor_postingaccount_number").notNull().references(() => portalCustomers.debtorPostingaccountNumber),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_counterparty_name").on(table.counterpartyName),
]);

export const counterpartyMappingsRelations = relations(counterpartyMappings, ({ one }) => ({
  customer: one(portalCustomers, {
    fields: [counterpartyMappings.debtorPostingaccountNumber],
    references: [portalCustomers.debtorPostingaccountNumber],
  }),
}));

export const counterpartyExceptions = pgTable("counterparty_exceptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  counterpartyName: text("counterparty_name").notNull().unique(),
  status: text("status").notNull().default("ignored"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_counterparty_exception_name").on(table.counterpartyName),
]);

export const dunningStagesSchema = z.object({
  reminder: z.object({
    daysAfterDue: z.number(),
    fee: z.number().optional(),
    enabled: z.boolean(),
  }),
  dunning1: z.object({
    daysAfterDue: z.number(),
    fee: z.number().optional(),
    enabled: z.boolean(),
  }),
  dunning2: z.object({
    daysAfterDue: z.number(),
    fee: z.number().optional(),
    enabled: z.boolean(),
  }),
  dunning3: z.object({
    daysAfterDue: z.number(),
    fee: z.number().optional(),
    enabled: z.boolean(),
  }),
});

export type DunningStages = z.infer<typeof dunningStagesSchema>;

export const dunningRules = pgTable("dunning_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => portalCustomers.id, { onDelete: "cascade" }),
  graceDays: integer("grace_days").default(0).notNull(),
  interestRatePercent: decimal("interest_rate_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  useLegalRate: boolean("use_legal_rate").default(false).notNull(),
  stages: jsonb("stages").$type<DunningStages>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dunningRulesRelations = relations(dunningRules, ({ one }) => ({
  customer: one(portalCustomers, {
    fields: [dunningRules.customerId],
    references: [portalCustomers.id],
  }),
}));

// Email templates for dunning letters (must be defined before dunningEvents)
export const dunningEmailTemplates = pgTable("dunning_email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  stage: text("stage").notNull(), // 'reminder', 'dunning1', 'dunning2', 'dunning3'
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  textBody: text("text_body"),
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_dunning_templates_stage").on(table.stage),
]);

export const dunningEvents = pgTable("dunning_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  receiptId: varchar("receipt_id").references(() => bhbReceiptsCache.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").references(() => portalCustomers.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").references(() => dunningEmailTemplates.id, { onDelete: "set null" }),
  stage: text("stage").notNull(),
  recipientEmail: text("recipient_email"),
  subject: text("subject"),
  interestAmount: decimal("interest_amount", { precision: 12, scale: 2 }),
  feeAmount: decimal("fee_amount", { precision: 12, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  invoiceCount: integer("invoice_count"),
  sentAt: timestamp("sent_at"),
  status: text("status").default("pending").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_dunning_events_receipt").on(table.receiptId),
  index("idx_dunning_events_customer").on(table.customerId),
  index("idx_dunning_events_stage").on(table.stage),
]);

export const dunningEventsRelations = relations(dunningEvents, ({ one }) => ({
  receipt: one(bhbReceiptsCache, {
    fields: [dunningEvents.receiptId],
    references: [bhbReceiptsCache.id],
  }),
}));

export const insertDunningEmailTemplateSchema = createInsertSchema(dunningEmailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDunningEmailTemplate = z.infer<typeof insertDunningEmailTemplateSchema>;
export type DunningEmailTemplate = typeof dunningEmailTemplates.$inferSelect;

export const insertPortalCustomerSchema = createInsertSchema(portalCustomers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastBhbSync: true,
}).extend({
  emailContact: z.union([z.string().email(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  isActive: z.boolean().optional().default(true),
});

export const customerTypeSchema = z.enum(["consumer", "business"]);

export const updatePortalCustomerSchema = z.object({
  displayName: z.string().min(1).optional(),
  emailContact: z.union([z.string().email(), z.literal(""), z.null()]).optional().transform(val => val === "" ? null : val),
  isActive: z.boolean().optional(),
  customerType: customerTypeSchema.nullable().optional(),
  contactPersonName: z.string().nullable().optional(),
  street: z.string().nullable().optional(),
  additionalAddressline: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  salesTaxIdEu: z.string().nullable().optional(),
  uidCh: z.string().nullable().optional(),
  iban: z.string().nullable().optional(),
  bic: z.string().nullable().optional(),
});

export const inputDunningRulesSchema = z.object({
  graceDays: z.number().int().min(0).optional().default(0),
  interestRatePercent: z.union([z.string(), z.number()]).optional().transform(val => String(val ?? "0")),
  useLegalRate: z.boolean().optional().default(false),
  stages: dunningStagesSchema.optional(),
}).strict();

export const insertPortalUserCustomerSchema = createInsertSchema(portalUserCustomers).omit({
  id: true,
  createdAt: true,
});

export const insertBhbReceiptsCacheSchema = createInsertSchema(bhbReceiptsCache).omit({
  id: true,
  lastSyncedAt: true,
});

export const insertDunningRulesSchema = createInsertSchema(dunningRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDunningEventSchema = createInsertSchema(dunningEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertPortalCustomer = z.infer<typeof insertPortalCustomerSchema>;
export type PortalCustomer = typeof portalCustomers.$inferSelect;

export type InsertPortalUserCustomer = z.infer<typeof insertPortalUserCustomerSchema>;
export type PortalUserCustomer = typeof portalUserCustomers.$inferSelect;

export type InsertBhbReceiptsCache = z.infer<typeof insertBhbReceiptsCacheSchema>;
export type BhbReceiptsCache = typeof bhbReceiptsCache.$inferSelect;

export type InsertDunningRules = z.infer<typeof insertDunningRulesSchema>;
export type DunningRules = typeof dunningRules.$inferSelect;

export type InsertDunningEvent = z.infer<typeof insertDunningEventSchema>;
export type DunningEvent = typeof dunningEvents.$inferSelect;

export const insertCounterpartyMappingSchema = createInsertSchema(counterpartyMappings).omit({
  id: true,
  createdAt: true,
});

export type InsertCounterpartyMapping = z.infer<typeof insertCounterpartyMappingSchema>;
export type CounterpartyMapping = typeof counterpartyMappings.$inferSelect;

// Branding configuration table for CI/CD customization
export const brandingConfig = pgTable("branding_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value"),
  category: text("category").notNull().default("general"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const brandingConfigSchema = z.object({
  companyName: z.string().optional().default("Kundenportal"),
  companyTagline: z.string().optional().default("Rechnungen & Zahlungen"),
  logoUrl: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  primaryColor: z.string().optional().default("#16a34a"),
  primaryForeground: z.string().optional().default("#ffffff"),
  accentColor: z.string().optional().default("#f0fdf4"),
  sidebarColor: z.string().optional().default("#f8fafc"),
  supportEmail: z.string().email().nullable().optional(),
  supportPhone: z.string().nullable().optional(),
  footerText: z.string().nullable().optional(),
  customCss: z.string().nullable().optional(),
});

export type BrandingConfig = z.infer<typeof brandingConfigSchema>;
export type BrandingConfigRow = typeof brandingConfig.$inferSelect;
