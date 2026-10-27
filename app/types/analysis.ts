export type RiskLevel = "high" | "medium" | "low";

export interface Risk {
  level: RiskLevel;
  text: string;
}

export interface AnalysisResult {
  title: string;
  summary: string;
  requiredDocuments: string[];
  keyRequirements: string[];
  risks: Risk[];
}