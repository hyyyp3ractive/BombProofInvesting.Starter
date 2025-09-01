import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { HelpCircle, Loader2 } from "lucide-react";

interface TermTooltipProps {
  term: string;
  children: React.ReactNode;
  className?: string;
}

export function TermTooltip({ term, children, className }: TermTooltipProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  // Check if tooltips are enabled in user settings
  const tooltipsEnabled = user?.settingsJson?.aiTooltips !== false; // Default to enabled
  
  const { data: explanation, isLoading } = useQuery({
    queryKey: ["term-explanation", term],
    queryFn: async () => {
      const response = await apiClient.explainTerm(term);
      return response;
    },
    enabled: isOpen && tooltipsEnabled,
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
  });

  if (!tooltipsEnabled) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <span 
            className={`inline-flex items-center gap-1 cursor-help border-b border-dotted border-muted-foreground/50 hover:border-primary/70 transition-colors ${className}`}
            data-testid={`tooltip-trigger-${term.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {children}
            <HelpCircle className="w-3 h-3 text-muted-foreground/70 hover:text-primary/70" />
          </span>
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-xs bg-white dark:bg-gray-900 border shadow-lg"
          side="top"
          data-testid={`tooltip-content-${term.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {term}
              </Badge>
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Getting explanation...
              </div>
            ) : explanation ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">{explanation.definition}</p>
                {explanation.example && (
                  <p className="text-xs text-muted-foreground">
                    <strong>Example:</strong> {explanation.example}
                  </p>
                )}
                {explanation.context && (
                  <p className="text-xs text-muted-foreground">
                    <strong>Why it matters:</strong> {explanation.context}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Explanation not available
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Helper component for common financial terms
export function FinancialTerm({ term, children, className }: TermTooltipProps) {
  return (
    <TermTooltip term={term} className={className}>
      {children}
    </TermTooltip>
  );
}