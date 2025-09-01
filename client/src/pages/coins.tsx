import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RiskPill, getRiskLevel } from "@/components/ui/risk-pill";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Star, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  TrendingDown,
  Plus,
  Sparkles,
  ExternalLink,
  Info
} from "lucide-react";

export default function Coins() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoin, setSelectedCoin] = useState<any>(null);
  const [isAddingToWatchlist, setIsAddingToWatchlist] = useState(false);
  const [watchlistNotes, setWatchlistNotes] = useState("");
  const [watchlistTags, setWatchlistTags] = useState("");

  // Fetch market data
  const { data: markets = [], isLoading: marketsLoading } = useQuery({
    queryKey: ["/api/coins/markets"],
    queryFn: () => apiClient.getMarkets("usd", 1, 100),
  });

  // Fetch user's watchlist
  const { data: watchlist = [] } = useQuery<any[]>({
    queryKey: ["/api/watchlist"],
  });

  // Fetch user's ratings
  const { data: ratings = [] } = useQuery<any[]>({
    queryKey: ["/api/ratings"],
  });

  // Search coins
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ["/api/coins/search", searchQuery],
    queryFn: () => apiClient.searchCoins(searchQuery, 20),
    enabled: searchQuery.length >= 2,
  });

  // Add to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: (data: { coinId: string; tags: string; notes: string }) =>
      apiClient.addToWatchlist(data.coinId, data.tags, data.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Added to watchlist",
        description: "Coin has been added to your watchlist successfully.",
      });
      setIsAddingToWatchlist(false);
      setWatchlistNotes("");
      setWatchlistTags("");
      setSelectedCoin(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add to watchlist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove from watchlist mutation
  const removeFromWatchlistMutation = useMutation({
    mutationFn: (coinId: string) => apiClient.removeFromWatchlist(coinId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Removed from watchlist",
        description: "Coin has been removed from your watchlist.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove from watchlist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // AI explain mutation
  const explainCoinMutation = useMutation({
    mutationFn: (coinId: string) => apiClient.explainCoin(coinId),
    onSuccess: (data) => {
      toast({
        title: "AI Explanation Generated",
        description: "Check the explanation in the dialog.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "AI explanation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredCoins = searchQuery.length >= 2 ? searchResults : markets;
  const isLoading = searchQuery.length >= 2 ? searchLoading : marketsLoading;

  const isInWatchlist = (coinId: string) => {
    return watchlist.some((item: any) => item.coinId === coinId);
  };

  const getCoinRating = (coinId: string) => {
    return ratings.find((rating: any) => rating.coinId === coinId);
  };

  const handleAddToWatchlist = (coin: any) => {
    setSelectedCoin(coin);
    setIsAddingToWatchlist(true);
  };

  const handleRemoveFromWatchlist = (coinId: string) => {
    removeFromWatchlistMutation.mutate(coinId);
  };

  const handleExplainCoin = (coinId: string) => {
    explainCoinMutation.mutate(coinId);
  };

  const submitWatchlistAdd = () => {
    if (selectedCoin) {
      addToWatchlistMutation.mutate({
        coinId: selectedCoin.id,
        tags: watchlistTags,
        notes: watchlistNotes,
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cryptocurrency Markets</h1>
          <p className="text-muted-foreground">
            Discover, analyze, and track cryptocurrencies
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search coins by name or symbol..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-coin-search"
            />
          </div>
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="text-sm text-muted-foreground mt-2">
              Type at least 2 characters to search
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            {searchQuery.length >= 2 ? "Search Results" : "Top Cryptocurrencies"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading coins...</p>
            </div>
          ) : filteredCoins.length === 0 ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No coins found</h3>
              <p className="text-muted-foreground">
                {searchQuery.length >= 2 
                  ? "Try a different search term"
                  : "Unable to load market data"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Coin</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>24h%</TableHead>
                    <TableHead>Market Cap</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCoins.map((coin: any, index: number) => {
                    const rating = getCoinRating(coin.id);
                    const riskLevel = rating ? getRiskLevel(rating.totalScore) : "medium";
                    const inWatchlist = isInWatchlist(coin.id);
                    
                    return (
                      <TableRow 
                        key={coin.id} 
                        className="table-row-hover"
                        data-testid={`coin-row-${coin.id}`}
                      >
                        <TableCell className="font-mono text-sm">
                          {coin.market_cap_rank || index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {coin.image ? (
                              <img 
                                src={coin.image} 
                                alt={coin.name}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold">
                                  {coin.symbol?.charAt(0).toUpperCase() || coin.name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium" data-testid={`coin-name-${coin.id}`}>
                                {coin.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {coin.symbol?.toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono" data-testid={`coin-price-${coin.id}`}>
                          {coin.current_price ? `$${coin.current_price.toLocaleString()}` : "N/A"}
                        </TableCell>
                        <TableCell data-testid={`coin-change-${coin.id}`}>
                          {coin.price_change_percentage_24h !== undefined ? (
                            <div className="flex items-center space-x-1">
                              {coin.price_change_percentage_24h >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-400" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-400" />
                              )}
                              <span className={coin.price_change_percentage_24h >= 0 ? "text-green-400" : "text-red-400"}>
                                {coin.price_change_percentage_24h.toFixed(2)}%
                              </span>
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell className="font-mono" data-testid={`coin-mcap-${coin.id}`}>
                          {coin.market_cap ? `$${(coin.market_cap / 1e9).toFixed(2)}B` : "N/A"}
                        </TableCell>
                        <TableCell>
                          {rating ? (
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm">{rating.totalScore}/25</span>
                              <Progress 
                                value={(rating.totalScore / 25) * 100} 
                                className="w-12 h-2"
                              />
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not rated</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <RiskPill risk={riskLevel} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => 
                                inWatchlist 
                                  ? handleRemoveFromWatchlist(coin.id)
                                  : handleAddToWatchlist(coin)
                              }
                              disabled={addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending}
                              data-testid={`button-watchlist-${coin.id}`}
                            >
                              {inWatchlist ? (
                                <EyeOff className="w-4 h-4 text-yellow-400" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleExplainCoin(coin.id)}
                              disabled={explainCoinMutation.isPending}
                              data-testid={`button-explain-${coin.id}`}
                            >
                              <Sparkles className="w-4 h-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              data-testid={`button-rate-${coin.id}`}
                            >
                              <a href={`/ratings?coin=${coin.id}`}>
                                <Star className="w-4 h-4" />
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add to Watchlist Dialog */}
      <Dialog open={isAddingToWatchlist} onOpenChange={setIsAddingToWatchlist}>
        <DialogContent data-testid="dialog-add-watchlist">
          <DialogHeader>
            <DialogTitle>Add to Watchlist</DialogTitle>
            <DialogDescription>
              Add {selectedCoin?.name} to your watchlist with optional tags and notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="e.g., layer1, defi, high-risk"
                value={watchlistTags}
                onChange={(e) => setWatchlistTags(e.target.value)}
                data-testid="input-watchlist-tags"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Your analysis, thoughts, or reminders..."
                value={watchlistNotes}
                onChange={(e) => setWatchlistNotes(e.target.value)}
                data-testid="textarea-watchlist-notes"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsAddingToWatchlist(false)}
                data-testid="button-cancel-watchlist"
              >
                Cancel
              </Button>
              <Button 
                onClick={submitWatchlistAdd}
                disabled={addToWatchlistMutation.isPending}
                data-testid="button-confirm-watchlist"
              >
                {addToWatchlistMutation.isPending ? "Adding..." : "Add to Watchlist"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Explanation Dialog */}
      <Dialog 
        open={!!explainCoinMutation.data} 
        onOpenChange={() => explainCoinMutation.reset()}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto" data-testid="dialog-ai-explanation">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>AI Explanation</span>
            </DialogTitle>
            <DialogDescription>
              Generated by Groq AI • For educational purposes only
            </DialogDescription>
          </DialogHeader>
          {explainCoinMutation.data && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/20 rounded-xl">
                <h3 className="font-semibold mb-2">
                  {explainCoinMutation.data.coin.toUpperCase()}
                </h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">
                    {explainCoinMutation.data.summary}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  <Info className="w-3 h-3 inline mr-1" />
                  This explanation is AI-generated and for educational purposes only. Not financial advice.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(explainCoinMutation.data.summary);
                    toast({ title: "Copied to clipboard" });
                  }}
                  data-testid="button-copy-explanation"
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
