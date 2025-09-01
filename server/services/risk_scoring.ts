import type { CoinDetail, MarketRow } from "@shared/schema";
import { marketDataService } from "./market_data";

// Risk factors and their weight in the overall score
interface RiskFactors {
  volatility: number;        // Price volatility (higher = riskier)
  marketCap: number;         // Market capitalization (lower = riskier) 
  liquidity: number;         // Trading volume (lower = riskier)
  age: number;              // Time since launch (newer = riskier)
  development: number;       // Development activity (lower = riskier)
  centralization: number;    // Decentralization score (more centralized = riskier)
  regulatory: number;        // Regulatory clarity (unclear = riskier)
  technical: number;         // Technical innovation score
}

interface RewardFactors {
  growth: number;           // Historical growth potential
  adoption: number;         // Real-world adoption rate
  innovation: number;       // Technology innovation score
  partnerships: number;     // Strategic partnerships
  utility: number;          // Real utility and use cases
  community: number;        // Community strength
  tokenomics: number;       // Token economics quality
}

interface ScoreResult {
  riskScore: number;        // 0-100 (0 = lowest risk, 100 = highest risk)
  rewardScore: number;      // 0-100 (0 = lowest reward, 100 = highest reward)
  category: "core" | "medium" | "high-risk" | "quarantine";
  factors: {
    risk: RiskFactors;
    reward: RewardFactors;
  };
  confidence: number;       // Confidence in the scoring (0-100)
  explanation: string;      // Human-readable explanation
}

class RiskScoringService {
  // Risk factor weights (must sum to 1.0)
  private readonly RISK_WEIGHTS = {
    volatility: 0.25,       // 25% - Most important for risk
    marketCap: 0.20,        // 20% - Size indicates stability
    liquidity: 0.15,        // 15% - Volume indicates stability
    age: 0.10,              // 10% - Maturity matters
    development: 0.10,      // 10% - Active development
    centralization: 0.08,   // 8%  - Decentralization
    regulatory: 0.07,       // 7%  - Legal clarity
    technical: 0.05,        // 5%  - Technical merit
  };

  // Reward factor weights (must sum to 1.0)
  private readonly REWARD_WEIGHTS = {
    growth: 0.20,           // 20% - Growth potential
    adoption: 0.18,         // 18% - Real-world use
    innovation: 0.15,       // 15% - Technical innovation
    utility: 0.12,          // 12% - Actual utility
    partnerships: 0.10,     // 10% - Strategic alliances
    community: 0.10,        // 10% - Community strength
    tokenomics: 0.15,       // 15% - Economic design
  };

  // Market cap tiers for risk assessment
  private readonly MARKET_CAP_TIERS = {
    MEGA_CAP: 100_000_000_000,    // $100B+ (BTC, ETH)
    LARGE_CAP: 10_000_000_000,    // $10B+ (Top 20)
    MID_CAP: 1_000_000_000,       // $1B+ (Top 100)
    SMALL_CAP: 100_000_000,       // $100M+ (Top 500)
    MICRO_CAP: 10_000_000,        // $10M+ (Top 1000)
  };

  async calculateScore(coinId: string, coinData?: CoinDetail): Promise<ScoreResult> {
    try {
      // Get fresh data if not provided
      const data = coinData || await marketDataService.coin(coinId);
      
      // Calculate risk factors
      const riskFactors = await this.calculateRiskFactors(data);
      
      // Calculate reward factors  
      const rewardFactors = await this.calculateRewardFactors(data);
      
      // Calculate weighted scores
      const riskScore = this.calculateWeightedScore(riskFactors, this.RISK_WEIGHTS);
      const rewardScore = this.calculateWeightedScore(rewardFactors, this.REWARD_WEIGHTS);
      
      // Determine category
      const category = this.determineCategory(riskScore, rewardScore, data);
      
      // Calculate confidence based on data availability
      const confidence = this.calculateConfidence(data, riskFactors, rewardFactors);
      
      // Generate explanation
      const explanation = this.generateExplanation(riskScore, rewardScore, category, data);

      return {
        riskScore: Math.round(riskScore),
        rewardScore: Math.round(rewardScore),
        category,
        factors: {
          risk: riskFactors,
          reward: rewardFactors,
        },
        confidence: Math.round(confidence),
        explanation,
      };
    } catch (error) {
      console.error(`Error calculating score for ${coinId}:`, error);
      return {
        riskScore: 95, // Default to high risk if calculation fails
        rewardScore: 5,
        category: "quarantine",
        factors: {
          risk: this.getDefaultRiskFactors(),
          reward: this.getDefaultRewardFactors(),
        },
        confidence: 0,
        explanation: "Unable to calculate accurate risk score due to insufficient data.",
      };
    }
  }

