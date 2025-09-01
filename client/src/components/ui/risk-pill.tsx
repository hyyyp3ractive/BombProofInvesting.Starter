import { cn } from "@/lib/utils";

export interface RiskPillProps {
  risk: "low" | "medium" | "high" | "quarantine";
  children?: React.ReactNode;
  className?: string;
}

const riskConfig = {
  low: {
    label: "Low",
    className: "risk-low",
    description: "Core/Safer - Lower volatility, established projects",
  },
  medium: {
    label: "Medium", 
    className: "risk-medium",
    description: "Growth - Moderate risk with upside potential",
  },
  high: {
    label: "High",
    className: "risk-high", 
    description: "Speculative - High risk, high reward potential",
  },
  quarantine: {
    label: "Quarantine",
    className: "bg-muted/50 text-muted-foreground border-border",
    description: "Avoid - Significant concerns identified",
  },
};

export function RiskPill({ risk, children, className }: RiskPillProps) {
  const config = riskConfig[risk];
  
  return (
    <span 
      className={cn("risk-pill", config.className, className)}
      title={config.description}
      data-testid={`risk-pill-${risk}`}
    >
      {children || config.label}
    </span>
  );
}

export function getRiskLevel(score: number): "low" | "medium" | "high" | "quarantine" {
  if (score < 0) return "quarantine";
  if (score >= 20) return "low";
  if (score >= 15) return "medium";
  return "high";
}

export function getRiskFromRating(
  marketHealth: number,
  techUtility: number, 
  teamAdoption: number,
  tokenomics: number,
  risk: number
): "low" | "medium" | "high" | "quarantine" {
  const totalScore = marketHealth + techUtility + teamAdoption + tokenomics + risk;
  return getRiskLevel(totalScore);
}
