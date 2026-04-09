"use client";

import { useEffect, useMemo, useState } from "react";

type BUName = "R1" | "R+" | "Complementares";
type ChannelCadence = "continuous" | "weekly";
type ChannelId =
  | "google-ads"
  | "meta-ads"
  | "whatsapp-hsm"
  | "email-marketing"
  | "redes-sociais-seo"
  | "follow-up"
  | "telao-cartaz";

type WeekPlan = {
  weekIndex: number;
  scheduledDate: string;
  action: string;
  completed: boolean;
};

type ChannelPlan = {
  id: ChannelId;
  name: string;
  tag: string;
  color: string;
  cadence: ChannelCadence;
  value: number;
  audience: string;
  objective: string;
  justification: string;
  consumption: string;
  weeks: WeekPlan[];
};

type CourseSummary = {
  description: string;
  lastCampaign: string;
  innovation: string;
  challenge: string;
  periodSummary: string;
};

type CourseMeta = {
  inscricoes: string;
  cpa: string;
  note: string;
};

type CoursePlan = {
  id: string;
  name: string;
  bu: BUName;
  alert: string | null;
  summary: CourseSummary;
  meta: CourseMeta;
  channels: ChannelPlan[];
};

type PeriodPlan = {
  version: number;
  month: number;
  year: number;
  courses: CoursePlan[];
  updatedAt: string | null;
};

type LegacyProduct = {
  name?: string;
  alert?: string | null;
  header?: Partial<{
    productName: string;
    description: string;
    lastCampaign: string;
    innovation: string;
    challenge: string;
    periodMeta: string;
  }>;
  meta?: Partial<{
    inscricoes: string;
    cpa: string;
    note: string;
  }>;
  channels?: Array<
    Partial<{
      name: string;
      tag: string;
      budget: number;
      color: string;
      type: ChannelCadence;
      note: string;
    }>
  >;
};

type ChannelTemplate = {
  id: ChannelId;
  name: string;
  tag: string;
  color: string;
  cadence: ChannelCadence;
  defaults: Pick<ChannelPlan, "audience" | "objective" | "justification" | "consumption" | "value">;
};

type CoursePreset = {
  alert?: string | null;
  summary?: Partial<CourseSummary>;
  meta?: Partial<CourseMeta>;
  channels?: Partial<Record<ChannelId, Partial<ChannelPlan>>>;
};

const STORAGE_PREFIX = "medgrupo_plano_midia_periodo_v3_";
const LEGACY_STORAGE_KEY = "medgrupo_plano_midia_produtos_v2";
const DEFAULT_MONTH = 3;
const DEFAULT_YEAR = 2026;

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const YEARS = Array.from({ length: 9 }, (_, index) => 2024 + index);
const BU_ORDER: BUName[] = ["R1", "R+", "Complementares"];

const COURSE_CATALOG: Record<BUName, string[]> = {
  R1: [
    "Extensivo",
    "MEDCURSO e MED",
    "MEDMASTER",
    "Intensivo",
    "INTENSIVÃO R1 + ENAMED",
    "MED FOCO + ENAMED",
    "ENAMED 4º ano",
  ],
  "R+": ["Preparação R+", "INTENSIVÃO R+", "TED", "TEGO", "INTENSIVÃO TED", "TED PRÁTICO"],
  Complementares: [
    "REVALIDAAÇÃO",
    "ENCONTRO REVALIDAAÇÃO",
    "CPMED REVALIDA",
    "CPMED PREMIUM",
    "CPMED EXTENSIVO",
    "ABC da Medicina",
    "MEDBASE PRÁTICO",
    "MEDELETRO",
    "MEDIMAGEM",
    "VENTILAMED",
    "MEDATB",
    "PERSONAMED",
    "MEDSoft",
    "MEDMe",
    "ByMed",
    "Parceria Enamed IEs",
    "Revisão Avançada ENAMED 4º ano",
    "Planejamento em 3 anos",
  ],
};

const LEGACY_NAME_MAP: Record<string, string> = {
  "R+": "Preparação R+",
  "CPMED Revalida": "CPMED REVALIDA",
  "MEDBASE Prático": "MEDBASE PRÁTICO",
  MEDMASTER: "MEDMASTER",
  REVALIDAAÇÃO: "REVALIDAAÇÃO",
  Extensivo: "Extensivo",
};

