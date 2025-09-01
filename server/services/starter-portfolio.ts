import { storage } from "../storage.js";
import { aiService } from "./ai.js";
import { RankingEngine } from "./ranking-engine.js";
import { marketDataService } from "./market_data.js";
import type { InsertStarterPortfolio, InsertStarterPortfolioItem } from "@shared/schema.js";

// Risk profile definitions
export interface RiskProfile {
  name: "Conservative" | "Balanced" | "Aggressive";
  coreTargetPct: number;
  btcTargetPct: number;
  ethTargetPct: number;
  stableBufferPct: number;
  satelliteTargetPct: number;
  bucketCaps: {
    High: number;
    Medium: number;
    Low: number;
  };
  perAssetCapPct: number;
  perCategoryCapPct: number;
  holdingsTargetRange: [number, number];
  liquidityRankLimit: number;
}

export interface IntakeData {
  experience: "Beginner" | "Intermediate" | "Advanced";
  riskTolerance: "Conservative" | "Balanced" | "Aggressive";
  horizon: "Short" | "Medium" | "Long";
  maxDrawdownComfort: 15 | 30 | 50;
  monthlyContributionUsd: number;
  initialLumpSumUsd?: number;
  preferredCategories: string[];
  exclusions: {
    coins: string[];
    categories: string[];
  };
  liquidity: {
    minMarketCapUsd: number;
    minVolToMcap: number;
  };
  holdingsRange: [number, number];
  rebalance: "Quarterly" | "Semiannual" | "Annual";
  stablecoinBufferPct: number;
  practiceMode?: boolean;
}

export interface AllocationItem {
  coinId: string;
  symbol: string;
  name: string;
  role: "core" | "satellite" | "stable";
  bucket: "Low" | "Medium" | "High";
  allocationPct: number;
  reasons: string[];
  risks: string[];
  dca: {
    amountUsd: number;
    cadence: string;
  };
}

export interface PolicyData {
  riskTolerance: string;
  coreTargetPct: number;
  btcTargetPct: number;
  ethTargetPct: number;
  stableBufferPct: number;
  satelliteTargetPct: number;
  bucketCaps: Record<string, number>;
  perAssetCapPct: number;
  perCategoryCapPct: number;
  holdingsTargetRange: [number, number];
  rebalance: string;
}

export interface StarterPortfolioResponse {
  policy: PolicyData;
  allocation: AllocationItem[];
  guardrails: {
    maxDrawdownAlertPct: number;
    rebalanceThresholdPct: number;
    minLiquidityVolToMcap: number;
    excludeFlags: string[];
  };
  notes: string;
  checklist: string[];
}

export class StarterPortfolioService {
  private rankingEngine: RankingEngine;
  
  // Risk profile configurations
  private riskProfiles: Record<string, RiskProfile> = {
    Conservative: {
      name: "Conservative",
      coreTargetPct: 0.75,
      btcTargetPct: 0.50,
      ethTargetPct: 0.25,
      stableBufferPct: 0.15,
      satelliteTargetPct: 0.10,
      bucketCaps: { High: 0.00, Medium: 0.60, Low: 1.0 },
      perAssetCapPct: 0.25,
      perCategoryCapPct: 0.35,
      holdingsTargetRange: [6, 10],
      liquidityRankLimit: 100,
    },
    Balanced: {
      name: "Balanced",
      coreTargetPct: 0.55,
      btcTargetPct: 0.35,
      ethTargetPct: 0.20,
      stableBufferPct: 0.05,
      satelliteTargetPct: 0.40,
      bucketCaps: { High: 0.15, Medium: 0.60, Low: 1.0 },
      perAssetCapPct: 0.15,
      perCategoryCapPct: 0.40,
      holdingsTargetRange: [8, 12],
      liquidityRankLimit: 200,
    },
    Aggressive: {
      name: "Aggressive",
      coreTargetPct: 0.40,
      btcTargetPct: 0.24,
      ethTargetPct: 0.16,
      stableBufferPct: 0.05,
      satelliteTargetPct: 0.55,
      bucketCaps: { High: 0.30, Medium: 0.60, Low: 1.0 },
      perAssetCapPct: 0.12,
      perCategoryCapPct: 0.45,
      holdingsTargetRange: [10, 16],
      liquidityRankLimit: 300,
    },
  };
  
