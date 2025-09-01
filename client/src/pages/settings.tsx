import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTheme } from "next-themes";
import { useUI } from "@/contexts/ui-context";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { 
  Settings as SettingsIcon,
  User,
  Palette,
  Shield,
  Bell,
  Calculator,
  Trash2,
  Save,
  AlertTriangle,
  Moon,
  Sun,
  Monitor,
  Mail,
  Lock,
  Sparkles
} from "lucide-react";

interface UserSettings {
  theme: "light" | "dark" | "system";
  aiEnabled: boolean;
  aiTooltips: boolean;
  emailNotifications: boolean;
  priceAlerts: boolean;
  portfolioAlerts: boolean;
  riskWeights: {
    marketHealth: number;
    techUtility: number;
    teamAdoption: number;
    tokenomics: number;
    risk: number;
  };
  defaultCurrency: string;
  positionSizeWarning: number; // percentage
  riskToleranceLevel: "conservative" | "moderate" | "aggressive";
}

export default function Settings() {
  const { user, updateSettings, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { beginnerMode, setBeginnerMode } = useUI();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<UserSettings>({
    theme: "dark",
    aiEnabled: true,
    aiTooltips: true,
    emailNotifications: false,
    priceAlerts: true,
    portfolioAlerts: true,
    riskWeights: {
      marketHealth: 20,
      techUtility: 25,
      teamAdoption: 20,
      tokenomics: 20,
      risk: 15,
    },
    defaultCurrency: "usd",
    positionSizeWarning: 20,
    riskToleranceLevel: "moderate",
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load user settings
  useEffect(() => {
    if (user?.settingsJson) {
      setSettings({ ...settings, ...user.settingsJson });
    }
  }, [user]);

  // Track changes
  useEffect(() => {
    const currentSettings = user?.settingsJson || {};
    const hasChanges = JSON.stringify(settings) !== JSON.stringify({ ...settings, ...currentSettings });
    setHasChanges(hasChanges);
  }, [settings, user]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateSettings(settings);
      setHasChanges(false);
    } catch (error) {
      toast({
        title: "Failed to save settings",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    setSettings({ ...settings, theme: newTheme as any });
  };

  const handleRiskWeightChange = (category: keyof typeof settings.riskWeights, value: number[]) => {
    setSettings({
      ...settings,
      riskWeights: {
        ...settings.riskWeights,
        [category]: value[0],
      },
    });
  };

  const resetRiskWeights = () => {
    setSettings({
      ...settings,
      riskWeights: {
        marketHealth: 20,
        techUtility: 25,
        teamAdoption: 20,
        tokenomics: 20,
        risk: 15,
      },
    });
  };

  const totalRiskWeight = Object.values(settings.riskWeights).reduce((sum, weight) => sum + weight, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Customize your Crypto Evaluator experience
          </p>
        </div>
        {hasChanges && (
          <Button 
            onClick={handleSaveSettings}
            disabled={isSaving}
            data-testid="button-save-settings"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Account</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={user?.email || ""}
                  disabled
                  className="pl-10"
                  data-testid="input-email-readonly"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email address cannot be changed. Contact support if needed.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Account Role</Label>
              <Input
                value={user?.role === "admin" ? "Administrator" : "Standard User"}
                disabled
                data-testid="input-role-readonly"
              />
            </div>

            <div className="space-y-2">
              <Label>Member Since</Label>
              <Input
                value={user?.createdAt ? new Date(user.createdAt * 1000).toLocaleDateString() : "Unknown"}
                disabled
                data-testid="input-member-since"
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="w-5 h-5" />
              <span>Appearance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ThemeSwitcher />
            
            <div className="space-y-2">
              <Label>Legacy Theme Mode</Label>
              <Select value={theme} onValueChange={handleThemeChange}>
                <SelectTrigger data-testid="select-legacy-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center space-x-2">
                      <Sun className="w-4 h-4" />
                      <span>Light</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center space-x-2">
                      <Moon className="w-4 h-4" />
                      <span>Dark</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center space-x-2">
                      <Monitor className="w-4 h-4" />
                      <span>System</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Note: Legacy mode is overridden by the theme selector above
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Beginner Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Simplified interface with friendly language for new investors
                </p>
              </div>
              <Switch
                checked={beginnerMode}
                onCheckedChange={setBeginnerMode}
                data-testid="switch-beginner-mode"
              />
            </div>

            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select 
                value={settings.defaultCurrency} 
                onValueChange={(value) => setSettings({ ...settings, defaultCurrency: value })}
              >
                <SelectTrigger data-testid="select-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD ($)</SelectItem>
                  <SelectItem value="eur">EUR (€)</SelectItem>
                  <SelectItem value="gbp">GBP (£)</SelectItem>
                  <SelectItem value="btc">BTC (₿)</SelectItem>
                  <SelectItem value="eth">ETH (Ξ)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive important updates via email
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                data-testid="switch-email-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Price Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified of significant price movements
                </p>
              </div>
              <Switch
                checked={settings.priceAlerts}
                onCheckedChange={(checked) => setSettings({ ...settings, priceAlerts: checked })}
                data-testid="switch-price-alerts"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Portfolio Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications for portfolio changes
                </p>
              </div>
              <Switch
                checked={settings.portfolioAlerts}
                onCheckedChange={(checked) => setSettings({ ...settings, portfolioAlerts: checked })}
                data-testid="switch-portfolio-alerts"
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="w-5 h-5" />
              <span>AI Features</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable AI Explanations</Label>
                <p className="text-sm text-muted-foreground">
                  Get AI-powered coin analysis and comparisons
                </p>
              </div>
              <Switch
                checked={settings.aiEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, aiEnabled: checked })}
                data-testid="switch-ai-enabled"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>AI Term Tooltips</Label>
                <p className="text-sm text-muted-foreground">
                  Show AI explanations when hovering over financial terms
                </p>
              </div>
              <Switch
                checked={settings.aiTooltips}
                onCheckedChange={(checked) => setSettings({ ...settings, aiTooltips: checked })}
                data-testid="switch-ai-tooltips"
              />
            </div>

            <div className="space-y-2">
              <Label>Risk Tolerance Level</Label>
              <Select 
                value={settings.riskToleranceLevel} 
                onValueChange={(value: any) => setSettings({ ...settings, riskToleranceLevel: value })}
              >
                <SelectTrigger data-testid="select-risk-tolerance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Position Size Warning (%)</Label>
              <div className="px-3">
                <Slider
                  value={[settings.positionSizeWarning]}
                  onValueChange={(value) => setSettings({ ...settings, positionSizeWarning: value[0] })}
                  max={50}
                  min={5}
                  step={5}
                  className="w-full"
                  data-testid="slider-position-warning"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Warn when a single position exceeds {settings.positionSizeWarning}% of portfolio
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Assessment Weights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Risk Assessment Weights</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Customize how different factors contribute to risk scoring
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(settings.riskWeights).map(([category, weight]) => {
              const labels = {
                marketHealth: "Market Health",
                techUtility: "Technology & Utility",
                teamAdoption: "Team & Adoption",
                tokenomics: "Tokenomics",
                risk: "Risk Factors",
              };
              
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">
                      {labels[category as keyof typeof labels]}
                    </Label>
                    <span className="text-sm font-mono">{weight}%</span>
                  </div>
                  <Slider
                    value={[weight]}
                    onValueChange={(value) => handleRiskWeightChange(category as keyof typeof settings.riskWeights, value)}
                    max={50}
                    min={5}
                    step={5}
                    className="w-full"
                    data-testid={`slider-risk-weight-${category}`}
                  />
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl">
            <div>
              <p className="font-medium">Total Weight</p>
              <p className="text-sm text-muted-foreground">
                {totalRiskWeight === 100 ? "Perfectly balanced" : "Weights should total 100%"}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`font-mono text-lg font-bold ${totalRiskWeight === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                {totalRiskWeight}%
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={resetRiskWeights}
                data-testid="button-reset-weights"
              >
                Reset to Default
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="w-5 h-5" />
            <span>Security</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/20 rounded-xl">
            <h4 className="font-medium mb-2">Password Security</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Your password is encrypted using Argon2 hashing. 
              Password changes require current password verification.
            </p>
            <Button variant="outline" disabled data-testid="button-change-password">
              <Lock className="w-4 h-4 mr-2" />
              Change Password (Coming Soon)
            </Button>
          </div>

          <div className="p-4 bg-muted/20 rounded-xl">
            <h4 className="font-medium mb-2">Active Sessions</h4>
            <p className="text-sm text-muted-foreground mb-4">
              You can manage your login sessions and revoke access from other devices.
            </p>
            <Button variant="outline" disabled data-testid="button-manage-sessions">
              Manage Sessions (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <span>Danger Zone</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
            <h4 className="font-medium mb-2 text-destructive">Delete Account</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete your account and all associated data. 
              This action cannot be undone and will immediately log you out.
            </p>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  data-testid="button-delete-account"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-testid="dialog-delete-account">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove all your data including:
                    <br />
                    <br />
                    • All watchlist items and ratings
                    <br />
                    • Portfolio transactions and DCA plans
                    <br />
                    • Personal settings and preferences
                    <br />
                    • Account access and login credentials
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      toast({
                        title: "Account deletion not implemented",
                        description: "This feature will be available in a future update.",
                        variant: "destructive",
                      });
                    }}
                    data-testid="button-confirm-delete"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="p-4 bg-muted/20 rounded-xl">
            <h4 className="font-medium mb-2">Export Data</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Download a copy of your data for backup or migration purposes.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              disabled
              data-testid="button-export-data"
            >
              Export Data (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Changes Footer */}
      {hasChanges && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">You have unsaved changes</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (user?.settingsJson) {
                      setSettings({ ...settings, ...user.settingsJson });
                    }
                    setHasChanges(false);
                  }}
                  data-testid="button-discard-changes"
                >
                  Discard
                </Button>
                <Button 
                  size="sm"
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  data-testid="button-save-changes-footer"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