const CHANNEL_LIBRARY: ChannelTemplate[] = [
  {
    id: "google-ads",
    name: "Google Ads",
    tag: "Search",
    color: "#378ADD",
    cadence: "continuous",
    defaults: {
      value: 0,
      audience: "Busca de alta intenção e termos de marca.",
      objective: "Capturar demanda qualificada no fundo do funil.",
      justification: "Cobrir intenção ativa e proteger a captura da demanda existente.",
      consumption: "Mensal",
    },
  },
  {
    id: "meta-ads",
    name: "Meta Ads",
    tag: "Social",
    color: "#7F77DD",
    cadence: "continuous",
    defaults: {
      value: 0,
      audience: "Públicos de interesse, remarketing e semelhantes.",
      objective: "Gerar alcance, consideração e retargeting.",
      justification: "Expandir cobertura de mídia e sustentar a base de conversão.",
      consumption: "Mensal",
    },
  },
  {
    id: "whatsapp-hsm",
    name: "WhatsApp HSM",
    tag: "CRM",
    color: "#1D9E75",
    cadence: "weekly",
    defaults: {
      value: 0,
      audience: "Base própria segmentada.",
      objective: "Nutrir, reter e converter leads da base.",
      justification: "Canal de maior proximidade para acionamento tático e recuperação.",
      consumption: "Semanal",
    },
  },
  {
    id: "email-marketing",
    name: "E-mail Marketing",
    tag: "CRM",
    color: "#EF9F27",
    cadence: "weekly",
    defaults: {
      value: 0,
      audience: "Base própria qualificada.",
      objective: "Nutrir interesse e reforçar as mensagens de campanha.",
      justification: "Complementa o CRM com comunicação recorrente e baixo custo.",
      consumption: "Base própria",
    },
  },
  {
    id: "redes-sociais-seo",
    name: "Redes Sociais/SEO",
    tag: "Orgânico",
    color: "#639922",
    cadence: "continuous",
    defaults: {
      value: 0,
      audience: "Audiência orgânica, comunidade e busca recorrente.",
      objective: "Sustentar presença e autoridade da marca.",
      justification: "Apoio descoberto, prova social e consistência de conteúdo.",
      consumption: "Orgânico",
    },
  },
  {
    id: "follow-up",
    name: "Follow-Up",
    tag: "Comercial",
    color: "#D85A30",
    cadence: "weekly",
    defaults: {
      value: 0,
      audience: "Leads quentes e oportunidades comerciais.",
      objective: "Acelerar resposta e retomada de interessados.",
      justification: "Reduz perdas de conversão após o primeiro contato.",
      consumption: "Funil comercial",
    },
  },
  {
    id: "telao-cartaz",
    name: "Telão & Cartaz",
    tag: "Offline",
    color: "#BA7517",
    cadence: "weekly",
    defaults: {
      value: 0,
      audience: "Fluxo presencial e pontos físicos.",
      objective: "Reforçar visibilidade offline e apoio local.",
      justification: "Complementa a campanha em eventos, auditórios e pontos de contato.",
      consumption: "Pontual",
    },
  },
];

