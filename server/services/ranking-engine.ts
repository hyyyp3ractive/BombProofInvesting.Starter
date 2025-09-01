import { marketDataService } from "./market_data.js";

interface TechnicalIndicators {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  bollingerBands: { upper: number; middle: number; lower: number; width: number };
  atr: number; // Average True Range for volatility
  obv: number; // On-Balance Volume
  volumeRatio: number;
}

interface MarketMetrics {
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number;
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
  priceChange1y: number;
  ath: number;
  athDate: Date;
  atl: number;
  atlDate: Date;
}

interface MomentumIndicators {
  momentum: number;
  rateOfChange: number;
  priceVelocity: number;
  trendStrength: number;
  volumeMomentum: number;
}

interface RiskMetrics {
  volatility30d: number;
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
  downsideDeviation: number;
  valueAtRisk: number;
}

interface CoinScore {
  coinId: string;
  symbol: string;
  name: string;
  
  // Component scores (0-100)
  technicalScore: number;
  momentumScore: number;
  volumeScore: number;
  volatilityScore: number;
  fundamentalScore: number;
  
  // Weighted total score (0-100)
  totalScore: number;
  
  // Detailed metrics
  technical: TechnicalIndicators;
  market: MarketMetrics;
  momentum: MomentumIndicators;
  risk: RiskMetrics;
  
  // Analysis
  signals: string[];
  trend: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

export class RankingEngine {
  // Scoring weights (must sum to 1.0)
  private weights = {
    technical: 0.30,
    momentum: 0.25,
    volume: 0.15,
    volatility: 0.15,
    fundamental: 0.15
  };

  async rankCoins(limit: number = 100): Promise<CoinScore[]> {
    try {
      // Get market data for top coins
      const markets = await marketDataService.markets("usd", 1, limit);
      
      // Process each coin with detailed analysis
      const scores = await Promise.all(
        markets.map(async (coin: any) => {
          try {
            // Get historical data for technical analysis
            const history = await marketDataService.history(coin.id, "usd", 90);
            
            if (!history.prices || history.prices.length < 30) {
              return null; // Skip coins with insufficient data
            }
            
            return this.analyzeCoin(coin, history);
          } catch (error) {
            console.error(`Error analyzing ${coin.id}:`, error);
            return null;
          }
        })
      );
      
      // Filter out nulls and sort by total score
      return scores
        .filter((s: any): s is CoinScore => s !== null)
        .sort((a: CoinScore, b: CoinScore) => b.totalScore - a.totalScore);
    } catch (error) {
      console.error("Ranking engine error:", error);
      throw error;
    }
  }

  private analyzeCoin(marketData: any, history: any): CoinScore {
    const prices = history.prices.map((p: any[]) => p[1]);
    const volumes = history.total_volumes?.map((v: any[]) => v[1]) || [];
    
    // Calculate all indicators
    const technical = this.calculateTechnicalIndicators(prices, volumes);
    const market = this.extractMarketMetrics(marketData);
    const momentum = this.calculateMomentum(prices, volumes);
    const risk = this.calculateRiskMetrics(prices);
    
    // Score each component
    const technicalScore = this.scoreTechnical(technical, prices[prices.length - 1]);
    const momentumScore = this.scoreMomentum(momentum);
    const volumeScore = this.scoreVolume(market, volumes);
    const volatilityScore = this.scoreVolatility(risk);
    const fundamentalScore = this.scoreFundamentals(market);
    
    // Calculate weighted total
    const totalScore = 
      technicalScore * this.weights.technical +
      momentumScore * this.weights.momentum +
      volumeScore * this.weights.volume +
      volatilityScore * this.weights.volatility +
      fundamentalScore * this.weights.fundamental;
    
    // Determine trend and signals
    const { trend, signals } = this.generateSignals(technical, momentum, prices);
    
    return {
      coinId: marketData.id,
      symbol: marketData.symbol,
      name: marketData.name,
      technicalScore,
      momentumScore,
      volumeScore,
      volatilityScore,
      fundamentalScore,
      totalScore,
      technical,
      market,
      momentum,
      risk,
      signals,
      trend,
      confidence: this.calculateConfidence(technical, momentum, risk)
    };
  }

  private calculateTechnicalIndicators(prices: number[], volumes: number[]): TechnicalIndicators {
    const rsi = this.calculateRSI(prices, 14);
    const macd = this.calculateMACD(prices);
    const sma20 = this.calculateSMA(prices, 20);
    const sma50 = this.calculateSMA(prices, 50);
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const bollingerBands = this.calculateBollingerBands(prices, 20);
    const atr = this.calculateATR(prices, 14);
    const obv = this.calculateOBV(prices, volumes);
    const volumeRatio = this.calculateVolumeRatio(volumes);
    
    return {
      rsi,
      macd,
      sma20,
      sma50,
      ema12,
      ema26,
      bollingerBands,
      atr,
      obv,
      volumeRatio
    };
  }

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    
    // Simplified signal line (9-period EMA of MACD)
    const signal = macdLine * 0.9; // Simplified calculation
    const histogram = macdLine - signal;
    
