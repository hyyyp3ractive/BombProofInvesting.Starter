import { config } from "../config";
import type { CoinSummary, MarketRow, CoinDetail, PriceHistory } from "@shared/schema";

// Base interfaces for market data providers
interface MarketDataProvider {
  name: string;
  search(query: string, limit?: number): Promise<CoinSummary[]>;
  markets(vsCurrency?: string, page?: number, perPage?: number): Promise<MarketRow[]>;
  coin(coinId: string): Promise<CoinDetail>;
  history(coinId: string, vsCurrency?: string, days?: number | string): Promise<PriceHistory>;
  isHealthy(): Promise<boolean>;
}

// Rate limiting and retry configuration
interface ProviderConfig {
  baseUrl: string;
  apiKey?: string;
  rateLimit: number; // requests per minute
  timeout: number;
  maxRetries: number;
}

// HTTP client with exponential backoff
class HttpClient {
  private lastRequest: Map<string, number> = new Map();
  
  async fetchWithRetry(url: string, options: RequestInit = {}, config: ProviderConfig): Promise<Response> {
    // Rate limiting
    const provider = new URL(url).hostname;
    const now = Date.now();
    const lastCall = this.lastRequest.get(provider) || 0;
    const minInterval = 60000 / config.rateLimit; // Convert to milliseconds
    
    if (now - lastCall < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - (now - lastCall)));
    }
    
    this.lastRequest.set(provider, Date.now());
    
    const headers: HeadersInit = {
      "Accept": "application/json",
      "User-Agent": "CryptoEvaluator/1.0",
      ...options.headers,
    };
    
    const requestOptions: RequestInit = {
      ...options,
      headers,
      signal: AbortSignal.timeout(config.timeout),
    };
    
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        if (response.ok) {
          return response;
        }
        
        // Handle rate limits
        if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after");
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
          console.warn(`Rate limited by ${provider}, waiting ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Handle server errors with retry
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        // Client errors shouldn't be retried
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === config.maxRetries) {
          break;
        }
        
        // Exponential backoff with jitter
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}

// CoinGecko Provider (Primary)
class CoinGeckoProvider implements MarketDataProvider {
  name = "CoinGecko";
  private client = new HttpClient();
  private config: ProviderConfig = {
    baseUrl: config.COINGECKO_BASE_URL,
    apiKey: config.COINGECKO_API_KEY,
    rateLimit: 10, // 10 calls per minute for free tier
    timeout: 30000,
    maxRetries: 3,
  };
  
  private buildUrl(endpoint: string): string {
    return `${this.config.baseUrl}${endpoint}`;
  }
  
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.config.apiKey) {
      headers["x-cg-demo-api-key"] = this.config.apiKey;
    }
    return headers;
  }
  
  async search(query: string, limit: number = 20): Promise<CoinSummary[]> {
    const url = this.buildUrl(`/search?query=${encodeURIComponent(query)}`);
    const response = await this.client.fetchWithRetry(url, { headers: this.getHeaders() }, this.config);
    const data = await response.json();
    
    return (data.coins || []).slice(0, limit).map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.large || coin.small,
      market_cap_rank: coin.market_cap_rank,
    }));
  }
  
  async markets(vsCurrency: string = "usd", page: number = 1, perPage: number = 100): Promise<MarketRow[]> {
    const url = this.buildUrl(`/coins/markets?vs_currency=${vsCurrency}&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`);
    const response = await this.client.fetchWithRetry(url, { headers: this.getHeaders() }, this.config);
    const data = await response.json();
    
    return data.map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image,
      current_price: coin.current_price || 0,
      market_cap: coin.market_cap || 0,
      market_cap_rank: coin.market_cap_rank || 0,
      price_change_percentage_24h: coin.price_change_percentage_24h || 0,
      total_volume: coin.total_volume || 0,
    }));
  }
  
  async coin(coinId: string): Promise<CoinDetail> {
    const url = this.buildUrl(`/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
    const response = await this.client.fetchWithRetry(url, { headers: this.getHeaders() }, this.config);
    const data = await response.json();
    
    return {
      id: data.id,
      symbol: data.symbol,
      name: data.name,
      description: data.description?.en,
      image: data.image?.large,
      current_price: data.market_data?.current_price?.usd || 0,
      market_cap: data.market_data?.market_cap?.usd || 0,
      market_cap_rank: data.market_cap_rank || 0,
      total_volume: data.market_data?.total_volume?.usd || 0,
      price_change_percentage_24h: data.market_data?.price_change_percentage_24h || 0,
      price_change_percentage_7d: data.market_data?.price_change_percentage_7d || 0,
      price_change_percentage_30d: data.market_data?.price_change_percentage_30d || 0,
      total_supply: data.market_data?.total_supply,
      max_supply: data.market_data?.max_supply,
      circulating_supply: data.market_data?.circulating_supply,
    };
  }
  
  async history(coinId: string, vsCurrency: string = "usd", days: number | string = 30): Promise<PriceHistory> {
    const url = this.buildUrl(`/coins/${coinId}/market_chart?vs_currency=${vsCurrency}&days=${days}`);
    const response = await this.client.fetchWithRetry(url, { headers: this.getHeaders() }, this.config);
    const data = await response.json();
    
    return {
      prices: data.prices || [],
      market_caps: data.market_caps || [],
      total_volumes: data.total_volumes || [],
    };
  }
  
  async isHealthy(): Promise<boolean> {
    try {
      const url = this.buildUrl("/ping");
      const response = await this.client.fetchWithRetry(url, { headers: this.getHeaders() }, { ...this.config, timeout: 5000 });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// CoinMarketCap Provider (Backup)
class CoinMarketCapProvider implements MarketDataProvider {
  name = "CoinMarketCap";
  private client = new HttpClient();
  private config: ProviderConfig = {
    baseUrl: "https://pro-api.coinmarketcap.com/v1",
    apiKey: process.env.COINMARKETCAP_API_KEY,
    rateLimit: 30, // 30 calls per minute for basic plan
    timeout: 30000,
    maxRetries: 3,
  };
  
  private buildUrl(endpoint: string): string {
    return `${this.config.baseUrl}${endpoint}`;
  }
  
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.config.apiKey) {
      headers["X-CMC_PRO_API_KEY"] = this.config.apiKey;
    }
    return headers;
  }
  
  // Map CMC symbol to approximate CoinGecko ID (basic mapping)
  private mapCmcToCoinGecko(cmcData: any): string {
    return cmcData.slug || cmcData.name?.toLowerCase().replace(/\s+/g, "-") || cmcData.symbol.toLowerCase();
  }
  
  async search(query: string, limit: number = 20): Promise<CoinSummary[]> {
    if (!this.config.apiKey) {
      throw new Error("CoinMarketCap API key not configured");
    }
    
    const url = this.buildUrl(`/cryptocurrency/map?symbol=${encodeURIComponent(query)}&limit=${limit}`);
    const response = await this.client.fetchWithRetry(url, { headers: this.getHeaders() }, this.config);
    const data = await response.json();
    
    return (data.data || []).map((coin: any) => ({
      id: this.mapCmcToCoinGecko(coin),
      symbol: coin.symbol.toLowerCase(),
      name: coin.name,
      image: "", // CMC doesn't provide images in map endpoint
      market_cap_rank: null,
    }));
  }
  
  async markets(vsCurrency: string = "usd", page: number = 1, perPage: number = 100): Promise<MarketRow[]> {
    if (!this.config.apiKey) {
      throw new Error("CoinMarketCap API key not configured");
    }
    
    const start = (page - 1) * perPage + 1;
    const url = this.buildUrl(`/cryptocurrency/listings/latest?start=${start}&limit=${perPage}&convert=${vsCurrency.toUpperCase()}`);
    const response = await this.client.fetchWithRetry(url, { headers: this.getHeaders() }, this.config);
    const data = await response.json();
    
    return (data.data || []).map((coin: any) => {
      const quote = coin.quote[vsCurrency.toUpperCase()];
      return {
        id: this.mapCmcToCoinGecko(coin),
        symbol: coin.symbol.toLowerCase(),
        name: coin.name,
        image: "", // CMC doesn't provide images in listings
        current_price: quote?.price || 0,
        market_cap: quote?.market_cap || 0,
        market_cap_rank: coin.cmc_rank || 0,
        price_change_percentage_24h: quote?.percent_change_24h || 0,
        total_volume: quote?.volume_24h || 0,
      };
    });
  }
  
  async coin(coinId: string): Promise<CoinDetail> {
    if (!this.config.apiKey) {
      throw new Error("CoinMarketCap API key not configured");
    }
    
    // CMC uses different identifiers, this is a simplified approach
    const url = this.buildUrl(`/cryptocurrency/quotes/latest?symbol=${coinId.toUpperCase()}&convert=USD`);
    const response = await this.client.fetchWithRetry(url, { headers: this.getHeaders() }, this.config);
    const data = await response.json();
    
    const coinData = Object.values(data.data || {})[0] as any;
    if (!coinData) {
      throw new Error(`Coin ${coinId} not found on CoinMarketCap`);
    }
    
    const quote = coinData.quote.USD;
    
    return {
      id: this.mapCmcToCoinGecko(coinData),
      symbol: coinData.symbol.toLowerCase(),
      name: coinData.name,
      description: "", // CMC doesn't provide descriptions in quotes endpoint
      image: "",
      current_price: quote?.price || 0,
      market_cap: quote?.market_cap || 0,
      market_cap_rank: coinData.cmc_rank || 0,
      total_volume: quote?.volume_24h || 0,
      price_change_percentage_24h: quote?.percent_change_24h || 0,
      price_change_percentage_7d: quote?.percent_change_7d || 0,
      price_change_percentage_30d: quote?.percent_change_30d || 0,
      total_supply: coinData.total_supply,
      max_supply: coinData.max_supply,
      circulating_supply: coinData.circulating_supply,
    };
  }
  
  async history(coinId: string, vsCurrency: string = "usd", days: number | string = 30): Promise<PriceHistory> {
    // CMC historical data requires higher tier subscription
    throw new Error("Historical data not available with basic CoinMarketCap plan");
  }
  
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.config.apiKey) return false;
      const url = this.buildUrl("/key/info");
      const response = await this.client.fetchWithRetry(url, { headers: this.getHeaders() }, { ...this.config, timeout: 5000 });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Messari Provider (Research Data)