const COURSE_PRESETS: Partial<Record<string, CoursePreset>> = {
  "Preparação R+": {
    summary: {
      description: "Preparação focada em escala, performance e conversão.",
      lastCampaign: "Conversão com mídia paga e base ativa.",
      innovation: "WhatsApp HSM integrado a remarketing.",
      challenge: "Sustentar volume com CPA controlado.",
    },
    meta: {
      inscricoes: "5.000",
      cpa: "R$ 32,00",
      note: "Meta baseada em histórico de campanha e volume de base ativa.",
    },
    channels: {
      "google-ads": { value: 8000 },
      "meta-ads": { value: 8000 },
      "whatsapp-hsm": { value: 140000, audience: "200 mil contatos" },
    },
  },
  "CPMED REVALIDA": {
    summary: {
      description: "Preparação para médicos formados com foco em Revalida.",
      lastCampaign: "Captação segmentada para público qualificado.",
      innovation: "CRM acionado sobre base de médicos formados.",
      challenge: "Escalar um público menor com ticket maior.",
    },
    meta: {
      inscricoes: "1.200",
      cpa: "R$ 50,00",
      note: "Público segmentado de médicos formados. Menor volume e ticket mais alto.",
    },
    channels: {
      "google-ads": { value: 3000 },
      "meta-ads": { value: 3000 },
      "whatsapp-hsm": { value: 14000, audience: "20 mil contatos" },
    },
  },
  "MEDBASE PRÁTICO": {
    summary: {
      description: "Produto com ativação digital e apoio prático presencial.",
      lastCampaign: "Leads e conversão com reforço em eventos.",
      innovation: "Integração entre mídia, CRM e presença offline.",
      challenge: "Equilibrar geração de demanda e conversão.",
    },
    meta: {
      inscricoes: "3.500",
      cpa: "R$ 28,00",
      note: "Meta considera geração de leads via tráfego pago e reforço presencial.",
    },
    channels: {
      "google-ads": { value: 3000 },
      "meta-ads": { value: 7000 },
      "whatsapp-hsm": { value: 33600, audience: "48 mil contatos" },
      "telao-cartaz": { value: 0 },
    },
  },
  MEDMASTER: {
    summary: {
      description: "Produto premium com base qualificada e recorrência.",
      lastCampaign: "Conversão com CRM e reforço social.",
      innovation: "HSM sobre base ativa com apoio orgânico.",
      challenge: "Aumentar eficiência sem perder qualificação.",
    },
    meta: {
      inscricoes: "2.000",
      cpa: "R$ 45,00",
      note: "Base de leads qualificados com foco em eficiência de conversão.",
    },
    channels: {
      "meta-ads": { value: 3000 },
      "whatsapp-hsm": { value: 56000, audience: "80 mil contatos" },
    },
  },
  REVALIDAAÇÃO: {
    summary: {
      description: "Configuração comercial inicial para produto em definição.",
      lastCampaign: "Estrutura base de mídia e CRM em construção.",
      innovation: "Modelo enxuto para ativação rápida.",
      challenge: "Ajustar meta, base e investimento final.",
    },
    meta: {
      inscricoes: "—",
      cpa: "—",
      note: "Configuração inicial para visualização comercial. Ajuste meta, base e orçamento conforme definição final.",
    },
    channels: {
      "google-ads": { value: 3000 },
      "meta-ads": { value: 3000 },
      "whatsapp-hsm": { value: 14000, audience: "20 mil contatos" },
    },
  },
  Extensivo: {
    alert: "Operação 100% reativa",
    summary: {
      description: "Operação reativa com foco em atendimento e demanda espontânea.",
      lastCampaign: "Demanda espontânea via WhatsApp.",
      innovation: "Presença orgânica contínua com CRM de apoio.",
      challenge: "Responder rápido sem operação ativa de mídia pesada.",
    },
    meta: {
      inscricoes: "—",
      cpa: "—",
      note: "Sem meta ativa. Operação reativa voltada a absorver demanda espontânea e reativar oportunidades.",
    },
    channels: {
      "whatsapp-hsm": {
        value: 5600,
        audience: "8 mil contatos",
        objective: "Responder demanda espontânea e reativar oportunidades.",
        justification: "Canal principal da operação, com acionamento conforme necessidade.",
        consumption: "Sob demanda",
      },
      "redes-sociais-seo": {
        value: 4000,
        audience: "Audiência orgânica, comunidade e busca recorrente.",
        objective: "Sustentar presença orgânica mínima do produto.",
        justification: "Apoio de marca sem investimento em mídia paga pesada.",
        consumption: "Orgânico",
      },
    },
  },
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getCourseId(name: string) {
  return slugify(name);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildStorageKey(month: number, year: number) {
  return `${STORAGE_PREFIX}${year}-${String(month + 1).padStart(2, "0")}`;
}

function findBUByCourseName(name: string): BUName | null {
  for (const bu of BU_ORDER) {
    if (COURSE_CATALOG[bu].includes(name)) return bu;
  }
  return null;
}

function getChannelTemplate(channelId: ChannelId) {
  return CHANNEL_LIBRARY.find((channel) => channel.id === channelId) || CHANNEL_LIBRARY[0];
}

function createWeekPlans(): WeekPlan[] {
  return Array.from({ length: 4 }, (_, weekIndex) => ({
    weekIndex,
    scheduledDate: "",
    action: "",
    completed: false,
  }));
}

function formatPeriodTitle(month: number, year: number) {
  return `${MONTHS[month]} ${year}`;
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "Ainda não salvo";

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatCompactCurrency(value: number) {
  if (value === 0) return "—";
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(".0", "")}k`;
  }
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

function parseBudget(value: string) {
  const numeric = Number(value.replace(/[^\d.-]/g, ""));
  if (Number.isNaN(numeric) || numeric < 0) return 0;
  return Math.round(numeric);
}

function getWeekRanges(month: number, year: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const ranges = [
    { start: 1, end: Math.min(7, lastDay) },
    { start: Math.min(8, lastDay), end: Math.min(14, lastDay) },
    { start: Math.min(15, lastDay), end: Math.min(21, lastDay) },
    { start: Math.min(22, lastDay), end: lastDay },
  ];

  return ranges.map((range, index) => ({
    label: `Sem ${index + 1}`,
    helper: `${String(range.start).padStart(2, "0")}–${String(range.end).padStart(2, "0")}`,
  }));
}

function getMonthBoundaries(month: number, year: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const toIso = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  return {
    min: toIso(start),
    max: toIso(end),
  };
}

function buildDefaultCourseSummary(name: string, month: number, year: number): CourseSummary {
  const periodLabel = `${MONTHS[month]}/${year}`;

  return {
    description: `${name} · planejamento mensal com visão integrada de mídia, CRM e apoio comercial.`,
    lastCampaign: "Campanha anterior em revisão.",
    innovation: "Planejamento integrado entre mídia, base proprietária e ativação comercial.",
    challenge: "Ajustar pressão de investimento, consumo e entrega por canal.",
    periodSummary: `Período: ${periodLabel} · Meta: — inscrições · CPA: —`,
  };
}

function buildDefaultMeta(): CourseMeta {
  return {
    inscricoes: "—",
    cpa: "—",
    note: "Preencha meta e observações do curso conforme o plano vigente.",
  };
}

function createChannelPlan(channelId: ChannelId, overrides?: Partial<ChannelPlan>): ChannelPlan {
  const template = getChannelTemplate(channelId);
  const normalizedWeeks = Array.isArray(overrides?.weeks)
    ? Array.from({ length: 4 }, (_, weekIndex) => {
        const existing = overrides?.weeks?.find((week) => week.weekIndex === weekIndex);
        return {
          weekIndex,
          scheduledDate: existing?.scheduledDate || "",
          action: existing?.action || "",
          completed: Boolean(existing?.completed),
        };
      })
    : createWeekPlans();

  return {
    id: template.id,
    name: template.name,
    tag: template.tag,
    color: template.color,
    cadence: template.cadence,
    value: template.defaults.value,
    audience: template.defaults.audience,
    objective: template.defaults.objective,
    justification: template.defaults.justification,
    consumption: template.defaults.consumption,
    ...deepClone(overrides || {}),
    weeks: normalizedWeeks,
  };
}

function ensureCourseChannels(channels: ChannelPlan[]) {
  const byId = new Map(channels.map((channel) => [channel.id, channel]));

  return CHANNEL_LIBRARY.map((template) => {
    const existing = byId.get(template.id);
    return existing ? createChannelPlan(template.id, existing) : createChannelPlan(template.id);
  });
}

function createCoursePlan(name: string, bu: BUName, month: number, year: number): CoursePlan {
  const preset = COURSE_PRESETS[name];
  const summary = {
    ...buildDefaultCourseSummary(name, month, year),
    ...(preset?.summary || {}),
  };
  const meta = {
    ...buildDefaultMeta(),
    ...(preset?.meta || {}),
  };
  summary.periodSummary =
    preset?.summary?.periodSummary || `Período: ${MONTHS[month]}/${year} · Meta: ${meta.inscricoes} inscrições · CPA: ${meta.cpa}`;

  return {
    id: getCourseId(name),
    name,
    bu,
    alert: preset?.alert || null,
    summary,
    meta,
    channels: ensureCourseChannels(
      CHANNEL_LIBRARY.map((channel) => createChannelPlan(channel.id, preset?.channels?.[channel.id]))
    ),
  };
}

function createPeriodPlan(month: number, year: number): PeriodPlan {
  const courses = BU_ORDER.flatMap((bu) => COURSE_CATALOG[bu].map((name) => createCoursePlan(name, bu, month, year)));

  return {
    version: 3,
    month,
    year,
    courses,
    updatedAt: null,
  };
}

function normalizeChannelIdFromName(value?: string): ChannelId | null {
  const normalized = slugify(value || "");
  const map: Record<string, ChannelId> = {
    "google-ads": "google-ads",
    "meta-ads": "meta-ads",
    "whatsapp-hsm": "whatsapp-hsm",
    "e-mail-marketing": "email-marketing",
    "email-marketing": "email-marketing",
    "redes-sociais-seo": "redes-sociais-seo",
    "follow-up": "follow-up",
    "telao-cartaz": "telao-cartaz",
    "telao-cartaz-evento-ponto": "telao-cartaz",
  };

  return map[normalized] || null;
}

function normalizeStoredCourse(raw: Partial<CoursePlan>, month: number, year: number): CoursePlan | null {
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "";
  const bu = raw.bu && BU_ORDER.includes(raw.bu) ? raw.bu : findBUByCourseName(name);
  if (!name || !bu) return null;

  const fallback = createCoursePlan(name, bu, month, year);
  const storedChannels = Array.isArray(raw.channels)
    ? raw.channels
        .map((channel) => {
          const channelId = normalizeChannelIdFromName(channel?.id || channel?.name);
          if (!channelId) return null;
          return createChannelPlan(channelId, channel);
        })
        .filter(Boolean) as ChannelPlan[]
    : [];

  return {
    ...fallback,
    ...raw,
    name,
    bu,
    summary: {
      ...fallback.summary,
      ...(raw.summary || {}),
      periodSummary:
        raw.summary?.periodSummary ||
        `Período: ${MONTHS[month]}/${year} · Meta: ${(raw.meta?.inscricoes || fallback.meta.inscricoes) ?? "—"} inscrições · CPA: ${(raw.meta?.cpa || fallback.meta.cpa) ?? "—"}`,
    },
    meta: {
      ...fallback.meta,
      ...(raw.meta || {}),
    },
    alert: raw.alert ?? fallback.alert,
    channels: ensureCourseChannels(storedChannels.length ? storedChannels : fallback.channels),
  };
}

function normalizeStoredPlan(raw: Partial<PeriodPlan> | null | undefined, month: number, year: number): PeriodPlan {
  const fallback = createPeriodPlan(month, year);
  if (!raw || !Array.isArray(raw.courses)) return fallback;

  const coursesById = new Map(
    raw.courses
      .map((course) => normalizeStoredCourse(course, month, year))
      .filter(Boolean)
      .map((course) => [course!.id, course!])
  );

  return {
    version: 3,
    month,
    year,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
    courses: fallback.courses.map((course) => coursesById.get(course.id) || course),
  };
}

function migrateLegacyProducts(legacy: LegacyProduct[] | null | undefined, month: number, year: number): PeriodPlan | null {
  if (!Array.isArray(legacy) || !legacy.length) return null;

  const next = createPeriodPlan(month, year);
  const nextCourses = next.courses.map((course) => {
    const legacyCourse = legacy.find((item) => {
      const mappedName = LEGACY_NAME_MAP[item.name || ""] || item.name || "";
      return mappedName === course.name;
    });

    if (!legacyCourse) return course;

    const incomingChannels = Array.isArray(legacyCourse.channels)
      ? legacyCourse.channels
          .map((channel) => {
            const channelId = normalizeChannelIdFromName(channel.name);
            if (!channelId) return null;
            return createChannelPlan(channelId, {
              value: typeof channel.budget === "number" ? channel.budget : 0,
              cadence: channel.type || getChannelTemplate(channelId).cadence,
              consumption: channel.note || getChannelTemplate(channelId).defaults.consumption,
            });
          })
          .filter(Boolean) as ChannelPlan[]
      : [];

    return {
      ...course,
      alert: legacyCourse.alert ?? course.alert,
      summary: {
        ...course.summary,
        description: legacyCourse.header?.description || course.summary.description,
        lastCampaign: legacyCourse.header?.lastCampaign || course.summary.lastCampaign,
        innovation: legacyCourse.header?.innovation || course.summary.innovation,
        challenge: legacyCourse.header?.challenge || course.summary.challenge,
        periodSummary:
          legacyCourse.header?.periodMeta ||
          `Período: ${MONTHS[month]}/${year} · Meta: ${legacyCourse.meta?.inscricoes || course.meta.inscricoes} inscrições · CPA: ${legacyCourse.meta?.cpa || course.meta.cpa}`,
      },
      meta: {
        ...course.meta,
        inscricoes: legacyCourse.meta?.inscricoes || course.meta.inscricoes,
        cpa: legacyCourse.meta?.cpa || course.meta.cpa,
        note: legacyCourse.meta?.note || course.meta.note,
      },
      channels: ensureCourseChannels(incomingChannels.length ? incomingChannels : course.channels),
    };
  });

  return {
    version: 3,
    month,
    year,
    courses: nextCourses,
    updatedAt: null,
  };
}

function readPeriodPlan(month: number, year: number): PeriodPlan {
  const fallback = createPeriodPlan(month, year);

  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(buildStorageKey(month, year));
    if (raw) {
      return normalizeStoredPlan(JSON.parse(raw), month, year);
    }
  } catch (error) {
    console.warn("Não foi possível carregar o plano salvo do período.", error);
  }

  if (month === DEFAULT_MONTH && year === DEFAULT_YEAR) {
    try {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const migrated = migrateLegacyProducts(JSON.parse(legacyRaw), month, year);
        if (migrated) return migrated;
      }
    } catch (error) {
      console.warn("Não foi possível migrar o storage legado do plano.", error);
    }
  }

  return fallback;
}

function savePeriodPlan(plan: PeriodPlan) {
  if (typeof window === "undefined") return;

  localStorage.setItem(buildStorageKey(plan.month, plan.year), JSON.stringify(plan));
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
  className?: string;
}) {
  return (
    <label className={`field-wrap ${className || ""}`.trim()}>
      <span className="field-label">{label}</span>
      {textarea ? (
        <textarea className="field-control field-control--textarea" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="field-control" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

export default function MidiaPage() {
  const [mounted, setMounted] = useState(false);
  const [month, setMonth] = useState(DEFAULT_MONTH);
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [plan, setPlan] = useState<PeriodPlan>(() => createPeriodPlan(DEFAULT_MONTH, DEFAULT_YEAR));
  const [activeBU, setActiveBU] = useState<BUName>("R1");
  const [activeCourseId, setActiveCourseId] = useState(getCourseId(COURSE_CATALOG.R1[0]));
  const [notice, setNotice] = useState("Autossalvo no navegador");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setPlan(readPeriodPlan(month, year));
  }, [mounted, month, year]);

  useEffect(() => {
    if (!mounted) return;

    const coursesForBU = plan.courses.filter((course) => course.bu === activeBU);
    if (!coursesForBU.length) return;

    const hasActive = coursesForBU.some((course) => course.id === activeCourseId);
    if (!hasActive) {
      setActiveCourseId(coursesForBU[0].id);
    }
  }, [activeBU, activeCourseId, mounted, plan.courses]);

  useEffect(() => {
    if (!mounted) return;
    document.title = `Plano de Mídia ${formatPeriodTitle(month, year)}`;
  }, [mounted, month, year]);

  const coursesForBU = useMemo(
    () => plan.courses.filter((course) => course.bu === activeBU),
    [activeBU, plan.courses]
  );

  const activeCourse = useMemo(() => {
    return coursesForBU.find((course) => course.id === activeCourseId) || coursesForBU[0] || plan.courses[0];
  }, [activeCourseId, coursesForBU, plan.courses]);

  const totalInvestment = useMemo(() => {
    if (!activeCourse) return 0;
    return activeCourse.channels.reduce((sum, channel) => sum + channel.value, 0);
  }, [activeCourse]);

  const maxChannelValue = useMemo(() => {
    if (!activeCourse) return 1;
    return Math.max(...activeCourse.channels.map((channel) => channel.value), 1);
  }, [activeCourse]);

  const weekRanges = useMemo(() => getWeekRanges(month, year), [month, year]);
  const monthBoundaries = useMemo(() => getMonthBoundaries(month, year), [month, year]);

  function commitPlan(nextPlan: PeriodPlan, nextNotice?: string) {
    const payload = {
      ...nextPlan,
      updatedAt: new Date().toISOString(),
    };
    setPlan(payload);
    savePeriodPlan(payload);
    if (nextNotice) setNotice(nextNotice);
  }

  function updateCourse(updater: (course: CoursePlan) => CoursePlan, nextNotice?: string) {
    if (!activeCourse) return;

    const nextPlan: PeriodPlan = {
      ...plan,
      courses: plan.courses.map((course) => (course.id === activeCourse.id ? updater(deepClone(course)) : course)),
    };

    commitPlan(nextPlan, nextNotice);
  }

  function updateSummaryField(field: keyof CourseSummary, value: string) {
    updateCourse(
      (course) => ({
        ...course,
        summary: {
          ...course.summary,
          [field]: value,
        },
      }),
      "Plano atualizado"
    );
  }

  function updateMetaField(field: keyof CourseMeta, value: string) {
    updateCourse(
      (course) => ({
        ...course,
        meta: {
          ...course.meta,
          [field]: value,
        },
      }),
      "Meta atualizada"
    );
  }

  function updateChannel(channelId: ChannelId, updater: (channel: ChannelPlan) => ChannelPlan) {
    updateCourse(
      (course) => ({
        ...course,
        channels: course.channels.map((channel) => (channel.id === channelId ? updater(deepClone(channel)) : channel)),
      }),
      "Canal atualizado"
    );
  }

  function updateWeek(channelId: ChannelId, weekIndex: number, updater: (week: WeekPlan) => WeekPlan) {
    updateChannel(channelId, (channel) => ({
      ...channel,
      weeks: channel.weeks.map((week) => (week.weekIndex === weekIndex ? updater({ ...week }) : week)),
    }));
  }

  function handleManualSave() {
    commitPlan(plan, "Plano salvo no navegador");
  }

  function handlePrint() {
    window.print();
  }

  if (!mounted || !activeCourse) {
    return (
      <>
        <div className="midia-page">
          <div className="canvas-wrap">
            <div className="panel-card">
              <p className="section-eyebrow">Plano de mídia</p>
              <h1 className="loading-title">Carregando plano…</h1>
            </div>
          </div>
        </div>
        <style jsx>{styles}</style>
      </>
    );
  }

  return (
    <>
      <div className="midia-page">
        <div className="canvas-wrap">
          <header className="page-header">
            <div>
              <p className="section-eyebrow">Plano de mídia</p>
              <h1 className="page-title">Plano de Mídia {formatPeriodTitle(month, year)}</h1>
              <p className="page-subtitle">Visão mensal por unidade de negócio e curso</p>
            </div>

            <div className="header-controls no-print">
              <label className="toolbar-field">
                <span className="toolbar-label">Mês</span>
                <select className="toolbar-select" value={month} onChange={(event) => setMonth(Number(event.target.value))}>
                  {MONTHS.map((label, index) => (
                    <option key={label} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="toolbar-field">
                <span className="toolbar-label">Ano</span>
                <select className="toolbar-select" value={year} onChange={(event) => setYear(Number(event.target.value))}>
                  {YEARS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <button type="button" className="action-btn" onClick={handleManualSave}>
                Salvar plano
              </button>
              <button type="button" className="action-btn action-btn--accent" onClick={handlePrint}>
                Imprimir plano em tela
              </button>
            </div>
          </header>

          <section className="chooser-card panel-card no-print">
            <div className="chooser-block">
              <span className="chooser-label">BU</span>
              <div className="bu-tabs">
                {BU_ORDER.map((bu) => (
                  <button
                    key={bu}
                    type="button"
                    className={`bu-tab ${bu === activeBU ? "is-active" : ""}`}
                    onClick={() => {
                      setActiveBU(bu);
                      setActiveCourseId(getCourseId(COURSE_CATALOG[bu][0]));
                    }}
                  >
                    {bu}
                  </button>
                ))}
              </div>
            </div>

            <label className="chooser-block chooser-block--course">
              <span className="chooser-label">Curso</span>
              <select className="toolbar-select toolbar-select--wide" value={activeCourse.id} onChange={(event) => setActiveCourseId(event.target.value)}>
                {coursesForBU.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="status-box">
              <span className="status-label">Última atualização</span>
              <strong>{formatUpdatedAt(plan.updatedAt)}</strong>
              <span>{notice}</span>
            </div>
          </section>

          <section className="hero-grid">
            <div className="panel-card">
              <div className="course-heading">
                <div>
                  <p className="section-eyebrow">Curso ativo</p>
                  <h2 className="course-title">{activeCourse.name}</h2>
                  <p className="course-bu">{activeCourse.bu}</p>
                </div>
                {activeCourse.alert ? <span className="alert-pill">◎ {activeCourse.alert}</span> : null}
              </div>

              <div className="summary-grid compact-summary-grid">
                <Field label="Descritivo do produto" value={activeCourse.summary.description} onChange={(value) => updateSummaryField("description", value)} />
                <Field label="Última campanha" value={activeCourse.summary.lastCampaign} onChange={(value) => updateSummaryField("lastCampaign", value)} />
                <Field label="Inovação" value={activeCourse.summary.innovation} onChange={(value) => updateSummaryField("innovation", value)} />
                <Field label="Desafio" value={activeCourse.summary.challenge} onChange={(value) => updateSummaryField("challenge", value)} />
                <Field className="field-span-2" label="Período e meta" value={activeCourse.summary.periodSummary} onChange={(value) => updateSummaryField("periodSummary", value)} />
              </div>
            </div>

            <div className="panel-card meta-panel">
              <p className="section-eyebrow">Resumo executivo</p>
              <div className="kpi-boxes">
                <div className="kpi-box">
                  <span className="kpi-label">Investimento mensal</span>
                  <strong className="kpi-value">{formatCurrency(totalInvestment)}</strong>
                  <small className="kpi-sub">soma dos canais planejados</small>
                </div>
                <div className="kpi-box">
                  <span className="kpi-label">Inscrições</span>
                  <input className="kpi-input" value={activeCourse.meta.inscricoes} onChange={(event) => updateMetaField("inscricoes", event.target.value)} />
                  <small className="kpi-sub">meta mensal</small>
                </div>
                <div className="kpi-box">
                  <span className="kpi-label">CPA</span>
                  <input className="kpi-input" value={activeCourse.meta.cpa} onChange={(event) => updateMetaField("cpa", event.target.value)} />
                  <small className="kpi-sub">custo por inscrição</small>
                </div>
              </div>

              <Field label="Observações da meta" value={activeCourse.meta.note} onChange={(value) => updateMetaField("note", value)} textarea />
            </div>
          </section>

          <section className="panel-card section-card">
            <div className="section-head">
              <div>
                <p className="section-eyebrow">Canais de marketing</p>
                <h3 className="section-title">Planejamento por canal</h3>
              </div>
              {activeCourse.alert ? <span className="alert-pill alert-pill--small">◎ {activeCourse.alert}</span> : null}
            </div>

            <div className="channel-grid">
              {activeCourse.channels.map((channel) => (
                <article className="channel-card" key={`${activeCourse.id}-${channel.id}`}>
                  <div className="channel-card-head">
                    <div className="channel-main">
                      <div className="channel-name-row">
                        <span className="channel-dot" style={{ background: channel.color }} />
                        <strong className="channel-name">{channel.name}</strong>
                        <span className="channel-tag">{channel.tag}</span>
                        <span className="channel-tag">{channel.cadence === "continuous" ? "Contínuo" : "Semanal"}</span>
                      </div>
                      <span className="channel-value-display">{formatCompactCurrency(channel.value)}</span>
                    </div>

                    <div className="channel-budget-wrap">
                      <div className="budget-track">
                        <div className="budget-fill" style={{ width: `${Math.max((channel.value / maxChannelValue) * 100, channel.value > 0 ? 8 : 0)}%`, background: channel.color }} />
                      </div>

                      <label className="budget-input-wrap">
                        <span className="field-label">Valor</span>
                        <input
                          className="field-control budget-input"
                          inputMode="numeric"
                          value={String(channel.value)}
                          onChange={(event) => updateChannel(channel.id, (current) => ({ ...current, value: parseBudget(event.target.value) }))}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="channel-fields-grid">
                    <Field label="Público" value={channel.audience} onChange={(value) => updateChannel(channel.id, (current) => ({ ...current, audience: value }))} />
                    <Field label="Objetivo" value={channel.objective} onChange={(value) => updateChannel(channel.id, (current) => ({ ...current, objective: value }))} />
                    <Field className="field-span-2" label="Justificativa" value={channel.justification} onChange={(value) => updateChannel(channel.id, (current) => ({ ...current, justification: value }))} textarea />
                    <Field label="Consumo" value={channel.consumption} onChange={(value) => updateChannel(channel.id, (current) => ({ ...current, consumption: value }))} />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-card section-card">
            <div className="section-head">
              <div>
                <p className="section-eyebrow">Calendário de ações</p>
                <h3 className="section-title">Execução do mês</h3>
              </div>
            </div>

            <div className="calendar-scroll">
              <table className="calendar-table">
                <thead>
                  <tr>
                    <th className="calendar-course-col">Canal</th>
                    {weekRanges.map((week) => (
                      <th key={week.label}>
                        <div className="week-head">
                          <span>{week.label}</span>
                          <small>{week.helper}</small>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeCourse.channels.map((channel) => (
                    <tr key={`${activeCourse.id}-${channel.id}-calendar`}>
                      <td className="calendar-course-col">
                        <div className="calendar-channel-name-wrap">
                          <span className="channel-dot" style={{ background: channel.color }} />
                          <div>
                            <strong className="calendar-channel-name">{channel.name}</strong>
                            <div className="calendar-channel-meta">
                              <span>{channel.tag}</span>
                              <span>{channel.cadence === "continuous" ? "Contínuo" : "Semanal"}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {channel.weeks.map((week) => (
                        <td key={`${channel.id}-${week.weekIndex}`}>
                          <div className="week-card">
                            <input
                              type="date"
                              min={monthBoundaries.min}
                              max={monthBoundaries.max}
                              className="field-control week-date"
                              value={week.scheduledDate}
                              onChange={(event) =>
                                updateWeek(channel.id, week.weekIndex, (current) => ({
                                  ...current,
                                  scheduledDate: event.target.value,
                                }))
                              }
                            />
                            <input
                              className="field-control"
                              value={week.action}
                              placeholder="Descreva a ação"
                              onChange={(event) =>
                                updateWeek(channel.id, week.weekIndex, (current) => ({
                                  ...current,
                                  action: event.target.value,
                                }))
                              }
                            />
                            <label className="week-check">
                              <input
                                type="checkbox"
                                checked={week.completed}
                                onChange={(event) =>
                                  updateWeek(channel.id, week.weekIndex, (current) => ({
                                    ...current,
                                    completed: event.target.checked,
                                  }))
                                }
                              />
                              <span>{week.completed ? "Concluído" : "Marcar como concluído"}</span>
                            </label>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <style jsx>{styles}</style>
    </>
  );
}

const styles = `
  .midia-page {
    min-height: 100%;
    color: var(--color-text);
  }

  .canvas-wrap {
    width: 100%;
    max-width: 1500px;
    margin: 0 auto;
    padding: 24px;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 18px;
    padding-bottom: 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .page-title,
  .loading-title,
  .course-title {
    margin: 0;
    color: var(--color-text);
  }

  .page-title {
    font-size: 28px;
    line-height: 1.1;
    font-weight: 700;
  }

  .loading-title {
    font-size: 22px;
    font-weight: 600;
  }

  .page-subtitle,
  .course-bu {
    margin: 6px 0 0;
    color: rgba(245, 247, 247, 0.68);
    font-size: 13px;
  }

  .section-eyebrow,
  .chooser-label,
  .toolbar-label,
  .field-label,
  .kpi-label,
  .status-label {
    display: block;
    margin: 0 0 8px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(245, 247, 247, 0.58);
  }

  .section-eyebrow {
    margin-bottom: 8px;
  }

  .header-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: flex-end;
    gap: 10px;
  }

  .toolbar-field {
    min-width: 124px;
  }

  .toolbar-select,
  .field-control,
  .kpi-input {
    width: 100%;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-text);
    min-height: 42px;
    padding: 10px 12px;
    outline: none;
    transition: border-color 0.18s ease, background 0.18s ease;
  }

  .toolbar-select:hover,
  .field-control:hover,
  .kpi-input:hover,
  .toolbar-select:focus,
  .field-control:focus,
  .kpi-input:focus {
    border-color: rgba(217, 235, 26, 0.34);
    background: rgba(255, 255, 255, 0.06);
  }

  .field-control--textarea {
    min-height: 88px;
    resize: vertical;
  }

  .action-btn {
    min-height: 42px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
    color: var(--color-text);
    font-weight: 600;
    cursor: pointer;
    transition: 0.18s ease;
  }

  .action-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .action-btn--accent {
    color: var(--color-lime);
    border-color: rgba(217, 235, 26, 0.34);
    background: rgba(217, 235, 26, 0.08);
  }

  .panel-card {
    border-radius: 22px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: linear-gradient(180deg, rgba(18, 22, 22, 0.92), rgba(18, 22, 22, 0.84));
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.22);
    padding: 18px;
  }

  .chooser-card {
    display: grid;
    grid-template-columns: 1.1fr 1.2fr 0.9fr;
    gap: 16px;
    align-items: end;
    margin-bottom: 16px;
  }

  .chooser-block {
    min-width: 0;
  }

  .chooser-block--course {
    display: block;
  }

  .bu-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .bu-tab {
    min-height: 42px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    color: rgba(245, 247, 247, 0.76);
    font-weight: 600;
    cursor: pointer;
  }

  .bu-tab.is-active {
    color: var(--color-lime);
    border-color: rgba(217, 235, 26, 0.34);
    background: rgba(217, 235, 26, 0.1);
  }

  .toolbar-select--wide {
    width: 100%;
  }

  .status-box {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 42px;
    justify-content: center;
    padding: 10px 12px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: rgba(245, 247, 247, 0.7);
    font-size: 12px;
  }

  .status-box strong {
    color: var(--color-text);
    font-size: 13px;
  }

  .hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.8fr);
    gap: 16px;
    margin-bottom: 16px;
  }

  .course-heading,
  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .course-title {
    font-size: 24px;
    font-weight: 700;
  }

  .alert-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(142, 26, 235, 0.34);
    background: rgba(142, 26, 235, 0.14);
    color: #d7b2ff;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }

  .alert-pill--small {
    min-height: 28px;
    font-size: 10px;
  }

  .summary-grid {
    display: grid;
    gap: 12px;
  }

  .compact-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field-wrap {
    min-width: 0;
  }

  .field-span-2 {
    grid-column: span 2;
  }

  .meta-panel {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .kpi-boxes {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .kpi-box {
    padding: 14px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.03);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .kpi-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.1;
  }

  .kpi-input {
    font-size: 20px;
    font-weight: 700;
    min-height: 46px;
  }

  .kpi-sub {
    color: rgba(245, 247, 247, 0.64);
    font-size: 11px;
  }

  .section-card {
    margin-bottom: 16px;
  }

  .section-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--color-text);
  }

  .channel-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .channel-card {
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.025);
    padding: 14px;
  }

  .channel-card-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 240px;
    gap: 12px;
    align-items: start;
    margin-bottom: 12px;
  }

  .channel-main {
    min-width: 0;
  }

  .channel-name-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 6px;
  }

  .channel-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .channel-name,
  .calendar-channel-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text);
  }

  .channel-tag {
    display: inline-flex;
    align-items: center;
    min-height: 22px;
    padding: 0 8px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(245, 247, 247, 0.72);
    font-size: 10px;
    font-weight: 600;
  }

  .channel-value-display {
    font-size: 12px;
    color: rgba(245, 247, 247, 0.76);
    font-weight: 600;
  }

  .channel-budget-wrap {
    display: grid;
    gap: 10px;
    align-items: end;
  }

  .budget-track {
    height: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }

  .budget-fill {
    height: 100%;
    border-radius: 999px;
  }

  .budget-input-wrap {
    display: block;
  }

  .budget-input {
    min-height: 38px;
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .channel-fields-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .calendar-scroll {
    overflow-x: auto;
  }

  .calendar-table {
    width: 100%;
    min-width: 1040px;
    border-collapse: collapse;
  }

  .calendar-table th,
  .calendar-table td {
    padding: 10px 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    vertical-align: top;
  }

  .calendar-table th {
    text-align: left;
    color: rgba(245, 247, 247, 0.72);
    font-size: 12px;
    font-weight: 600;
  }

  .calendar-table tr:last-child td {
    border-bottom: none;
  }

  .calendar-course-col {
    width: 220px;
    min-width: 220px;
  }

  .week-head {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .week-head small,
  .calendar-channel-meta {
    color: rgba(245, 247, 247, 0.56);
    font-size: 11px;
  }

  .calendar-channel-name-wrap {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding-top: 6px;
  }

  .calendar-channel-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
  }

  .week-card {
    display: grid;
    gap: 8px;
    padding: 10px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.03);
    min-width: 170px;
  }

  .week-date {
    min-height: 38px;
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .week-check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: rgba(245, 247, 247, 0.74);
    font-size: 11px;
    min-height: 24px;
  }

  .week-check input {
    accent-color: var(--color-lime);
  }

  @media (max-width: 1280px) {
    .channel-grid {
      grid-template-columns: 1fr;
    }

    .hero-grid,
    .chooser-card {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 980px) {
    .page-header,
    .section-head,
    .course-heading {
      flex-direction: column;
      align-items: stretch;
    }

    .header-controls {
      justify-content: flex-start;
    }

    .channel-card-head,
    .compact-summary-grid,
    .channel-fields-grid,
    .kpi-boxes {
      grid-template-columns: 1fr;
    }

    .field-span-2 {
      grid-column: span 1;
    }
  }

  @media (max-width: 720px) {
    .canvas-wrap {
      padding: 16px;
    }

    .page-title {
      font-size: 24px;
    }

    .action-btn,
    .toolbar-select,
    .field-control,
    .kpi-input {
      min-height: 40px;
    }
  }

  @media print {
    :global(body) {
      background: #fff !important;
      color: #000 !important;
    }

    .midia-page {
      color: #000;
    }

    .canvas-wrap {
      max-width: none;
      padding: 0;
    }

    .no-print {
      display: none !important;
    }

    .panel-card,
    .channel-card,
    .week-card,
    .kpi-box {
      background: #fff !important;
      color: #000 !important;
      box-shadow: none !important;
      border-color: rgba(0, 0, 0, 0.12) !important;
    }

    .page-title,
    .course-title,
    .section-title,
    .channel-name,
    .calendar-channel-name,
    .kpi-value {
      color: #000 !important;
    }

    .page-subtitle,
    .course-bu,
    .section-eyebrow,
    .chooser-label,
    .toolbar-label,
    .field-label,
    .kpi-label,
    .status-label,
    .calendar-channel-meta,
    .week-head small,
    .kpi-sub,
    .status-box,
    .channel-value-display,
    .channel-tag,
    .alert-pill {
      color: rgba(0, 0, 0, 0.72) !important;
      background: transparent !important;
    }

    .toolbar-select,
    .field-control,
    .kpi-input {
      color: #000 !important;
      border-color: rgba(0, 0, 0, 0.14) !important;
      background: transparent !important;
    }
  }
`;
