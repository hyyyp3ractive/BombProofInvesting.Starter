import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { marketDataService } from "./services/market_data";
import { aiService } from "./services/ai";
import { riskScoringService } from "./services/risk_scoring";
import { starterPortfolioService } from "./services/starter-portfolio";
import { 
  hashPassword, verifyPassword, generateTokens, verifyAccessToken, 
  verifyRefreshToken, hashToken, extractBearerToken 
} from "./auth";
import { config } from "./config";
import { registerSchema, loginSchema, insertWatchlistItemSchema, insertRatingSchema, insertTransactionSchema, insertDcaPlanSchema } from "@shared/schema";
import type { User } from "@shared/schema";

// Middleware to get current user from JWT
async function getCurrentUser(req: Request): Promise<User | null> {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) return null;
  
  const payload = verifyAccessToken(token);
  if (!payload) return null;
  
  return await storage.getUser(payload.sub) || null;
}

// Middleware to require authentication
function requireAuth(handler: (req: Request, res: Response, user: User) => Promise<void>) {
  return async (req: Request, res: Response) => {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    }
    
    try {
      await handler(req, res, user);
    } catch (error) {
      console.error("Route handler error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create dev user for development bypass (only in dev mode)
  if (config.APP_ENV === "development") {
    try {
      const devEmail = "dev@example.com";
      const existingDevUser = await storage.getUserByEmail(devEmail);
      
      if (!existingDevUser) {
        const passwordHash = hashPassword("dev123456");
        await storage.createUser({ 
          email: devEmail, 
          passwordHash,
          role: "user",
        });
        console.log("🚀 Dev user created: dev@example.com / dev123456");
      }
    } catch (error) {
      console.error("Failed to create dev user:", error);
    }
  }

  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password } = registerSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: { code: "USER_EXISTS", message: "User with this email already exists" } });
      }
      
      // Create user
      const passwordHash = hashPassword(password);
      const user = await storage.createUser({ email, passwordHash });
      
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);
      
      // Store refresh token session
      const tokenHash = hashToken(refreshToken);
      const expiresAt = Math.floor(Date.now() / 1000) + (config.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60);
      await storage.createSession({
        userId: user.id,
        refreshTokenHash: tokenHash,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
        expiresAt,
      });
      
      // Set HTTP-only cookie for refresh token
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: config.APP_ENV === "production",
        sameSite: "lax",
        maxAge: config.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
      });
      
      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          settingsJson: user.settingsJson,
        },
        accessToken,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: error.message } });
    }
  });
  
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      // Get user
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
      }
      
      // Verify password
      if (!verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
      }
      
      // Update last login
      await storage.updateUser(user.id, { lastLoginAt: Math.floor(Date.now() / 1000) });
      
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);
      
      // Store refresh token session
      const tokenHash = hashToken(refreshToken);
      const expiresAt = Math.floor(Date.now() / 1000) + (config.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60);
      await storage.createSession({
        userId: user.id,
        refreshTokenHash: tokenHash,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
        expiresAt,
      });
      
      // Set HTTP-only cookie for refresh token
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: config.APP_ENV === "production",
        sameSite: "lax",
        maxAge: config.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
      });
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          settingsJson: user.settingsJson,
        },
        accessToken,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: error.message } });
    }
  });
  
  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ error: { code: "NO_REFRESH_TOKEN", message: "Refresh token not provided" } });
      }
      
      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);
      if (!payload) {
        return res.status(401).json({ error: { code: "INVALID_REFRESH_TOKEN", message: "Invalid refresh token" } });
      }
      
      // Check session
      const tokenHash = hashToken(refreshToken);
      const session = await storage.getSessionByTokenHash(tokenHash);
      if (!session || session.revoked || session.expiresAt < Math.floor(Date.now() / 1000)) {
        return res.status(401).json({ error: { code: "SESSION_EXPIRED", message: "Session expired" } });
      }
      
      // Get user
      const user = await storage.getUser(payload.sub);
      if (!user) {
        return res.status(401).json({ error: { code: "USER_NOT_FOUND", message: "User not found" } });
      }
      
      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
      
      // Revoke old session and create new one
      await storage.revokeSession(session.id);
      const newTokenHash = hashToken(newRefreshToken);
      const expiresAt = Math.floor(Date.now() / 1000) + (config.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60);
      await storage.createSession({
        userId: user.id,
        refreshTokenHash: newTokenHash,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
        expiresAt,
      });
      
      // Set new HTTP-only cookie
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: config.APP_ENV === "production",
        sameSite: "lax",
        maxAge: config.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
      });
      
      res.json({ accessToken });
    } catch (error) {
      console.error("Refresh error:", error);
      res.status(401).json({ error: { code: "REFRESH_ERROR", message: "Failed to refresh token" } });
    }
  });
  
  app.post("/api/auth/logout", requireAuth(async (req: Request, res: Response, user: User) => {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      const session = await storage.getSessionByTokenHash(tokenHash);
      if (session) {
        await storage.revokeSession(session.id);
      }
    }
    
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
  }));
  
  // User profile
  app.get("/api/me", requireAuth(async (req: Request, res: Response, user: User) => {
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      settingsJson: user.settingsJson,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    });
  }));
  
  app.patch("/api/me", requireAuth(async (req: Request, res: Response, user: User) => {
    const { settingsJson } = req.body;
    
    const updatedUser = await storage.updateUser(user.id, { settingsJson });
    if (!updatedUser) {
      res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found" } });
      return;
    }
    
    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      emailVerified: updatedUser.emailVerified,
      settingsJson: updatedUser.settingsJson,
    });
  }));
  
  // Market data routes with caching
  app.get("/api/coins/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;
      
      if (!query || query.length < 2) {
        return res.status(400).json({ error: { code: "INVALID_QUERY", message: "Query must be at least 2 characters" } });
      }
      
      const cacheKey = `search:${query}:${limit}`;
      let results = await storage.getCacheItem(cacheKey);
      
      if (!results) {
        results = await marketDataService.search(query, limit);
        const expiresAt = Math.floor(Date.now() / 1000) + config.CACHE_TTL_MARKETS_SEC;
        await storage.setCacheItem(cacheKey, results, expiresAt);
      }
      
      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: { code: "SEARCH_ERROR", message: "Failed to search coins" } });
    }
  });
  
  app.get("/api/coins/markets", async (req: Request, res: Response) => {
    try {
      const vsCurrency = req.query.vs_currency as string || "usd";
      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.per_page as string) || 100;
      
      const cacheKey = `markets:${vsCurrency}:${page}:${perPage}`;
      let results = await storage.getCacheItem(cacheKey);
      
      if (!results) {
        results = await marketDataService.markets(vsCurrency, page, perPage);
        const expiresAt = Math.floor(Date.now() / 1000) + config.CACHE_TTL_MARKETS_SEC;
        await storage.setCacheItem(cacheKey, results, expiresAt);
      }
      
      res.json(results);
    } catch (error) {
      console.error("Markets error:", error);
      res.status(500).json({ error: { code: "MARKETS_ERROR", message: "Failed to fetch market data" } });
    }
  });
  
  app.get("/api/coins/:coinId", async (req: Request, res: Response) => {
    try {
      const { coinId } = req.params;
      
      const cacheKey = `coin:${coinId}`;
      let result = await storage.getCacheItem(cacheKey);
      
      if (!result) {
        result = await marketDataService.coin(coinId);
        const expiresAt = Math.floor(Date.now() / 1000) + config.CACHE_TTL_COIN_SEC;
        await storage.setCacheItem(cacheKey, result, expiresAt);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Coin detail error:", error);
      res.status(500).json({ error: { code: "COIN_ERROR", message: "Failed to fetch coin data" } });
    }
  });
  
  app.get("/api/coins/:coinId/history", async (req: Request, res: Response) => {
    try {
      const { coinId } = req.params;
      const vsCurrency = req.query.vs_currency as string || "usd";
      const days = req.query.days as string || "30";
      
      const cacheKey = `history:${coinId}:${vsCurrency}:${days}`;
      let result = await storage.getCacheItem(cacheKey);
      
      if (!result) {
        result = await marketDataService.history(coinId, vsCurrency, days);
        const expiresAt = Math.floor(Date.now() / 1000) + config.CACHE_TTL_HISTORY_SEC;
        await storage.setCacheItem(cacheKey, result, expiresAt);
      }
      
      res.json(result);
    } catch (error) {
      console.error("History error:", error);
      res.status(500).json({ error: { code: "HISTORY_ERROR", message: "Failed to fetch price history" } });
    }
  });
  
  // AI Evaluation routes
  app.post("/api/ai/evaluate", requireAuth(async (req: Request, res: Response, user: User) => {
    try {
      const { aiEvaluator } = await import("./services/ai-evaluator");
      
      // Check if there's a recent evaluation (within last hour)
      const latestEval = await storage.getLatestAiEvaluation(user.id);
      if (latestEval) {
        const hourAgo = Date.now() / 1000 - 3600;
        if (latestEval.createdAt > hourAgo && latestEval.status === "completed") {
          return res.status(429).json({ 
            error: { 
              code: "RATE_LIMITED", 
              message: "Please wait at least 1 hour between evaluations" 
            } 
          });
        }
      }
      
      // Run evaluation asynchronously
      aiEvaluator.runEvaluation(user.id, "manual").catch(error => {
        console.error("Background evaluation failed:", error);
      });
      
      res.json({ 
        message: "Evaluation started", 
        status: "processing" 
      });
    } catch (error: any) {
      console.error("AI evaluation error:", error);
      res.status(500).json({ 
        error: { 
          code: "EVALUATION_ERROR", 
          message: "Failed to start evaluation" 
        } 
      });
    }
  }));
  
  app.get("/api/ai/evaluations", requireAuth(async (req: Request, res: Response, user: User) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const evaluations = await storage.getAiEvaluations(user.id, limit);
      res.json(evaluations);
    } catch (error: any) {
      console.error("Failed to fetch evaluations:", error);
      res.status(500).json({ 
        error: { 
          code: "FETCH_ERROR", 
          message: "Failed to fetch evaluations" 
        } 
      });
    }
  }));
  
  app.get("/api/ai/evaluations/latest", requireAuth(async (req: Request, res: Response, user: User) => {
    try {
      const evaluation = await storage.getLatestAiEvaluation(user.id);
      if (!evaluation) {
        return res.status(404).json({ 
          error: { 
            code: "NOT_FOUND", 
            message: "No evaluations found" 
          } 
        });
      }
      res.json(evaluation);
    } catch (error: any) {
      console.error("Failed to fetch latest evaluation:", error);
      res.status(500).json({ 
        error: { 
          code: "FETCH_ERROR", 
          message: "Failed to fetch latest evaluation" 
        } 
      });
    }
  }));
  
  // AI routes
  app.get("/api/ai/explain", async (req: Request, res: Response) => {
    try {
      const coinId = req.query.coin as string;
      if (!coinId) {
        return res.status(400).json({ error: { code: "MISSING_COIN", message: "Coin parameter is required" } });
      }
      
      const cacheKey = `ai:explain:${coinId}`;
      let explanation = await storage.getAiCache(cacheKey);
      
      if (!explanation) {
        // Try to get coin data for context
        let coinData;
        try {
          coinData = await marketDataService.coin(coinId);
        } catch (error) {
          console.warn("Failed to fetch coin data for AI context:", error);
        }
        
        explanation = await aiService.explainCoin(coinId, coinData);
        const expiresAt = Math.floor(Date.now() / 1000) + config.CACHE_TTL_AI_SEC;
        await storage.setAiCache(cacheKey, explanation, expiresAt);
      }
      
      res.json({ coin: coinId, summary: explanation });
    } catch (error: any) {
      console.error("AI explain error:", error);
      if (error.message.includes("AI features are disabled")) {
        return res.status(503).json({ error: { code: "AI_DISABLED", message: "AI features are not configured" } });
      }
      res.status(500).json({ error: { code: "AI_ERROR", message: "Failed to generate explanation" } });
    }
  });
  
  app.get("/api/ai/compare", async (req: Request, res: Response) => {
    try {
      const coinsParam = req.query.coins as string;
      if (!coinsParam) {
        return res.status(400).json({ error: { code: "MISSING_COINS", message: "Coins parameter is required" } });
      }
      
      const coinIds = coinsParam.split(",").map(c => c.trim()).filter(Boolean);
      if (coinIds.length < 2) {
        return res.status(400).json({ error: { code: "INSUFFICIENT_COINS", message: "At least 2 coins are required for comparison" } });
      }
      
      const cacheKey = `ai:compare:${coinIds.sort().join(",")}`;
      let comparison = await storage.getAiCache(cacheKey);
      
      if (!comparison) {
        // Try to get coin data for context
        const coinDataList = [];
        for (const coinId of coinIds) {
          try {
            const coinData = await marketDataService.coin(coinId);
            coinDataList.push(coinData);
          } catch (error) {
            console.warn(`Failed to fetch data for ${coinId}:`, error);
          }
        }
        
        comparison = await aiService.compareCoins(coinIds, coinDataList);
        const expiresAt = Math.floor(Date.now() / 1000) + config.CACHE_TTL_AI_SEC;
        await storage.setAiCache(cacheKey, comparison, expiresAt);
      }
      
      res.json({ coins: coinIds, comparison });
    } catch (error: any) {
      console.error("AI compare error:", error);
      if (error.message.includes("AI features are disabled")) {
        return res.status(503).json({ error: { code: "AI_DISABLED", message: "AI features are not configured" } });
      }
      res.status(500).json({ error: { code: "AI_ERROR", message: "Failed to generate comparison" } });
    }
  });
  
  // Watchlist routes
  app.get("/api/watchlist", requireAuth(async (req: Request, res: Response, user: User) => {
    const items = await storage.getWatchlistItems(user.id);
    res.json(items);
  }));
  
  app.post("/api/watchlist", requireAuth(async (req: Request, res: Response, user: User) => {
    try {
      const itemData = insertWatchlistItemSchema.parse(req.body);
      const item = await storage.addToWatchlist(user.id, itemData);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: error.message } });
    }
  }));
  
  app.delete("/api/watchlist/:coinId", requireAuth(async (req: Request, res: Response, user: User) => {
    const { coinId } = req.params;
    await storage.removeFromWatchlist(user.id, coinId);
    res.json({ message: "Removed from watchlist" });
  }));
  
  // Ratings routes
  app.get("/api/ratings", requireAuth(async (req: Request, res: Response, user: User) => {
    const ratings = await storage.getUserRatings(user.id);
    res.json(ratings);
  }));
  
  app.get("/api/ratings/:coinId", requireAuth(async (req: Request, res: Response, user: User) => {
    const { coinId } = req.params;
    const rating = await storage.getCoinRating(user.id, coinId);
    if (!rating) {
      res.status(404).json({ error: { code: "RATING_NOT_FOUND", message: "Rating not found" } });
      return;
    }
    res.json(rating);
  }));
  
  app.post("/api/ratings", requireAuth(async (req: Request, res: Response, user: User) => {
    try {
      const ratingData = insertRatingSchema.parse(req.body);
      const rating = await storage.createRating(user.id, ratingData);
      res.status(201).json(rating);
    } catch (error: any) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: error.message } });
    }
  }));
  
  app.patch("/api/ratings/:coinId", requireAuth(async (req: Request, res: Response, user: User) => {
    try {
      const { coinId } = req.params;
      const updates = insertRatingSchema.partial().parse(req.body);
      const rating = await storage.updateRating(user.id, coinId, updates);
      if (!rating) {
        res.status(404).json({ error: { code: "RATING_NOT_FOUND", message: "Rating not found" } });
        return;
      }
      res.json(rating);
    } catch (error: any) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: error.message } });
    }
  }));
  
  // Transactions routes
  app.get("/api/transactions", requireAuth(async (req: Request, res: Response, user: User) => {
    const coinId = req.query.coinId as string;
    const transactions = coinId 
      ? await storage.getCoinTransactions(user.id, coinId)
      : await storage.getUserTransactions(user.id);
    res.json(transactions);
  }));
  
  app.post("/api/transactions", requireAuth(async (req: Request, res: Response, user: User) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(user.id, transactionData);
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: error.message } });
    }
  }));
  
  // DCA Plans routes
  app.get("/api/dca-plans", requireAuth(async (req: Request, res: Response, user: User) => {
    const plans = await storage.getUserDcaPlans(user.id);
    res.json(plans);
  }));
  
  app.post("/api/dca-plans", requireAuth(async (req: Request, res: Response, user: User) => {
    try {
      const planData = insertDcaPlanSchema.parse(req.body);
      const plan = await storage.createDcaPlan(user.id, planData);
      res.status(201).json(plan);
    } catch (error: any) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: error.message } });
    }
  }));
  
  app.patch("/api/dca-plans/:planId", requireAuth(async (req: Request, res: Response, user: User) => {
    try {
      const { planId } = req.params;
      const updates = insertDcaPlanSchema.partial().parse(req.body);
      const plan = await storage.updateDcaPlan(user.id, planId, updates);
      if (!plan) {
        res.status(404).json({ error: { code: "PLAN_NOT_FOUND", message: "DCA plan not found" } });
        return;
      }
      res.json(plan);
    } catch (error: any) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: error.message } });
    }
  }));

  // Risk scoring routes
  app.get("/api/risk-score/:coinId", async (req: Request, res: Response) => {
    try {
      const { coinId } = req.params;
      const score = await riskScoringService.calculateScore(coinId);
      res.json(score);
    } catch (error: any) {
      console.error("Risk scoring error:", error);
      res.status(500).json({ error: { code: "SCORING_ERROR", message: "Failed to calculate risk score" } });
    }
  });

  // Starter Portfolio routes
  app.post("/api/ai/starter-portfolio", requireAuth(async (req: Request, res: Response, user: User) => {
    try {
      const { intake } = req.body;
      
      if (!intake) {
        return res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Intake data is required" } });
      }
      
      const portfolio = await starterPortfolioService.generateStarterPortfolio(user.id, intake);
      res.json(portfolio);
    } catch (error: any) {
      console.error("Starter portfolio generation error:", error);
      res.status(500).json({ error: { code: "PORTFOLIO_ERROR", message: error.message || "Failed to generate portfolio" } });
    }
  }));
  
  app.post("/api/ai/starter-portfolio/save", requireAuth(async (req: Request, res: Response, user: User) => {
    try {
      const { name, intake, portfolio } = req.body;
      
      if (!name || !intake || !portfolio) {
        return res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Name, intake, and portfolio data are required" } });
      }
      
      await starterPortfolioService.saveStarterPortfolio(user.id, name, intake, portfolio);
      res.json({ message: "Portfolio saved successfully" });
    } catch (error: any) {
      console.error("Portfolio save error:", error);
      res.status(500).json({ error: { code: "SAVE_ERROR", message: "Failed to save portfolio" } });
    }
  }));
  
  app.get("/api/starter-portfolios", requireAuth(async (req: Request, res: Response, user: User) => {
    try {
      const portfolios = await storage.getUserStarterPortfolios(user.id);
      res.json(portfolios);
    } catch (error: any) {
      console.error("Get portfolios error:", error);
      res.status(500).json({ error: { code: "FETCH_ERROR", message: "Failed to fetch portfolios" } });
    }
  }));
  
  app.get("/api/starter-portfolios/:id", requireAuth(async (req: Request, res: Response, user: User) => {
    try {
      const { id } = req.params;
      const result = await storage.getStarterPortfolioWithItems(user.id, id);
      
      if (!result) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Portfolio not found" } });
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("Get portfolio error:", error);
      res.status(500).json({ error: { code: "FETCH_ERROR", message: "Failed to fetch portfolio" } });
    }
  }));
  
  app.delete("/api/starter-portfolios/:id", requireAuth(async (req: Request, res: Response, user: User) => {
    try {
      const { id } = req.params;
      await storage.deleteStarterPortfolio(user.id, id);
      res.json({ message: "Portfolio deleted successfully" });
    } catch (error: any) {
      console.error("Delete portfolio error:", error);
      res.status(500).json({ error: { code: "DELETE_ERROR", message: "Failed to delete portfolio" } });
    }
  }));

  // Provider health monitoring
  app.get("/api/health/providers", async (req: Request, res: Response) => {
    try {
      const providerStatus = marketDataService.getProviderStatus();
      res.json({ providers: providerStatus });
    } catch (error: any) {
      console.error("Provider health check error:", error);
      res.status(500).json({ error: { code: "HEALTH_CHECK_ERROR", message: "Failed to check provider health" } });
    }
  });

  // Cache management
  app.delete("/api/cache/market-data", async (req: Request, res: Response) => {
    try {
      marketDataService.clearCache();
      res.json({ message: "Market data cache cleared" });
    } catch (error: any) {
      console.error("Cache clear error:", error);
      res.status(500).json({ error: { code: "CACHE_ERROR", message: "Failed to clear cache" } });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