    return { value: macdLine, signal, histogram };
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const relevantPrices = prices.slice(-period);
    return relevantPrices.reduce((sum, price) => sum + price, 0) / period;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(prices.slice(0, period), period);
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  private calculateBollingerBands(prices: number[], period: number = 20): 
    { upper: number; middle: number; lower: number; width: number } {
    const sma = this.calculateSMA(prices, period);
    const relevantPrices = prices.slice(-period);
    
    const squaredDiffs = relevantPrices.map(price => Math.pow(price - sma, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
    const stdDev = Math.sqrt(variance);
    
    const upper = sma + (stdDev * 2);
    const lower = sma - (stdDev * 2);
    const width = (upper - lower) / sma * 100; // Bandwidth as percentage
    
    return { upper, middle: sma, lower, width };
  }

  private calculateATR(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 0;
    
    const trueRanges: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const high = prices[i];
      const low = prices[i];
      const prevClose = prices[i - 1];
      
      const tr = Math.max(
        Math.abs(high - low),
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }
    
    const relevantTRs = trueRanges.slice(-period);
    return relevantTRs.reduce((sum, tr) => sum + tr, 0) / period;
  }

  private calculateOBV(prices: number[], volumes: number[]): number {
    if (prices.length !== volumes.length || prices.length < 2) return 0;
    
    let obv = 0;
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > prices[i - 1]) {
        obv += volumes[i];
      } else if (prices[i] < prices[i - 1]) {
        obv -= volumes[i];
      }
    }
    
    return obv;
  }

  private calculateVolumeRatio(volumes: number[]): number {
    if (volumes.length < 20) return 1;
    
    const recent = volumes.slice(-5);
    const older = volumes.slice(-20, -5);
    
    const avgRecent = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const avgOlder = older.reduce((sum, v) => sum + v, 0) / older.length;
    
    return avgOlder > 0 ? avgRecent / avgOlder : 1;
  }

  private calculateMomentum(prices: number[], volumes: number[]): MomentumIndicators {
    const momentum = this.calculatePriceMomentum(prices, 10);
    const roc = this.calculateROC(prices, 10);
    const velocity = this.calculateVelocity(prices);
    const trendStrength = this.calculateTrendStrength(prices);
    const volumeMomentum = this.calculateVolumeMomentum(volumes);
    
    return {
      momentum,
      rateOfChange: roc,
      priceVelocity: velocity,
      trendStrength,
      volumeMomentum
    };
  }

  private calculatePriceMomentum(prices: number[], period: number = 10): number {
    if (prices.length < period + 1) return 0;
    
    const current = prices[prices.length - 1];
    const past = prices[prices.length - period - 1];
    
    return ((current - past) / past) * 100;
  }

  private calculateROC(prices: number[], period: number = 10): number {
    if (prices.length < period + 1) return 0;
    
    const current = prices[prices.length - 1];
    const past = prices[prices.length - period - 1];
    
    return ((current - past) / past) * 100;
  }

  private calculateVelocity(prices: number[]): number {
    if (prices.length < 5) return 0;
    
    const recentPrices = prices.slice(-5);
    const changes = [];
    
    for (let i = 1; i < recentPrices.length; i++) {
      changes.push((recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1]);
    }
    
    return changes.reduce((sum, change) => sum + change, 0) / changes.length * 100;
  }

  private calculateTrendStrength(prices: number[]): number {
    if (prices.length < 20) return 0;
    
    const sma20 = this.calculateSMA(prices, 20);
    const current = prices[prices.length - 1];
    
    return ((current - sma20) / sma20) * 100;
  }

  private calculateVolumeMomentum(volumes: number[]): number {
    if (volumes.length < 10) return 0;
    
    const recent = volumes.slice(-5);
    const older = volumes.slice(-10, -5);
    
    const avgRecent = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const avgOlder = older.reduce((sum, v) => sum + v, 0) / older.length;
    
    return avgOlder > 0 ? ((avgRecent - avgOlder) / avgOlder) * 100 : 0;
  }

  private calculateRiskMetrics(prices: number[]): RiskMetrics {
    const volatility = this.calculateVolatility(prices, 30);
    const sharpe = this.calculateSharpeRatio(prices);
    const maxDrawdown = this.calculateMaxDrawdown(prices);
    const beta = this.calculateBeta(prices);
    const downside = this.calculateDownsideDeviation(prices);
    const var95 = this.calculateValueAtRisk(prices, 0.95);
    
    return {
      volatility30d: volatility,
      sharpeRatio: sharpe,
      maxDrawdown,
      beta,
      downsideDeviation: downside,
      valueAtRisk: var95
    };
  }

