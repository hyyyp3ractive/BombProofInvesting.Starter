import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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
} from "@/components/ui/dialog";
import { 
  Star, 
  Plus, 
  Edit, 
  Trash2,
  Search,
  BarChart3,
  TrendingUp,
  Users,
  Coins,
  Shield,
  Calculator
} from "lucide-react";

interface RatingForm {
  coinId: string;
  marketHealth: number;
  techUtility: number;
  teamAdoption: number;
  tokenomics: number;
  risk: number;
  notes: string;
}

const ratingCriteria = {
  marketHealth: {
    label: "Market Health",
    icon: TrendingUp,
    description: "Liquidity, trading volume, price stability",
  },
  techUtility: {
    label: "Technology & Utility",
    icon: Coins,
    description: "Technical innovation, real-world use cases",
  },
  teamAdoption: {
    label: "Team & Adoption",
    icon: Users,
    description: "Team experience, community, partnerships",
  },
  tokenomics: {
    label: "Tokenomics",
    icon: BarChart3,
    description: "Supply mechanics, distribution, incentives",
  },
  risk: {
    label: "Risk Assessment",
    icon: Shield,
    description: "Regulatory, technical, market risks",
  },
};

export default function Ratings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingRating, setEditingRating] = useState<any>(null);
  const [formData, setFormData] = useState<RatingForm>({
    coinId: "",
    marketHealth: 3,
    techUtility: 3,
    teamAdoption: 3,
    tokenomics: 3,
    risk: 3,
    notes: "",
  });

  // Fetch user's ratings
  const { data: ratings = [], isLoading: ratingsLoading } = useQuery<any[]>({
    queryKey: ["/api/ratings"],
  });

  // Search coins for new rating
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ["/api/coins/search", searchQuery],
    queryFn: () => apiClient.searchCoins(searchQuery, 20),
    enabled: searchQuery.length >= 2,
  });

  // Create rating mutation
  const createRatingMutation = useMutation({
    mutationFn: (data: RatingForm) => apiClient.createRating(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ratings"] });
      toast({
        title: "Rating created",
        description: "Your rating has been saved successfully.",
      });
      setIsCreating(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create rating",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update rating mutation
  const updateRatingMutation = useMutation({
    mutationFn: ({ coinId, ...updates }: Partial<RatingForm> & { coinId: string }) =>
      apiClient.updateRating(coinId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ratings"] });
      toast({
        title: "Rating updated",
        description: "Your rating has been updated successfully.",
      });
      setEditingRating(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update rating",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      coinId: "",
      marketHealth: 3,
      techUtility: 3,
      teamAdoption: 3,
      tokenomics: 3,
      risk: 3,
      notes: "",
    });
  };

  const handleCreateRating = () => {
    setIsCreating(true);
    resetForm();
  };

  const handleEditRating = (rating: any) => {
    setEditingRating(rating);
    setFormData({
      coinId: rating.coinId,
      marketHealth: rating.marketHealth,
      techUtility: rating.techUtility,
      teamAdoption: rating.teamAdoption,
      tokenomics: rating.tokenomics,
      risk: rating.risk,
      notes: rating.notes || "",
    });
  };

  const handleSubmit = () => {
    if (editingRating) {
      updateRatingMutation.mutate(formData);
    } else {
      createRatingMutation.mutate(formData);
    }
  };

  const handleCoinSelect = (coinId: string) => {
    setFormData({ ...formData, coinId });
    setSearchQuery("");
  };

  const handleSliderChange = (field: keyof RatingForm, value: number[]) => {
    setFormData({ ...formData, [field]: value[0] });
  };

  const calculateTotalScore = () => {
    return formData.marketHealth + formData.techUtility + formData.teamAdoption + formData.tokenomics + formData.risk;
  };

  const filteredRatings = ratings.filter((rating: any) =>
    rating.coinId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate average scores
  const averageScores = ratings.length > 0 ? {
    marketHealth: ratings.reduce((acc: number, r: any) => acc + r.marketHealth, 0) / ratings.length,
    techUtility: ratings.reduce((acc: number, r: any) => acc + r.techUtility, 0) / ratings.length,
    teamAdoption: ratings.reduce((acc: number, r: any) => acc + r.teamAdoption, 0) / ratings.length,
    tokenomics: ratings.reduce((acc: number, r: any) => acc + r.tokenomics, 0) / ratings.length,
    risk: ratings.reduce((acc: number, r: any) => acc + r.risk, 0) / ratings.length,
  } : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ratings & Analysis</h1>
          <p className="text-muted-foreground">
            Create detailed ratings for cryptocurrencies based on key factors
          </p>
        </div>
        <Button onClick={handleCreateRating} data-testid="button-create-rating">
          <Plus className="w-4 h-4 mr-2" />
          Create Rating
        </Button>
      </div>

      {/* Stats Cards */}
      {averageScores && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(ratingCriteria).map(([key, criteria]) => {
            const Icon = criteria.icon;
            const avg = averageScores[key as keyof typeof averageScores];
            return (
              <Card key={key} className="kpi-card">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{criteria.label}</span>
                  </div>
                  <p className="text-2xl font-bold font-mono">{avg.toFixed(1)}/5</p>
                  <p className="text-xs text-muted-foreground">Average</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search your ratings..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-rating-search"
            />
          </div>
        </CardContent>
      </Card>

      {/* Ratings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Ratings ({ratings.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ratingsLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading ratings...</p>
            </div>
          ) : filteredRatings.length === 0 ? (
            <div className="p-8 text-center">
              <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {ratings.length === 0 ? "No ratings yet" : "No matching ratings"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {ratings.length === 0 
                  ? "Start by creating your first cryptocurrency rating"
                  : "Try a different search term"
                }
              </p>
              {ratings.length === 0 && (
                <Button onClick={handleCreateRating} data-testid="button-create-first-rating">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Rating
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coin</TableHead>
                    <TableHead>Market</TableHead>
                    <TableHead>Tech</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Tokenomics</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRatings.map((rating: any) => {
                    const riskLevel = getRiskLevel(rating.totalScore);
                    return (
                      <TableRow 
                        key={rating.id} 
                        className="table-row-hover"
                        data-testid={`rating-row-${rating.coinId}`}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold">
                                {rating.coinId.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{rating.coinId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{rating.marketHealth}/5</TableCell>
                        <TableCell className="font-mono">{rating.techUtility}/5</TableCell>
                        <TableCell className="font-mono">{rating.teamAdoption}/5</TableCell>
                        <TableCell className="font-mono">{rating.tokenomics}/5</TableCell>
                        <TableCell className="font-mono">{rating.risk}/5</TableCell>
                        <TableCell>
                          <span className="font-mono font-bold">{rating.totalScore}/25</span>
                        </TableCell>
                        <TableCell>
                          <RiskPill risk={riskLevel} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditRating(rating)}
                              data-testid={`button-edit-${rating.coinId}`}
                            >
                              <Edit className="w-4 h-4" />
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

      {/* Create/Edit Rating Dialog */}
      <Dialog 
        open={isCreating || !!editingRating} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreating(false);
            setEditingRating(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto" data-testid="dialog-rating-form">
          <DialogHeader>
            <DialogTitle>
              {editingRating ? "Edit Rating" : "Create New Rating"}
            </DialogTitle>
            <DialogDescription>
              Rate cryptocurrency based on key fundamental factors
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Coin Selection */}
            {!editingRating && (
              <div className="space-y-2">
                <Label>Select Cryptocurrency</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search for a coin to rate..."
                    className="pl-10"
                    value={formData.coinId || searchQuery}
                    onChange={(e) => {
                      if (!formData.coinId) {
                        setSearchQuery(e.target.value);
                      }
                    }}
                    data-testid="input-coin-selection"
                  />
                </div>
                
                {searchQuery.length >= 2 && searchResults.length > 0 && !formData.coinId && (
                  <div className="max-h-40 overflow-y-auto border border-border rounded-md">
                    {searchResults.map((coin: any) => (
                      <button
                        key={coin.id}
                        className="w-full text-left p-3 hover:bg-muted/50 flex items-center space-x-2"
                        onClick={() => handleCoinSelect(coin.id)}
                        data-testid={`coin-option-${coin.id}`}
                      >
                        <span className="font-medium">{coin.name}</span>
                        <span className="text-muted-foreground">({coin.symbol?.toUpperCase()})</span>
                      </button>
                    ))}
                  </div>
                )}
                
                {formData.coinId && (
                  <div className="p-3 bg-muted/20 rounded-md flex items-center justify-between">
                    <span>Selected: <strong>{formData.coinId}</strong></span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setFormData({ ...formData, coinId: "" })}
                    >
                      Change
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Rating Criteria */}
            <div className="space-y-6">
              {Object.entries(ratingCriteria).map(([key, criteria]) => {
                const Icon = criteria.icon;
                const value = formData[key as keyof RatingForm] as number;
                
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4 text-primary" />
                      <Label className="font-medium">{criteria.label}</Label>
                      <span className="font-mono text-sm text-muted-foreground">
                        {value}/5
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {criteria.description}
                    </p>
                    <Slider
                      value={[value]}
                      onValueChange={(value) => handleSliderChange(key as keyof RatingForm, value)}
                      max={5}
                      min={1}
                      step={1}
                      className="w-full"
                      data-testid={`slider-${key}`}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Poor</span>
                      <span>Fair</span>
                      <span>Good</span>
                      <span>Very Good</span>
                      <span>Excellent</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Score */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-5 h-5 text-primary" />
                    <span className="font-medium">Total Score</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold font-mono">
                      {calculateTotalScore()}/25
                    </span>
                    <RiskPill risk={getRiskLevel(calculateTotalScore())} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional analysis, concerns, or observations..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="textarea-rating-notes"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreating(false);
                  setEditingRating(null);
                  resetForm();
                }}
                data-testid="button-cancel-rating"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={
                  !formData.coinId || 
                  createRatingMutation.isPending || 
                  updateRatingMutation.isPending
                }
                data-testid="button-save-rating"
              >
                {createRatingMutation.isPending || updateRatingMutation.isPending
                  ? "Saving..." 
                  : editingRating 
                    ? "Update Rating" 
                    : "Create Rating"
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
