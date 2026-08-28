export interface ExecutiveStatusCard {
  title: string;
  value: number;
  unit?: string;
  tone: 'neutral' | 'info' | 'warning' | 'danger' | 'success';
  description: string;
  highlight?: boolean;
}

export interface ExecutiveSummaryEvidenceLink {
  label: string;
  href: string;
}

export interface ExecutiveSummaryData {
  generatedAt: string;
  trustScore: number;
  todayBrief: string;
  topChanges: string[];
  highestRisks: string[];
  focusAreas: string[];
  evidenceLinks: ExecutiveSummaryEvidenceLink[];
}

export interface ExecutiveRiskItem {
  id: string;
  category: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedArea: string;
  explanation: string;
  suggestedAction: string;
  evidenceHref?: string | null;
}

export interface ExecutiveRecommendationItem {
  id: string;
  title: string;
  impactArea: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  actionLabel: string;
  actionHref?: string | null;
}

export interface CrossFunctionalKpiItem {
  key: string;
  label: string;
  value: number;
  suffix?: string;
  description: string;
  trendDirection: 'up' | 'down' | 'flat';
  trendLabel: string;
}

export interface ExecutiveTrendPoint {
  label: string;
  value: number;
}

export interface ExecutiveTrendSeries {
  key: string;
  title: string;
  description: string;
  points: ExecutiveTrendPoint[];
}

export interface ExecutiveMemoItem {
  id: string;
  title: string;
  summary: string;
  href: string;
  createdAt: string;
}

export interface LeadershipAssistantPrompt {
  id: string;
  label: string;
  prompt: string;
}

export interface ExecutiveOverviewData {
  organizationName: string;
  dataVolumeNote: string;
  statusCards: ExecutiveStatusCard[];
  summary: ExecutiveSummaryData;
  risks: ExecutiveRiskItem[];
  recommendations: ExecutiveRecommendationItem[];
  kpis: CrossFunctionalKpiItem[];
  trends: ExecutiveTrendSeries[];
  memos: ExecutiveMemoItem[];
  assistantPrompts: LeadershipAssistantPrompt[];
}

export interface ExecutiveReportData {
  id: string;
  title: string;
  summary: string;
  generatedAt: string;
  sections: Array<{
    heading: string;
    body: string;
  }>;
  supportingFacts: Array<{
    label: string;
    value: string;
  }>;
}
