import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, desc, sql } from "drizzle-orm";
import { config } from "./config";
import * as schema from "@shared/schema";
import type { 
  User, InsertUser, Session, WatchlistItem, InsertWatchlistItem, 
  Rating, InsertRating, Transaction, InsertTransaction, 
  DcaPlan, InsertDcaPlan, AiEvaluation, InsertAiEvaluation
} from "@shared/schema";

const client = postgres(config.DATABASE_URL);
const db = drizzle(client, { schema });

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Sessions
  createSession(session: {
    userId: string;
    refreshTokenHash: string;
    userAgent?: string;
    ip?: string;
    expiresAt: number;
  }): Promise<Session>;
  getSessionByTokenHash(tokenHash: string): Promise<Session | undefined>;
  revokeSession(id: string): Promise<void>;
  revokeUserSessions(userId: string): Promise<void>;
  
  // Email codes
  createEmailCode(code: {
    userId?: string;
    email: string;
    purpose: string;
    codeHash: string;
    expiresAt: number;
  }): Promise<void>;
  getEmailCode(email: string, purpose: string): Promise<any>;
  markEmailCodeUsed(id: string): Promise<void>;
  
  // Watchlist
  getWatchlistItems(userId: string): Promise<WatchlistItem[]>;
  addToWatchlist(userId: string, item: InsertWatchlistItem): Promise<WatchlistItem>;
  removeFromWatchlist(userId: string, coinId: string): Promise<void>;
  updateWatchlistItem(userId: string, coinId: string, updates: Partial<InsertWatchlistItem>): Promise<WatchlistItem | undefined>;
  
  // Ratings
  getUserRatings(userId: string): Promise<Rating[]>;
  getCoinRating(userId: string, coinId: string): Promise<Rating | undefined>;
  createRating(userId: string, rating: InsertRating): Promise<Rating>;
  updateRating(userId: string, coinId: string, updates: Partial<InsertRating>): Promise<Rating | undefined>;
  
  // Transactions
  getUserTransactions(userId: string): Promise<Transaction[]>;
  getCoinTransactions(userId: string, coinId: string): Promise<Transaction[]>;
  createTransaction(userId: string, transaction: InsertTransaction): Promise<Transaction>;
  
  // DCA Plans
  getUserDcaPlans(userId: string): Promise<DcaPlan[]>;
  createDcaPlan(userId: string, plan: InsertDcaPlan): Promise<DcaPlan>;
  updateDcaPlan(userId: string, planId: string, updates: Partial<InsertDcaPlan>): Promise<DcaPlan | undefined>;
  
  // Cache
  getCacheItem(key: string): Promise<any>;
  setCacheItem(key: string, value: any, expiresAt: number): Promise<void>;
  getAiCache(key: string): Promise<string | undefined>;
  setAiCache(key: string, value: string, expiresAt: number): Promise<void>;
  
  // AI Evaluations
  getLatestAiEvaluation(userId?: string): Promise<AiEvaluation | undefined>;
  getAiEvaluations(userId?: string, limit?: number): Promise<AiEvaluation[]>;
  createAiEvaluation(evaluation: InsertAiEvaluation): Promise<AiEvaluation>;
  updateAiEvaluation(id: string, updates: Partial<InsertAiEvaluation>): Promise<AiEvaluation | undefined>;
}

