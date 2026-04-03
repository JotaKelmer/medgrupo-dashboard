import { BetaAnalyticsDataClient } from '@google-analytics/data';

import { getGa4RuntimeConfig } from './ga4-config';

export type Ga4RequestMetric = {
  name: string;
};

export type Ga4RequestDimension = {
  name: string;
};

export type Ga4RequestDateRange = {
  startDate: string;
  endDate: string;
};

export type Ga4OrderBy = {
  dimension?: {
    dimensionName: string;
    orderType?: 'ALPHANUMERIC' | 'CASE_INSENSITIVE_ALPHANUMERIC' | 'NUMERIC';
  };
  metric?: {
    metricName: string;
  };
  desc?: boolean;
};

export type Ga4ReportRequest = {
  dimensions?: Ga4RequestDimension[];
  metrics: Ga4RequestMetric[];
  dateRanges: Ga4RequestDateRange[];
  orderBys?: Ga4OrderBy[];
  limit?: number;
  offset?: number;
  keepEmptyRows?: boolean;
  metricAggregations?: Array<'TOTAL' | 'MINIMUM' | 'MAXIMUM' | 'COUNT'>;
};

export type Ga4ReportRow = {
  dimensionValues?: Array<{ value?: string | null }>;
  metricValues?: Array<{ value?: string | null }>;
};

export type Ga4ReportResponse = {
  rows?: Ga4ReportRow[];
  totals?: Ga4ReportRow[];
  rowCount?: number | null;
  metadata?: Record<string, unknown>;
};

let cachedClient: BetaAnalyticsDataClient | null = null;

function createClient() {
  const config = getGa4RuntimeConfig();

  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
    projectId: config.projectId,
  });
}

export function getGa4Client(): BetaAnalyticsDataClient {
  if (!cachedClient) {
    cachedClient = createClient();
  }

  return cachedClient;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  return new Error('[GA4] Erro desconhecido ao consultar a API do Google Analytics.');
}

export async function batchRunGa4Reports(
  requests: Ga4ReportRequest[],
): Promise<Ga4ReportResponse[]> {
  const client = getGa4Client();
  const { propertyId } = getGa4RuntimeConfig();

  try {
    const [response] = await client.batchRunReports({
      property: `properties/${propertyId}`,
      requests,
    });

    return (response.reports ?? []) as Ga4ReportResponse[];
  } catch (error) {
    throw normalizeError(error);
  }
}
