import { storage } from "../storage";
import { aiService } from "./ai";
import { marketDataService } from "./market_data";
import { config } from "../config";
import type { InsertAiEvaluation } from "@shared/schema";

interface CoinFeatures {
  id: string;
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
  volumeToMarketCap: number;
  rank: number;
  score?: number;
  riskLevel?: string;
}

interface EvaluationPick {
  coinId: string;
  symbol: string;
  allocation: number;
  reasoning: string;
  riskScore: number;
  expectedReturn: string;
}

interface EvaluationResult {
  picks: EvaluationPick[];
  summary: string;
  metadata: {
    totalCoinsAnalyzed: number;
    topPerformers: string[];
    riskDistribution: Record<string, number>;
    marketCondition: string;
    timestamp: number;
  };
}

class AIEvaluator {
  private readonly MAX_CANDIDATES = 100;
  private readonly MIN_VOLUME_THRESHOLD = 1000000; // $1M daily volume
  private readonly MIN_MARKET_CAP = 10000000; // $10M market cap
  
  async runEvaluation(userId?: string, runType: "scheduled" | "manual" = "manual"): Promise<void> {
    const evaluationId = crypto.randomUUID();
    
    try {
      // Create initial evaluation record
      await storage.createAiEvaluation({
        userId: userId || null,
        runType,
        status: "processing",
        evaluationData: {},
        picks: [],
        summary: null,
        metadata: null,
        error: null,
      });
      
      // Fetch and prepare market data
      const marketData = await this.fetchMarketData();
      const features = this.prepareFeatures(marketData);
      
      // Get user context if userId provided
      const userContext = userId ? await this.getUserContext(userId) : null;
      
      // Run AI evaluation
      const result = await this.evaluateWithAI(features, userContext);
      
      // Update evaluation with results
      await storage.updateAiEvaluation(evaluationId, {
        status: "completed",
        evaluationData: result,
        picks: result.picks,
        summary: result.summary,
        metadata: result.metadata,
      });
      
    } catch (error: any) {
      console.error("AI Evaluation failed:", error);
      
      // Update evaluation with error
      await storage.updateAiEvaluation(evaluationId, {
        status: "failed",
        error: error.message || "Unknown error occurred",
      });
      
      throw error;
    }
  }
  
  private async fetchMarketData(): Promise<any[]> {
    try {
      // Fetch top coins by market cap
      const markets = await marketDataService.markets("usd", 1, this.MAX_CANDIDATES);
      return markets;
    } catch (error) {
      console.error("Failed to fetch market data:", error);
      throw new Error("Unable to fetch market data for evaluation");
    }
  }
  