  private async calculateRiskFactors(data: CoinDetail): Promise<RiskFactors> {
    // Get historical data for volatility calculation
    let volatilityScore = 50; // Default medium volatility
    try {
      const history = await marketDataService.history(data.id, "usd", 30);
      volatilityScore = this.calculateVolatilityScore(history.prices);
    } catch (error) {
      console.warn(`Could not fetch volatility data for ${data.id}:`, error);
    }

    return {
      volatility: volatilityScore,
      marketCap: this.calculateMarketCapRisk(data.market_cap),
      liquidity: this.calculateLiquidityRisk(data.total_volume, data.market_cap),
      age: this.calculateAgeRisk(data.id), // Simplified - would need launch date
      development: this.calculateDevelopmentRisk(data.id), // Simplified - would need GitHub data
      centralization: this.calculateCentralizationRisk(data.id), // Simplified
      regulatory: this.calculateRegulatoryRisk(data.id), // Simplified
      technical: this.calculateTechnicalRisk(data.id), // Simplified
    };
  }

  private async calculateRewardFactors(data: CoinDetail): Promise<RewardFactors> {
    return {
      growth: this.calculateGrowthPotential(data),
      adoption: this.calculateAdoptionScore(data),
      innovation: this.calculateInnovationScore(data.id), // Would need external data
      partnerships: this.calculatePartnershipScore(data.id), // Would need external data
      utility: this.calculateUtilityScore(data),
      community: this.calculateCommunityScore(data.id), // Would need social metrics
      tokenomics: this.calculateTokenomicsScore(data),
    };
  }

  private calculateVolatilityScore(prices: number[][]): number {
    if (prices.length < 2) return 50;

    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const currentPrice = prices[i][1];
      const previousPrice = prices[i-1][1];
      if (previousPrice > 0) {
        returns.push((currentPrice - previousPrice) / previousPrice);
      }
    }

    if (returns.length === 0) return 50;

