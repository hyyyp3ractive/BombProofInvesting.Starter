import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { 
  Search, 
  Moon, 
  Sun, 
  User, 
  Settings, 
  LogOut,
  Sparkles,
} from "lucide-react";

interface TopbarProps {
  onSearchChange?: (query: string) => void;
  searchValue?: string;
  filters?: {
    category?: string;
    riskBucket?: string;
  };
  onFiltersChange?: (filters: any) => void;
}

export function Topbar({ 
  onSearchChange, 
  searchValue = "", 
  filters = {},
  onFiltersChange 
}: TopbarProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [aiEnabled, setAiEnabled] = useState(true);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(e.target.value);
  };

  const handleCategoryChange = (category: string) => {
    onFiltersChange?.({ ...filters, category });
  };

  const handleRiskBucketChange = (riskBucket: string) => {
    onFiltersChange?.({ ...filters, riskBucket });
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search coins, symbols..."
            className="pl-10 w-80 search-input"
            value={searchValue}
            onChange={handleSearchChange}
            data-testid="input-search"
          />
        </div>
        
        {/* Filters */}
        <Select 
          value={filters.category} 
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-40" data-testid="select-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="layer1">Layer 1</SelectItem>
            <SelectItem value="defi">DeFi</SelectItem>
            <SelectItem value="meme">Meme</SelectItem>
            <SelectItem value="infrastructure">Infrastructure</SelectItem>
            <SelectItem value="gaming">Gaming</SelectItem>
          </SelectContent>
        </Select>
        
        <Select 
          value={filters.riskBucket} 
          onValueChange={handleRiskBucketChange}
        >
          <SelectTrigger className="w-40" data-testid="select-risk-bucket">
            <SelectValue placeholder="All Risk Buckets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Buckets</SelectItem>
            <SelectItem value="low">Low Risk</SelectItem>
            <SelectItem value="medium">Medium Risk</SelectItem>
            <SelectItem value="high">High Risk</SelectItem>
            <SelectItem value="quarantine">Quarantine</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* AI Toggle */}
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">AI</span>
          <Switch
            checked={aiEnabled}
            onCheckedChange={setAiEnabled}
            data-testid="switch-ai-toggle"
          />
        </div>
        
        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={toggleTheme}
          data-testid="button-theme-toggle"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center space-x-3"
              data-testid="button-user-menu"
            >
              <div className="text-right">
                <p className="text-sm font-medium" data-testid="text-user-name">
                  {user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.role === "admin" ? "Admin" : "Standard Plan"}
                </p>
              </div>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-primary-foreground">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings" className="cursor-pointer" data-testid="menu-settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => logout()}
              className="cursor-pointer text-destructive"
              data-testid="menu-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
