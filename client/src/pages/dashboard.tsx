import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RiskPill, getRiskLevel } from "@/components/ui/risk-pill";
import { 
  DollarSign, 
  Briefcase, 
  TrendingUp, 
  Eye,
  ExternalLink,
  Activity,
  Star,
  Plus,
  BarChart3
} from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  
  // Fetch dashboard data
  const { data: watchlist = [], isLoading: watchlistLoading } = useQuery<any[]>({
    queryKey: ["/api/watchlist"],
    enabled: !!user,
  });

  const { data: ratings = [], isLoading: ratingsLoading } = useQuery<any[]>({
    queryKey: ["/api/ratings"],
    enabled: !!user,
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });

  const { data: dcaPlans = [], isLoading: dcaPlansLoading } = useQuery<any[]>({
    queryKey: ["/api/dca-plans"],
    enabled: !!user,
  });

  const { data: markets = [], isLoading: marketsLoading } = useQuery({
    queryKey: ["/api/coins/markets"],
    queryFn: () => apiClient.getMarkets("usd", 1, 50),
  });

  // Calculate portfolio metrics (simplified for demo)
  const portfolioValue = transactions.reduce((acc: number, tx: any) => {
    const value = tx.type === "BUY" || tx.type === "TRANSFER_IN" 
      ? tx.quantity * tx.price 
      : -(tx.quantity * tx.price);
    return acc + value;
  }, 0);

  const activeHoldings = Array.from(new Set(transactions.map((tx: any) => tx.coinId))).length;

  // Get top rated coins
  const topRatedCoins = ratings
    .sort((a: any, b: any) => b.totalScore - a.totalScore)
    .slice(0, 3);

  // Risk distribution
  const riskDistribution = ratings.reduce((acc: any, rating: any) => {
    const risk = getRiskLevel(rating.totalScore);
    acc[risk] = (acc[risk] || 0) + 1;
    return acc;
  }, {});

  // Recent activity (last 5 items)
  const recentActivity = [
    ...ratings.slice(0, 2).map((r: any) => ({ type: "rating", data: r })),
    ...watchlist.slice(0, 2).map((w: any) => ({ type: "watchlist", data: w })),
    ...dcaPlans.slice(0, 1).map((d: any) => ({ type: "dca", data: d })),
  ].slice(0, 3);

  const isLoading = watchlistLoading || ratingsLoading || transactionsLoading || dcaPlansLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Portfolio Value</p>
                <p className="text-2xl font-bold font-mono" data-testid="text-portfolio-value">
                  {formatCurrency(portfolioValue)}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-2 flex items-center">
              <span className="text-sm text-green-400 font-medium">
                +{formatCurrency(portfolioValue * 0.024)} (2.4%)
              </span>
              <span className="text-xs text-muted-foreground ml-2">24h</span>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Holdings</p>
                <p className="text-2xl font-bold" data-testid="text-active-holdings">
                  {activeHoldings}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/50 rounded-xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-foreground" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">
                {riskDistribution.low || 0} Low, {riskDistribution.medium || 0} Med, {riskDistribution.high || 0} High
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top Gainer</p>
                <p className="text-lg font-bold" data-testid="text-top-gainer">
                  {markets[0]?.symbol?.toUpperCase() || "N/A"}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-400 font-medium">
                {formatPercentage(markets[0]?.price_change_percentage_24h || 0)}
              </span>
              <span className="text-xs text-muted-foreground ml-2">24h</span>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Watchlist Items</p>
                <p className="text-2xl font-bold" data-testid="text-watchlist-count">
                  {watchlist.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">
                {ratings.length} ratings created
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Watchlist */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle>Watchlist</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/coins" data-testid="button-view-all-watchlist">
                    View All
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {watchlist.length === 0 ? (
                <div className="p-8 text-center">
                  <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No coins in watchlist</h3>
                  <p className="text-muted-foreground mb-4">
                    Start tracking your favorite cryptocurrencies
                  </p>
                  <Button asChild>
                    <a href="/coins" data-testid="button-add-to-watchlist">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Coins
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/20">
                      <tr className="text-left">
                        <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Coin
                        </th>
                        <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Risk
                        </th>
                        <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {watchlist.slice(0, 5).map((item: any) => {
                        const rating = ratings.find((r: any) => r.coinId === item.coinId);
                        const riskLevel = rating ? getRiskLevel(rating.totalScore) : "medium";
                        
                        return (
                          <tr 
                            key={item.id} 
                            className="table-row-hover"
                            data-testid={`watchlist-row-${item.coinId}`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-bold">
                                    {item.coinId.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{item.coinId}</p>
                                  {item.tags && (
                                    <p className="text-sm text-muted-foreground">{item.tags}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {rating ? (
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono">{rating.totalScore}/25</span>
                                  <Progress 
                                    value={(rating.totalScore / 25) * 100} 
                                    className="w-12 h-2"
                                  />
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Not rated</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <RiskPill risk={riskLevel} />
                            </td>
                            <td className="px-6 py-4">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                asChild
                                data-testid={`button-view-${item.coinId}`}
                              >
                                <a href={`/coins?q=${item.coinId}`}>
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Picks & Risk Heatmap */}
        <div className="space-y-8">
          {/* Top Picks */}
          <Card>
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle>Top Picks</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/ratings" data-testid="button-see-all-ratings">
                    See All Ratings
                  </a>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Highest scored coins</p>
            </CardHeader>
            <CardContent className="p-6">
              {topRatedCoins.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No ratings yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start rating coins to see your top picks
                  </p>
                  <Button size="sm" asChild>
                    <a href="/ratings" data-testid="button-create-rating">
                      Create Rating
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {topRatedCoins.map((rating: any) => {
                    const riskLevel = getRiskLevel(rating.totalScore);
                    return (
                      <div 
                        key={rating.id} 
                        className="flex items-center justify-between"
                        data-testid={`top-pick-${rating.coinId}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold">
                              {rating.coinId.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{rating.coinId}</p>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-mono text-muted-foreground">
                                {rating.totalScore}/25
                              </span>
                              <RiskPill risk={riskLevel} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Heatmap */}
          <Card>
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle>Risk Heatmap</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/reports" data-testid="button-full-report">
                    Full Report
                  </a>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Risk distribution by category</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-xl flex items-center justify-center bg-green-500/10 border border-green-500/20">
                    <span className="text-2xl font-bold text-green-400 font-mono" data-testid="risk-count-low">
                      {riskDistribution.low || 0}
                    </span>
                  </div>
                  <p className="text-sm font-medium">Low Risk</p>
                  <p className="text-xs text-muted-foreground">Core/Safer</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-xl flex items-center justify-center bg-yellow-500/10 border border-yellow-500/20">
                    <span className="text-2xl font-bold text-yellow-400 font-mono" data-testid="risk-count-medium">
                      {riskDistribution.medium || 0}
                    </span>
                  </div>
                  <p className="text-sm font-medium">Medium Risk</p>
                  <p className="text-xs text-muted-foreground">Growth</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/20">
                    <span className="text-2xl font-bold text-red-400 font-mono" data-testid="risk-count-high">
                      {riskDistribution.high || 0}
                    </span>
                  </div>
                  <p className="text-sm font-medium">High Risk</p>
                  <p className="text-xs text-muted-foreground">Speculative</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-xl flex items-center justify-center bg-muted border border-border">
                    <span className="text-2xl font-bold text-muted-foreground font-mono" data-testid="risk-count-quarantine">
                      {riskDistribution.quarantine || 0}
                    </span>
                  </div>
                  <p className="text-sm font-medium">Quarantine</p>
                  <p className="text-xs text-muted-foreground">Avoid</p>
                </div>
              </div>

              {ratings.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Market Health</span>
                      <span className="font-mono">
                        {(ratings.reduce((acc: number, r: any) => acc + r.marketHealth, 0) / ratings.length).toFixed(1)}/5
                      </span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Technology</span>
                      <span className="font-mono">
                        {(ratings.reduce((acc: number, r: any) => acc + r.techUtility, 0) / ratings.length).toFixed(1)}/5
                      </span>
                    </div>
                    <Progress value={84} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Team & Adoption</span>
                      <span className="font-mono">
                        {(ratings.reduce((acc: number, r: any) => acc + r.teamAdoption, 0) / ratings.length).toFixed(1)}/5
                      </span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Recent Activity</CardTitle>
          <p className="text-sm text-muted-foreground">
            Latest ratings, transactions, and watchlist changes
          </p>
        </CardHeader>
        <CardContent className="p-6">
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No recent activity</h3>
              <p className="text-sm text-muted-foreground">
                Start using the platform to see your activity here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity: any, index: number) => (
                <div 
                  key={index}
                  className="flex items-center space-x-4 p-4 bg-muted/20 rounded-xl"
                  data-testid={`activity-${activity.type}-${index}`}
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    {activity.type === "rating" && <Star className="w-5 h-5 text-primary" />}
                    {activity.type === "watchlist" && <Eye className="w-5 h-5 text-primary" />}
                    {activity.type === "dca" && <BarChart3 className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1">
                    {activity.type === "rating" && (
                      <>
                        <p className="font-medium">
                          Created rating for {activity.data.coinId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Score: {activity.data.totalScore}/25 • {activity.data.notes || "No notes"}
                        </p>
                      </>
                    )}
                    {activity.type === "watchlist" && (
                      <>
                        <p className="font-medium">
                          Added {activity.data.coinId} to watchlist
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Tags: {activity.data.tags || "None"}
                        </p>
                      </>
                    )}
                    {activity.type === "dca" && (
                      <>
                        <p className="font-medium">
                          Created DCA plan for {activity.data.coinId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ${activity.data.amountUsd} {activity.data.cadence.toLowerCase()}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Recently</p>
                    {activity.type === "rating" && (
                      <RiskPill risk={getRiskLevel(activity.data.totalScore)} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Disclaimer */}
      <div className="bg-card border border-border rounded-2xl p-4 text-center">
        <p className="text-xs text-muted-foreground">
          <strong>Disclaimer:</strong> This application is for educational and research purposes only. 
          All information provided is not financial advice and should not be used as the sole basis for investment decisions. 
          Cryptocurrency investments carry significant risk of loss.
        </p>
      </div>
    </div>
  );
}
