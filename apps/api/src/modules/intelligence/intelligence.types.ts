export interface IntelligenceSignal {
  id: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
}

export interface IntelligenceInsight {
  id: string;
  category: 'coverage' | 'commerce' | 'finance' | 'customer';
  title: string;
  description: string;
}

export interface IntelligenceRecommendation {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actions: string[];
}

export interface IntelligenceContext {
  shopDomain: string;
  productsCount: number;
  ordersToday?: number;
  revenueToday?: number;
  newCustomers?: number;
  hasOrderAccess: boolean;
  hasCustomerAccess: boolean;
  hasStripe: boolean;
  signals: IntelligenceSignal[];
  confirmedRevenueToday?: number;
  topProductTitle?: string;
  shopifyCoverage: 'FULL' | 'PARTIAL' | 'NONE';
  retentionPressure?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface IntelligenceOverview {
  summary: string;
  signals: IntelligenceSignal[];
  insights: IntelligenceInsight[];
  recommendations: IntelligenceRecommendation[];
  context: {
    shopDomain: string;
    productsCount: number;
    hasOrderAccess: boolean;
    hasCustomerAccess: boolean;
    hasStripe: boolean;
    shopifyCoverage: 'FULL' | 'PARTIAL' | 'NONE';
  };
  sourceType: 'deterministic' | 'ai_rephrased';
  modelName: string | null;
}
