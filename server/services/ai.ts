import { config } from "../config";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface RateLimitInfo {
  requestsThisMinute: number;
  lastReset: number;
}

class AIService {
  private rateLimitInfo: RateLimitInfo = { requestsThisMinute: 0, lastReset: Date.now() };
  private readonly MAX_REQUESTS_PER_MINUTE = 10; // Conservative for free tier
  
  private isEnabled(): boolean {
    return !!config.GROQ_API_KEY;
  }
  
  private checkRateLimit(): boolean {
    const now = Date.now();
    const minutesSinceReset = (now - this.rateLimitInfo.lastReset) / (1000 * 60);
    
    // Reset counter every minute
    if (minutesSinceReset >= 1) {
      this.rateLimitInfo = { requestsThisMinute: 0, lastReset: now };
    }
    
    return this.rateLimitInfo.requestsThisMinute < this.MAX_REQUESTS_PER_MINUTE;
  }
  
  private async waitForRateLimit(): Promise<void> {
    if (this.checkRateLimit()) return;
    
    const timeToWait = 60000 - (Date.now() - this.rateLimitInfo.lastReset);
    console.log(`⏱️ AI rate limit reached, waiting ${Math.ceil(timeToWait / 1000)}s`);
    await new Promise(resolve => setTimeout(resolve, timeToWait));
  }
  
  async chat(messages: ChatMessage[]): Promise<string> {
    if (!this.isEnabled()) {
      throw new Error("AI features are disabled - GROQ_API_KEY not configured");
    }
    
    // Wait for rate limit if needed
    await this.waitForRateLimit();
    this.rateLimitInfo.requestsThisMinute++;
    
    const response = await fetch(`${config.GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.GROQ_MODEL,
        messages,
        temperature: config.GROQ_TEMPERATURE,
        max_tokens: config.GROQ_MAX_TOKENS,
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout for AI requests
    });
    
    if (!response.ok) {
      throw new Error(`AI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "No response generated";
  }
  
  async explainCoin(coinId: string, coinData?: any): Promise<string> {
    const systemPrompt = {
      role: "system" as const,
      content: "You are a concise crypto analyst for beginners. Be neutral, cite concrete facts (with units), and avoid financial advice. Keep responses under 300 words."
    };
    
    const userPrompt = {
      role: "user" as const,
      content: `Explain ${coinData?.name || coinId} cryptocurrency in bullet points, covering: purpose, technology, tokenomics (supply/issuance), major use cases, key competitors, primary risks, and what metrics to monitor. Use 2-3 short sentences per bullet point.`
    };
    
    return this.chat([systemPrompt, userPrompt]);
  }
  
  async compareCoins(coinIds: string[], coinDataList?: any[]): Promise<string> {
    const systemPrompt = {
      role: "system" as const,
      content: "You are a neutral crypto analyst. Be specific and concise; no financial advice. Focus on factual comparisons."
    };
    
    const coinNames = coinDataList?.map(c => c.name).join(", ") || coinIds.join(", ");
    const userPrompt = {
      role: "user" as const,
      content: `Compare these cryptocurrencies head-to-head: ${coinNames}. Cover: consensus mechanism/scalability, fees/throughput, tokenomics, ecosystem maturity, developer activity, and key risks for each. End with a monitoring checklist (key metrics to watch). Keep under 400 words.`
    };
    
    return this.chat([systemPrompt, userPrompt]);
  }

  async explainTerm(term: string): Promise<{ definition: string; example?: string; context?: string }> {
    const systemPrompt = {
      role: "system" as const,
      content: "You are a financial education expert. Explain complex financial and cryptocurrency terms in simple, beginner-friendly language. Always provide practical context for why the term matters to investors."
    };
    
    const userPrompt = {
      role: "user" as const,
      content: `Explain the financial/crypto term "${term}" in simple language. Structure your response as JSON with three fields:
      - "definition": A clear, concise explanation (1-2 sentences)
      - "example": A practical example showing the concept (1 sentence, optional)
      - "context": Why this matters to investors/users (1 sentence, optional)
      Keep it beginner-friendly and avoid jargon.`
    };
    
    try {
      const response = await this.chat([systemPrompt, userPrompt]);
      // Try to parse as JSON, fallback to structured response
      try {
        return JSON.parse(response);
      } catch {
        // If JSON parsing fails, create a structured response
        return {
          definition: response.trim(),
          context: "Understanding this term helps make better investment decisions."
        };
      }
    } catch (error) {
      console.error("Term explanation error:", error);
      // Provide fallback explanations for common terms
      const fallbackExplanations: Record<string, any> = {
        "maximum drawdown": {
          definition: "The largest peak-to-trough decline in your portfolio value during a specific period.",
          example: "If your $1000 portfolio drops to $700, that's a 30% drawdown.",
          context: "Helps you understand the worst-case scenario for potential losses."
        },
        "risk tolerance": {
          definition: "Your ability and willingness to lose money in exchange for potential gains.",
          example: "Conservative investors prefer stable returns, while aggressive investors accept high volatility.",
          context: "Determines what investments are appropriate for your situation."
        },
        "dca": {
          definition: "Dollar-Cost Averaging: investing a fixed amount regularly regardless of price.",
          example: "Buying $100 of Bitcoin every Monday for a year.",
          context: "Reduces the impact of volatility by spreading purchases over time."
        },
        "market cap": {
          definition: "The total value of all coins in circulation (price × supply).",
          example: "If a coin costs $10 and has 1 million coins, market cap is $10 million.",
          context: "Indicates the size and relative importance of a cryptocurrency."
        }
      };
      
      const key = term.toLowerCase().replace(/\s+/g, " ");
      return fallbackExplanations[key] || {
        definition: `${term} is a financial concept that affects investment decisions.`,
        context: "Understanding financial terms helps make better investment choices."
      };
    }
  }
}

export const aiService = new AIService();
