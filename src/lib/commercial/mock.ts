import type { CommercialDailyMetricRecord } from "@/lib/commercial/types";
import { addDays, clamp01, toIsoDate } from "@/lib/commercial/utils";

const SELLERS = [
  { id: "seller-ana", name: "Ana Paula", email: "ana.paula@medgrupo.com.br" },
  { id: "seller-bruno", name: "Bruno Costa", email: "bruno.costa@medgrupo.com.br" },
  { id: "seller-carla", name: "Carla Mendes", email: "carla.mendes@medgrupo.com.br" },
  { id: "seller-diego", name: "Diego Ramos", email: "diego.ramos@medgrupo.com.br" },
  { id: "seller-erika", name: "Erika Souza", email: "erika.souza@medgrupo.com.br" },
  { id: "seller-felipe", name: "Felipe Lima", email: "felipe.lima@medgrupo.com.br" },
];

function seeded(seed: number) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

function buildMetric(
  workspaceId: string,
  dayIndex: number,
  sellerIndex: number,
  metricDate: string,
): CommercialDailyMetricRecord {
  const seller = SELLERS[sellerIndex % SELLERS.length];
  const seed = dayIndex * 100 + sellerIndex * 37 + 11;
  const load = seeded(seed);
  const quality = seeded(seed + 7);
  const volume = seeded(seed + 19);

  const totalOpenDeals = 45 + Math.round(volume * 65) + sellerIndex * 6;
  const dealsUpdatedThisMonth = Math.min(
    totalOpenDeals,
    Math.round(totalOpenDeals * (0.54 + load * 0.33)),
  );
  const activitiesDoneYesterday = Math.round(3 + seeded(seed + 29) * 14);
  const activitiesOverdue = Math.round(seeded(seed + 31) * 3);
  const activitiesTotalYesterday = Math.max(
    activitiesDoneYesterday,
    activitiesDoneYesterday + Math.round(seeded(seed + 33) * 4),
  );
  const dealsAdvancedYesterday = Math.round(seeded(seed + 41) * 5);
  const dealsWonYesterday = Math.round(seeded(seed + 43) * 3);
  const dealsLostYesterday = Math.round(seeded(seed + 47) * 2);
  const stagnantDeals = Math.round(totalOpenDeals * clamp01(0.08 + quality * 0.28));

  const coveragePercent = clamp01(dealsUpdatedThisMonth / Math.max(totalOpenDeals, 1));
  const advancementPercent = clamp01(dealsAdvancedYesterday / Math.max(totalOpenDeals, 1));
  const stagnantPercent = clamp01(stagnantDeals / Math.max(totalOpenDeals, 1));

  return {
    id: `${workspaceId}-${seller.id}-${metricDate}`,
    workspaceId,
    metricDate,
    ownerId: seller.id,
    ownerName: seller.name,
    ownerEmail: seller.email,
    totalOpenDeals,
    dealsUpdatedThisMonth,
    coveragePercent,
    activitiesDoneYesterday,
    activitiesTotalYesterday,
    activitiesOverdue,
    dealsAdvancedYesterday,
    dealsWonYesterday,
    dealsLostYesterday,
    advancementPercent,
    stagnantDeals,
    stagnantPercent,
    source: "mock",
    syncedAt: new Date(`${metricDate}T12:00:00Z`).toISOString(),
  };
}

export function buildCommercialMockMetrics(
  workspaceId: string,
  startDate: string,
  endDate: string,
) {
  const start = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  const rows: CommercialDailyMetricRecord[] = [];

  let current = new Date(start);
  let dayIndex = 0;

  while (current <= end) {
    const metricDate = toIsoDate(current);

    SELLERS.forEach((_, sellerIndex) => {
      rows.push(buildMetric(workspaceId, dayIndex, sellerIndex, metricDate));
    });

    current = addDays(current, 1);
    dayIndex += 1;
  }

  return rows;
}
