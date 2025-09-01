export const config = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://localhost:5432/crypto_evaluator",
  
  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "change_me_access",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "change_me_refresh",
  JWT_ACCESS_TTL_MIN: parseInt(process.env.JWT_ACCESS_TTL_MIN || "15"),
  JWT_REFRESH_TTL_DAYS: parseInt(process.env.JWT_REFRESH_TTL_DAYS || "7"),
  
  // Argon2
  ARGON2_MEMORY_COST: parseInt(process.env.ARGON2_MEMORY_COST || "65536"),
  ARGON2_TIME_COST: parseInt(process.env.ARGON2_TIME_COST || "3"),
  ARGON2_PARALLELISM: parseInt(process.env.ARGON2_PARALLELISM || "2"),
  
  // Market Data APIs
  COINGECKO_BASE_URL: process.env.COINGECKO_BASE_URL || "https://api.coingecko.com/api/v3",
  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY || "",
  COINMARKETCAP_API_KEY: process.env.COINMARKETCAP_API_KEY || "",
  MESSARI_API_KEY: process.env.MESSARI_API_KEY || "",
  
  // Groq AI
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",
  GROQ_BASE_URL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
  GROQ_MODEL: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
  GROQ_MAX_TOKENS: parseInt(process.env.GROQ_MAX_TOKENS || "600"),
  GROQ_TEMPERATURE: parseFloat(process.env.GROQ_TEMPERATURE || "0.2"),
  
  // Cache & HTTP
  MARKET_REFRESH_SEC: parseInt(process.env.MARKET_REFRESH_SEC || "300"),
  HTTP_TIMEOUT_SEC: parseInt(process.env.HTTP_TIMEOUT_SEC || "20"),
  HTTP_MAX_RETRIES: parseInt(process.env.HTTP_MAX_RETRIES || "4"),
  CACHE_TTL_MARKETS_SEC: parseInt(process.env.CACHE_TTL_MARKETS_SEC || "120"),
  CACHE_TTL_COIN_SEC: parseInt(process.env.CACHE_TTL_COIN_SEC || "600"),
  CACHE_TTL_HISTORY_SEC: parseInt(process.env.CACHE_TTL_HISTORY_SEC || "86400"),
  CACHE_TTL_AI_SEC: parseInt(process.env.CACHE_TTL_AI_SEC || "86400"),
  
  // App
  APP_ENV: process.env.APP_ENV || "development",
  APP_BASE_URL: process.env.APP_BASE_URL || "http://localhost:5000",
  
  // SMTP (optional)
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "587"),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
};