    // Calculate standard deviation of returns
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Convert to 0-100 scale (higher std dev = higher risk)
    // 0.05 (5% daily std dev) = 50, 0.10 (10%) = 100
    return Math.min(100, Math.max(0, stdDev * 1000));
  }

  private calculateMarketCapRisk(marketCap: number): number {
    if (!marketCap || marketCap <= 0) return 90; // Very risky if no market cap
    
    if (marketCap >= this.MARKET_CAP_TIERS.MEGA_CAP) return 5;   // Very low risk
    if (marketCap >= this.MARKET_CAP_TIERS.LARGE_CAP) return 15; // Low risk
    if (marketCap >= this.MARKET_CAP_TIERS.MID_CAP) return 30;   // Medium-low risk
    if (marketCap >= this.MARKET_CAP_TIERS.SMALL_CAP) return 50; // Medium risk
    if (marketCap >= this.MARKET_CAP_TIERS.MICRO_CAP) return 70; // High risk
    return 90; // Very high risk for ultra-small caps
  }

  private calculateLiquidityRisk(volume: number, marketCap: number): number {
    if (!volume || volume <= 0) return 95; // Very risky if no volume
    if (!marketCap || marketCap <= 0) return 90;

    // Volume-to-market-cap ratio (higher = more liquid = lower risk)
    const volumeRatio = volume / marketCap;
    
    if (volumeRatio >= 0.1) return 10;   // Very liquid
    if (volumeRatio >= 0.05) return 20;  // Good liquidity
    if (volumeRatio >= 0.02) return 35;  // Moderate liquidity
    if (volumeRatio >= 0.01) return 50;  // Low liquidity
    if (volumeRatio >= 0.005) return 70; // Poor liquidity
    return 90; // Very poor liquidity
  }

  private calculateAgeRisk(coinId: string): number {
    // Simplified age calculation based on known coins
    // In production, this would use launch date data
    const knownOldCoins = ["bitcoin", "ethereum", "litecoin", "ripple", "bitcoin-cash"];
    const knownNewCoins = ["solana", "cardano", "polkadot", "chainlink", "uniswap"];
    
    if (knownOldCoins.includes(coinId)) return 10; // Low risk - battle tested
    if (knownNewCoins.includes(coinId)) return 40; // Medium risk - newer but established
    return 60; // Higher risk for unknown/very new coins
  }

  private calculateDevelopmentRisk(coinId: string): number {
    // Simplified - in production would use GitHub API data
    const activeProjects = ["ethereum", "bitcoin", "cardano", "solana", "polkadot"];
    return activeProjects.includes(coinId) ? 20 : 60;
  }

  private calculateCentralizationRisk(coinId: string): number {
    // Simplified centralization scoring
    const decentralizedCoins = ["bitcoin", "ethereum", "litecoin"];
    const somewhatCentralized = ["cardano", "solana", "polkadot"];
    
    if (decentralizedCoins.includes(coinId)) return 15;
    if (somewhatCentralized.includes(coinId)) return 40;
    return 70; // Higher risk for more centralized projects
  }

  private calculateRegulatoryRisk(coinId: string): number {
    // Regulatory clarity scoring
    const clearRegulatory = ["bitcoin", "ethereum"];
    const unclearRegulatory = ["monero", "zcash"];
    
    if (clearRegulatory.includes(coinId)) return 20;
    if (unclearRegulatory.includes(coinId)) return 80;
    return 50; // Medium risk for most coins
  }

  private calculateTechnicalRisk(coinId: string): number {
    // Technical merit scoring (simplified)
    const highTech = ["ethereum", "cardano", "solana", "polkadot"];
    if (highTech.includes(coinId)) return 20;
    return 50; // Default medium technical risk
  }

  private calculateGrowthPotential(data: CoinDetail): number {
    // Base growth potential on recent performance and market position
    const recent24h = data.price_change_percentage_24h || 0;
    const recent7d = data.price_change_percentage_7d || 0;
    const recent30d = data.price_change_percentage_30d || 0;
    
    // Calculate momentum score
    const momentumScore = (recent24h + recent7d + recent30d) / 3;
    
    // Adjust for market cap (smaller caps have more growth potential but higher risk)
    let capAdjustment = 50;
    if (data.market_cap > this.MARKET_CAP_TIERS.LARGE_CAP) capAdjustment = 30;
    else if (data.market_cap > this.MARKET_CAP_TIERS.MID_CAP) capAdjustment = 50;
    else if (data.market_cap > this.MARKET_CAP_TIERS.SMALL_CAP) capAdjustment = 70;
    else capAdjustment = 85;

    return Math.min(100, Math.max(0, capAdjustment + (momentumScore * 2)));
  }

  private calculateAdoptionScore(data: CoinDetail): number {
    // Base adoption on market cap rank and trading volume
    const rankScore = data.market_cap_rank ? Math.max(0, 100 - data.market_cap_rank) : 20;
    const volumeScore = Math.min(50, (data.total_volume / 1000000)); // Per million in volume
    return Math.min(100, rankScore + volumeScore);
  }

  private calculateInnovationScore(coinId: string): number {
    // Innovation scoring (simplified)
    const highInnovation = ["ethereum", "cardano", "solana", "polkadot", "chainlink"];
    const mediumInnovation = ["litecoin", "bitcoin-cash", "stellar"];
    
    if (highInnovation.includes(coinId)) return 80;
    if (mediumInnovation.includes(coinId)) return 50;
    return 30; // Default lower innovation score
  }

  private calculatePartnershipScore(coinId: string): number {
    // Partnership scoring (simplified)
    const strongPartners = ["ethereum", "cardano", "chainlink", "ripple"];
    return strongPartners.includes(coinId) ? 70 : 40;
  }

  private calculateUtilityScore(data: CoinDetail): number {
    // Utility based on description and known use cases
    const description = data.description?.toLowerCase() || "";
    let utilityScore = 30; // Base score
    
    // Look for utility keywords
    if (description.includes("smart contract")) utilityScore += 20;
    if (description.includes("defi") || description.includes("decentralized finance")) utilityScore += 15;
    if (description.includes("payment") || description.includes("currency")) utilityScore += 10;
    if (description.includes("oracle") || description.includes("data")) utilityScore += 15;
    if (description.includes("governance")) utilityScore += 10;
    
    return Math.min(100, utilityScore);
  }

  private calculateCommunityScore(coinId: string): number {
    // Community strength (simplified - would use social media metrics)
    const strongCommunity = ["bitcoin", "ethereum", "cardano", "solana"];
    return strongCommunity.includes(coinId) ? 80 : 45;
  }

  private calculateTokenomicsScore(data: CoinDetail): number {
    let score = 50; // Base score
    
    // Check supply mechanics
    if (data.max_supply && data.circulating_supply) {
      const circulationRatio = data.circulating_supply / data.max_supply;
      if (circulationRatio > 0.8) score += 10; // High circulation is good
      if (circulationRatio < 0.3) score -= 10; // Very low circulation might indicate hoarding
    }
    
    // Capped supply is generally positive
    if (data.max_supply && data.max_supply > 0) {
      score += 15;
    } else {
      score -= 10; // Unlimited supply can be inflationary
    }
    
    return Math.min(100, Math.max(0, score));
  }

  private calculateWeightedScore(factors: any, weights: any): number {
    let score = 0;
    for (const [factor, value] of Object.entries(factors)) {
      const weight = weights[factor] || 0;
      score += (value as number) * weight;
    }
    return score;
  }

  private determineCategory(riskScore: number, rewardScore: number, data: CoinDetail): "core" | "medium" | "high-risk" | "quarantine" {
    // Quarantine: Very high risk or very low confidence
    if (riskScore >= 80 || (riskScore >= 60 && rewardScore <= 20)) {
      return "quarantine";
    }
    
    // Core/Safer: Low risk, established coins
    if (riskScore <= 30 && data.market_cap > this.MARKET_CAP_TIERS.LARGE_CAP) {
      return "core";
    }
    
    // High Risk/High Reward: High potential but risky
    if (rewardScore >= 70 && riskScore >= 50) {
      return "high-risk";
    }
    
    // Medium: Everything else
    return "medium";
  }

  private calculateConfidence(data: CoinDetail, risk: RiskFactors, reward: RewardFactors): number {
    let confidence = 100;
    
    // Reduce confidence for missing data
    if (!data.market_cap) confidence -= 20;
    if (!data.total_volume) confidence -= 15;
    if (!data.description) confidence -= 10;
    if (!data.market_cap_rank) confidence -= 10;
    
    // Historical data availability affects confidence
    if (risk.volatility === 50) confidence -= 15; // Default volatility score
    
    return Math.max(0, confidence);
  }

  private generateExplanation(riskScore: number, rewardScore: number, category: string, data: CoinDetail): string {
    const riskLevel = riskScore <= 30 ? "low" : riskScore <= 60 ? "medium" : "high";
    const rewardLevel = rewardScore <= 30 ? "low" : rewardScore <= 60 ? "medium" : "high";
    
    let explanation = `${data.name} has ${riskLevel} risk (${riskScore}/100) and ${rewardLevel} reward potential (${rewardScore}/100). `;
    
    switch (category) {
      case "core":
        explanation += "This is a core holding - established, lower-risk cryptocurrency suitable for portfolio foundation.";
        break;
      case "medium":
        explanation += "This is a medium-risk investment with balanced risk/reward characteristics.";
        break;
      case "high-risk":
        explanation += "This is a high-risk, high-reward opportunity. Only suitable for risk-tolerant investors.";
        break;
      case "quarantine":
        explanation += "This asset is in quarantine due to high risk or insufficient data. Avoid or research extensively.";
        break;
    }
    
    return explanation;
  }

  private getDefaultRiskFactors(): RiskFactors {
    return {
      volatility: 80,
      marketCap: 90,
      liquidity: 85,
      age: 70,
      development: 60,
      centralization: 70,
      regulatory: 80,
      technical: 60,
    };
  }

  private getDefaultRewardFactors(): RewardFactors {
    return {
      growth: 10,
      adoption: 5,
      innovation: 10,
      partnerships: 10,
      utility: 15,
      community: 10,
      tokenomics: 20,
    };
  }
}

export const riskScoringService = new RiskScoringService();