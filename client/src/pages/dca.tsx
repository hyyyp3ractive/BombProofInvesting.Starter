import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Calendar,
  DollarSign,
  TrendingUp,
  Play,
  Pause,
  Edit,
  BarChart3,
  Clock,
  Target,
  Activity,
  Search
} from "lucide-react";

interface DcaPlanForm {
  coinId: string;
  amountUsd: number;
  cadence: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  startDate: number;
  endDate?: number;
  active: boolean;
}

export default function DCA() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<DcaPlanForm>({
    coinId: "",
    amountUsd: 100,
    cadence: "WEEKLY",
    startDate: Math.floor(Date.now() / 1000),
    active: true,
  });

  // Fetch DCA plans
  const { data: dcaPlans = [], isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ["/api/dca-plans"],
  });

  // Fetch market data for calculations
  const { data: markets = [] } = useQuery({
    queryKey: ["/api/coins/markets"],
    queryFn: () => apiClient.getMarkets("usd", 1, 100),
  });

  // Search coins for new plan
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ["/api/coins/search", searchQuery],
    queryFn: () => apiClient.searchCoins(searchQuery, 20),
    enabled: searchQuery.length >= 2,
  });

  // Create DCA plan mutation
  const createPlanMutation = useMutation({
    mutationFn: (data: DcaPlanForm) => apiClient.createDcaPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dca-plans"] });
      toast({
        title: "DCA plan created",
        description: "Your dollar-cost averaging plan has been set up successfully.",
      });
      setIsCreatingPlan(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create DCA plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update DCA plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: ({ planId, ...updates }: Partial<DcaPlanForm> & { planId: string }) =>
      apiClient.updateDcaPlan(planId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dca-plans"] });
      toast({
        title: "DCA plan updated",
        description: "Your plan has been updated successfully.",
      });
      setEditingPlan(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update DCA plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      coinId: "",
      amountUsd: 100,
      cadence: "WEEKLY",
      startDate: Math.floor(Date.now() / 1000),
      active: true,
    });
    setSearchQuery("");
  };

  const handleCreatePlan = () => {
    setIsCreatingPlan(true);
    resetForm();
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      coinId: plan.coinId,
      amountUsd: plan.amountUsd,
      cadence: plan.cadence,
      startDate: plan.startDate,
      endDate: plan.endDate,
      active: plan.active,
    });
  };

  const handleSubmit = () => {
    if (!formData.coinId || formData.amountUsd <= 0) {
      toast({
        title: "Invalid input",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive",
      });
      return;
    }

    if (editingPlan) {
      updatePlanMutation.mutate({ planId: editingPlan.id, ...formData });
    } else {
      createPlanMutation.mutate(formData);
    }
  };

  const handleCoinSelect = (coinId: string) => {
    setFormData({ ...formData, coinId });
    setSearchQuery("");
  };

  const togglePlanActive = (planId: string, active: boolean) => {
    updatePlanMutation.mutate({ planId, active });
  };

  // Calculate plan metrics
  const calculateNextExecution = (plan: any) => {
    const now = Date.now() / 1000;
    const dayInSeconds = 24 * 60 * 60;
    let intervalDays;
    
    switch (plan.cadence) {
      case "WEEKLY":
        intervalDays = 7;
        break;
      case "BIWEEKLY":
        intervalDays = 14;
        break;
      case "MONTHLY":
        intervalDays = 30;
        break;
      default:
        intervalDays = 7;
    }
    
    const daysSinceStart = Math.floor((now - plan.startDate) / dayInSeconds);
    const executionCount = Math.floor(daysSinceStart / intervalDays);
    const nextExecution = plan.startDate + ((executionCount + 1) * intervalDays * dayInSeconds);
    
    return {
      nextExecution,
      executionCount,
      totalInvested: executionCount * plan.amountUsd,
    };
  };

  // Portfolio metrics from active plans
  const portfolioMetrics = {
    activePlans: dcaPlans.filter((plan: any) => plan.active).length,
    totalMonthlyDCA: dcaPlans
      .filter((plan: any) => plan.active)
      .reduce((sum: number, plan: any) => {
        const monthlyAmount = plan.cadence === "WEEKLY" 
          ? plan.amountUsd * 4.33
          : plan.cadence === "BIWEEKLY"
            ? plan.amountUsd * 2.17
            : plan.amountUsd;
        return sum + monthlyAmount;
      }, 0),
    totalInvested: dcaPlans.reduce((sum: number, plan: any) => {
      const metrics = calculateNextExecution(plan);
      return sum + metrics.totalInvested;
    }, 0),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dollar-Cost Averaging</h1>
          <p className="text-muted-foreground">
            Automate your cryptocurrency investments with recurring purchases
          </p>
        </div>
        <Button onClick={handleCreatePlan} data-testid="button-create-dca-plan">
          <Plus className="w-4 h-4 mr-2" />
          Create DCA Plan
        </Button>
      </div>

      {/* Portfolio Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Plans</p>
                <p className="text-2xl font-bold" data-testid="text-active-plans">
                  {portfolioMetrics.activePlans}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">
                {dcaPlans.length - portfolioMetrics.activePlans} paused
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly DCA</p>
                <p className="text-2xl font-bold font-mono" data-testid="text-monthly-dca">
                  ${portfolioMetrics.totalMonthlyDCA.toFixed(0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">
                Recurring investment
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Invested</p>
                <p className="text-2xl font-bold font-mono" data-testid="text-total-invested">
                  ${portfolioMetrics.totalInvested.toFixed(0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">
                Via DCA execution
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DCA Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your DCA Plans</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {plansLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading DCA plans...</p>
            </div>
          ) : dcaPlans.length === 0 ? (
            <div className="p-8 text-center">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No DCA plans yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first dollar-cost averaging plan to start investing regularly
              </p>
              <Button onClick={handleCreatePlan} data-testid="button-create-first-dca">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First DCA Plan
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Next Purchase</TableHead>
                    <TableHead>Total Invested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dcaPlans.map((plan: any) => {
                    const metrics = calculateNextExecution(plan);
                    const nextDate = new Date(metrics.nextExecution * 1000);
                    const isUpcoming = metrics.nextExecution > Date.now() / 1000;
                    
                    return (
                      <TableRow 
                        key={plan.id} 
                        className="table-row-hover"
                        data-testid={`dca-plan-row-${plan.coinId}`}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold">
                                {plan.coinId.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{plan.coinId.toUpperCase()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          ${plan.amountUsd.toFixed(0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {plan.cadence.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(plan.startDate * 1000).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {plan.active ? (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4 text-primary" />
                              <span className="text-sm">
                                {isUpcoming ? nextDate.toLocaleDateString() : "Overdue"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Paused</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">
                          ${metrics.totalInvested.toFixed(0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={plan.active ? "default" : "secondary"}
                              className={plan.active ? "bg-green-500/10 text-green-400 border-green-500/20" : ""}
                            >
                              {plan.active ? "Active" : "Paused"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => togglePlanActive(plan.id, !plan.active)}
                              disabled={updatePlanMutation.isPending}
                              data-testid={`button-toggle-${plan.id}`}
                            >
                              {plan.active ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditPlan(plan)}
                              data-testid={`button-edit-${plan.id}`}
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

      {/* DCA Education */}
      <Card>
        <CardHeader>
          <CardTitle>About Dollar-Cost Averaging</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Reduce Volatility</h3>
              <p className="text-sm text-muted-foreground">
                Smooth out price fluctuations by investing regularly over time
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="font-medium mb-2">Disciplined Investing</h3>
              <p className="text-sm text-muted-foreground">
                Remove emotion from timing decisions with automated purchases
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Target className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="font-medium mb-2">Long-term Focus</h3>
              <p className="text-sm text-muted-foreground">
                Build positions gradually for long-term wealth accumulation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit DCA Plan Dialog */}
      <Dialog 
        open={isCreatingPlan || !!editingPlan} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreatingPlan(false);
            setEditingPlan(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md" data-testid="dialog-dca-plan-form">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Edit DCA Plan" : "Create DCA Plan"}
            </DialogTitle>
            <DialogDescription>
              Set up recurring cryptocurrency purchases
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Coin Selection */}
            {!editingPlan && (
              <div className="space-y-2">
                <Label>Select Cryptocurrency</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search for a coin..."
                    className="pl-10"
                    value={formData.coinId || searchQuery}
                    onChange={(e) => {
                      if (!formData.coinId) {
                        setSearchQuery(e.target.value);
                      }
                    }}
                    data-testid="input-dca-coin-selection"
                  />
                </div>
                
                {searchQuery.length >= 2 && searchResults.length > 0 && !formData.coinId && (
                  <div className="max-h-40 overflow-y-auto border border-border rounded-md">
                    {searchResults.map((coin: any) => (
                      <button
                        key={coin.id}
                        className="w-full text-left p-3 hover:bg-muted/50 flex items-center space-x-2"
                        onClick={() => handleCoinSelect(coin.id)}
                        data-testid={`dca-coin-option-${coin.id}`}
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

            <div className="space-y-2">
              <Label htmlFor="amountUsd">Investment Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="amountUsd"
                  type="number"
                  step="1"
                  min="1"
                  placeholder="100"
                  className="pl-10"
                  value={formData.amountUsd || ""}
                  onChange={(e) => setFormData({ ...formData, amountUsd: parseFloat(e.target.value) || 0 })}
                  data-testid="input-dca-amount"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cadence">Purchase Frequency</Label>
              <Select 
                value={formData.cadence} 
                onValueChange={(value: any) => setFormData({ ...formData, cadence: value })}
              >
                <SelectTrigger data-testid="select-dca-cadence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={new Date(formData.startDate * 1000).toISOString().split('T')[0]}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  startDate: new Date(e.target.value).getTime() / 1000 
                })}
                data-testid="input-dca-start-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate ? new Date(formData.endDate * 1000).toISOString().split('T')[0] : ""}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  endDate: e.target.value ? new Date(e.target.value).getTime() / 1000 : undefined
                })}
                data-testid="input-dca-end-date"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                data-testid="switch-dca-active"
              />
              <Label htmlFor="active">Start plan immediately</Label>
            </div>

            {/* Plan Summary */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Plan Summary</h4>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Investment:</span>{" "}
                    <span className="font-mono">${formData.amountUsd}</span> {formData.cadence.toLowerCase()}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Monthly equivalent:</span>{" "}
                    <span className="font-mono">
                      ${(formData.cadence === "WEEKLY" 
                        ? formData.amountUsd * 4.33
                        : formData.cadence === "BIWEEKLY"
                          ? formData.amountUsd * 2.17
                          : formData.amountUsd
                      ).toFixed(0)}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Yearly equivalent:</span>{" "}
                    <span className="font-mono">
                      ${(formData.cadence === "WEEKLY" 
                        ? formData.amountUsd * 52
                        : formData.cadence === "BIWEEKLY"
                          ? formData.amountUsd * 26
                          : formData.amountUsd * 12
                      ).toFixed(0)}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreatingPlan(false);
                  setEditingPlan(null);
                  resetForm();
                }}
                data-testid="button-cancel-dca"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={
                  !formData.coinId || 
                  formData.amountUsd <= 0 ||
                  createPlanMutation.isPending || 
                  updatePlanMutation.isPending
                }
                data-testid="button-save-dca"
              >
                {createPlanMutation.isPending || updatePlanMutation.isPending
                  ? "Saving..." 
                  : editingPlan 
                    ? "Update Plan" 
                    : "Create Plan"
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
