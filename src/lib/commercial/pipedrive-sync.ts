import type { PipedriveCommercialMetricRow } from "@/lib/commercial/types";
import { addDays, toIsoDate } from "@/lib/commercial/utils";

type PipedriveUser = {
  id: number;
  name: string;
  email: string | null;
  active_flag: boolean;
};

type PipedriveUserRef = {
  id?: number;
};

type PipedriveDeal = {
  user_id?: number | PipedriveUserRef | null;
  last_activity_date?: string | null;
  next_activity_date?: string | null;
  update_time?: string | null;
  stage_change_time?: string | null;
  rotten_flag?: boolean | null;
  won_time?: string | null;
  lost_time?: string | null;
};

type PipedriveActivity = {
  marked_as_done_time?: string | null;
  due_date?: string | null;
};

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function fetchPipedriveJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Falha na chamada ao Pipedrive: ${response.status}`);
  }

  return (await response.json()) as T;
}

function resolveOwnerId(user: PipedriveDeal["user_id"]) {
  if (typeof user === "number") return String(user);
  if (user && typeof user === "object" && typeof user.id === "number") {
    return String(user.id);
  }
  return null;
}

export async function collectCommercialMetricsFromPipedrive(options: {
  startDate: string;
  endDate: string;
}) {
  const { startDate, endDate } = options;

  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    throw new Error("startDate e endDate devem estar no formato YYYY-MM-DD.");
  }

  const apiToken = process.env.PIPEDRIVE_API_TOKEN?.trim();
  const companyDomain = process.env.PIPEDRIVE_COMPANY_DOMAIN?.trim();

  if (!apiToken || !companyDomain) {
    throw new Error(
      "PIPEDRIVE_API_TOKEN e PIPEDRIVE_COMPANY_DOMAIN são obrigatórios.",
    );
  }

  const usersPayload = await fetchPipedriveJson<{
    success: boolean;
    data: PipedriveUser[];
  }>(
    `https://${companyDomain}.pipedrive.com/api/v1/users?api_token=${apiToken}`,
  );

  if (!usersPayload.success) {
    throw new Error("Não foi possível carregar usuários do Pipedrive.");
  }

  const users = usersPayload.data.filter(
    (user) => user.active_flag && !user.name.toLowerCase().includes("service"),
  );

  const allOpenDeals: PipedriveDeal[] = [];
  let paginationStart = 0;
  let hasMoreDeals = true;

  while (hasMoreDeals) {
    const dealsPayload = await fetchPipedriveJson<{
      success: boolean;
      data?: PipedriveDeal[];
      additional_data?: {
        pagination?: {
          more_items_in_collection?: boolean;
          next_start?: number;
        };
      };
    }>(
      `https://${companyDomain}.pipedrive.com/api/v1/deals?status=open&start=${paginationStart}&limit=500&api_token=${apiToken}`,
    );

    if (dealsPayload.success && dealsPayload.data?.length) {
      allOpenDeals.push(...dealsPayload.data);
    }

    hasMoreDeals = Boolean(
      dealsPayload.additional_data?.pagination?.more_items_in_collection,
    );
    paginationStart = dealsPayload.additional_data?.pagination?.next_start ?? 0;
  }

  const ownerPayloads = await Promise.all(
    users.map(async (user) => {
      const [activitiesDone, activitiesOpen, wonDeals, lostDeals] =
        await Promise.all([
          fetchPipedriveJson<{ success: boolean; data?: PipedriveActivity[] }>(
            `https://${companyDomain}.pipedrive.com/api/v1/activities?user_id=${user.id}&done=1&limit=500&sort=update_time%20DESC&api_token=${apiToken}`,
          ),
          fetchPipedriveJson<{ success: boolean; data?: PipedriveActivity[] }>(
            `https://${companyDomain}.pipedrive.com/api/v1/activities?user_id=${user.id}&done=0&limit=500&sort=due_date%20ASC&api_token=${apiToken}`,
          ),
          fetchPipedriveJson<{ success: boolean; data?: PipedriveDeal[] }>(
            `https://${companyDomain}.pipedrive.com/api/v1/deals?user_id=${user.id}&status=won&limit=200&sort=update_time%20DESC&api_token=${apiToken}`,
          ),
          fetchPipedriveJson<{ success: boolean; data?: PipedriveDeal[] }>(
            `https://${companyDomain}.pipedrive.com/api/v1/deals?user_id=${user.id}&status=lost&limit=200&sort=update_time%20DESC&api_token=${apiToken}`,
          ),
        ]);

      return {
        user,
        activitiesDone: activitiesDone.data ?? [],
        activitiesOpen: activitiesOpen.data ?? [],
        wonDeals: wonDeals.data ?? [],
        lostDeals: lostDeals.data ?? [],
      };
    }),
  );

  const rows: PipedriveCommercialMetricRow[] = [];
  let cursor = new Date(`${startDate}T12:00:00Z`);
  const limitDate = new Date(`${endDate}T12:00:00Z`);

  while (cursor <= limitDate) {
    const metricDate = toIsoDate(cursor);
    const currentMonth = metricDate.slice(0, 7);

    const perOwner = new Map(
      users.map((user) => [
        String(user.id),
        {
          owner_name: user.name,
          owner_email: user.email,
          total_open_deals: 0,
          deals_updated_this_month: 0,
          activities_done_yesterday: 0,
          activities_total_yesterday: 0,
          activities_overdue: 0,
          deals_advanced_yesterday: 0,
          deals_won_yesterday: 0,
          deals_lost_yesterday: 0,
          stagnant_deals: 0,
        },
      ]),
    );

    for (const deal of allOpenDeals) {
      const ownerId = resolveOwnerId(deal.user_id);
      if (!ownerId || !perOwner.has(ownerId)) continue;

      const stats = perOwner.get(ownerId)!;
      stats.total_open_deals += 1;

      const lastActivityMonth =
        typeof deal.last_activity_date === "string"
          ? deal.last_activity_date.slice(0, 7)
          : null;
      const nextActivityMonth =
        typeof deal.next_activity_date === "string"
          ? deal.next_activity_date.slice(0, 7)
          : null;
      const updateTimeMonth =
        typeof deal.update_time === "string"
          ? deal.update_time.slice(0, 7)
          : null;

      if (
        lastActivityMonth === currentMonth ||
        nextActivityMonth === currentMonth ||
        updateTimeMonth === currentMonth
      ) {
        stats.deals_updated_this_month += 1;
      }

      if (
        typeof deal.stage_change_time === "string" &&
        deal.stage_change_time.slice(0, 10) === metricDate
      ) {
        stats.deals_advanced_yesterday += 1;
      }

      if (deal.rotten_flag || !deal.next_activity_date) {
        stats.stagnant_deals += 1;
      }
    }

    for (const payload of ownerPayloads) {
      const ownerId = String(payload.user.id);
      const stats = perOwner.get(ownerId);
      if (!stats) continue;

      for (const activity of payload.activitiesDone) {
        if (
          typeof activity.marked_as_done_time === "string" &&
          activity.marked_as_done_time.slice(0, 10) === metricDate
        ) {
          stats.activities_done_yesterday += 1;
          stats.activities_total_yesterday += 1;
        }
      }

      for (const activity of payload.activitiesOpen) {
        if (typeof activity.due_date === "string" && activity.due_date === metricDate) {
          stats.activities_total_yesterday += 1;
        }

        if (typeof activity.due_date === "string" && activity.due_date < metricDate) {
          stats.activities_overdue += 1;
        }
      }

      for (const deal of payload.wonDeals) {
        if (typeof deal.won_time === "string" && deal.won_time.slice(0, 10) === metricDate) {
          stats.deals_won_yesterday += 1;
        }
      }

      for (const deal of payload.lostDeals) {
        if (
          typeof deal.lost_time === "string" &&
          deal.lost_time.slice(0, 10) === metricDate
        ) {
          stats.deals_lost_yesterday += 1;
        }
      }
    }

    for (const [ownerId, stats] of perOwner.entries()) {
      if (
        !stats.total_open_deals &&
        !stats.activities_done_yesterday &&
        !stats.deals_won_yesterday &&
        !stats.deals_lost_yesterday
      ) {
        continue;
      }

      const coveragePercent = stats.total_open_deals
        ? stats.deals_updated_this_month / stats.total_open_deals
        : 0;
      const stagnantPercent = stats.total_open_deals
        ? stats.stagnant_deals / stats.total_open_deals
        : 0;
      const advancementPercent = stats.total_open_deals
        ? stats.deals_advanced_yesterday / stats.total_open_deals
        : 0;

      rows.push({
        metric_date: metricDate,
        owner_external_id: ownerId,
        owner_name: stats.owner_name,
        owner_email: stats.owner_email,
        total_open_deals: stats.total_open_deals,
        deals_updated_this_month: stats.deals_updated_this_month,
        coverage_percent: coveragePercent,
        activities_done_yesterday: stats.activities_done_yesterday,
        activities_total_yesterday: stats.activities_total_yesterday,
        activities_overdue: stats.activities_overdue,
        deals_advanced_yesterday: stats.deals_advanced_yesterday,
        deals_won_yesterday: stats.deals_won_yesterday,
        deals_lost_yesterday: stats.deals_lost_yesterday,
        advancement_percent: advancementPercent,
        stagnant_deals: stats.stagnant_deals,
        stagnant_percent: stagnantPercent,
      });
    }

    cursor = addDays(cursor, 1);
  }

  return rows;
}