  private calculateVolatility(prices: number[], period: number = 30): number {
    if (prices.length < period) return 0;
    
    const relevantPrices = prices.slice(-period);
    const returns: number[] = [];
    
    for (let i = 1; i < relevantPrices.length; i++) {
      returns.push((relevantPrices[i] - relevantPrices[i - 1]) / relevantPrices[i - 1]);
    }
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(365) * 100; // Annualized volatility
  }

  private calculateSharpeRatio(prices: number[]): number {
    if (prices.length < 30) return 0;
    
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const riskFreeRate = 0.02 / 365; // Assume 2% annual risk-free rate
    
    const excessReturns = returns.map(r => r - riskFreeRate);
    const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    
    const stdDev = Math.sqrt(
      excessReturns.reduce((sum, r) => sum + Math.pow(r - avgExcessReturn, 2), 0) / excessReturns.length
    );
    
    return stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev * Math.sqrt(365) : 0;
  }

  private calculateMaxDrawdown(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    let maxDrawdown = 0;
    let peak = prices[0];
    
    for (const price of prices) {
      if (price > peak) {
        peak = price;
      }
      
      const drawdown = (peak - price) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown * 100;
  }

  private calculateBeta(prices: number[]): number {
    // Simplified beta calculation (would normally compare to market index)
    // Using volatility as proxy for now
    const volatility = this.calculateVolatility(prices, 30);
    return volatility / 20; // Assuming market volatility of 20%
  }

  private calculateDownsideDeviation(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const negativeReturns = returns.filter(r => r < 0);
    if (negativeReturns.length === 0) return 0;
    
    const avgNegReturn = negativeReturns.reduce((sum, r) => sum + r, 0) / negativeReturns.length;
    const variance = negativeReturns.reduce((sum, r) => sum + Math.pow(r - avgNegReturn, 2), 0) / negativeReturns.length;
    
    return Math.sqrt(variance) * Math.sqrt(365) * 100;
  }

  private calculateValueAtRisk(prices: number[], confidence: number = 0.95): number {
    if (prices.length < 2) return 0;
    
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    returns.sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * returns.length);
    
    return Math.abs(returns[index]) * 100;
  }

  private extractMarketMetrics(marketData: any): MarketMetrics {
    return {
      marketCap: marketData.market_cap || 0,
      volume24h: marketData.total_volume || 0,
      circulatingSupply: marketData.circulating_supply || 0,
      totalSupply: marketData.total_supply || 0,
      priceChange24h: marketData.price_change_percentage_24h || 0,
      priceChange7d: marketData.price_change_percentage_7d_in_currency || 0,
      priceChange30d: marketData.price_change_percentage_30d_in_currency || 0,
      priceChange1y: marketData.price_change_percentage_1y_in_currency || 0,
      ath: marketData.ath || 0,
      athDate: new Date(marketData.ath_date || Date.now()),
      atl: marketData.atl || 0,
      atlDate: new Date(marketData.atl_date || Date.now())
    };
  }

