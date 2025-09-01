import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/use-auth";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AppLayout } from "@/components/layout/app-layout";

// Pages
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Coins from "@/pages/coins";
import Ratings from "@/pages/ratings";
import Portfolio from "@/pages/portfolio";
import DCA from "@/pages/dca";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <AuthGuard fallback={<Redirect to="/login" />}>
      <AppLayout>
        <Component />
      </AppLayout>
    </AuthGuard>
  );
}

function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={() => <AuthRoute component={Login} />} />
      <Route path="/register" component={() => <AuthRoute component={Register} />} />
      
      {/* Protected routes */}
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/coins" component={() => <ProtectedRoute component={Coins} />} />
      <Route path="/ratings" component={() => <ProtectedRoute component={Ratings} />} />
      <Route path="/portfolio" component={() => <ProtectedRoute component={Portfolio} />} />
      <Route path="/dca" component={() => <ProtectedRoute component={DCA} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
