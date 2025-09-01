import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Coins,
  Star,
  Briefcase,
  TrendingUp,
  BarChart3,
  Settings,
} from "lucide-react";

const navigationItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    testId: "nav-dashboard",
  },
  {
    href: "/coins",
    icon: Coins,
    label: "Coins",
    testId: "nav-coins",
  },
  {
    href: "/ratings",
    icon: Star,
    label: "Ratings",
    testId: "nav-ratings",
  },
  {
    href: "/portfolio",
    icon: Briefcase,
    label: "Portfolio",
    testId: "nav-portfolio",
  },
  {
    href: "/dca",
    icon: TrendingUp,
    label: "DCA",
    testId: "nav-dca",
  },
  {
    href: "/reports",
    icon: BarChart3,
    label: "Reports",
    testId: "nav-reports",
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Settings",
    testId: "nav-settings",
  },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-18 bg-card border-r border-border flex flex-col items-center py-4 space-y-6">
      {/* Logo */}
      <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
        <svg 
          className="w-6 h-6 text-primary-foreground" 
          fill="currentColor" 
          viewBox="0 0 24 24"
          data-testid="logo"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      
      {/* Navigation */}
      <nav className="flex flex-col space-y-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(item.href + "/");
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "nav-link",
                isActive && "nav-link-active"
              )}
              title={item.label}
              data-testid={item.testId}
            >
              <Icon className={cn(
                "sidebar-icon",
                isActive && "text-primary"
              )} />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
