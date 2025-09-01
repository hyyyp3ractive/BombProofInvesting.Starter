import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FinancialTerm } from "@/components/ui/term-tooltip";
import { useUI } from "@/contexts/ui-context";
import { 
  Sparkles, 
  TrendingUp, 
  Shield, 
  DollarSign,
  PieChart,
  Save,
  Download,
  AlertTriangle,
  Brain,
  RefreshCw,
  Flower
} from "lucide-react";

interface IntakeData {
  experience: "Beginner" | "Intermediate" | "Advanced";
  riskTolerance: "Conservative" | "Balanced" | "Aggressive";
  horizon: "Short" | "Medium" | "Long";
  maxDrawdownComfort: 15 | 30 | 50;
  monthlyContributionUsd: number;
  initialLumpSumUsd?: number;
  preferredCategories: string[];
  exclusions: {
    coins: string[];
    categories: string[];
  };
  liquidity: {
    minMarketCapUsd: number;
    minVolToMcap: number;
  };
  holdingsRange: [number, number];
  rebalance: "Quarterly" | "Semiannual" | "Annual";
  stablecoinBufferPct: number;
  practiceMode?: boolean;
}

interface AllocationItem {
  coinId: string;
  symbol: string;
  name: string;
  role: "core" | "satellite" | "stable";
  bucket: "Low" | "Medium" | "High";
  allocationPct: number;
  reasons: string[];
  risks: string[];
  dca: {
    amountUsd: number;
    cadence: string;
  };
}

const CATEGORIES = [
  "L1", "L2/Scaling", "DeFi", "Infra/Data", "AI", 
  "RWA", "Privacy", "Gaming", "Meme", "Stable"
];

const POPULAR_EXCLUSIONS = [
  "DOGE", "SHIB", "PEPE", "FLOKI", "BONK"
];