  constructor() {
    this.rankingEngine = new RankingEngine();
  }
  
  async generateStarterPortfolio(userId: string, intake: IntakeData): Promise<StarterPortfolioResponse> {
    try {
      // 1. Get risk profile and merge with intake preferences
      const policy = this.buildPolicy(intake);
      
      // 2. Get ranked candidates using sophisticated ranking
      const rankedCoins = await this.rankingEngine.rankCoins(150);
      
      // 3. Filter candidates based on intake criteria
      const candidates = this.filterCandidates(rankedCoins, intake, policy);
      
      // 4. Build deterministic core allocation
      const coreAllocations = this.buildCoreAllocations(policy, intake);
      
      // 5. Use AI to select satellites from filtered candidates
      const satellites = await this.selectSatellitesWithAI(candidates, policy, intake);
      
      // 6. Combine and validate allocations
      const allocation = this.combineAndValidateAllocations(
        coreAllocations, 
        satellites, 
        policy, 
        intake
      );
      
      // 7. Generate DCA plans
      this.addDcaPlans(allocation, intake);
      
      // 8. Create guardrails and checklist
      const guardrails = this.createGuardrails(intake);
      const checklist = this.createChecklist(allocation);
      
      return {
        policy,
        allocation,
        guardrails,
        notes: "This is an educational starter allocation derived from app data. Not financial advice.",
        checklist,
      };
      
    } catch (error) {
      console.error("Starter portfolio generation error:", error);
      throw new Error("Failed to generate starter portfolio");
    }
  }
  
  async saveStarterPortfolio(
    userId: string, 
    name: string,
    intake: IntakeData, 
    response: StarterPortfolioResponse
  ): Promise<void> {
    // Create portfolio record
    const portfolio = await storage.createStarterPortfolio(userId, {
      name,
      intakeData: intake,
      policyData: response.policy,
      notes: response.notes,
      status: "active",
    });
    
    // Create portfolio items
    const items: InsertStarterPortfolioItem[] = response.allocation.map(item => ({
      portfolioId: portfolio.id,
      coinId: item.coinId,
      symbol: item.symbol,
      name: item.name,
      role: item.role,
      bucket: item.bucket,
      allocationPct: item.allocationPct,
      reasons: item.reasons,
      risks: item.risks,
      dcaAmountUsd: item.dca.amountUsd,
      dcaCadence: item.dca.cadence,
    }));
    
    await storage.createStarterPortfolioItems(items);
  }
  
  private buildPolicy(intake: IntakeData): PolicyData {
    const baseProfile = this.riskProfiles[intake.riskTolerance];
    
    // Apply user preferences and overrides
    const stableBufferPct = Math.max(intake.stablecoinBufferPct / 100, baseProfile.stableBufferPct);
    const coreTargetPct = Math.max(0.3, baseProfile.coreTargetPct - stableBufferPct);
    const satelliteTargetPct = 1.0 - coreTargetPct - stableBufferPct;
    
    return {
      riskTolerance: intake.riskTolerance,
      coreTargetPct,
      btcTargetPct: baseProfile.btcTargetPct * (coreTargetPct / baseProfile.coreTargetPct),
      ethTargetPct: baseProfile.ethTargetPct * (coreTargetPct / baseProfile.coreTargetPct),
      stableBufferPct,
      satelliteTargetPct,
      bucketCaps: baseProfile.bucketCaps,
      perAssetCapPct: baseProfile.perAssetCapPct,
      perCategoryCapPct: baseProfile.perCategoryCapPct,
      holdingsTargetRange: intake.holdingsRange,
      rebalance: intake.rebalance,
    };
  }
  