  private prepareFeatures(marketData: any[]): CoinFeatures[] {
    return marketData
      .filter(coin => {
        // Filter out coins with insufficient liquidity or market cap
        return coin.total_volume >= this.MIN_VOLUME_THRESHOLD && 
               coin.market_cap >= this.MIN_MARKET_CAP;
      })
      .map(coin => {
        const volumeToMarketCap = coin.market_cap > 0 ? coin.total_volume / coin.market_cap : 0;
        
        // Calculate a simple risk-adjusted score
        const momentumScore = (coin.price_change_percentage_24h || 0) * 0.2 +
                            (coin.price_change_percentage_7d || 0) * 0.3 +
                            (coin.price_change_percentage_30d || 0) * 0.5;
        
        const liquidityScore = Math.min(volumeToMarketCap * 100, 10); // Cap at 10
        const score = momentumScore + liquidityScore;
        
        // Determine risk level based on volatility and market cap
        let riskLevel = "high";
        if (coin.market_cap > 1000000000) { // $1B+
          riskLevel = coin.price_change_percentage_24h > 10 ? "medium" : "low";
        } else if (coin.market_cap > 100000000) { // $100M+
          riskLevel = "medium";
        }
        
        return {
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          price: coin.current_price,
          marketCap: coin.market_cap,
          volume24h: coin.total_volume,
          priceChange24h: coin.price_change_percentage_24h || 0,
          priceChange7d: coin.price_change_percentage_7d || 0,
          priceChange30d: coin.price_change_percentage_30d || 0,
          volumeToMarketCap,
          rank: coin.market_cap_rank,
          score,
          riskLevel,
        };
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }
  
  private async getUserContext(userId: string): Promise<any> {
    // Fetch user's portfolio, ratings, and DCA plans for context
    const [transactions, ratings, dcaPlans] = await Promise.all([
      storage.getUserTransactions(userId),
      storage.getUserRatings(userId),
      storage.getUserDcaPlans(userId),
    ]);
    
    // Calculate portfolio composition
    const holdings = new Map<string, number>();
    transactions.forEach(tx => {
      const current = holdings.get(tx.coinId) || 0;
      if (tx.type === "BUY" || tx.type === "TRANSFER_IN") {
        holdings.set(tx.coinId, current + tx.quantity);
      } else {
        holdings.set(tx.coinId, current - tx.quantity);
      }
    });
    
    return {
      currentHoldings: Array.from(holdings.entries()).map(([coinId, quantity]) => ({
        coinId,
        quantity,
      })),
      userRatings: ratings.map(r => ({
        coinId: r.coinId,
        totalScore: r.totalScore,
      })),
      activeDcaPlans: dcaPlans.filter(p => p.active).map(p => ({
        coinId: p.coinId,
        amountUsd: p.amountUsd,
        cadence: p.cadence,
      })),
    };
  }
  
  private async evaluateWithAI(features: CoinFeatures[], userContext: any): Promise<EvaluationResult> {
    const systemPrompt = `You are a cryptocurrency portfolio advisor providing data-driven recommendations.
    Analyze the provided market data and generate a balanced portfolio allocation.
    
    STRICT RULES:
    1. Return ONLY valid JSON format
    2. Allocations must sum to 100%
    3. Maximum 10 picks
    4. Include only coins from the provided data
    5. Consider risk distribution (mix of low, medium, high risk)
    6. Base decisions on momentum, liquidity, and market position
    7. No speculation or external data - use only what's provided`;
    
    const userPrompt = `Analyze these ${features.length} cryptocurrencies and recommend a portfolio:
    
    TOP CANDIDATES (by score):
    ${features.slice(0, 20).map(f => 
      `${f.symbol.toUpperCase()}: Price $${f.price.toFixed(2)}, MCap $${(f.marketCap/1e9).toFixed(2)}B, ` +
      `24h: ${f.priceChange24h.toFixed(1)}%, 7d: ${f.priceChange7d.toFixed(1)}%, ` +
      `Vol/MCap: ${(f.volumeToMarketCap * 100).toFixed(1)}%, Risk: ${f.riskLevel}`
    ).join('\n')}
    
    ${userContext ? `USER CONTEXT:
    Current Holdings: ${userContext.currentHoldings.map((h: any) => h.coinId).join(', ')}
    Active DCA Plans: ${userContext.activeDcaPlans.map((p: any) => p.coinId).join(', ')}` : ''}
    
    Return a JSON object with this EXACT structure:
    {
      "picks": [
        {
          "coinId": "bitcoin",
          "symbol": "btc",
          "allocation": 30,
          "reasoning": "Market leader with strong momentum",
          "riskScore": 3,
          "expectedReturn": "moderate"
        }
      ],
      "summary": "Brief market analysis and strategy explanation",
      "marketCondition": "bullish|neutral|bearish"
    }`;
    
    try {
      const response = await aiService.chat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);
      
      // Parse AI response
      const parsed = JSON.parse(response);
      
      // Validate and normalize the response
      const picks: EvaluationPick[] = (parsed.picks || []).slice(0, 10).map((pick: any) => ({
        coinId: pick.coinId,
        symbol: pick.symbol,
        allocation: Math.min(Math.max(pick.allocation, 0), 100),
        reasoning: pick.reasoning || "No specific reasoning provided",
        riskScore: pick.riskScore || 5,
        expectedReturn: pick.expectedReturn || "unknown",
      }));
      
      // Normalize allocations to sum to 100%
      const totalAllocation = picks.reduce((sum, p) => sum + p.allocation, 0);
      if (totalAllocation > 0 && totalAllocation !== 100) {
        picks.forEach(p => {
          p.allocation = Math.round((p.allocation / totalAllocation) * 100);
        });
      }
      
      // Calculate risk distribution
      const riskDistribution = features.reduce((acc, f) => {
        acc[f.riskLevel || "unknown"] = (acc[f.riskLevel || "unknown"] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        picks,
        summary: parsed.summary || "AI evaluation completed successfully",
        metadata: {
          totalCoinsAnalyzed: features.length,
          topPerformers: features.slice(0, 5).map(f => f.symbol),
          riskDistribution,
          marketCondition: parsed.marketCondition || "neutral",
          timestamp: Date.now(),
        },
      };
      
    } catch (error: any) {
      console.error("AI evaluation error:", error);
      
      // Fallback to rule-based selection if AI fails
      return this.fallbackEvaluation(features);
    }
  }
  
  private fallbackEvaluation(features: CoinFeatures[]): EvaluationResult {
    // Simple rule-based fallback
    const picks: EvaluationPick[] = [];
    const allocations = [30, 25, 15, 10, 8, 5, 4, 3]; // Predefined allocation percentages
    
    // Select top coins by score with risk diversification
    const lowRisk = features.filter(f => f.riskLevel === "low").slice(0, 2);
    const mediumRisk = features.filter(f => f.riskLevel === "medium").slice(0, 3);
    const highRisk = features.filter(f => f.riskLevel === "high").slice(0, 3);
    
    const selected = [...lowRisk, ...mediumRisk, ...highRisk].slice(0, 8);
    
    selected.forEach((coin, index) => {
      picks.push({
        coinId: coin.id,
        symbol: coin.symbol,
        allocation: allocations[index] || 1,
        reasoning: `Selected based on ${coin.riskLevel} risk profile and score of ${coin.score?.toFixed(2)}`,
        riskScore: coin.riskLevel === "low" ? 2 : coin.riskLevel === "medium" ? 5 : 8,
        expectedReturn: coin.score && coin.score > 5 ? "high" : "moderate",
      });
    });
    
    return {
      picks,
      summary: "Fallback evaluation using rule-based selection due to AI unavailability",
      metadata: {
        totalCoinsAnalyzed: features.length,
        topPerformers: features.slice(0, 5).map(f => f.symbol),
        riskDistribution: {
          low: lowRisk.length,
          medium: mediumRisk.length,
          high: highRisk.length,
        },
        marketCondition: "neutral",
        timestamp: Date.now(),
      },
    };
  }
}

export const aiEvaluator = new AIEvaluator();