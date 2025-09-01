import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { 
  Plus, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  PieChart,
  ArrowUpDown,
  Wallet,
  Activity
} from "lucide-react";

interface TransactionForm {
  coinId: string;
  type: "BUY" | "SELL" | "TRANSFER_IN" | "TRANSFER_OUT";
  quantity: number;
  price: number;
  fee: number;
  timestamp: number;
  note: string;
}

interface Position {
  coinId: string;
  quantity: number;
  avgCost: number;
  currentValue: number;
  totalCost: number;
  pnl: number;
  pnlPercentage: number;
  allocation: number;
}

export default function Portfolio() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [formData, setFormData] = useState<TransactionForm>({
    coinId: "",
    type: "BUY",
    quantity: 0,
    price: 0,
    fee: 0,
    timestamp: Date.now() / 1000,
    note: "",
  });

  // Fetch transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
  });

  // Fetch market data for current prices
  const { data: markets = [] } = useQuery({
    queryKey: ["/api/coins/markets"],
    queryFn: () => apiClient.getMarkets("usd", 1, 100),
  });

  // Add transaction mutation
  const addTransactionMutation = useMutation({
    mutationFn: (data: TransactionForm) => apiClient.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Transaction added",
        description: "Your transaction has been recorded successfully.",
      });
      setIsAddingTransaction(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add transaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      coinId: "",
      type: "BUY",
      quantity: 0,
      price: 0,
      fee: 0,
      timestamp: Date.now() / 1000,
      note: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.coinId || formData.quantity <= 0 || formData.price <= 0) {
      toast({
        title: "Invalid input",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive",
      });
      return;
    }
    addTransactionMutation.mutate(formData);
  };

  // Calculate positions from transactions
  const positions: Position[] = (() => {
    const positionMap = new Map<string, {
      quantity: number;
      totalCost: number;
      fees: number;
    }>();

    // Process transactions to calculate positions
    transactions.forEach((tx: any) => {
      const existing = positionMap.get(tx.coinId) || { quantity: 0, totalCost: 0, fees: 0 };
      
      switch (tx.type) {
        case "BUY":
        case "TRANSFER_IN":
          existing.quantity += tx.quantity;
          existing.totalCost += tx.quantity * tx.price;
          existing.fees += tx.fee || 0;
          break;
        case "SELL":
        case "TRANSFER_OUT":
          existing.quantity -= tx.quantity;
          existing.totalCost -= tx.quantity * (existing.totalCost / (existing.quantity + tx.quantity));
          existing.fees += tx.fee || 0;
          break;
      }
      
      positionMap.set(tx.coinId, existing);
    });

    // Convert to Position objects with current market data
    const totalPortfolioValue = Array.from(positionMap.entries()).reduce((total, [coinId, pos]) => {
      if (pos.quantity <= 0) return total;
      const market = markets.find((m: any) => m.id === coinId);
      const currentPrice = market?.current_price || 0;
      return total + (pos.quantity * currentPrice);
    }, 0);

    return Array.from(positionMap.entries())
      .map(([coinId, pos]) => {
        if (pos.quantity <= 0) return null;
        
        const market = markets.find((m: any) => m.id === coinId);
        const currentPrice = market?.current_price || 0;
        const currentValue = pos.quantity * currentPrice;
        const avgCost = pos.totalCost / pos.quantity;
        const pnl = currentValue - pos.totalCost;
        const pnlPercentage = pos.totalCost > 0 ? (pnl / pos.totalCost) * 100 : 0;
        const allocation = totalPortfolioValue > 0 ? (currentValue / totalPortfolioValue) * 100 : 0;

        return {
          coinId,
          quantity: pos.quantity,
          avgCost,
          currentValue,
          totalCost: pos.totalCost,
          pnl,
          pnlPercentage,
          allocation,
        };
      })
      .filter(Boolean) as Position[];
  })();

  // Portfolio metrics
  const portfolioMetrics = {
    totalValue: positions.reduce((sum, pos) => sum + pos.currentValue, 0),
    totalCost: positions.reduce((sum, pos) => sum + pos.totalCost, 0),
    totalPnL: positions.reduce((sum, pos) => sum + pos.pnl, 0),
    totalPnLPercentage: 0,
    holdings: positions.length,
  };
  
  portfolioMetrics.totalPnLPercentage = portfolioMetrics.totalCost > 0 
    ? (portfolioMetrics.totalPnL / portfolioMetrics.totalCost) * 100 
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground">
            Track your cryptocurrency holdings and performance
          </p>
        </div>
        <Button onClick={() => setIsAddingTransaction(true)} data-testid="button-add-transaction">
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Portfolio Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold font-mono" data-testid="text-total-value">
                  ${portfolioMetrics.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-2 flex items-center">
              <span className={`text-sm font-medium ${portfolioMetrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {portfolioMetrics.totalPnL >= 0 ? '+' : ''}${portfolioMetrics.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                ({portfolioMetrics.totalPnLPercentage.toFixed(2)}%)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold font-mono" data-testid="text-total-cost">
                  ${portfolioMetrics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-muted/50 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-foreground" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">
                {transactions.length} transactions
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Holdings</p>
                <p className="text-2xl font-bold" data-testid="text-holdings-count">
                  {portfolioMetrics.holdings}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/50 rounded-xl flex items-center justify-center">
                <PieChart className="w-6 h-6 text-foreground" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">
                Active positions
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Best Performer</p>
                <p className="text-lg font-bold" data-testid="text-best-performer">
                  {positions.length > 0 
                    ? positions.sort((a, b) => b.pnlPercentage - a.pnlPercentage)[0]?.coinId.toUpperCase() 
                    : "N/A"
                  }
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-400 font-medium">
                {positions.length > 0 
                  ? `+${positions.sort((a, b) => b.pnlPercentage - a.pnlPercentage)[0]?.pnlPercentage.toFixed(2)}%`
                  : "0%"
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactionsLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading portfolio...</p>
            </div>
          ) : positions.length === 0 ? (
            <div className="p-8 text-center">
              <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No holdings yet</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking your cryptocurrency investments
              </p>
              <Button onClick={() => setIsAddingTransaction(true)} data-testid="button-add-first-transaction">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Transaction
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Avg Cost</TableHead>
                    <TableHead>Current Value</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>P&L %</TableHead>
                    <TableHead>Allocation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions
                    .sort((a, b) => b.currentValue - a.currentValue)
                    .map((position) => (
                      <TableRow 
                        key={position.coinId} 
                        className="table-row-hover"
                        data-testid={`position-row-${position.coinId}`}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold">
                                {position.coinId.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{position.coinId.toUpperCase()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {position.quantity.toFixed(6)}
                        </TableCell>
                        <TableCell className="font-mono">
                          ${position.avgCost.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono">
                          ${position.currentValue.toFixed(2)}
                        </TableCell>
                        <TableCell className={`font-mono ${position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                        </TableCell>
                        <TableCell className={`font-mono ${position.pnlPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          <div className="flex items-center space-x-1">
                            {position.pnlPercentage >= 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            <span>{position.pnlPercentage >= 0 ? '+' : ''}{position.pnlPercentage.toFixed(2)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {position.allocation.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No transactions yet</h3>
              <p className="text-muted-foreground">
                Your transaction history will appear here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions
                    .sort((a: any, b: any) => b.timestamp - a.timestamp)
                    .slice(0, 10)
                    .map((tx: any) => (
                      <TableRow 
                        key={tx.id} 
                        className="table-row-hover"
                        data-testid={`transaction-row-${tx.id}`}
                      >
                        <TableCell>
                          {new Date(tx.timestamp * 1000).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tx.type === 'BUY' || tx.type === 'TRANSFER_IN' 
                              ? 'bg-green-500/10 text-green-400' 
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {tx.type.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {tx.coinId.toUpperCase()}
                        </TableCell>
                        <TableCell className="font-mono">
                          {tx.quantity.toFixed(6)}
                        </TableCell>
                        <TableCell className="font-mono">
                          ${tx.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono">
                          ${(tx.quantity * tx.price).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {tx.note || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <Dialog open={isAddingTransaction} onOpenChange={setIsAddingTransaction}>
        <DialogContent className="max-w-md" data-testid="dialog-add-transaction">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Record a new cryptocurrency transaction
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="coinId">Coin ID</Label>
              <Input
                id="coinId"
                placeholder="e.g., bitcoin, ethereum"
                value={formData.coinId}
                onChange={(e) => setFormData({ ...formData, coinId: e.target.value })}
                data-testid="input-coin-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Transaction Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger data-testid="select-transaction-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">Buy</SelectItem>
                  <SelectItem value="SELL">Sell</SelectItem>
                  <SelectItem value="TRANSFER_IN">Transfer In</SelectItem>
                  <SelectItem value="TRANSFER_OUT">Transfer Out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formData.quantity || ""}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                  data-testid="input-quantity"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formData.price || ""}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  data-testid="input-price"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fee">Fee (USD, Optional)</Label>
              <Input
                id="fee"
                type="number"
                step="any"
                placeholder="0.00"
                value={formData.fee || ""}
                onChange={(e) => setFormData({ ...formData, fee: parseFloat(e.target.value) || 0 })}
                data-testid="input-fee"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timestamp">Date</Label>
              <Input
                id="timestamp"
                type="datetime-local"
                value={new Date(formData.timestamp * 1000).toISOString().slice(0, 16)}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  timestamp: new Date(e.target.value).getTime() / 1000 
                })}
                data-testid="input-timestamp"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Notes (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Exchange, reason, etc."
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                data-testid="textarea-note"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsAddingTransaction(false)}
                data-testid="button-cancel-transaction"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={addTransactionMutation.isPending}
                data-testid="button-save-transaction"
              >
                {addTransactionMutation.isPending ? "Adding..." : "Add Transaction"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
