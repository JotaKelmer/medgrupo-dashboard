export type Ga4DateRange = {
  startDate: string;
  endDate: string;
};

export type Ga4TrendStatus = 'above' | 'average' | 'below' | 'neutral';

export type Ga4BenchmarkMetric = {
  value: number;
  previousValue: number;
  historicalAverage: number | null;
  deltaVsPreviousPct: number | null;
  deltaVsHistoricalPct: number | null;
  status: Ga4TrendStatus;
  unit: 'number' | 'percent';
  formattedValue: string;
  formattedPreviousValue: string;
  formattedHistoricalAverage: string;
};

export type Ga4HeroCards = {
  visits: Ga4BenchmarkMetric;
  engagement: Ga4BenchmarkMetric;
  signups: Ga4BenchmarkMetric;
};

export type Ga4SiteShareSource = 'Google Ads' | 'Meta Ads' | 'Orgânico';

export type Ga4SiteShareCard = {
  source: Ga4SiteShareSource;
  sessions: number;
  totalUsers: number;
  signups: number;
  sharePct: number;
  previousSharePct: number;
  deltaSharePct: number | null;
};

export type Ga4SiteConversion = {
  metric: Ga4BenchmarkMetric;
  siteVisits: number;
  siteVisitors: number;
  signups: number;
};

export type Ga4DashboardResponse = {
  propertyId: string;
  range: {
    current: Ga4DateRange;
    previous: Ga4DateRange;
  };
  heroCards: Ga4HeroCards;
  siteShare: Ga4SiteShareCard[];
  siteConversion: Ga4SiteConversion;
  generatedAt: string;
};