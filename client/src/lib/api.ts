import { authService } from "./auth";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "/api") {
    this.baseUrl = baseUrl;
  }

  private async makeRequest(
    method: string,
    endpoint: string,
    data?: unknown,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const accessToken = authService.getAccessToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      credentials: "include",
      ...options,
    };

    if (data && (method === "POST" || method === "PATCH" || method === "PUT")) {
      requestOptions.body = JSON.stringify(data);
    }

    const response = await fetch(url, requestOptions);

    // Handle 401 Unauthorized by attempting token refresh
    if (response.status === 401 && accessToken) {
      const newToken = await authService.refreshAccessToken();
      if (newToken) {
        // Retry the request with the new token
        headers.Authorization = `Bearer ${newToken}`;
        const retryRequestOptions = {
          ...requestOptions,
          headers
        };
        const retryResponse = await fetch(url, retryRequestOptions);
        if (!retryResponse.ok) {
          throw new Error(`${retryResponse.status}: ${retryResponse.statusText}`);
        }
        return retryResponse;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status}: ${errorText || response.statusText}`);
    }

    return response;
  }

  // Market data methods
  async searchCoins(query: string, limit: number = 20) {
    const response = await this.makeRequest("GET", `/coins/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.json();
  }

  async getMarkets(vsCurrency: string = "usd", page: number = 1, perPage: number = 100) {
    const response = await this.makeRequest("GET", `/coins/markets?vs_currency=${vsCurrency}&page=${page}&per_page=${perPage}`);
    return response.json();
  }

  async getCoin(coinId: string) {
    const response = await this.makeRequest("GET", `/coins/${coinId}`);
    return response.json();
  }

  async getCoinHistory(coinId: string, vsCurrency: string = "usd", days: string = "30") {
    const response = await this.makeRequest("GET", `/coins/${coinId}/history?vs_currency=${vsCurrency}&days=${days}`);
    return response.json();
  }

  // AI methods
  async explainCoin(coinId: string) {
    const response = await this.makeRequest("GET", `/ai/explain?coin=${encodeURIComponent(coinId)}`);
    return response.json();
  }

  async compareCoins(coinIds: string[]) {
    const response = await this.makeRequest("GET", `/ai/compare?coins=${coinIds.join(",")}`);
    return response.json();
  }

  // Watchlist methods
  async getWatchlist() {
    const response = await this.makeRequest("GET", "/watchlist");
    return response.json();
  }

  async addToWatchlist(coinId: string, tags?: string, notes?: string) {
    const response = await this.makeRequest("POST", "/watchlist", {
      coinId,
      tags: tags || "",
      notes: notes || "",
    });
    return response.json();
  }

  async removeFromWatchlist(coinId: string) {
    const response = await this.makeRequest("DELETE", `/watchlist/${coinId}`);
    return response.json();
  }

  // Ratings methods
  async getRatings() {
    const response = await this.makeRequest("GET", "/ratings");
    return response.json();
  }

  async getCoinRating(coinId: string) {
    const response = await this.makeRequest("GET", `/ratings/${coinId}`);
    return response.json();
  }

  async createRating(rating: {
    coinId: string;
    marketHealth: number;
    techUtility: number;
    teamAdoption: number;
    tokenomics: number;
    risk: number;
    notes?: string;
  }) {
    const response = await this.makeRequest("POST", "/ratings", rating);
    return response.json();
  }

  async updateRating(coinId: string, updates: Partial<{
    marketHealth: number;
    techUtility: number;
    teamAdoption: number;
    tokenomics: number;
    risk: number;
    notes: string;
  }>) {
    const response = await this.makeRequest("PATCH", `/ratings/${coinId}`, updates);
    return response.json();
  }

  // Transactions methods
  async getTransactions(coinId?: string) {
    const endpoint = coinId ? `/transactions?coinId=${coinId}` : "/transactions";
    const response = await this.makeRequest("GET", endpoint);
    return response.json();
  }

  async createTransaction(transaction: {
    coinId: string;
    type: "BUY" | "SELL" | "TRANSFER_IN" | "TRANSFER_OUT";
    quantity: number;
    price: number;
    fee?: number;
    timestamp?: number;
    note?: string;
  }) {
    const response = await this.makeRequest("POST", "/transactions", transaction);
    return response.json();
  }

  // DCA Plans methods
  async getDcaPlans() {
    const response = await this.makeRequest("GET", "/dca-plans");
    return response.json();
  }

  async createDcaPlan(plan: {
    coinId: string;
    amountUsd: number;
    cadence: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
    startDate: number;
    endDate?: number;
    active?: boolean;
  }) {
    const response = await this.makeRequest("POST", "/dca-plans", plan);
    return response.json();
  }

  async updateDcaPlan(planId: string, updates: Partial<{
    amountUsd: number;
    cadence: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
    startDate: number;
    endDate: number;
    active: boolean;
  }>) {
    const response = await this.makeRequest("PATCH", `/dca-plans/${planId}`, updates);
    return response.json();
  }
}

export const apiClient = new ApiClient();