  private filterCandidates(rankedCoins: any[], intake: IntakeData, policy: PolicyData): any[] {
    const riskProfile = this.riskProfiles[intake.riskTolerance];
    
    return rankedCoins.filter(coin => {
      // Liquidity filters
      if (coin.market.marketCap < intake.liquidity.minMarketCapUsd) return false;
      if ((coin.market.volume24h / coin.market.marketCap) < intake.liquidity.minVolToMcap) return false;
      
      // Ranking limit
      const rank = rankedCoins.indexOf(coin) + 1;
      if (rank > riskProfile.liquidityRankLimit) return false;
      
      // Exclusions
      if (intake.exclusions.coins.includes(coin.coinId)) return false;
      
      // Bucket restrictions
      const riskLevel = coin.risk.volatility30d < 30 ? "Low" : 
                       coin.risk.volatility30d < 70 ? "Medium" : "High";
      if (policy.bucketCaps[riskLevel] === 0) return false;
      
      // Skip core coins (BTC, ETH) and known stablecoins
      const coreCoins = ["bitcoin", "ethereum"];
      const stablecoins = ["usd-coin", "tether", "dai", "true-usd", "binance-usd"];
      if (coreCoins.includes(coin.coinId) || stablecoins.includes(coin.coinId)) return false;
      
      return true;
    });
  }
  
  private buildCoreAllocations(policy: PolicyData, intake: IntakeData): AllocationItem[] {
    const allocations: AllocationItem[] = [];
    
    // Bitcoin (always included)
    allocations.push({
      coinId: "bitcoin",
      symbol: "BTC",
      name: "Bitcoin",
      role: "core",
      bucket: "Low",
      allocationPct: policy.btcTargetPct,
      reasons: ["Digital gold standard", "Highest liquidity", "Store of value"],
      risks: ["Macro sensitivity", "Regulatory uncertainty"],
      dca: { amountUsd: 0, cadence: "Monthly" },
    });
    
    // Ethereum (always included)
    allocations.push({
      coinId: "ethereum",
      symbol: "ETH",
      name: "Ethereum",
      role: "core",
      bucket: "Medium",
      allocationPct: policy.ethTargetPct,
      reasons: ["Smart contract platform", "DeFi ecosystem", "ETH 2.0 staking"],
      risks: ["L2 competition", "Gas fee volatility", "Execution risk"],
      dca: { amountUsd: 0, cadence: "Monthly" },
    });
    
    // Stablecoin buffer if needed
    if (policy.stableBufferPct > 0) {
      allocations.push({
        coinId: "usd-coin",
        symbol: "USDC",
        name: "USD Coin",
        role: "stable",
        bucket: "Low",
        allocationPct: policy.stableBufferPct,
        reasons: ["Capital preservation", "Buy dip opportunities", "Risk management"],
        risks: ["Issuer risk", "Regulatory risk", "No growth potential"],
        dca: { amountUsd: 0, cadence: "Monthly" },
      });
    }
    
    return allocations;
  }
  
