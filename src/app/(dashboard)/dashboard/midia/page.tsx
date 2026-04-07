"use client";

import { useEffect, useMemo, useState } from "react";

type Channel = {
  name: string;
  tag: string;
  budget: number;
  color: string;
  type: "continuous" | "weekly";
  note?: string;
  isHsm?: boolean;
  baseSize?: number;
};

type ProductMeta = {
  inscricoes: string;
  cpa: string;
  note: string;
};

type ProductHeader = {
  productName: string;
  description: string;
  lastCampaign: string;
  innovation: string;
  challenge: string;
  periodMeta: string;
};

type Product = {
  name: string;
  header: ProductHeader;
  alert: string | null;
  creativeWeeks: number[];
  meta: ProductMeta;
  channels: Channel[];
};

const STORAGE_KEY = "medgrupo_plano_midia_produtos_v2";
const HSM_PRICE_BRL = 0.7;

function hsmCost(disparoVolume: number) {
  return Math.round(disparoVolume * HSM_PRICE_BRL);
}

function fmtBRL(v: number) {
  if (v === 0) return "—";
  if (v >= 1000) return "R$ " + (v / 1000).toFixed(0) + "k";
  return "R$ " + v;
}

function fmtFull(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatContacts(baseSize: number) {
  if (baseSize >= 1000 && baseSize % 1000 === 0) {
    return baseSize / 1000 + " mil contatos";
  }
  return baseSize.toLocaleString("pt-BR") + " contatos";
}

function getLegendName(channel: Channel) {
  if (channel.isHsm && channel.baseSize) {
    return `WhatsApp HSM (${formatContacts(channel.baseSize)})`;
  }
  return channel.name;
}

const defaultApproach = {
  topo: {
    badge: "Topo",
    text: "Awareness via vídeo e display em Redes Sociais. Tráfego Pago.",
    channels: ["Meta Ads", "Redes Sociais"],
  },
  meio: {
    badge: "Meio",
    text: "Remarketing em Ads, e-mail marketing e disparo WhatsApp HSM.",
    channels: ["Remarketing", "E-mail Mktg", "WhatsApp HSM"],
  },
  fundo: {
    badge: "Fundo",
    text: "Search (Google) + oferta de conversão direta ao eCommerce.",
    channels: ["Google Ads", "Follow-Up"],
  },
};

function getApproachItems(product: Product) {
  if (product.name === "Extensivo") {
    return [
      {
        badge: "Fundo",
        text: "Oferta de conversão direta ao eCommerce.",
        channels: [] as string[],
      },
    ];
  }

  return [defaultApproach.topo, defaultApproach.meio, defaultApproach.fundo];
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function normalizeProduct(product: Product): Product {
  const clone = deepClone(product);

  clone.header = clone.header || {
    productName: clone.name || "Produto",
    description: "Resumo estratégico do produto.",
    lastCampaign: "Campanha em definição.",
    innovation: "Estrutura de inovação em definição.",
    challenge: "Desafio estratégico em definição.",
    periodMeta: `Período: Abril/2026 · Meta: ${clone.meta?.inscricoes || "—"} inscrições · CPA: ${clone.meta?.cpa || "—"}`,
  };

  clone.header.productName = clone.header.productName || clone.name || "Produto";
  clone.header.description = clone.header.description || "Resumo estratégico do produto.";
  clone.header.lastCampaign = clone.header.lastCampaign || "Campanha em definição.";
  clone.header.innovation = clone.header.innovation || "Estrutura de inovação em definição.";
  clone.header.challenge = clone.header.challenge || "Desafio estratégico em definição.";
  clone.header.periodMeta =
    clone.header.periodMeta ||
    `Período: Abril/2026 · Meta: ${clone.meta?.inscricoes || "—"} inscrições · CPA: ${clone.meta?.cpa || "—"}`;

  return clone;
}

const defaultProducts: Product[] = [
  {
    name: "R+",
    header: {
      productName: "R+",
      description: "Preparação focada em escala, performance e conversão.",
      lastCampaign: "Conversão com mídia paga e base ativa.",
      innovation: "WhatsApp HSM integrado a remarketing.",
      challenge: "Sustentar volume com CPA controlado.",
      periodMeta: "Período: Abril/2026 · Meta: 5.000 inscrições · CPA: R$ 32,00",
    },
    alert: null,
    creativeWeeks: [0, 2],
    meta: {
      inscricoes: "5.000",
      cpa: "R$ 32,00",
      note: "Meta baseada em histórico de campanha + volume de base ativa.",
    },
    channels: [
      { name: "Google Ads", tag: "Search", budget: 8000, color: "#378ADD", type: "continuous" },
      { name: "Meta Ads", tag: "Social", budget: 8000, color: "#7F77DD", type: "continuous" },
      {
        name: "WhatsApp HSM",
        tag: "CRM",
        budget: 140000,
        color: "#1D9E75",
        type: "weekly",
        note: "200 mil contatos",
        isHsm: true,
        baseSize: 200000,
      },
      { name: "E-mail Marketing", tag: "CRM", budget: 0, color: "#EF9F27", type: "weekly", note: "base própria" },
      { name: "Redes Sociais/SEO", tag: "Orgânico", budget: 0, color: "#639922", type: "continuous", note: "orgânico" },
      { name: "Follow-Up", tag: "Comercial", budget: 0, color: "#D85A30", type: "weekly", note: "funil comercial" },
    ],
  },
  {
    name: "CPMED Revalida",
    header: {
      productName: "CPMED Revalida",
      description: "Preparação para médicos formados com foco em Revalida.",
      lastCampaign: "Captação segmentada para público qualificado.",
      innovation: "CRM acionado sobre base de médicos formados.",
      challenge: "Escalar um público menor com ticket maior.",
      periodMeta: "Período: Abril/2026 · Meta: 1.200 inscrições · CPA: R$ 50,00",
    },
    alert: null,
    creativeWeeks: [1],
    meta: {
      inscricoes: "1.200",
      cpa: "R$ 50,00",
      note: "Público segmentado de médicos formados. Menor volume, maior ticket.",
    },
    channels: [
      { name: "Google Ads", tag: "Search", budget: 3000, color: "#378ADD", type: "continuous" },
      { name: "Meta Ads", tag: "Social", budget: 3000, color: "#7F77DD", type: "continuous" },
      {
        name: "WhatsApp HSM",
        tag: "CRM",
        budget: 14000,
        color: "#1D9E75",
        type: "weekly",
        note: "20 mil contatos",
        isHsm: true,
        baseSize: 20000,
      },
      { name: "E-mail Marketing", tag: "CRM", budget: 0, color: "#EF9F27", type: "weekly", note: "base própria" },
      { name: "Redes Sociais/SEO", tag: "Orgânico", budget: 0, color: "#639922", type: "continuous", note: "orgânico" },
    ],
  },
  {
    name: "MEDBASE Prático",
    header: {
      productName: "MedBase",
      description: "Produto com ativação digital e apoio prático presencial.",
      lastCampaign: "Leads e conversão com reforço em eventos.",
      innovation: "Integração entre mídia, CRM e presença offline.",
      challenge: "Equilibrar geração de demanda e conversão.",
      periodMeta: "Período: Abril/2026 · Meta: 3.500 inscrições · CPA: R$ 28,00",
    },
    alert: null,
    creativeWeeks: [0, 2],
    meta: {
      inscricoes: "3.500",
      cpa: "R$ 28,00",
      note: "Meta considera geração de leads via tráfego pago + eventos presenciais (Telão).",
    },
    channels: [
      { name: "Google Ads", tag: "Search", budget: 3000, color: "#378ADD", type: "continuous" },
      { name: "Meta Ads", tag: "Social", budget: 7000, color: "#7F77DD", type: "continuous" },
      {
        name: "WhatsApp HSM",
        tag: "CRM",
        budget: 33600,
        color: "#1D9E75",
        type: "weekly",
        note: "48 mil contatos",
        isHsm: true,
        baseSize: 48000,
      },
      { name: "E-mail Marketing", tag: "CRM", budget: 0, color: "#EF9F27", type: "weekly", note: "base própria" },
      { name: "Redes Sociais/SEO", tag: "Orgânico", budget: 0, color: "#639922", type: "continuous", note: "orgânico" },
      { name: "Telão & Cartaz", tag: "Offline", budget: 0, color: "#BA7517", type: "weekly", note: "evento/ponto" },
    ],
  },
  {
    name: "MEDMASTER",
    header: {
      productName: "MEDMASTER",
      description: "Produto premium com base qualificada e recorrência.",
      lastCampaign: "Conversão com CRM e reforço social.",
      innovation: "HSM sobre base ativa com apoio orgânico.",
      challenge: "Aumentar eficiência sem perder qualificação.",
      periodMeta: "Período: Abril/2026 · Meta: 2.000 inscrições · CPA: R$ 45,00",
    },
    alert: null,
    creativeWeeks: [1],
    meta: {
      inscricoes: "2.000",
      cpa: "R$ 45,00",
      note: "Base de leads qualificados. Meta ajustada ao volume de HSM ativo.",
    },
    channels: [
      { name: "Meta Ads", tag: "Social", budget: 3000, color: "#7F77DD", type: "continuous" },
      {
        name: "WhatsApp HSM",
        tag: "CRM",
        budget: 56000,
        color: "#1D9E75",
        type: "weekly",
        note: "80 mil contatos",
        isHsm: true,
        baseSize: 80000,
      },
      { name: "E-mail Marketing", tag: "CRM", budget: 0, color: "#EF9F27", type: "weekly", note: "base própria" },
      { name: "Redes Sociais/SEO", tag: "Orgânico", budget: 0, color: "#639922", type: "continuous", note: "orgânico" },
      { name: "Telão & Cartaz", tag: "Offline", budget: 0, color: "#BA7517", type: "weekly", note: "evento/ponto" },
    ],
  },
  {
    name: "Combos",
    header: {
      productName: "Combos",
      description: "Oferta combinada voltada para conversão mais rápida.",
      lastCampaign: "Campanha de oferta com apelo de valor.",
      innovation: "Integração entre search, social e CRM.",
      challenge: "Manter urgência comercial com boa leitura de oferta.",
      periodMeta: "Período: Abril/2026 · Meta: 4.000 inscrições · CPA: R$ 25,00",
    },
    alert: null,
    creativeWeeks: [1, 3],
    meta: {
      inscricoes: "4.000",
      cpa: "R$ 25,00",
      note: "Produto de conversão rápida. CPA mais baixo por oferta combinada.",
    },
    channels: [
      { name: "Google Ads", tag: "Search", budget: 5000, color: "#378ADD", type: "continuous" },
      { name: "Meta Ads", tag: "Social", budget: 5000, color: "#7F77DD", type: "continuous" },
      {
        name: "WhatsApp HSM",
        tag: "CRM",
        budget: 84000,
        color: "#1D9E75",
        type: "weekly",
        note: "120 mil contatos",
        isHsm: true,
        baseSize: 120000,
      },
      { name: "E-mail Marketing", tag: "CRM", budget: 0, color: "#EF9F27", type: "weekly", note: "base própria" },
      { name: "Redes Sociais/SEO", tag: "Orgânico", budget: 0, color: "#639922", type: "continuous", note: "orgânico" },
      { name: "Telão & Cartaz", tag: "Offline", budget: 0, color: "#BA7517", type: "weekly", note: "evento/ponto" },
    ],
  },
  {
    name: "REVALIDAAÇÃO",
    header: {
      productName: "REVALIDAAÇÃO",
      description: "Configuração comercial inicial para produto em definição.",
      lastCampaign: "Estrutura base de mídia e CRM em construção.",
      innovation: "Modelo enxuto para ativação rápida.",
      challenge: "Ajustar meta, base e investimento final.",
      periodMeta: "Período: Abril/2026 · Meta: — inscrições · CPA: —",
    },
    alert: null,
    creativeWeeks: [1],
    meta: {
      inscricoes: "—",
      cpa: "—",
      note: "Configuração inicial para visualização comercial. Ajuste meta, base e orçamento conforme definição final.",
    },
    channels: [
      { name: "Google Ads", tag: "Search", budget: 3000, color: "#378ADD", type: "continuous" },
      { name: "Meta Ads", tag: "Social", budget: 3000, color: "#7F77DD", type: "continuous" },
      {
        name: "WhatsApp HSM",
        tag: "CRM",
        budget: 14000,
        color: "#1D9E75",
        type: "weekly",
        note: "20 mil contatos",
        isHsm: true,
        baseSize: 20000,
      },
      { name: "Redes Sociais/SEO", tag: "Orgânico", budget: 0, color: "#639922", type: "continuous", note: "orgânico" },
      { name: "E-mail Marketing", tag: "CRM", budget: 0, color: "#EF9F27", type: "weekly", note: "base própria" },
    ],
  },
  {
    name: "Extensivo",
    header: {
      productName: "Extensivo",
      description: "Operação reativa com foco em atendimento e demanda espontânea.",
      lastCampaign: "Demanda espontânea via WhatsApp.",
      innovation: "HSM de apoio com presença orgânica.",
      challenge: "Responder rápido sem operação ativa de mídia.",
      periodMeta: "Período: Abril/2026 · Meta: — inscrições · CPA: —",
    },
    alert: "Operação 100% reativa",
    creativeWeeks: [],
    meta: {
      inscricoes: "—",
      cpa: "—",
      note: "Sem meta ativa. Operação reativa — atende demanda espontânea via WhatsApp.",
    },
    channels: [
      {
        name: "WhatsApp HSM",
        tag: "CRM",
        budget: 5600,
        color: "#1D9E75",
        type: "weekly",
        note: "8 mil contatos",
        isHsm: true,
        baseSize: 8000,
      },
      {
        name: "Redes Sociais/SEO",
        tag: "Orgânico",
        budget: 0,
        color: "#639922",
        type: "continuous",
        note: "orgânico",
      },
    ],
  },
];

function MedgrupoLogo() {
  return (
    <div className="header-banner-logo">
      <div className="header-banner-logo__icon">
        <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="17.2" fill="none" stroke="var(--color-lime)" strokeWidth="2.2"></circle>
          <g transform="translate(4 4)">
            <path
              stroke="var(--color-lime)"
              fill="none"
              strokeLinejoin="miter"
              strokeLinecap="square"
              strokeMiterlimit="4"
              strokeWidth="2.6"
              d="M22 3.333v6.667h6.667M18 3.333v6.667M10 3.333v6.667h-6.667M14 3.333v6.667M22 28.667v-6.667h6.667M10 28.667v-6.667h-6.667M14 22v6.667M18 22v6.667M28.666 14h-6.667M10 14h-6.667M28.666 18h-6.667M10 18h-6.667M14 14h0.013M18 14h0.013M18 18h0.013M14 18h0.013"
            ></path>
          </g>
        </svg>
      </div>

      <div className="header-banner-logo__icon-text">
        <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="0 0 248 32">
          <path d="M26.1 2.026c0.288-0.35 0.518-0.555 0.691-0.613 0.173-0.088 0.46-0.131 0.863-0.131h5.395v29.032h-6.905v-18.435l-6.56 8.232h-4.057c-0.316 0-0.561-0.029-0.734-0.088s-0.345-0.204-0.518-0.438l-6.042-7.707v18.435h-6.819v-29.032h5.697c0.403 0 0.676 0.029 0.82 0.088 0.173 0.058 0.403 0.277 0.691 0.657l8.718 11.035h0.129l8.632-11.035z"></path>
          <path d="M60.254 1.282v5.999h-14.587v5.386h13.293v5.912h-13.293v5.737h14.976v5.999h-22.14v-29.032h21.752z"></path>
          <path d="M65.561 30.314v-29.032h10.315c2.82 0 5.294 0.307 7.423 0.92 2.129 0.584 3.942 1.533 5.438 2.846 1.352 1.197 2.374 2.686 3.064 4.467 0.719 1.781 1.079 3.883 1.079 6.306s-0.36 4.525-1.079 6.306c-0.69 1.781-1.712 3.27-3.064 4.467-1.496 1.314-3.323 2.262-5.481 2.846-2.129 0.584-4.604 0.876-7.423 0.876h-10.272zM72.725 24.008h2.935c1.726 0 3.222-0.117 4.488-0.35s2.302-0.715 3.107-1.445c0.691-0.642 1.208-1.474 1.554-2.496 0.374-1.051 0.561-2.35 0.561-3.897 0-3.007-0.705-5.153-2.115-6.437-0.806-0.73-1.841-1.212-3.107-1.445s-2.762-0.35-4.488-0.35h-2.935v16.421z"></path>
          <path d="M116.985 19.673h-4.186v-4.948h10.056c0.432 0 0.719 0.073 0.863 0.219 0.173 0.146 0.259 0.423 0.259 0.832v14.538h-5.006l-1.122-2.54-2.158 1.226c-1.007 0.584-2.014 1.022-3.021 1.314-1.007 0.321-2.1 0.467-3.28 0.438-2.129 0-4.042-0.38-5.74-1.139s-3.151-1.81-4.359-3.153c-1.18-1.343-2.086-2.919-2.719-4.729-0.633-1.839-0.949-3.81-0.949-5.912 0-2.306 0.388-4.379 1.165-6.218 0.806-1.868 1.87-3.445 3.194-4.729 1.352-1.314 2.92-2.306 4.704-2.978 1.784-0.701 3.668-1.051 5.654-1.051 1.496 0 2.906 0.19 4.23 0.569 1.352 0.379 2.575 0.92 3.668 1.62s2.057 1.533 2.892 2.496c0.834 0.963 1.482 2.014 1.942 3.153l-4.316 3.065-4.057-2.671c-0.921-0.613-1.741-1.022-2.46-1.226-0.691-0.234-1.482-0.35-2.374-0.35-0.921 0-1.798 0.175-2.633 0.525-0.806 0.35-1.51 0.861-2.115 1.533s-1.093 1.533-1.467 2.584c-0.345 1.022-0.518 2.204-0.518 3.547 0 2.832 0.662 4.919 1.985 6.262 1.323 1.314 3.222 1.971 5.697 1.971 0.863 0 1.827-0.073 2.892-0.219 1.065-0.175 1.942-0.394 2.633-0.657 0.259-0.088 0.432-0.19 0.518-0.307s0.13-0.306 0.13-0.569v-2.496z"></path>
          <path d="M136.324 30.314h-7.164v-29.032h12.127c2.388 0 4.388 0.219 5.999 0.657s2.92 1.139 3.927 2.102c1.611 1.635 2.417 3.897 2.417 6.787 0 2.014-0.46 3.78-1.381 5.299-0.892 1.489-2.014 2.671-3.366 3.547l6.474 10.641h-7.164c-0.345 0-0.604-0.044-0.777-0.131-0.173-0.117-0.331-0.306-0.475-0.569l-4.575-7.794c-0.201-0.321-0.36-0.511-0.475-0.569s-0.374-0.088-0.777-0.088h-4.79v9.152zM144.006 15.25c0.374 0 0.676-0.044 0.906-0.131s0.446-0.292 0.647-0.613c0.259-0.409 0.446-0.92 0.561-1.533 0.144-0.642 0.216-1.255 0.216-1.839 0-0.671-0.086-1.241-0.259-1.708-0.173-0.496-0.403-0.876-0.69-1.139-0.374-0.35-0.878-0.584-1.511-0.701-0.633-0.146-1.453-0.219-2.46-0.219h-5.093v7.882h7.682z"></path>
          <path d="M184.85 18.009c0 4.175-1.079 7.298-3.237 9.371-1.151 1.109-2.546 1.956-4.186 2.54-1.64 0.555-3.525 0.832-5.654 0.832-4.258 0-7.538-1.124-9.84-3.372-1.122-1.109-1.956-2.408-2.503-3.897-0.518-1.518-0.777-3.343-0.777-5.474v-16.728h7.164v16.728c0 0.993 0.086 1.854 0.259 2.584 0.201 0.73 0.518 1.314 0.95 1.752 0.489 0.467 1.151 0.817 1.985 1.051 0.834 0.204 1.784 0.306 2.848 0.306s2-0.102 2.805-0.306c0.806-0.234 1.453-0.584 1.942-1.051 0.46-0.438 0.777-1.022 0.949-1.752 0.201-0.73 0.288-1.591 0.259-2.584v-16.728h7.035v16.728z"></path>
          <path d="M197.057 30.314h-7.164v-29.032h11.911c4 0 7.050 0.774 9.15 2.321 2.1 1.518 3.15 4.087 3.15 7.707 0 3.299-0.906 5.853-2.718 7.663-1.784 1.781-4.618 2.671-8.502 2.671h-5.827v8.67zM204.566 15.732c0.404 0 0.706-0.044 0.906-0.131 0.23-0.117 0.462-0.35 0.692-0.701 0.23-0.409 0.402-0.963 0.518-1.664 0.114-0.73 0.172-1.387 0.172-1.971 0-1.372-0.288-2.35-0.864-2.934-0.402-0.409-0.92-0.671-1.554-0.788-0.632-0.117-1.496-0.175-2.588-0.175h-4.791v8.364h7.509z"></path>
          <path d="M246.224 15.82c0 2.277-0.402 4.335-1.208 6.174-0.776 1.839-1.842 3.416-3.194 4.729-1.324 1.284-2.876 2.277-4.66 2.978-1.756 0.701-3.626 1.051-5.612 1.051-1.984 0-3.87-0.35-5.652-1.051-1.756-0.701-3.31-1.693-4.662-2.978-1.324-1.314-2.388-2.89-3.194-4.729-0.776-1.839-1.164-3.897-1.164-6.174s0.388-4.335 1.164-6.174c0.806-1.839 1.87-3.416 3.194-4.729 1.352-1.314 2.906-2.321 4.662-3.021 1.782-0.701 3.668-1.051 5.652-1.051 1.986 0 3.856 0.35 5.612 1.051 1.784 0.701 3.336 1.708 4.66 3.021 1.352 1.314 2.418 2.89 3.194 4.729 0.806 1.839 1.208 3.897 1.208 6.174zM238.716 15.82c0-2.627-0.634-4.598-1.9-5.912s-3.020-1.971-5.266-1.971c-2.272 0-4.042 0.657-5.308 1.971-1.236 1.314-1.856 3.284-1.856 5.912 0 2.657 0.62 4.627 1.856 5.912 1.266 1.284 3.036 1.927 5.308 1.927 2.246 0 4-0.642 5.266-1.927 1.266-1.314 1.9-3.284 1.9-5.912z"></path>
        </svg>
      </div>
    </div>
  );
}

export default function MidiaPage() {
  const [products, setProducts] = useState<Product[]>(defaultProducts.map(normalizeProduct));
  const [active, setActive] = useState(6);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          setProducts(parsed.map(normalizeProduct));
        }
      }
    } catch (error) {
      console.warn("Não foi possível carregar os dados salvos.", error);
    } finally {
      setMounted(true);
    }
  }, []);

  const activeProduct = useMemo(() => normalizeProduct(products[active]), [products, active]);
  const approachItems = useMemo(() => getApproachItems(activeProduct), [activeProduct]);

  const paidChannels = useMemo(
    () => activeProduct.channels.filter((channel) => channel.budget > 0),
    [activeProduct.channels]
  );

  const total = useMemo(
    () => paidChannels.reduce((sum, channel) => sum + channel.budget, 0),
    [paidChannels]
  );

  const maxBudget = useMemo(
    () => Math.max(...paidChannels.map((channel) => channel.budget), 1),
    [paidChannels]
  );

  function persist(nextProducts: Product[]) {
    setProducts(nextProducts);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProducts));
    } catch (error) {
      console.warn("Não foi possível salvar os dados.", error);
    }
  }

  function updateHeaderField(field: keyof ProductHeader, value: string) {
    const next = [...products];
    next[active] = normalizeProduct(next[active]);
    next[active].header[field] = value.replace(/\u00a0/g, " ").trim();
    persist(next);
  }

  function saveSummaryState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
      alert("Alterações salvas no navegador.");
    } catch (error) {
      console.warn("Não foi possível salvar no navegador.", error);
    }
  }

  function downloadCurrentJson() {
    const blob = new Blob([JSON.stringify(products, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plano_midia_medgrupo_abril_2026.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (!mounted) {
    return (
      <>
        <div className="midia-page">
          <div className="canvas-wrap">
            <div className="midia-card">
              <p className="card-title">Carregando plano de mídia...</p>
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
          <div className="medgrupo-header">
            <div className="medgrupo-header-top">
              <MedgrupoLogo />

              <div className="page-title-wrap">
                <h1 className="page-title">Plano de Mídia Abril 2026</h1>
                <span className="page-subtitle">Visão por produto · mensal</span>
              </div>
            </div>
          </div>

          <div className="products-toolbar">
            <div className="products-tabs">
              {products.map((product, index) => (
                <button
                  key={product.name}
                  className={`tab-btn ${index === active ? "active" : ""}`}
                  type="button"
                  onClick={() => setActive(index)}
                >
                  {product.name}
                </button>
              ))}
            </div>

            <div className="summary-actions">
              <button className="action-btn" type="button" onClick={saveSummaryState}>
                Salvar no navegador
              </button>
              <button className="action-btn action-btn--accent" type="button" onClick={downloadCurrentJson}>
                Baixar JSON atualizado
              </button>
            </div>
          </div>

          <div className="product-summary-bar">
            <div className="product-summary-item">
              <span className="product-summary-label">Produto</span>
              <div className="product-summary-value">{activeProduct.header.productName}</div>
            </div>

            <EditableField
              label="Descritivo do produto"
              value={activeProduct.header.description}
              onSave={(value) => updateHeaderField("description", value)}
            />

            <EditableField
              label="Última campanha"
              value={activeProduct.header.lastCampaign}
              onSave={(value) => updateHeaderField("lastCampaign", value)}
            />

            <EditableField
              label="Inovação"
              value={activeProduct.header.innovation}
              onSave={(value) => updateHeaderField("innovation", value)}
            />

            <EditableField
              label="Desafio"
              value={activeProduct.header.challenge}
              onSave={(value) => updateHeaderField("challenge", value)}
            />

            <EditableField
              label="Período e meta"
              value={activeProduct.header.periodMeta}
              onSave={(value) => updateHeaderField("periodMeta", value)}
            />
          </div>

          <div className="grid">
            <div className="midia-card">
              <p className="card-title">Canais de marketing</p>

              {activeProduct.alert ? <div className="alert-tag">◎ {activeProduct.alert}</div> : null}

              {activeProduct.channels.map((channel) => (
                <div className="channel-row" key={`${activeProduct.name}-${channel.name}`}>
                  <div className="ch-left">
                    <div className="ch-dot" style={{ background: channel.color }} />
                    <span className="ch-name">{channel.name}</span>
                    <span className="ch-tag">{channel.tag}</span>
                  </div>

                  <div className="ch-right">
                    {channel.budget > 0 ? (
                      <div className="bar-wrap">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${Math.round((channel.budget / maxBudget) * 100)}%`,
                            background: channel.color,
                          }}
                        />
                      </div>
                    ) : null}

                    <span className="ch-budget">
                      {channel.budget > 0 ? fmtBRL(channel.budget) : channel.note || "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="midia-card">
              <p className="card-title">Calendário de ações — mês</p>
              <Calendar product={activeProduct} />
            </div>

            <div className="midia-card">
              {total > 0 ? (
                <>
                  <div className="stacked-bar">
                    {paidChannels.map((channel) => (
                      <div
                        key={`${activeProduct.name}-${channel.name}-stack`}
                        style={{ flex: channel.budget, background: channel.color }}
                      />
                    ))}
                  </div>

                  {paidChannels.map((channel) => (
                    <div className="legend-item" key={`${activeProduct.name}-${channel.name}-legend`}>
                      <div className="leg-dot" style={{ background: channel.color }} />
                      <span>{getLegendName(channel)}</span>
                      <span className="legend-percent">{Math.round((channel.budget / total) * 100)}%</span>
                      <span className="legend-value">{fmtBRL(channel.budget)}</span>
                    </div>
                  ))}

                  {activeProduct.name !== "Extensivo" ? (
                    <div className="cost-note">
                      * E-mail Mktg, Redes Sociais/SEO e Telão: custo operacional.
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="only-reactive">
                  Apenas custo de disparo HSM. Produto em operação 100% reativa.
                </div>
              )}
            </div>

            <div className="midia-card">
              <p className="card-title">Abordagem por etapa do funil</p>

              {approachItems.map((item, index) => (
                <div className="ap-item" key={`${item.badge}-${index}`}>
                  <span className={`ap-badge ap-badge-${item.badge.toLowerCase()}`}>{item.badge}</span>

                  <div>
                    <div className="ap-text">{item.text}</div>

                    {item.channels?.length ? (
                      <div className="ap-channels">
                        {item.channels.map((channel) => (
                          <span className="ap-ch" key={channel}>
                            {channel}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="midia-card">
              <p className="card-title">Investimento mensal (mídia paga)</p>

              <div className="inv-header">
                <span className="inv-total">{total > 0 ? fmtFull(total) : "—"}</span>
                <span className="inv-sub">{total > 0 ? "estimado/mês" : "reativo"}</span>
              </div>

              <div className="meta-card">
                <p className="card-title">Meta do produto</p>

                <div className="meta-inner">
                  <div className="meta-kpi">
                    <span className="meta-kpi-label">Inscrições</span>
                    <span className="meta-kpi-value">{activeProduct.meta.inscricoes}</span>
                    <span className="meta-kpi-sub">meta mensal</span>
                  </div>

                  <div className="meta-kpi">
                    <span className="meta-kpi-label">CPA - custo por aquisição</span>
                    <span className="meta-kpi-value">{activeProduct.meta.cpa}</span>
                    <span className="meta-kpi-sub">estimado por inscrição</span>
                  </div>
                </div>

                <div className="meta-note">{activeProduct.meta.note}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{styles}</style>
    </>
  );
}

function EditableField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
}) {
  return (
    <div className="product-summary-item">
      <span className="product-summary-label">{label}</span>
      <div
        className="product-summary-value is-editable"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onSave(e.currentTarget.innerText)}
      >
        {value}
      </div>
    </div>
  );
}

function Calendar({ product }: { product: Product }) {
  const weeks = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"];

  return (
    <>
      <table className="cal-table">
        <thead>
          <tr>
            <th className="ch-col">Canal</th>
            {weeks.map((week) => (
              <th key={week}>{week}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {product.channels.map((channel) => (
            <tr key={`${product.name}-${channel.name}-calendar`}>
              <td className="channel-cell">
                <div className="calendar-channel-label">
                  <div className="calendar-channel-dot" style={{ background: channel.color }} />
                  <span className="calendar-channel-name">{channel.name}</span>
                  <span className="calendar-channel-tag">{channel.tag}</span>
                </div>
              </td>

              {weeks.map((_, weekIndex) => {
                if (channel.type === "continuous") {
                  const isCreative = product.creativeWeeks.includes(weekIndex);

                  return (
                    <td className="week-cell" key={`${channel.name}-${weekIndex}`}>
                      <div className="pill-cont">
                        <div
                          className="bar-cont"
                          style={{
                            background: `${channel.color}22`,
                            color: channel.color,
                            border: `0.5px solid ${channel.color}55`,
                          }}
                        >
                          Ativo
                        </div>

                        {isCreative ? <div className="update-badge">↻ criativo</div> : null}
                      </div>
                    </td>
                  );
                }

                return (
                  <td className="week-cell" key={`${channel.name}-${weekIndex}`}>
                    <div
                      className="ev-dot"
                      style={{
                        background: `${channel.color}22`,
                        color: channel.color,
                        border: `0.5px solid ${channel.color}66`,
                      }}
                    >
                      1×
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="cal-legend">
        <div className="cal-leg-item">
          <div className="cal-leg-bar" />
          Contínuo (mês todo)
        </div>

        <div className="cal-leg-item">
          <div className="cal-leg-dot" />
          1× por semana
        </div>

        <div className="cal-leg-item">
          <span className="creative-pill">↻ criativo</span>
          Novo criativo
        </div>
      </div>
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
    max-width: 1280px;
    margin: 0 auto;
    padding: 24px;
  }

  .medgrupo-header {
    margin-bottom: 18px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding-bottom: 16px;
  }

  .medgrupo-header-top {
    display: flex;
    align-items: center;
    gap: 22px;
    flex-wrap: wrap;
  }

  .header-banner-logo {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .header-banner-logo__icon svg {
    width: 40px;
    height: 40px;
    display: block;
  }

  .header-banner-logo__icon-text svg {
    height: 18px;
    width: auto;
    fill: var(--color-text);
    display: block;
  }

  .page-title-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 260px;
  }

  .page-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
    line-height: 1.2;
  }

  .page-subtitle {
    font-size: 12px;
    color: rgba(245, 247, 247, 0.68);
  }

  .products-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .summary-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .products-tabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tab-btn {
    padding: 6px 16px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(245, 247, 247, 0.68);
    background: rgba(255,255,255,0.02);
    transition: all 0.2s ease;
  }

  .tab-btn:hover {
    border-color: rgba(255,255,255,0.14);
    color: var(--color-text);
    background: rgba(255,255,255,0.04);
  }

  .tab-btn.active {
    background: rgba(217, 235, 26, 0.12);
    color: var(--color-lime);
    border-color: rgba(217, 235, 26, 0.38);
  }

  .action-btn {
    padding: 8px 14px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.02);
    color: var(--color-text);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn:hover {
    border-color: rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.05);
  }

  .action-btn--accent {
    border-color: rgba(217, 235, 26, 0.38);
    color: var(--color-lime);
    background: rgba(217, 235, 26, 0.08);
  }

  .product-summary-bar {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 16px;
    padding: 14px 16px;
    background: var(--panel);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px;
    box-shadow: 0 12px 30px rgba(0,0,0,0.16);
  }

  .product-summary-item {
    min-width: 0;
  }

  .product-summary-label {
    display: block;
    font-size: 10px;
    font-weight: 600;
    color: rgba(245, 247, 247, 0.62);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }

  .product-summary-value {
    display: block;
    min-height: 44px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
    line-height: 1.45;
    padding: 8px 10px;
    border: 1px solid transparent;
    border-radius: 12px;
    outline: none;
    transition: border-color 0.2s ease, background 0.2s ease;
    white-space: pre-wrap;
  }

  .product-summary-value.is-editable {
    background: rgba(255,255,255,0.02);
    border-color: rgba(255,255,255,0.06);
    cursor: text;
  }

  .product-summary-value.is-editable:hover,
  .product-summary-value.is-editable:focus {
    background: rgba(255,255,255,0.04);
    border-color: rgba(217, 235, 26, 0.4);
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .midia-card,
  .meta-card {
    background: var(--panel);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px;
    padding: 16px 18px;
    box-shadow: 0 12px 30px rgba(0,0,0,0.16);
  }

  .meta-card {
    margin-top: 12px;
  }

  .card-title {
    font-size: 11px;
    font-weight: 600;
    color: rgba(245, 247, 247, 0.62);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0 0 16px;
  }

  .channel-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .channel-row:last-child {
    border-bottom: none;
  }

  .ch-left,
  .ch-right {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .ch-right {
    flex-shrink: 0;
  }

  .ch-dot,
  .leg-dot,
  .cal-leg-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .ch-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ch-tag,
  .ap-ch,
  .update-badge {
    font-size: 10px;
    font-weight: 500;
    color: rgba(245, 247, 247, 0.68);
    background: rgba(255,255,255,0.04);
    border-radius: 6px;
    padding: 2px 6px;
    white-space: nowrap;
    border: 1px solid rgba(255,255,255,0.06);
  }

  .bar-wrap {
    width: 60px;
    height: 4px;
    background: rgba(255,255,255,0.08);
    border-radius: 999px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 999px;
  }

  .ch-budget {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text);
    min-width: 88px;
    text-align: right;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: rgba(245, 247, 247, 0.72);
    margin-bottom: 6px;
  }

  .legend-percent {
    margin-left: auto;
    font-weight: 500;
  }

  .legend-value {
    min-width: 72px;
    text-align: right;
    font-weight: 500;
    color: var(--color-text);
  }

  .stacked-bar {
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
    display: flex;
    margin-bottom: 16px;
    background: rgba(255,255,255,0.06);
  }

  .inv-header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .inv-total {
    font-size: 28px;
    font-weight: 600;
    color: var(--color-text);
  }

  .inv-sub {
    font-size: 12px;
    color: rgba(245, 247, 247, 0.62);
  }

  .ap-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 12px;
  }

  .ap-item:last-child {
    margin-bottom: 0;
  }

  .ap-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 999px;
    white-space: nowrap;
    margin-top: 1px;
    flex-shrink: 0;
    border: 1px solid transparent;
  }

  .ap-badge-topo {
    background: rgba(72, 150, 150, 0.12);
    color: var(--color-teal);
    border-color: rgba(72, 150, 150, 0.3);
  }

  .ap-badge-meio {
    background: rgba(142, 26, 235, 0.14);
    color: #d7b2ff;
    border-color: rgba(142, 26, 235, 0.32);
  }

  .ap-badge-fundo {
    background: rgba(217, 235, 26, 0.12);
    color: var(--color-lime);
    border-color: rgba(217, 235, 26, 0.32);
  }

  .ap-text {
    font-size: 13px;
    color: rgba(245, 247, 247, 0.72);
    line-height: 1.5;
  }

  .ap-channels {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }

  .alert-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(142, 26, 235, 0.14);
    color: #d7b2ff;
    border: 1px solid rgba(142, 26, 235, 0.3);
    margin-bottom: 12px;
    font-weight: 500;
  }

  .cal-table {
    width: 100%;
    border-collapse: collapse;
  }

  .cal-table th {
    font-size: 11px;
    font-weight: 500;
    color: rgba(245, 247, 247, 0.62);
    text-align: center;
    padding: 6px 4px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .cal-table th.ch-col {
    text-align: left;
    padding-left: 0;
    min-width: 120px;
  }

  .cal-table td {
    padding: 6px 4px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    vertical-align: middle;
  }

  .cal-table tr:last-child td {
    border-bottom: none;
  }

  .channel-cell {
    padding: 8px 0 !important;
  }

  .calendar-channel-label {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .calendar-channel-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .calendar-channel-name {
    font-size: 12px;
    color: var(--color-text);
    font-weight: 500;
    white-space: nowrap;
  }

  .calendar-channel-tag {
    font-size: 10px;
    color: rgba(245, 247, 247, 0.68);
    background: rgba(255,255,255,0.04);
    border-radius: 6px;
    padding: 2px 6px;
    white-space: nowrap;
    border: 1px solid rgba(255,255,255,0.06);
  }

  .week-cell {
    text-align: center;
  }

  .pill-cont {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
  }

  .bar-cont {
    height: 20px;
    border-radius: 8px;
    width: 90%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
  }

  .ev-dot {
    width: 22px;
    height: 22px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    margin: 0 auto;
  }

  .cal-legend {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .cal-leg-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: rgba(245, 247, 247, 0.68);
  }

  .cal-leg-bar {
    width: 20px;
    height: 8px;
    border-radius: 999px;
    background: rgba(72, 150, 150, 0.18);
    border: 1px solid rgba(72, 150, 150, 0.34);
  }

  .cal-leg-dot {
    background: rgba(217, 235, 26, 0.14);
    border: 1px solid rgba(217, 235, 26, 0.34);
  }

  .creative-pill {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 6px;
    background: rgba(255,255,255,0.04);
    color: rgba(245, 247, 247, 0.68);
    border: 1px solid rgba(255,255,255,0.06);
  }

  .meta-inner {
    display: flex;
    gap: 16px;
    align-items: stretch;
    flex-wrap: wrap;
  }

  .meta-kpi {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 180px;
    background: rgba(255,255,255,0.03);
    border-radius: 16px;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.05);
  }

  .meta-kpi-label {
    font-size: 11px;
    font-weight: 600;
    color: rgba(245, 247, 247, 0.62);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .meta-kpi-value {
    font-size: 26px;
    font-weight: 600;
    color: var(--color-text);
  }

  .meta-kpi-sub,
  .meta-note,
  .cost-note,
  .only-reactive {
    font-size: 12px;
    color: rgba(245, 247, 247, 0.68);
  }

  .meta-note {
    margin-top: 12px;
    line-height: 1.6;
  }

  .cost-note {
    border-top: 1px solid rgba(255,255,255,0.06);
    margin-top: 12px;
    padding-top: 12px;
  }

  .only-reactive {
    font-size: 13px;
  }

  @media (max-width: 1100px) {
    .product-summary-bar {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .grid {
      grid-template-columns: 1fr;
    }

    .ch-budget {
      min-width: 72px;
    }

    .product-summary-bar {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 760px) {
    .products-toolbar {
      align-items: stretch;
    }

    .summary-actions {
      width: 100%;
    }

    .product-summary-bar {
      grid-template-columns: 1fr;
    }

    .product-summary-value {
      min-height: 0;
    }

    .canvas-wrap {
      padding: 16px;
    }
  }

  @media (max-width: 640px) {
    .page-title {
      font-size: 18px;
    }

    .product-summary-bar {
      grid-template-columns: 1fr;
    }
  }
`;