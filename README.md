# CryptoPortfolio Manager

A comprehensive cryptocurrency evaluation and portfolio management application built with React, Express, and PostgreSQL. This platform helps users discover, rate, track, and manage cryptocurrency investments with a focus on beginner-friendly tools and AI-powered insights.

## ✨ Key Features

### 🎨 Multi-Theme Experience
- **Professional Light/Dark**: Clean themes for experienced investors
- **Flower Mode**: Warm, welcoming interface for crypto beginners
- **Accessibility Options**: High contrast and cozy earth tone variants
- **System Integration**: Automatically follows device light/dark preferences

### 🤖 AI-Powered Intelligence
- **Smart Portfolio Recommendations**: Personalized crypto suggestions based on risk tolerance
- **Educational Explanations**: AI breaks down complex crypto concepts in simple terms
- **Market Analysis**: Intelligent insights and cryptocurrency comparisons
- **Risk Assessment**: Multi-criteria evaluation of crypto projects

### 📊 Comprehensive Portfolio Management
- **Real-Time Tracking**: Live portfolio performance with P&L calculations
- **Transaction Management**: Record buys, sells, and transfers automatically
- **Watchlists**: Save and monitor interesting cryptocurrencies
- **Personal Ratings**: Rate projects with 5-star system and notes

### 💰 Investment Tools
- **Dollar-Cost Averaging**: Set up automated recurring investment plans
- **Risk Management**: Customizable risk weight configurations
- **Market Data**: Real-time prices from multiple reliable sources
- **Performance Analytics**: Detailed charts and portfolio metrics

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- API access to cryptocurrency data providers

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd crypto-portfolio-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_jwt_secret_key
   OPENAI_API_KEY=your_openai_api_key (optional)
   ```

4. **Initialize the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **shadcn/ui** components built on Radix UI primitives
- **Tailwind CSS** with custom design tokens
- **TanStack Query** for server state management
- **Wouter** for lightweight routing

### Backend
- **Express.js** with TypeScript for the API server
- **Drizzle ORM** with PostgreSQL for type-safe database operations
- **JWT Authentication** with secure cookie handling
- **Multi-provider** market data integration with fallbacks

### Database
- **PostgreSQL** with comprehensive schema for users, portfolios, and transactions
- **Drizzle migrations** for safe schema evolution
- **Multi-user support** with proper data isolation

## 📱 User Experience Modes

### Beginner Mode (Flower Theme)
- Simplified interface with friendly language
- Step-by-step guidance for crypto newcomers
- AI explanations for complex concepts
- Safe default settings and recommendations

### Professional Mode
- Advanced analytics and detailed metrics
- Comprehensive portfolio management tools
- Customizable risk assessment criteria
- Full market data and research capabilities

## 🔧 Configuration

### Theme Customization
The application supports multiple themes that can be customized in `client/src/index.css`:
- Professional Dark/Light themes
- Flower Mode with warm pastels
- High contrast for accessibility
- Cozy earth tones

### API Integration
Market data is sourced from multiple providers with automatic fallback:
- CoinGecko (primary)
- Crypto.com API
- CoinMarketCap (backup)

## 🛠️ Development

### Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── contexts/      # React contexts (UI, Auth)
│   │   └── hooks/         # Custom React hooks
├── server/                # Express backend
│   ├── routes.ts         # API endpoints
│   ├── services/         # Business logic
│   └── storage.ts        # Database operations
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema definitions
└── package.json
```

### Database Operations
```bash
# Push schema changes to database
npm run db:push

# Force push if there are conflicts
npm run db:push --force

# Generate new migration
npm run db:generate
```

### Adding New Features
1. Define data types in `shared/schema.ts`
2. Update storage interface in `server/storage.ts`
3. Add API routes in `server/routes.ts`
4. Create frontend components and pages
5. Update UI context if needed

## 🔒 Security

- **JWT Authentication** with access and refresh tokens
- **Password Hashing** using bcrypt
- **Secure Cookies** for session management
- **Input Validation** with Zod schemas
- **SQL Injection Protection** via Drizzle ORM

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### Portfolio Management
- `GET /api/portfolio` - Get user portfolio
- `GET /api/transactions` - List all transactions
- `POST /api/transactions` - Add new transaction
- `GET /api/watchlist` - Get watchlist
- `POST /api/watchlist` - Add to watchlist

### Market Data
- `GET /api/coins/markets` - Top cryptocurrencies
- `GET /api/coins/search` - Search cryptocurrencies
- `GET /api/coins/:id` - Get coin details

### AI Features
- `POST /api/ai/explain` - Get AI explanation of cryptocurrency
- `POST /api/ai/compare` - Compare multiple cryptocurrencies
- `GET /api/ai/evaluations/latest` - Get latest AI market evaluation

## 🎯 Features in Detail

### AI Starter Portfolio
- Experience-based questionnaire (Beginner/Intermediate/Advanced)
- Risk tolerance assessment
- Investment amount and timeline preferences
- Personalized cryptocurrency recommendations
- Educational explanations for each suggestion

### Dollar-Cost Averaging
- Flexible scheduling (daily, weekly, monthly)
- Automatic execution tracking
- Performance monitoring
- Historical analysis

### Risk Assessment
- Customizable evaluation criteria
- Market health indicators
- Technology and utility scoring
- Team and adoption metrics
- Tokenomics analysis

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email [your-email@example.com] or create an issue in this repository.

## 🙏 Acknowledgments

- [CoinGecko](https://coingecko.com) for cryptocurrency market data
- [shadcn/ui](https://ui.shadcn.com) for beautiful UI components
- [Drizzle ORM](https://orm.drizzle.team) for type-safe database operations
- [OpenAI](https://openai.com) for AI-powered features

---

Built with ❤️ for the crypto community
