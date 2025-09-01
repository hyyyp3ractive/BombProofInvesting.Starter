import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Activity,
  PieChart,
  Calendar,
  BarChart3,
  Target,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Sparkles,
  RefreshCw,
  Brain,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercentage: number;
  bestPerformer: { coinId: string; pnl: number; pnlPercentage: number } | null;
  worstPerformer: { coinId: string; pnl: number; pnlPercentage: number } | null;
  holdings: number;
  totalTransactions: number;
  avgHoldingPeriod: number;
}

interface TransactionSummary {
  totalBuys: number;
  totalSells: number;
  totalBuyVolume: number;
  totalSellVolume: number;
  totalFees: number;
  mostTradedCoin: string | null;
  recentActivity: { date: string; count: number }[];
}

export default function Reports() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState("all");

  // Fetch data
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: markets = [] } = useQuery({
    queryKey: ["/api/coins/markets"],
    queryFn: () => apiClient.getMarkets("usd", 1, 100),
  });

  const { data: dcaPlans = [] } = useQuery<any[]>({
    queryKey: ["/api/dca-plans"],
  });

  const { data: ratings = [] } = useQuery<any[]>({
    queryKey: ["/api/ratings"],
  });
  
  // AI Evaluation data
  const { data: latestEvaluation, isLoading: evaluationLoading, refetch: refetchEvaluation } = useQuery({
    queryKey: ["/api/ai/evaluations/latest"],
    queryFn: () => apiClient.getLatestAiEvaluation(),
    retry: false,
  });
  
  const runEvaluationMutation = useMutation({
    mutationFn: () => apiClient.runAiEvaluation(),
    onSuccess: (data) => {
      toast({
        title: "AI Evaluation Started",
        description: "The AI is analyzing the market. This may take a minute.",
      });
      // Poll for results after a delay
      setTimeout(() => {
        refetchEvaluation();
      }, 5000);
    },
    onError: (error: any) => {
      toast({
        title: "Evaluation Failed",
        description: error.message || "Could not start AI evaluation",
        variant: "destructive",
      });
    },
  });

  // Filter transactions by time range
  const filteredTransactions = useMemo(() => {
    if (timeRange === "all") return transactions;
    
    const now = Date.now() / 1000;
    let cutoffTime = now;
    
    switch (timeRange) {
      case "7d":
        cutoffTime = now - 7 * 24 * 60 * 60;
        break;
      case "30d":
        cutoffTime = now - 30 * 24 * 60 * 60;
        break;
      case "90d":
        cutoffTime = now - 90 * 24 * 60 * 60;
        break;
      case "1y":
        cutoffTime = now - 365 * 24 * 60 * 60;
        break;
    }
    
    return transactions.filter((tx: any) => tx.timestamp >= cutoffTime);
  }, [transactions, timeRange]);

  // Calculate portfolio metrics
  const portfolioMetrics: PortfolioMetrics = useMemo(() => {
    const positionMap = new Map<string, {
      quantity: number;
      totalCost: number;
      fees: number;
      firstBuyTime: number;
    }>();

    // Process transactions to calculate positions
    filteredTransactions.forEach((tx: any) => {
      const existing = positionMap.get(tx.coinId) || { 
        quantity: 0, 
        totalCost: 0, 
        fees: 0,
        firstBuyTime: tx.timestamp 
      };
      
      switch (tx.type) {
        case "BUY":
        case "TRANSFER_IN":
          existing.quantity += tx.quantity;
          existing.totalCost += tx.quantity * tx.price;
          existing.fees += tx.fee || 0;
          if (tx.timestamp < existing.firstBuyTime) {
            existing.firstBuyTime = tx.timestamp;
          }
          break;
        case "SELL":
        case "TRANSFER_OUT":
          if (existing.quantity > 0) {
            const avgCost = existing.totalCost / existing.quantity;
            existing.quantity -= tx.quantity;
            existing.totalCost = existing.quantity * avgCost;
          }
          existing.fees += tx.fee || 0;
          break;
      }
      
      positionMap.set(tx.coinId, existing);
    });

    // Calculate current values and P&L
    let totalValue = 0;
    let totalCost = 0;
    let bestPerformer: { coinId: string; pnl: number; pnlPercentage: number } | null = null;
    let worstPerformer: { coinId: string; pnl: number; pnlPercentage: number } | null = null;
    let totalHoldingPeriod = 0;
    let holdingsCount = 0;

    Array.from(positionMap.entries()).forEach(([coinId, pos]) => {
      if (pos.quantity <= 0) return;
      
      holdingsCount++;
      const market = markets.find((m: any) => m.id === coinId);
      const currentPrice = market?.current_price || 0;
      const currentValue = pos.quantity * currentPrice;
      const pnl = currentValue - pos.totalCost;
      const pnlPercentage = pos.totalCost > 0 ? (pnl / pos.totalCost) * 100 : 0;
      
      totalValue += currentValue;
      totalCost += pos.totalCost;
      
      const holdingDays = (Date.now() / 1000 - pos.firstBuyTime) / (24 * 60 * 60);
      totalHoldingPeriod += holdingDays;
      
      if (!bestPerformer || pnlPercentage > bestPerformer.pnlPercentage) {
        bestPerformer = { coinId, pnl, pnlPercentage };
      }
      
      if (!worstPerformer || pnlPercentage < worstPerformer.pnlPercentage) {
        worstPerformer = { coinId, pnl, pnlPercentage };
      }
    });

    const totalPnL = totalValue - totalCost;
    const totalPnLPercentage = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    const avgHoldingPeriod = holdingsCount > 0 ? totalHoldingPeriod / holdingsCount : 0;

    return {
      totalValue,
      totalCost,
      totalPnL,
      totalPnLPercentage,
      bestPerformer,
      worstPerformer,
      holdings: holdingsCount,
      totalTransactions: filteredTransactions.length,
      avgHoldingPeriod,
    };
  }, [filteredTransactions, markets]);

  // Calculate transaction summary
  const transactionSummary: TransactionSummary = useMemo(() => {
    const coinCounts = new Map<string, number>();
    let totalBuys = 0;
    let totalSells = 0;
    let totalBuyVolume = 0;
    let totalSellVolume = 0;
    let totalFees = 0;
    
    // Activity by date
    const activityByDate = new Map<string, number>();
    
    filteredTransactions.forEach((tx: any) => {
      // Count by type
      if (tx.type === "BUY" || tx.type === "TRANSFER_IN") {
        totalBuys++;
        totalBuyVolume += tx.quantity * tx.price;
      } else {
        totalSells++;
        totalSellVolume += tx.quantity * tx.price;
      }
      
      totalFees += tx.fee || 0;
      
      // Track most traded coin
      coinCounts.set(tx.coinId, (coinCounts.get(tx.coinId) || 0) + 1);
      
      // Track activity by date
      const date = new Date(tx.timestamp * 1000).toLocaleDateString();
      activityByDate.set(date, (activityByDate.get(date) || 0) + 1);
    });
    
    // Find most traded coin
    let mostTradedCoin = null;
    let maxTrades = 0;
    coinCounts.forEach((count, coinId) => {
      if (count > maxTrades) {
        maxTrades = count;
        mostTradedCoin = coinId;
      }
    });
    
    // Get recent 7 days activity
    const recentActivity: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString();
      recentActivity.push({
        date: dateStr,
        count: activityByDate.get(dateStr) || 0,
      });
    }
    
    return {
      totalBuys,
      totalSells,
      totalBuyVolume,
      totalSellVolume,
      totalFees,
      mostTradedCoin,
      recentActivity,
    };
  }, [filteredTransactions]);

  // DCA metrics
  const dcaMetrics = useMemo(() => {
    const activePlans = dcaPlans.filter((plan: any) => plan.active);
    const totalMonthlyInvestment = activePlans.reduce((sum: number, plan: any) => {
      const multiplier = plan.cadence === "WEEKLY" ? 4 : plan.cadence === "BIWEEKLY" ? 2 : 1;
      return sum + (plan.amountUsd * multiplier);
    }, 0);
    
    return {
      activePlans: activePlans.length,
      totalPlans: dcaPlans.length,
      totalMonthlyInvestment,
    };
  }, [dcaPlans]);

  // Rating metrics
  const ratingMetrics = useMemo(() => {
    if (ratings.length === 0) return { avgScore: 0, totalRated: 0, topRated: null };
    
    const avgScore = ratings.reduce((sum: number, r: any) => sum + r.totalScore, 0) / ratings.length;
    const topRated = ratings.sort((a: any, b: any) => b.totalScore - a.totalScore)[0];
    
    return {
      avgScore,
      totalRated: ratings.length,
      topRated: topRated ? { coinId: topRated.coinId, score: topRated.totalScore } : null,
    };
  }, [ratings]);

  if (transactionsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and performance metrics
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]" data-testid="select-time-range">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* AI Evaluation Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Brain className="w-5 h-5 mr-2 text-primary" />
              AI Market Evaluation
            </CardTitle>
            <Button
              onClick={() => runEvaluationMutation.mutate()}
              disabled={runEvaluationMutation.isPending}
              size="sm"
              data-testid="button-run-evaluation"
            >
              {runEvaluationMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {evaluationLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : latestEvaluation && latestEvaluation.status === "completed" ? (
            <div className="space-y-4">
              {/* AI Picks */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">AI Recommended Portfolio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(latestEvaluation.picks as any[])?.slice(0, 6).map((pick: any, index: number) => (
                    <div 
                      key={pick.coinId} 
                      className="p-3 bg-muted/20 rounded-lg border border-border/50"
                      data-testid={`ai-pick-${pick.coinId}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{pick.symbol?.toUpperCase() || pick.coinId}</span>
                        <span className="text-lg font-bold text-primary">{pick.allocation}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{pick.reasoning}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span>Risk: {pick.riskScore}/10</span>
                        <span className="text-green-400">{pick.expectedReturn}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Summary */}
              {latestEvaluation.summary && (
                <div className="p-4 bg-muted/10 rounded-lg">
                  <p className="text-sm">{latestEvaluation.summary}</p>
                </div>
              )}
              
              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Last updated: {new Date(latestEvaluation.createdAt * 1000).toLocaleString()}
                </div>
                {(latestEvaluation.metadata as any)?.marketCondition && (
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full">
                    Market: {(latestEvaluation.metadata as any).marketCondition}
                  </span>
                )}
              </div>
            </div>
          ) : latestEvaluation && latestEvaluation.status === "processing" ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">AI is analyzing the market...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take up to a minute</p>
            </div>
          ) : latestEvaluation && latestEvaluation.status === "failed" ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Evaluation failed</p>
              <p className="text-xs text-destructive mt-1">{latestEvaluation.error}</p>
              <Button 
                onClick={() => runEvaluationMutation.mutate()} 
                size="sm" 
                className="mt-4"
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No AI evaluation available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Run an AI analysis to get personalized crypto recommendations
              </p>
              <Button 
                onClick={() => runEvaluationMutation.mutate()} 
                size="sm" 
                className="mt-4"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Start Analysis
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Performance Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Portfolio Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold font-mono" data-testid="text-report-total-value">
                    ${portfolioMetrics.totalValue.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </p>
                  <div className="flex items-center mt-2">
                    {portfolioMetrics.totalPnL >= 0 ? (
                      <ArrowUp className="w-4 h-4 text-green-400 mr-1" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-400 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${
                      portfolioMetrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {portfolioMetrics.totalPnLPercentage.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total P&L</p>
                  <p className={`text-2xl font-bold font-mono ${
                    portfolioMetrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                  }`} data-testid="text-report-total-pnl">
                    {portfolioMetrics.totalPnL >= 0 ? '+' : ''}
                    ${portfolioMetrics.totalPnL.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    From ${portfolioMetrics.totalCost.toFixed(2)} invested
                  </p>
                </div>
                {portfolioMetrics.totalPnL >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-400 opacity-20" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-400 opacity-20" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Best Performer</p>
                  {portfolioMetrics.bestPerformer ? (
                    <>
                      <p className="text-lg font-bold" data-testid="text-report-best-performer">
                        {portfolioMetrics.bestPerformer.coinId.toUpperCase()}
                      </p>
                      <p className="text-sm text-green-400 mt-1">
                        +{portfolioMetrics.bestPerformer.pnlPercentage.toFixed(2)}%
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-bold">N/A</p>
                  )}
                </div>
                <TrendingUp className="w-8 h-8 text-green-400 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Worst Performer</p>
                  {portfolioMetrics.worstPerformer ? (
                    <>
                      <p className="text-lg font-bold" data-testid="text-report-worst-performer">
                        {portfolioMetrics.worstPerformer.coinId.toUpperCase()}
                      </p>
                      <p className="text-sm text-red-400 mt-1">
                        {portfolioMetrics.worstPerformer.pnlPercentage.toFixed(2)}%
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-bold">N/A</p>
                  )}
                </div>
                <TrendingDown className="w-8 h-8 text-red-400 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transaction Analytics Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Transaction Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold" data-testid="text-report-transactions">
                    {portfolioMetrics.totalTransactions}
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-sm">
                      <span className="text-green-400">{transactionSummary.totalBuys}</span> buys
                    </span>
                    <span className="text-sm">
                      <span className="text-red-400">{transactionSummary.totalSells}</span> sells
                    </span>
                  </div>
                </div>
                <Activity className="w-8 h-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Trading Volume</p>
                  <p className="text-2xl font-bold font-mono" data-testid="text-report-volume">
                    ${(transactionSummary.totalBuyVolume + transactionSummary.totalSellVolume).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Fees: ${transactionSummary.totalFees.toFixed(2)}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Most Traded</p>
                  <p className="text-lg font-bold" data-testid="text-report-most-traded">
                    {transactionSummary.mostTradedCoin?.toUpperCase() || "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Avg hold: {portfolioMetrics.avgHoldingPeriod.toFixed(0)} days
                  </p>
                </div>
                <PieChart className="w-8 h-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DCA Plans Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              DCA Investment Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Plans</span>
                <span className="font-medium" data-testid="text-report-active-dca">
                  {dcaMetrics.activePlans} / {dcaMetrics.totalPlans}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Investment</span>
                <span className="font-medium font-mono">
                  ${dcaMetrics.totalMonthlyInvestment.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projected Annual</span>
                <span className="font-medium font-mono">
                  ${(dcaMetrics.totalMonthlyInvestment * 12).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ratings Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Rating Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coins Rated</span>
                <span className="font-medium" data-testid="text-report-rated-coins">
                  {ratingMetrics.totalRated}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Score</span>
                <span className="font-medium">
                  {ratingMetrics.avgScore.toFixed(1)} / 25
                </span>
              </div>
              {ratingMetrics.topRated && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Top Rated</span>
                  <span className="font-medium">
                    {ratingMetrics.topRated.coinId.toUpperCase()} ({ratingMetrics.topRated.score}/25)
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Recent Activity (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between h-32 space-x-2">
            {transactionSummary.recentActivity.map((day, index) => {
              const maxCount = Math.max(...transactionSummary.recentActivity.map(d => d.count), 1);
              const heightPercentage = (day.count / maxCount) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-primary/20 rounded-t relative" style={{ 
                    height: `${heightPercentage}%`,
                    minHeight: day.count > 0 ? '4px' : '0'
                  }}>
                    {day.count > 0 && (
                      <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
                        {day.count}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground mt-2">
                    {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}