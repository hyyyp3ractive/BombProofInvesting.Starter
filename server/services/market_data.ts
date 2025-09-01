import { config } from "../config";
import type { CoinSummary, MarketRow, CoinDetail, PriceHistory } from "@shared/schema";

class MarketDataService {
  private baseUrl = config.COINGECKO_BASE_URL;
  private apiKey = config.COINGECKO_API_KEY;
  
  private async fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
    const headers: HeadersInit = {
      "Accept": "application/json",
      ...(this.apiKey && { "x-cg-demo-api-key": this.apiKey }),
      ...options.headers,
    };
    
    const requestOptions: RequestInit = {
      ...options,
      headers,
      signal: AbortSignal.timeout(config.HTTP_TIMEOUT_SEC * 1000),
    };
    
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.HTTP_MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        if (response.ok) {
          return response;
        }
        
        // Handle rate limits
        if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after");
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === config.HTTP_MAX_RETRIES) {
          break;
        }
        
        // Exponential backoff with jitter
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
  
  async search(query: string, limit: number = 20): Promise<CoinSummary[]> {
    const url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}`;
    const response = await this.fetchWithRetry(url);
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
    const url = `${this.baseUrl}/coins/markets?vs_currency=${vsCurrency}&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`;
    const response = await this.fetchWithRetry(url);
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
    const url = `${this.baseUrl}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    const response = await this.fetchWithRetry(url);
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
    const url = `${this.baseUrl}/coins/${coinId}/market_chart?vs_currency=${vsCurrency}&days=${days}`;
    const response = await this.fetchWithRetry(url);
    const data = await response.json();
    
    return {
      prices: data.prices || [],
      market_caps: data.market_caps || [],
      total_volumes: data.total_volumes || [],
    };
  }
}

export const marketDataService = new MarketDataService();