  private scoreTechnical(technical: TechnicalIndicators, currentPrice: number): number {
    let score = 50; // Start neutral
    
    // RSI scoring
    if (technical.rsi < 30) score += 15; // Oversold
    else if (technical.rsi > 70) score -= 15; // Overbought
    else score += 5; // Neutral is good
    
    // MACD scoring
    if (technical.macd.histogram > 0) score += 10;
    else score -= 10;
    
    // Moving average scoring
    if (currentPrice > technical.sma20) score += 10;
    if (currentPrice > technical.sma50) score += 10;
    
    // Bollinger Bands scoring
    const bbPosition = (currentPrice - technical.bollingerBands.lower) / 
                      (technical.bollingerBands.upper - technical.bollingerBands.lower);
    if (bbPosition < 0.2) score += 10; // Near lower band
    else if (bbPosition > 0.8) score -= 10; // Near upper band
    
    // Volume scoring
    if (technical.volumeRatio > 1.5) score += 10;
    else if (technical.volumeRatio < 0.5) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private scoreMomentum(momentum: MomentumIndicators): number {
    let score = 50;
    
    if (momentum.momentum > 10) score += 20;
    else if (momentum.momentum > 0) score += 10;
    else if (momentum.momentum < -10) score -= 20;
    else score -= 10;
    
    if (momentum.trendStrength > 5) score += 15;
    else if (momentum.trendStrength < -5) score -= 15;
    
    if (momentum.volumeMomentum > 20) score += 15;
    else if (momentum.volumeMomentum < -20) score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }

  private scoreVolume(market: MarketMetrics, volumes: number[]): number {
    let score = 50;
    
    // Volume to market cap ratio
    const volumeToMcap = market.volume24h / market.marketCap;
    if (volumeToMcap > 0.1) score += 20;
    else if (volumeToMcap > 0.05) score += 10;
    else if (volumeToMcap < 0.01) score -= 20;
    
    // Recent volume trend
    const recentAvg = volumes.slice(-7).reduce((s, v) => s + v, 0) / 7;
    const olderAvg = volumes.slice(-30, -7).reduce((s, v) => s + v, 0) / 23;
    
    if (recentAvg > olderAvg * 1.5) score += 20;
    else if (recentAvg > olderAvg) score += 10;
    else if (recentAvg < olderAvg * 0.5) score -= 20;
    
    return Math.max(0, Math.min(100, score));
  }

  private scoreVolatility(risk: RiskMetrics): number {
    let score = 50;
    
    // Prefer moderate volatility (not too high, not too low)
    if (risk.volatility30d < 30) score += 20;
    else if (risk.volatility30d < 50) score += 10;
    else if (risk.volatility30d > 100) score -= 20;
    else if (risk.volatility30d > 70) score -= 10;
    
    // Sharpe ratio scoring
    if (risk.sharpeRatio > 2) score += 20;
    else if (risk.sharpeRatio > 1) score += 10;
    else if (risk.sharpeRatio < 0) score -= 20;
    
    // Drawdown scoring
    if (risk.maxDrawdown < 20) score += 10;
    else if (risk.maxDrawdown > 50) score -= 20;
    
    return Math.max(0, Math.min(100, score));
  }

  private scoreFundamentals(market: MarketMetrics): number {
    let score = 50;
    
    // Market cap scoring (prefer established but not too large)
    if (market.marketCap > 1e9 && market.marketCap < 100e9) score += 20;
    else if (market.marketCap > 100e6) score += 10;
    else if (market.marketCap < 10e6) score -= 20;
    
    // Supply metrics
    const supplyRatio = market.circulatingSupply / (market.totalSupply || market.circulatingSupply);
    if (supplyRatio > 0.7) score += 10;
    else if (supplyRatio < 0.3) score -= 10;
    
    // Price performance
    if (market.priceChange30d > 10) score += 10;
    else if (market.priceChange30d < -20) score -= 10;
    
    // Distance from ATH
    const distanceFromAth = ((market.ath - market.priceChange24h) / market.ath) * 100;
    if (distanceFromAth > 70) score += 10; // Potential for recovery
    else if (distanceFromAth < 10) score -= 10; // Near ATH, limited upside
    
    return Math.max(0, Math.min(100, score));
  }

  private generateSignals(
    technical: TechnicalIndicators, 
    momentum: MomentumIndicators,
    prices: number[]
  ): { trend: 'bullish' | 'bearish' | 'neutral'; signals: string[] } {
    const signals: string[] = [];
    let bullishCount = 0;
    let bearishCount = 0;
    
    // Technical signals
    if (technical.rsi < 30) {
      signals.push("RSI oversold");
      bullishCount++;
    } else if (technical.rsi > 70) {
      signals.push("RSI overbought");
      bearishCount++;
    }
    
    if (technical.macd.histogram > 0) {
      signals.push("MACD bullish");
      bullishCount++;
    } else {
      signals.push("MACD bearish");
      bearishCount++;
    }
    
    const currentPrice = prices[prices.length - 1];
    if (currentPrice > technical.sma50) {
      signals.push("Above 50-day SMA");
      bullishCount++;
    } else {
      signals.push("Below 50-day SMA");
      bearishCount++;
    }
    
    // Momentum signals
    if (momentum.momentum > 10) {
      signals.push("Strong momentum");
      bullishCount++;
    } else if (momentum.momentum < -10) {
      signals.push("Weak momentum");
      bearishCount++;
    }
    
    if (momentum.volumeMomentum > 20) {
      signals.push("Volume increasing");
      bullishCount++;
    }
    
    // Determine trend
    let trend: 'bullish' | 'bearish' | 'neutral';
    if (bullishCount > bearishCount + 1) trend = 'bullish';
    else if (bearishCount > bullishCount + 1) trend = 'bearish';
    else trend = 'neutral';
    
    return { trend, signals };
  }

  private calculateConfidence(
    technical: TechnicalIndicators,
    momentum: MomentumIndicators,
    risk: RiskMetrics
  ): number {
    let confidence = 50;
    
    // Technical alignment
    if (technical.macd.histogram > 0 && technical.rsi > 30 && technical.rsi < 70) {
      confidence += 20;
    }
    
    // Momentum confirmation
    if (momentum.momentum > 0 && momentum.volumeMomentum > 0) {
      confidence += 15;
    }
    
    // Risk factors
    if (risk.sharpeRatio > 1 && risk.volatility30d < 50) {
      confidence += 15;
    }
    
    return Math.min(100, confidence);
  }
}