export default function StarterPortfolio() {
  const { toast } = useToast();
  const { beginnerMode, currentTheme } = useUI();
  const [currentStep, setCurrentStep] = useState<"intake" | "preview" | "saved">("intake");
  const [generatedPortfolio, setGeneratedPortfolio] = useState<any>(null);
  const [portfolioName, setPortfolioName] = useState("");
  
  const [intake, setIntake] = useState<IntakeData>({
    experience: "Beginner",
    riskTolerance: "Balanced",
    horizon: "Medium",
    maxDrawdownComfort: 30,
    monthlyContributionUsd: 500,
    initialLumpSumUsd: 1000,
    preferredCategories: ["L1", "L2/Scaling", "DeFi"],
    exclusions: {
      coins: [],
      categories: ["Meme"],
    },
    liquidity: {
      minMarketCapUsd: 1000000000, // $1B
      minVolToMcap: 0.005, // 0.5%
    },
    holdingsRange: [8, 12],
    rebalance: "Quarterly",
    stablecoinBufferPct: 5,
    practiceMode: true,
  });

  const generatePortfolioMutation = useMutation({
    mutationFn: (intakeData: IntakeData) => apiClient.generateStarterPortfolio(intakeData),
    onSuccess: (data) => {
      setGeneratedPortfolio(data);
      setCurrentStep("preview");
      toast({
        title: "Portfolio Generated",
        description: "Your AI-powered starter portfolio is ready for review.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Could not generate portfolio",
        variant: "destructive",
      });
    },
  });

  const savePortfolioMutation = useMutation({
    mutationFn: () => apiClient.saveStarterPortfolio(portfolioName, intake, generatedPortfolio),
    onSuccess: () => {
      setCurrentStep("saved");
      toast({
        title: "Portfolio Saved",
        description: "Your starter portfolio has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Could not save portfolio",
        variant: "destructive",
      });
    },
  });

  const updateIntake = (field: keyof IntakeData, value: any) => {
    setIntake(prev => ({ ...prev, [field]: value }));
    
    // Auto-toggle beginner mode based on experience level
    if (field === "experience") {
      setBeginnerMode(value === "Beginner");
    }
  };

  const toggleCategory = (category: string) => {
    setIntake(prev => ({
      ...prev,
      preferredCategories: prev.preferredCategories.includes(category)
        ? prev.preferredCategories.filter(c => c !== category)
        : [...prev.preferredCategories, category]
    }));
  };

  const toggleExcludedCoin = (coin: string) => {
    setIntake(prev => ({
      ...prev,
      exclusions: {
        ...prev.exclusions,
        coins: prev.exclusions.coins.includes(coin)
          ? prev.exclusions.coins.filter(c => c !== coin)
          : [...prev.exclusions.coins, coin]
      }
    }));
  };

  const getBucketColor = (bucket: string) => {
    switch (bucket) {
      case "Low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "High": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };
  
  // Beginner-friendly bucket labels
  const getFriendlyBucketLabel = (bucket: string) => {
    if (!beginnerMode) return bucket;
    switch (bucket) {
      case "Low": return "Chill (Low Risk) 🌱";
      case "Medium": return "Balanced (Medium Risk) ⚖️";
      case "High": return "Spicy (High Risk) 🌶️";
      default: return bucket;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "core": return <Shield className="w-4 h-4" />;
      case "satellite": return <TrendingUp className="w-4 h-4" />;
      case "stable": return <DollarSign className="w-4 h-4" />;
      default: return <PieChart className="w-4 h-4" />;
    }
  };

  if (currentStep === "saved") {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
            <Save className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold">Portfolio Saved!</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your AI-generated starter portfolio "{portfolioName}" has been saved. You can view it anytime in your portfolio dashboard.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button onClick={() => setCurrentStep("intake")} variant="outline">
              Create Another
            </Button>
            <Button onClick={() => window.location.href = "/portfolio"}>
              View Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "preview" && generatedPortfolio) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Brain className="w-8 h-8 mr-3 text-primary" />
              AI Starter Portfolio
            </h1>
            <p className="text-muted-foreground">
              Personalized portfolio based on your risk profile and preferences
            </p>
          </div>
          <Button 
            onClick={() => setCurrentStep("intake")} 
            variant="outline"
            data-testid="button-edit-intake"
          >
            Edit Preferences
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Educational Purpose Only
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {generatedPortfolio.notes}
              </p>
            </div>
          </div>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Policy Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Portfolio Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Risk Profile:</span>
                <Badge variant="outline">{generatedPortfolio.policy.riskTolerance}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Core Assets:</span>
                <span className="text-sm font-medium">{(generatedPortfolio.policy.coreTargetPct * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Satellites:</span>
                <span className="text-sm font-medium">{(generatedPortfolio.policy.satelliteTargetPct * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Stable Buffer:</span>
                <span className="text-sm font-medium">{(generatedPortfolio.policy.stableBufferPct * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Holdings:</span>
                <span className="text-sm font-medium">{generatedPortfolio.allocation.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Rebalance:</span>
                <span className="text-sm font-medium">{generatedPortfolio.policy.rebalance}</span>
              </div>
            </CardContent>
          </Card>

          {/* DCA Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">DCA Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Monthly Total:</span>
                <span className="text-sm font-medium">${intake.monthlyContributionUsd}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Initial Investment:</span>
                <span className="text-sm font-medium">${intake.initialLumpSumUsd || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Largest DCA:</span>
                <span className="text-sm font-medium">
                  ${Math.max(...generatedPortfolio.allocation.map((a: AllocationItem) => a.dca.amountUsd))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Smallest DCA:</span>
                <span className="text-sm font-medium">
                  ${Math.min(...generatedPortfolio.allocation.map((a: AllocationItem) => a.dca.amountUsd))}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Guardrails */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Risk Guardrails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Max Drawdown Alert:</span>
                <span className="text-sm font-medium">{(generatedPortfolio.guardrails.maxDrawdownAlertPct * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Rebalance Threshold:</span>
                <span className="text-sm font-medium">{(generatedPortfolio.guardrails.rebalanceThresholdPct * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Min Liquidity:</span>
                <span className="text-sm font-medium">{(generatedPortfolio.guardrails.minLiquidityVolToMcap * 100).toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Allocation Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Portfolio Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatedPortfolio.allocation.map((item: AllocationItem, index: number) => (
                <div 
                  key={item.coinId} 
                  className="flex items-center justify-between p-4 border border-border/50 rounded-lg"
                  data-testid={`allocation-${item.symbol.toLowerCase()}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(item.role)}
                      <div>
                        <div className="font-medium">{item.symbol.toUpperCase()}</div>
                        <div className="text-sm text-muted-foreground">{item.name}</div>
                      </div>
                    </div>
                    <Badge className={getBucketColor(item.bucket)}>{item.bucket} Risk</Badge>
                    <Badge variant="outline" className="capitalize">{item.role}</Badge>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <div className="text-xl font-bold text-primary">
                      {(item.allocationPct * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${item.dca.amountUsd}/{item.dca.cadence}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reasoning & Risks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Investment Rationale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedPortfolio.allocation.map((item: AllocationItem) => (
                <div key={item.coinId} className="space-y-2">
                  <div className="font-medium">{item.symbol.toUpperCase()}</div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {item.reasons.map((reason: string, idx: number) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Risk Considerations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedPortfolio.allocation.map((item: AllocationItem) => (
                <div key={item.coinId} className="space-y-2">
                  <div className="font-medium">{item.symbol.toUpperCase()}</div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {item.risks.map((risk: string, idx: number) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Action Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Implementation Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {generatedPortfolio.checklist.map((item: string, index: number) => (
                <li key={index} className="flex items-start">
                  <span className="text-primary mr-2">□</span>
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Save Portfolio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Save This Portfolio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portfolio-name">Portfolio Name</Label>
              <Input
                id="portfolio-name"
                placeholder="e.g., My Balanced Starter Portfolio"
                value={portfolioName}
                onChange={(e) => setPortfolioName(e.target.value)}
                data-testid="input-portfolio-name"
              />
            </div>
            <div className="flex gap-4">
              <Button 
                onClick={() => savePortfolioMutation.mutate()}
                disabled={!portfolioName.trim() || savePortfolioMutation.isPending}
                className="flex-1"
                data-testid="button-save-portfolio"
              >
                {savePortfolioMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Portfolio
                  </>
                )}
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center">
          {currentTheme === "flower" ? (
            <Flower className="w-8 h-8 mr-3 text-primary" />
          ) : (
            <Sparkles className="w-8 h-8 mr-3 text-primary" />
          )}
          {beginnerMode ? "Your Personal Crypto Garden 🌱" : "AI Starter Portfolio"}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {beginnerMode ? (
            "Let's grow your first crypto portfolio together! Answer a few questions and we'll create a personalized plan just for you. No complicated terms - we'll explain everything in simple words."
          ) : (
            "Get a personalized cryptocurrency portfolio recommendation based on your risk tolerance, investment horizon, and preferences. Built using sophisticated market analysis and AI insights."
          )}
        </p>
        {beginnerMode && currentTheme === "flower" && (
          <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-3 mt-4 max-w-md mx-auto">
            <p className="text-sm text-pink-700 dark:text-pink-300 text-center">
              🌸 Welcome to Flower Mode! We've made everything warm and friendly for new investors like you.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Intake Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Investment Profile</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tell us about your investment goals and preferences
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Experience Level */}
            <div className="space-y-3">
              <Label>Experience Level</Label>
              <Select value={intake.experience} onValueChange={(value: any) => updateIntake("experience", value)}>
                <SelectTrigger data-testid="select-experience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Risk Tolerance */}
            <div className="space-y-3">
              <Label>
                <FinancialTerm term="risk tolerance">
                  Risk Tolerance
                </FinancialTerm>
              </Label>
              <Select value={intake.riskTolerance} onValueChange={(value: any) => updateIntake("riskTolerance", value)}>
                <SelectTrigger data-testid="select-risk-tolerance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="Conservative">
                    {beginnerMode ? "🌱 Chill (Play it safe, steady growth)" : "Conservative (Lower risk, stable returns)"}
                  </SelectItem>
                  <SelectItem value="Balanced">
                    {beginnerMode ? "⚖️ Balanced (Some ups and downs, good growth)" : "Balanced (Moderate risk, balanced growth)"}
                  </SelectItem>
                  <SelectItem value="Aggressive">
                    {beginnerMode ? "🌶️ Spicy (Big ups and downs, high growth potential)" : "Aggressive (Higher risk, growth potential)"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Investment Horizon */}
            <div className="space-y-3">
              <Label>Investment Horizon</Label>
              <Select value={intake.horizon} onValueChange={(value: any) => updateIntake("horizon", value)}>
                <SelectTrigger data-testid="select-horizon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="Short">Short Term (≤1 year)</SelectItem>
                  <SelectItem value="Medium">Medium Term (1-3 years)</SelectItem>
                  <SelectItem value="Long">Long Term (3+ years)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Monthly Contribution */}
            <div className="space-y-3">
              <Label>
                <FinancialTerm term="dollar cost averaging">
                  {beginnerMode ? "How much do you want to invest each month?" : "Monthly Contribution (USD)"}
                </FinancialTerm>
              </Label>
              {beginnerMode && (
                <p className="text-xs text-muted-foreground">
                  💡 Tip: Investing the same amount each month helps smooth out price swings!
                </p>
              )}
              <Input
                type="number"
                value={intake.monthlyContributionUsd}
                onChange={(e) => updateIntake("monthlyContributionUsd", parseInt(e.target.value) || 0)}
                placeholder="500"
                data-testid="input-monthly-contribution"
              />
            </div>

            {/* Initial Investment */}
            <div className="space-y-3">
              <Label>Initial Lump Sum (USD) - Optional</Label>
              <Input
                type="number"
                value={intake.initialLumpSumUsd || ""}
                onChange={(e) => updateIntake("initialLumpSumUsd", parseInt(e.target.value) || undefined)}
                placeholder="1000"
                data-testid="input-initial-investment"
              />
            </div>

            {/* Max Drawdown Comfort */}
            <div className="space-y-3">
              <Label>
                <FinancialTerm term="maximum drawdown">
                  Maximum Drawdown Comfort
                </FinancialTerm>
                : {intake.maxDrawdownComfort}%
              </Label>
              <Slider
                value={[intake.maxDrawdownComfort]}
                onValueChange={([value]) => updateIntake("maxDrawdownComfort", value as 15 | 30 | 50)}
                min={15}
                max={50}
                step={15}
                className="w-full"
                data-testid="slider-drawdown"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Conservative (15%)</span>
                <span>Moderate (30%)</span>
                <span>Aggressive (50%)</span>
              </div>
            </div>

            {/* Stablecoin Buffer */}
            <div className="space-y-3">
              <Label>
                <FinancialTerm term="stablecoin">
                  Stablecoin Buffer
                </FinancialTerm>
                : {intake.stablecoinBufferPct}%
              </Label>
              <Slider
                value={[intake.stablecoinBufferPct]}
                onValueChange={([value]) => updateIntake("stablecoinBufferPct", value)}
                min={0}
                max={20}
                step={5}
                className="w-full"
                data-testid="slider-stable-buffer"
              />
              <p className="text-xs text-muted-foreground">
                Percentage allocated to stablecoins for stability and opportunity fund
              </p>
            </div>

            {/* Holdings Range */}
            <div className="space-y-3">
              <Label>Number of Holdings: {intake.holdingsRange[0]} - {intake.holdingsRange[1]}</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Minimum</Label>
                  <Slider
                    value={[intake.holdingsRange[0]]}
                    onValueChange={([value]) => updateIntake("holdingsRange", [value, intake.holdingsRange[1]])}
                    min={4}
                    max={16}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="text-xs">Maximum</Label>
                  <Slider
                    value={[intake.holdingsRange[1]]}
                    onValueChange={([value]) => updateIntake("holdingsRange", [intake.holdingsRange[0], value])}
                    min={6}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Rebalance Frequency */}
            <div className="space-y-3">
              <Label>Rebalance Frequency</Label>
              <Select value={intake.rebalance} onValueChange={(value: any) => updateIntake("rebalance", value)}>
                <SelectTrigger data-testid="select-rebalance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="Quarterly">Quarterly (every 3 months)</SelectItem>
                  <SelectItem value="Semiannual">Semiannual (every 6 months)</SelectItem>
                  <SelectItem value="Annual">Annual (every 12 months)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Preferences & Exclusions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Preferences & Constraints</CardTitle>
            <p className="text-sm text-muted-foreground">
              Customize your portfolio preferences and risk constraints
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preferred Categories */}
            <div className="space-y-3">
              <Label>Preferred Categories</Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={category}
                      checked={intake.preferredCategories.includes(category)}
                      onCheckedChange={() => toggleCategory(category)}
                      data-testid={`checkbox-category-${category.toLowerCase()}`}
                    />
                    <Label htmlFor={category} className="text-sm">{category}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Excluded Coins */}
            <div className="space-y-3">
              <Label>Exclude Specific Coins</Label>
              <div className="grid grid-cols-2 gap-2">
                {POPULAR_EXCLUSIONS.map(coin => (
                  <div key={coin} className="flex items-center space-x-2">
                    <Checkbox
                      id={coin}
                      checked={intake.exclusions.coins.includes(coin)}
                      onCheckedChange={() => toggleExcludedCoin(coin)}
                      data-testid={`checkbox-exclude-${coin.toLowerCase()}`}
                    />
                    <Label htmlFor={coin} className="text-sm">{coin}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Liquidity Requirements */}
            <div className="space-y-4">
              <Label>
                <FinancialTerm term="liquidity">
                  Liquidity Requirements
                </FinancialTerm>
              </Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">
                    Minimum <FinancialTerm term="market cap">Market Cap</FinancialTerm>: ${(intake.liquidity.minMarketCapUsd / 1e9).toFixed(1)}B
                  </Label>
                  <Slider
                    value={[intake.liquidity.minMarketCapUsd / 1e9]}
                    onValueChange={([value]) => updateIntake("liquidity", { 
                      ...intake.liquidity, 
                      minMarketCapUsd: value * 1e9 
                    })}
                    min={0.1}
                    max={10}
                    step={0.1}
                    className="w-full"
                    data-testid="slider-min-mcap"
                  />
                </div>
                <div>
                  <Label className="text-sm">Minimum Volume/MCap Ratio: {(intake.liquidity.minVolToMcap * 100).toFixed(1)}%</Label>
                  <Slider
                    value={[intake.liquidity.minVolToMcap * 100]}
                    onValueChange={([value]) => updateIntake("liquidity", { 
                      ...intake.liquidity, 
                      minVolToMcap: value / 100 
                    })}
                    min={0.1}
                    max={5}
                    step={0.1}
                    className="w-full"
                    data-testid="slider-min-volume"
                  />
                </div>
              </div>
            </div>

            {/* Practice Mode */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="practice-mode"
                checked={intake.practiceMode || false}
                onCheckedChange={(checked) => updateIntake("practiceMode", checked)}
                data-testid="checkbox-practice-mode"
              />
              <Label htmlFor="practice-mode" className="text-sm">
                Practice mode only (educational purposes)
              </Label>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={() => generatePortfolioMutation.mutate(intake)}
              disabled={generatePortfolioMutation.isPending}
              className="w-full"
              size="lg"
              data-testid="button-generate-portfolio"
            >
              {generatePortfolioMutation.isPending ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Generating Portfolio...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate AI Portfolio
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}