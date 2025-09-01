import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, real, uuid, timestamp, json, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  passwordHash: text("password_hash"),
  role: text("role").default("user").notNull(),
  settingsJson: json("settings_json").default({}),
  createdAt: integer("created_at").default(sql`extract(epoch from now())`).notNull(),
  lastLoginAt: integer("last_login_at").default(sql`extract(epoch from now())`),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
}));

// Sessions table for refresh tokens
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  userAgent: text("user_agent"),
  ip: text("ip"),
  expiresAt: integer("expires_at").notNull(),
  revoked: boolean("revoked").default(false).notNull(),
  createdAt: integer("created_at").default(sql`extract(epoch from now())`).notNull(),
}, (table) => ({
  userIdIdx: index("sessions_user_id_idx").on(table.userId),
  tokenHashIdx: index("sessions_token_hash_idx").on(table.refreshTokenHash),
}));

// Email codes for passwordless auth
export const emailCodes = pgTable("email_codes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  purpose: text("purpose").notNull(), // 'verify', 'login', 'reset'
  codeHash: text("code_hash").notNull(),
  expiresAt: integer("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: integer("created_at").default(sql`extract(epoch from now())`).notNull(),
}, (table) => ({
  emailIdx: index("email_codes_email_idx").on(table.email),
}));

// Watchlist items
export const watchlistItems = pgTable("watchlist_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  coinId: text("coin_id").notNull(),
  tags: text("tags").default(""),
  notes: text("notes").default(""),
  addedAt: integer("added_at").default(sql`extract(epoch from now())`).notNull(),
}, (table) => ({
  userIdIdx: index("watchlist_user_id_idx").on(table.userId),
  coinIdIdx: index("watchlist_coin_id_idx").on(table.coinId),
  uniqueUserCoin: unique("unique_user_coin").on(table.userId, table.coinId),
}));

// Ratings
export const ratings = pgTable("ratings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  coinId: text("coin_id").notNull(),
  marketHealth: integer("market_health").notNull(), // 1-5
  techUtility: integer("tech_utility").notNull(), // 1-5
  teamAdoption: integer("team_adoption").notNull(), // 1-5
  tokenomics: integer("tokenomics").notNull(), // 1-5
  risk: integer("risk").notNull(), // 1-5
  totalScore: integer("total_score").notNull(), // computed
  notes: text("notes").default(""),
  createdAt: integer("created_at").default(sql`extract(epoch from now())`).notNull(),
}, (table) => ({
  userIdIdx: index("ratings_user_id_idx").on(table.userId),
  coinIdIdx: index("ratings_coin_id_idx").on(table.coinId),
}));

// Transactions
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  coinId: text("coin_id").notNull(),
  type: text("type").notNull(), // 'BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT'
  quantity: real("quantity").notNull(),
  price: real("price").notNull(),
  fee: real("fee").default(0),
  timestamp: integer("timestamp").default(sql`extract(epoch from now())`).notNull(),
  note: text("note").default(""),
}, (table) => ({
  userIdIdx: index("transactions_user_id_idx").on(table.userId),
  coinIdIdx: index("transactions_coin_id_idx").on(table.coinId),
  timestampIdx: index("transactions_timestamp_idx").on(table.timestamp),
}));

// DCA Plans
export const dcaPlans = pgTable("dca_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  coinId: text("coin_id").notNull(),
  amountUsd: real("amount_usd").notNull(),
  cadence: text("cadence").notNull(), // 'WEEKLY', 'BIWEEKLY', 'MONTHLY'
  startDate: integer("start_date").notNull(),
  endDate: integer("end_date"),
  active: boolean("active").default(true).notNull(),
  createdAt: integer("created_at").default(sql`extract(epoch from now())`).notNull(),
}, (table) => ({
  userIdIdx: index("dca_plans_user_id_idx").on(table.userId),
  coinIdIdx: index("dca_plans_coin_id_idx").on(table.coinId),
  activeIdx: index("dca_plans_active_idx").on(table.active),
}));

// HTTP Cache for market data
export const httpCache = pgTable("http_cache", {
  key: text("key").primaryKey(),
  value: json("value").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

// AI Evaluations - bi-daily automated crypto analysis
export const aiEvaluations = pgTable("ai_evaluations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  runType: text("run_type").notNull(), // 'scheduled', 'manual'
  status: text("status").notNull(), // 'pending', 'processing', 'completed', 'failed'
  evaluationData: json("evaluation_data").notNull(), // Full evaluation results
  picks: json("picks").notNull(), // Array of recommended picks with allocations
  summary: text("summary"), // Human-readable summary
  metadata: json("metadata"), // Token usage, processing time, etc.
  error: text("error"), // Error message if failed
  createdAt: integer("created_at").default(sql`extract(epoch from now())`).notNull(),
}, (table) => ({
  userIdIdx: index("ai_evaluations_user_id_idx").on(table.userId),
  createdAtIdx: index("ai_evaluations_created_at_idx").on(table.createdAt),
}));

// AI Cache for explanations
export const aiCache = pgTable("ai_cache", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

// Schema exports
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  passwordHash: true,
  role: true,
  settingsJson: true,
});

export const selectUserSchema = createSelectSchema(users);

export const insertWatchlistItemSchema = createInsertSchema(watchlistItems).pick({
  coinId: true,
  tags: true,
  notes: true,
});

export const insertRatingSchema = createInsertSchema(ratings).pick({
  coinId: true,
  marketHealth: true,
  techUtility: true,
  teamAdoption: true,
  tokenomics: true,
  risk: true,
  notes: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  coinId: true,
  type: true,
  quantity: true,
  price: true,
  fee: true,
  timestamp: true,
  note: true,
});

export const insertDcaPlanSchema = createInsertSchema(dcaPlans).pick({
  coinId: true,
  amountUsd: true,
  cadence: true,
  startDate: true,
  endDate: true,
  active: true,
});

export const insertAiEvaluationSchema = createInsertSchema(aiEvaluations).pick({
  userId: true,
  runType: true,
  status: true,
  evaluationData: true,
  picks: true,
  summary: true,
  metadata: true,
  error: true,
});

// Register and login schemas
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Session = typeof sessions.$inferSelect;
export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type InsertWatchlistItem = z.infer<typeof insertWatchlistItemSchema>;
export type Rating = typeof ratings.$inferSelect;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type DcaPlan = typeof dcaPlans.$inferSelect;
export type InsertDcaPlan = z.infer<typeof insertDcaPlanSchema>;
export type AiEvaluation = typeof aiEvaluations.$inferSelect;
export type InsertAiEvaluation = z.infer<typeof insertAiEvaluationSchema>;

// Market data types
export type CoinSummary = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price?: number;
  market_cap?: number;
  market_cap_rank?: number;
};

export type MarketRow = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  total_volume: number;
};

export type CoinDetail = {
  id: string;
  symbol: string;
  name: string;
  description?: string;
  image?: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  price_change_percentage_30d: number;
  total_supply?: number;
  max_supply?: number;
  circulating_supply?: number;
};

export type PriceHistory = {
  prices: [number, number][]; // [timestamp, price]
  market_caps: [number, number][];
  total_volumes: [number, number][];
};