  private async selectSatellitesWithAI(
    candidates: any[], 
    policy: PolicyData, 
    intake: IntakeData
  ): Promise<AllocationItem[]> {
    const systemPrompt = `You are a cautious cryptocurrency portfolio advisor. Select satellite holdings from the provided candidates to complete a starter portfolio allocation.

STRICT RULES:
1. Return ONLY valid JSON format
2. Respect all allocation caps and bucket limits
3. Select based on total_score, momentum, and technical indicators
4. Prefer coins with strong fundamentals and reasonable risk
5. Diversify across different use cases and technologies
6. Include reasoning for each selection`;

    const candidateData = candidates.slice(0, 50).map(coin => ({
      coin_id: coin.coinId,
      symbol: coin.symbol,
      name: coin.name,
      total_score: coin.totalScore,
      technical_score: coin.technicalScore,
      momentum_score: coin.momentumScore,
      bucket: coin.risk.volatility30d < 30 ? "Low" : coin.risk.volatility30d < 70 ? "Medium" : "High",
      market_cap: coin.market.marketCap,
      vol_to_mcap: coin.market.volume24h / coin.market.marketCap,
      trend: coin.trend,
      signals: coin.signals.slice(0, 3),
    }));
    
    const userPrompt = `Generate satellites for ${policy.riskTolerance} portfolio:

TARGET SATELLITE ALLOCATION: ${(policy.satelliteTargetPct * 100).toFixed(1)}%
BUCKET CAPS: High ${(policy.bucketCaps.High * 100)}%, Medium ${(policy.bucketCaps.Medium * 100)}%, Low ${(policy.bucketCaps.Low * 100)}%
PER-ASSET CAP: ${(policy.perAssetCapPct * 100)}%
TARGET HOLDINGS: ${policy.holdingsTargetRange[0]}-${policy.holdingsTargetRange[1]}

CANDIDATES:
${candidateData.map(c => 
  `${c.symbol}: Score ${c.total_score.toFixed(1)}, ${c.bucket} risk, ` +
  `MCap $${(c.market_cap/1e9).toFixed(1)}B, Trend ${c.trend}, ` +
  `Signals: ${c.signals.join(', ')}`
).join('\n')}

Return STRICT JSON:
{
  "satellites": [
    {
      "coin_id": "solana",
      "symbol": "SOL", 
      "name": "Solana",
      "bucket": "Medium",
      "allocation_pct": 0.08,
      "reasons": ["High throughput", "Growing ecosystem"],
      "risks": ["Network outages", "Competition"]
    }
  ]
}`;

    try {
      const response = await aiService.chat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);
      
      const parsed = JSON.parse(response);
      const satellites: AllocationItem[] = (parsed.satellites || []).map((sat: any) => ({
        coinId: sat.coin_id,
        symbol: sat.symbol,
        name: sat.name,
        role: "satellite" as const,
        bucket: sat.bucket,
        allocationPct: sat.allocation_pct,
        reasons: sat.reasons || [],
        risks: sat.risks || [],
        dca: { amountUsd: 0, cadence: "Monthly" },
      }));
      
      return this.validateAndCapSatellites(satellites, policy);
      
    } catch (error) {
      console.error("AI satellite selection failed:", error);
      return this.fallbackSatelliteSelection(candidates, policy);
    }
  }
  
  private validateAndCapSatellites(satellites: AllocationItem[], policy: PolicyData): AllocationItem[] {
    // Apply per-asset caps
    satellites.forEach(sat => {
      if (sat.allocationPct > policy.perAssetCapPct) {
        sat.allocationPct = policy.perAssetCapPct;
      }
    });
    
    // Apply bucket caps
    const bucketTotals = { High: 0, Medium: 0, Low: 0 };
    satellites.forEach(sat => {
      bucketTotals[sat.bucket as keyof typeof bucketTotals] += sat.allocationPct;
    });
    
    // Normalize if over bucket caps
    Object.keys(bucketTotals).forEach(bucket => {
      const total = bucketTotals[bucket as keyof typeof bucketTotals];
      const cap = policy.bucketCaps[bucket];
      if (total > cap) {
        const scale = cap / total;
        satellites.filter(s => s.bucket === bucket).forEach(s => {
          s.allocationPct *= scale;
        });
      }
    });
    
    // Sort by allocation and limit to target range
    satellites.sort((a, b) => b.allocationPct - a.allocationPct);
    const maxHoldings = policy.holdingsTargetRange[1] - 3; // Account for core + stable
    
    return satellites.slice(0, maxHoldings);
  }
  
  private fallbackSatelliteSelection(candidates: any[], policy: PolicyData): AllocationItem[] {
    const satellites: AllocationItem[] = [];
    const maxSatellites = policy.holdingsTargetRange[1] - 3;
    const targetPerSat = policy.satelliteTargetPct / maxSatellites;
    
    // Select top candidates by score, respecting bucket caps
    const bucketLimits = { High: 0, Medium: 0, Low: 0 };
    
    for (const coin of candidates.slice(0, maxSatellites)) {
      const bucket = coin.risk.volatility30d < 30 ? "Low" : 
                    coin.risk.volatility30d < 70 ? "Medium" : "High";
      
      if (bucketLimits[bucket] < policy.bucketCaps[bucket]) {
        const allocation = Math.min(targetPerSat, policy.perAssetCapPct);
        
        satellites.push({
          coinId: coin.coinId,
          symbol: coin.symbol,
          name: coin.name,
          role: "satellite",
          bucket,
          allocationPct: allocation,
          reasons: [`Score: ${coin.totalScore.toFixed(1)}`, `Trend: ${coin.trend}`],
          risks: ["Market volatility", "Project execution risk"],
          dca: { amountUsd: 0, cadence: "Monthly" },
        });
        
        bucketLimits[bucket] += allocation;
      }
    }
    
    return satellites;
  }
  
  private combineAndValidateAllocations(
    core: AllocationItem[], 
    satellites: AllocationItem[], 
    policy: PolicyData,
    intake: IntakeData
  ): AllocationItem[] {
    const allocation = [...core, ...satellites];
    
    // Normalize to 100%
    const totalAllocation = allocation.reduce((sum, item) => sum + item.allocationPct, 0);
    if (Math.abs(totalAllocation - 1.0) > 0.01) {
      const scaleFactor = 1.0 / totalAllocation;
      allocation.forEach(item => {
        item.allocationPct *= scaleFactor;
      });
    }
    
    // Validate holdings count
    if (allocation.length < intake.holdingsRange[0]) {
      console.warn(`Portfolio has ${allocation.length} holdings, below minimum ${intake.holdingsRange[0]}`);
    }
    if (allocation.length > intake.holdingsRange[1]) {
      console.warn(`Portfolio has ${allocation.length} holdings, above maximum ${intake.holdingsRange[1]}`);
    }
    
    return allocation;
  }
  
  private addDcaPlans(allocation: AllocationItem[], intake: IntakeData): void {
    const totalContribution = intake.monthlyContributionUsd;
    
    allocation.forEach(item => {
      const dcaAmount = Math.round((item.allocationPct * totalContribution) / 5) * 5; // Round to nearest $5
      item.dca = {
        amountUsd: Math.max(dcaAmount, 5), // Minimum $5
        cadence: "Monthly",
      };
    });
  }
  
  private createGuardrails(intake: IntakeData) {
    return {
      maxDrawdownAlertPct: intake.maxDrawdownComfort / 100,
      rebalanceThresholdPct: 0.05,
      minLiquidityVolToMcap: intake.liquidity.minVolToMcap,
      excludeFlags: ["Regulatory", "Exploit", "Quarantine"],
    };
  }
  
  private createChecklist(allocation: AllocationItem[]): string[] {
    const coreCoins = allocation.filter(a => a.role === "core").map(a => a.symbol).join(", ");
    const topSatellites = allocation
      .filter(a => a.role === "satellite")
      .sort((a, b) => b.allocationPct - a.allocationPct)
      .slice(0, 2)
      .map(a => a.symbol)
      .join(", ");
    
    return [
      `Enable price alerts for core holdings: ${coreCoins}`,
      `Set up DCA autopay 2-3 days after income`,
      `Track performance of top satellites: ${topSatellites}`,
      `Review allocation quarterly for rebalancing needs`,
      `Reassess risk tolerance after any major drawdown`,
    ];
  }
}

export const starterPortfolioService = new StarterPortfolioService();