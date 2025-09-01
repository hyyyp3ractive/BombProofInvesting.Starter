import { apiRequest } from "./queryClient";

export interface User {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  settingsJson: any;
  createdAt?: number;
  lastLoginAt?: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export class AuthService {
  private static instance: AuthService;
  private accessToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async register(email: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/register", {
      email,
      password,
    });
    
    const data = await response.json();
    this.setAccessToken(data.accessToken);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/login", {
      email,
      password,
    });
    
    const data = await response.json();
    this.setAccessToken(data.accessToken);
    return data;
  }

  async logout(): Promise<void> {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch (error) {
      console.warn("Logout request failed:", error);
    } finally {
      this.accessToken = null;
      this.refreshPromise = null;
    }
  }

  async refreshAccessToken(): Promise<string | null> {
    // Prevent multiple concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await apiRequest("POST", "/api/auth/refresh");
        const data = await response.json();
        this.setAccessToken(data.accessToken);
        return data.accessToken;
      } catch (error) {
        console.warn("Token refresh failed:", error);
        this.accessToken = null;
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.accessToken) {
      // Try to refresh token first
      const newToken = await this.refreshAccessToken();
      if (!newToken) {
        return null;
      }
    }

    try {
      const response = await apiRequest("GET", "/api/me");
      return await response.json();
    } catch (error: any) {
      if (error.message.includes("401")) {
        // Token expired, try to refresh
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          try {
            const response = await apiRequest("GET", "/api/me");
            return await response.json();
          } catch (retryError) {
            console.warn("Failed to get user after token refresh:", retryError);
          }
        }
      }
      return null;
    }
  }

  async updateUserSettings(settingsJson: any): Promise<User> {
    const response = await apiRequest("PATCH", "/api/me", { settingsJson });
    return await response.json();
  }
}

export const authService = AuthService.getInstance();