class MessariProvider implements MarketDataProvider {
  name = "Messari";
  private client = new HttpClient();
  private config: ProviderConfig = {
    baseUrl: "https://data.messari.io/api/v1",
    apiKey: process.env.MESSARI_API_KEY,
    rateLimit: 20, // 20 calls per minute for free tier
    timeout: 30000,
    maxRetries: 3,
  };
  
  private buildUrl(endpoint: string): string {
    return `${this.config.baseUrl}${endpoint}`;
  }
  
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.config.apiKey) {
      headers["x-messari-api-key"] = this.config.apiKey;
    }
    return headers;
  }
  
  async search(query: string, limit: number = 20): Promise<CoinSummary[]> {
    const url = this.buildUrl(`/assets?fields=id,symbol,name,slug&limit=${limit}`);
    const response = await this.client.fetchWithRetry(url, { headers: this.getHeaders() }, this.config);
    const data = await response.json();
    
    // Basic filtering by query
    const filtered = (data.data || []).filter((asset: any) => 
      asset.name?.toLowerCase().includes(query.toLowerCase()) ||
      asset.symbol?.toLowerCase().includes(query.toLowerCase())
    );
    
    return filtered.slice(0, limit).map((asset: any) => ({
      id: asset.slug || asset.symbol?.toLowerCase(),
      symbol: asset.symbol?.toLowerCase(),
      name: asset.name,
      image: "",
      market_cap_rank: null,
    }));
  }
  
  async markets(vsCurrency: string = "usd", page: number = 1, perPage: number = 100): Promise<MarketRow[]> {
    const url = this.buildUrl(`/assets?fields=id,symbol,name,slug,market_data/price_usd,market_data/market_cap_usd,market_data/percent_change_usd_last_24_hours,market_data/real_volume_last_24_hours&limit=${perPage}&page=${page}`);
    const response = await this.client.fetchWithRetry(url, { headers: this.getHeaders() }, this.config);
    const data = await response.json();
    
    return (data.data || []).map((asset: any, index: number) => ({
      id: asset.slug || asset.symbol?.toLowerCase(),
      symbol: asset.symbol?.toLowerCase(),
      name: asset.name,
      image: "",
      current_price: asset.market_data?.price_usd || 0,
      market_cap: asset.market_data?.market_cap_usd || 0,
      market_cap_rank: (page - 1) * perPage + index + 1,
      price_change_percentage_24h: asset.market_data?.percent_change_usd_last_24_hours || 0,
      total_volume: asset.market_data?.real_volume_last_24_hours || 0,
    }));
  }
  
  async coin(coinId: string): Promise<CoinDetail> {
    const url = this.buildUrl(`/assets/${coinId}/metrics`);
    const response = await this.client.fetchWithRetry(url, { headers: this.getHeaders() }, this.config);
    const data = await response.json();
    
    const asset = data.data;
    if (!asset) {
      throw new Error(`Asset ${coinId} not found on Messari`);
    }
    
    return {
      id: asset.slug || asset.symbol?.toLowerCase(),
      symbol: asset.symbol?.toLowerCase(),
      name: asset.name,
      description: asset.profile?.general?.overview?.project_details || "",
      image: "",
      current_price: asset.market_data?.price_usd || 0,
      market_cap: asset.market_data?.marketcap?.current_marketcap_usd || 0,
      market_cap_rank: asset.marketcap?.rank || 0,
      total_volume: asset.market_data?.real_volume_last_24_hours || 0,
      price_change_percentage_24h: asset.market_data?.percent_change_usd_last_24_hours || 0,
      price_change_percentage_7d: asset.market_data?.percent_change_usd_last_1_week || 0,
      price_change_percentage_30d: asset.market_data?.percent_change_usd_last_1_month || 0,
      total_supply: asset.supply?.y_2050 || asset.supply?.maximum,
      max_supply: asset.supply?.maximum,
      circulating_supply: asset.supply?.circulating,
    };
  }
  
  async history(coinId: string, vsCurrency: string = "usd", days: number | string = 30): Promise<PriceHistory> {
    const url = this.buildUrl(`/assets/${coinId}/metrics/price/time-series?start=2024-01-01&end=2024-12-31&interval=1d`);
    const response = await this.client.fetchWithRetry(url, { headers: this.getHeaders() }, this.config);
    const data = await response.json();
    
    const values = data.data?.values || [];
    const prices = values.map((item: any) => [new Date(item[0]).getTime(), item[4]]); // [timestamp, close_price]
    
    return {
      prices,
      market_caps: [], // Messari doesn't provide market cap history in this endpoint
      total_volumes: [],
    };
  }
  
  async isHealthy(): Promise<boolean> {
    try {
      const url = this.buildUrl("/assets");
      const response = await this.client.fetchWithRetry(url, { headers: this.getHeaders() }, { ...this.config, timeout: 5000 });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Unified Market Data Service with Fallback
class MarketDataService {
  private providers: MarketDataProvider[] = [];
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private healthStatus = new Map<string, boolean>();
  
  constructor() {
    // Initialize providers in order of preference
    this.providers = [
      new CoinGeckoProvider(),
      new CoinMarketCapProvider(),
      new MessariProvider(),
    ];
    
    // Check provider health every 5 minutes
    setInterval(() => this.checkProvidersHealth(), 5 * 60 * 1000);
    this.checkProvidersHealth();
  }
  
  private async checkProvidersHealth(): Promise<void> {
    for (const provider of this.providers) {
      try {
        const healthy = await provider.isHealthy();
        this.healthStatus.set(provider.name, healthy);
        if (healthy) {
          console.log(`✅ ${provider.name} provider is healthy`);
        } else {
          console.warn(`⚠️ ${provider.name} provider is unhealthy`);
        }
      } catch (error) {
        console.error(`❌ Error checking ${provider.name} health:`, error);
        this.healthStatus.set(provider.name, false);
      }
    }
  }
  
  private getAvailableProviders(): MarketDataProvider[] {
    return this.providers.filter(provider => 
      this.healthStatus.get(provider.name) !== false
    );
  }
  
  private getCacheKey(method: string, ...args: any[]): string {
    return `${method}:${JSON.stringify(args)}`;
  }
  
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  private setCache<T>(key: string, data: T, ttlMinutes: number = 5): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000,
    });
  }
  
  private async executeWithFallback<T>(
    method: keyof MarketDataProvider,
    args: any[],
    cacheTtl: number = 5
  ): Promise<T> {
    const cacheKey = this.getCacheKey(method, ...args);
    
    // Try cache first
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const availableProviders = this.getAvailableProviders();
    let lastError: Error = new Error("No providers available");
    
    for (const provider of availableProviders) {
      try {
        console.log(`📡 Trying ${provider.name} for ${method}`);
        const result = await (provider[method] as any)(...args);
        this.setCache(cacheKey, result, cacheTtl);
        console.log(`✅ ${provider.name} succeeded for ${method}`);
        return result;
      } catch (error) {
        console.warn(`❌ ${provider.name} failed for ${method}:`, error);
        lastError = error as Error;
        // Mark provider as temporarily unhealthy
        this.healthStatus.set(provider.name, false);
      }
    }
    
    throw new Error(`All providers failed for ${method}: ${lastError?.message}`);
  }
  
  async search(query: string, limit: number = 20): Promise<CoinSummary[]> {
    return this.executeWithFallback<CoinSummary[]>("search", [query, limit], 10);
  }
  
  async markets(vsCurrency: string = "usd", page: number = 1, perPage: number = 100): Promise<MarketRow[]> {
    return this.executeWithFallback<MarketRow[]>("markets", [vsCurrency, page, perPage], 2);
  }
  
  async coin(coinId: string): Promise<CoinDetail> {
    return this.executeWithFallback<CoinDetail>("coin", [coinId], 5);
  }
  
  async history(coinId: string, vsCurrency: string = "usd", days: number | string = 30): Promise<PriceHistory> {
    return this.executeWithFallback<PriceHistory>("history", [coinId, vsCurrency, days], 30);
  }
  
  getProviderStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const provider of this.providers) {
      status[provider.name] = this.healthStatus.get(provider.name) !== false;
    }
    return status;
  }
  
  clearCache(): void {
    this.cache.clear();
    console.log("Market data cache cleared");
  }
}

export const marketDataService = new MarketDataService();