export class PostgresStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return result[0];
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    return result[0];
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(schema.users).values(user).returning();
    return result[0];
  }
  
  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, id))
      .returning();
    return result[0];
  }
  
  // Sessions
  async createSession(sessionData: {
    userId: string;
    refreshTokenHash: string;
    userAgent?: string;
    ip?: string;
    expiresAt: number;
  }): Promise<Session> {
    const result = await db.insert(schema.sessions).values(sessionData).returning();
    return result[0];
  }
  
  async getSessionByTokenHash(tokenHash: string): Promise<Session | undefined> {
    const result = await db.select().from(schema.sessions)
      .where(and(
        eq(schema.sessions.refreshTokenHash, tokenHash),
        eq(schema.sessions.revoked, false)
      )).limit(1);
    return result[0];
  }
  
  async revokeSession(id: string): Promise<void> {
    await db.update(schema.sessions)
      .set({ revoked: true })
      .where(eq(schema.sessions.id, id));
  }
  
  async revokeUserSessions(userId: string): Promise<void> {
    await db.update(schema.sessions)
      .set({ revoked: true })
      .where(eq(schema.sessions.userId, userId));
  }
  
  // Email codes
  async createEmailCode(code: {
    userId?: string;
    email: string;
    purpose: string;
    codeHash: string;
    expiresAt: number;
  }): Promise<void> {
    await db.insert(schema.emailCodes).values(code);
  }
  
  async getEmailCode(email: string, purpose: string): Promise<any> {
    const result = await db.select().from(schema.emailCodes)
      .where(and(
        eq(schema.emailCodes.email, email),
        eq(schema.emailCodes.purpose, purpose),
        eq(schema.emailCodes.used, false)
      ))
      .orderBy(desc(schema.emailCodes.createdAt))
      .limit(1);
    return result[0];
  }
  
  async markEmailCodeUsed(id: string): Promise<void> {
    await db.update(schema.emailCodes)
      .set({ used: true })
      .where(eq(schema.emailCodes.id, id));
  }
  
  // Watchlist
  async getWatchlistItems(userId: string): Promise<WatchlistItem[]> {
    return db.select().from(schema.watchlistItems)
      .where(eq(schema.watchlistItems.userId, userId))
      .orderBy(desc(schema.watchlistItems.addedAt));
  }
  
  async addToWatchlist(userId: string, item: InsertWatchlistItem): Promise<WatchlistItem> {
    const result = await db.insert(schema.watchlistItems)
      .values({ ...item, userId })
      .returning();
    return result[0];
  }
  
  async removeFromWatchlist(userId: string, coinId: string): Promise<void> {
    await db.delete(schema.watchlistItems)
      .where(and(
        eq(schema.watchlistItems.userId, userId),
        eq(schema.watchlistItems.coinId, coinId)
      ));
  }
  
  async updateWatchlistItem(userId: string, coinId: string, updates: Partial<InsertWatchlistItem>): Promise<WatchlistItem | undefined> {
    const result = await db.update(schema.watchlistItems)
      .set(updates)
      .where(and(
        eq(schema.watchlistItems.userId, userId),
        eq(schema.watchlistItems.coinId, coinId)
      ))
      .returning();
    return result[0];
  }
  
  // Ratings
  async getUserRatings(userId: string): Promise<Rating[]> {
    return db.select().from(schema.ratings)
      .where(eq(schema.ratings.userId, userId))
      .orderBy(desc(schema.ratings.createdAt));
  }
  
  async getCoinRating(userId: string, coinId: string): Promise<Rating | undefined> {
    const result = await db.select().from(schema.ratings)
      .where(and(
        eq(schema.ratings.userId, userId),
        eq(schema.ratings.coinId, coinId)
      ))
      .orderBy(desc(schema.ratings.createdAt))
      .limit(1);
    return result[0];
  }
  
  async createRating(userId: string, rating: InsertRating): Promise<Rating> {
    // Calculate total score
    const totalScore = rating.marketHealth + rating.techUtility + rating.teamAdoption + rating.tokenomics + rating.risk;
    const result = await db.insert(schema.ratings)
      .values({ ...rating, userId, totalScore })
      .returning();
    return result[0];
  }
  
  async updateRating(userId: string, coinId: string, updates: Partial<InsertRating>): Promise<Rating | undefined> {
    // Recalculate total score if any component is updated
    const current = await this.getCoinRating(userId, coinId);
    if (!current) return undefined;
    
    const newRating = { ...current, ...updates };
    const totalScore = newRating.marketHealth + newRating.techUtility + newRating.teamAdoption + newRating.tokenomics + newRating.risk;
    
    const result = await db.update(schema.ratings)
      .set({ ...updates, totalScore })
      .where(and(
        eq(schema.ratings.userId, userId),
        eq(schema.ratings.coinId, coinId)
      ))
      .returning();
    return result[0];
  }
  
  // Transactions
  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return db.select().from(schema.transactions)
      .where(eq(schema.transactions.userId, userId))
      .orderBy(desc(schema.transactions.timestamp));
  }
  
  async getCoinTransactions(userId: string, coinId: string): Promise<Transaction[]> {
    return db.select().from(schema.transactions)
      .where(and(
        eq(schema.transactions.userId, userId),
        eq(schema.transactions.coinId, coinId)
      ))
      .orderBy(desc(schema.transactions.timestamp));
  }
  
  async createTransaction(userId: string, transaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(schema.transactions)
      .values({ ...transaction, userId })
      .returning();
    return result[0];
  }
  
  // DCA Plans
  async getUserDcaPlans(userId: string): Promise<DcaPlan[]> {
    return db.select().from(schema.dcaPlans)
      .where(eq(schema.dcaPlans.userId, userId))
      .orderBy(desc(schema.dcaPlans.createdAt));
  }
  
  async createDcaPlan(userId: string, plan: InsertDcaPlan): Promise<DcaPlan> {
    const result = await db.insert(schema.dcaPlans)
      .values({ ...plan, userId })
      .returning();
    return result[0];
  }
  
  async updateDcaPlan(userId: string, planId: string, updates: Partial<InsertDcaPlan>): Promise<DcaPlan | undefined> {
    const result = await db.update(schema.dcaPlans)
      .set(updates)
      .where(and(
        eq(schema.dcaPlans.userId, userId),
        eq(schema.dcaPlans.id, planId)
      ))
      .returning();
    return result[0];
  }
  
  // Cache
  async getCacheItem(key: string): Promise<any> {
    const now = Math.floor(Date.now() / 1000);
    const result = await db.select().from(schema.httpCache)
      .where(eq(schema.httpCache.key, key))
      .limit(1);
    
    if (result[0] && result[0].expiresAt > now) {
      return result[0].value;
    }
    return undefined;
  }
  
  async setCacheItem(key: string, value: any, expiresAt: number): Promise<void> {
    await db.insert(schema.httpCache)
      .values({ key, value, expiresAt })
      .onConflictDoUpdate({
        target: schema.httpCache.key,
        set: { value, expiresAt }
      });
  }
  
  async getAiCache(key: string): Promise<string | undefined> {
    const now = Math.floor(Date.now() / 1000);
    const result = await db.select().from(schema.aiCache)
      .where(eq(schema.aiCache.key, key))
      .limit(1);
    
    if (result[0] && result[0].expiresAt > now) {
      return result[0].value;
    }
    return undefined;
  }
  
  async setAiCache(key: string, value: string, expiresAt: number): Promise<void> {
    await db.insert(schema.aiCache)
      .values({ key, value, expiresAt })
      .onConflictDoUpdate({
        target: schema.aiCache.key,
        set: { value, expiresAt }
      });
  }
  
  // AI Evaluations
  async getLatestAiEvaluation(userId?: string): Promise<AiEvaluation | undefined> {
    const query = userId 
      ? db.select().from(schema.aiEvaluations).where(eq(schema.aiEvaluations.userId, userId))
      : db.select().from(schema.aiEvaluations).where(sql`${schema.aiEvaluations.userId} IS NULL`);
    
    const result = await query
      .orderBy(desc(schema.aiEvaluations.createdAt))
      .limit(1);
    return result[0];
  }
  
  async getAiEvaluations(userId?: string, limit: number = 10): Promise<AiEvaluation[]> {
    const query = userId 
      ? db.select().from(schema.aiEvaluations).where(eq(schema.aiEvaluations.userId, userId))
      : db.select().from(schema.aiEvaluations).where(sql`${schema.aiEvaluations.userId} IS NULL`);
    
    return query
      .orderBy(desc(schema.aiEvaluations.createdAt))
      .limit(limit);
  }
  
  async createAiEvaluation(evaluation: InsertAiEvaluation): Promise<AiEvaluation> {
    const result = await db.insert(schema.aiEvaluations)
      .values(evaluation)
      .returning();
    return result[0];
  }
  
  async updateAiEvaluation(id: string, updates: Partial<InsertAiEvaluation>): Promise<AiEvaluation | undefined> {
    const result = await db.update(schema.aiEvaluations)
      .set(updates)
      .where(eq(schema.aiEvaluations.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new PostgresStorage();
