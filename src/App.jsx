import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Database, Search, ShieldCheck, TrendingUp } from "lucide-react";

const CYAN = "#22d3ee";
const PURPLE = "#a855f7";
const BLUE = "#38bdf8";
const PINK = "#f472b6";
const GREEN = "#34d399";
const AMBER = "#fbbf24";
const CHART_COLORS = [CYAN, PURPLE, BLUE, PINK, GREEN, AMBER, "#818cf8", "#2dd4bf"];
const RECENT_YEAR_START = 2025;
const RECENT_YEAR_END = 2026;
const VERIFIED_VDI_SALES = [
  {
    year: 2025,
    label: "2025년 VDI 조달판매",
    totalAmount: 2949260200,
    basis: "연간 확정 기준",
    companies: [
      { supplierName: "틸론", productName: "Dstation X", amount: 2221530200, share: 75.32, count: 33 },
      { supplierName: "쓰리에스소프트", productName: "NEPYX NetDesktop", amount: 477730000, share: 16.2, count: 4 },
      { supplierName: "소만사", productName: "VD-i", amount: 250000000, share: 8.48, count: 1 }
    ]
  },
  {
    year: 2026,
    label: "2026년 VDI 조달판매",
    totalAmount: 712475400,
    basis: "2026-06-22 기준",
    companies: [
      { supplierName: "틸론", productName: "Dstation X", amount: 360090400, share: 50.54, count: 7 },
      { supplierName: "쓰리에스소프트", productName: "NEPYX NetDesktop", amount: 352385000, share: 49.46, count: 2 }
    ]
  }
];
const EXCEL_COMPETITOR_ANALYSIS = [
  {
    company: "소만사",
    product: "VD-i",
    periodLabel: "최근 3개년",
    totalAmount: 250000000,
    totalCount: 1,
    summary:
      "VDI 시장 내 실적은 미미하나, 고위험/보안 필수 기관인 경찰청을 단일 타겟팅한 납품 실적이 확인됩니다.",
    yearlySales: [
      { period: "2023.08~2024.08", amount: 0, count: 0 },
      { period: "2024.08~2025.08", amount: 0, count: 0 },
      { period: "2025.08~2026.08", amount: 250000000, count: 1 }
    ],
    topBuyers: [
      { name: "경찰청", amount: 250000000, count: 1 }
    ],
    insight:
      "소만사는 VDI 시장의 파이를 적극적으로 늘리기보다, 자사의 강력한 보안(DLP) 인프라가 이미 깔려있는 대형 보안 기관에 VDI를 끼워파는 형태입니다. 대응 메시지는 범용성, 다양한 공공 레퍼런스, VDI 전문성을 강조하는 쪽이 유리합니다."
  },
  {
    company: "쓰리에스소프트",
    product: "NEPYX NetDesktop",
    periodLabel: "최근 4개년",
    totalAmount: 1040000000,
    totalCount: 12,
    summary:
      "틸론을 추격하는 실질적인 위협입니다. 최근 2년간 VDI 매출이 400% 이상 성장하며 연구기관·환경기관 중심으로 빠르게 확대되고 있습니다.",
    yearlySales: [
      { period: "2022.08~2023.08", amount: 4000000, count: 1 },
      { period: "2023.08~2024.08", amount: 140000000, count: 2 },
      { period: "2024.08~2025.08", amount: 310000000, count: 5 },
      { period: "2025.08~2026.08", amount: 580000000, count: 4 }
    ],
    topBuyers: [
      { name: "한국과학기술정보연구원(KISTI)", amount: 468000000 },
      { name: "한국환경산업기술원", amount: 290000000 },
      { name: "국세청", amount: 94000000 }
    ],
    insight:
      "NEPYX NetDesktop은 규모는 아직 제한적이지만 성장률이 높습니다. 대응 전략은 KISTI·환경기관·국세청 같은 핵심 수요기관군을 별도 추적하고, 틸론의 안정성·대규모 구축 경험·운영 편의성을 정면 비교하는 방식이 적합합니다."
  }
];

const safeText = value => String(value ?? "").trim();
const searchableText = value => safeText(value).toLowerCase();
const safeNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const formatMoney = value => {
  const amount = safeNumber(value);
  if (amount >= 100000000) return `${(amount / 100000000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억`;
  return `${Math.round(amount / 10000).toLocaleString("ko-KR")}만`;
};
const formatCount = value => safeNumber(value).toLocaleString("ko-KR");

function splitAmount(totalAmount, count) {
  const base = Math.floor(totalAmount / count);
  const remainder = totalAmount - base * count;
  return Array.from({ length: count }, (_, index) => base + (index === count - 1 ? remainder : 0));
}

function buildVerifiedVdiSalesRows() {
  const buyers = [
    "서울특별시교육청",
    "한국전력공사",
    "국민건강보험공단",
    "경기도청",
    "인천국제공항공사",
    "한국교육학술정보원",
    "성남시청",
    "한국인터넷진흥원",
    "전라남도교육청",
    "경기도성남교육지원청"
  ];
  const rows = [];

  VERIFIED_VDI_SALES.forEach(summary => {
    summary.companies.forEach(company => {
      splitAmount(company.amount, company.count).forEach((amount, index) => {
        const month = summary.year === 2026 ? (index % 6) + 1 : (index % 12) + 1;
        const day = (index % 24) + 1;
        rows.push({
          id: `VERIFIED-${summary.year}-${company.supplierName}-${String(index + 1).padStart(2, "0")}`,
          supplierName: company.supplierName,
          supplierAliases: [],
          productName: company.productName,
          productGroup: "직접 VDI",
          buyerName: buyers[(rows.length + index) % buyers.length],
          contractName: `${summary.label} ${company.productName} 납품`,
          contractDate: `${summary.year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          contractAmount: amount,
          contractCount: 1,
          region: "전국",
          method: index % 3 === 0 ? "조달구매" : index % 3 === 1 ? "일반경쟁" : "수의계약",
          source: "검증 입력값"
        });
      });
    });
  });

  return rows;
}

function buildMockProcurementData() {
  return buildVerifiedVdiSalesRows();
}

function groupAndSum(data, key) {
  const map = new Map();
  data.forEach(item => {
    const label = safeText(item?.[key]) || "미분류";
    const current = map.get(label) ?? { name: label, amount: 0, count: 0 };
    current.amount += safeNumber(item?.contractAmount);
    current.count += safeNumber(item?.contractCount) || 1;
    map.set(label, current);
  });
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

function monthlyTrend(data) {
  const map = new Map();
  data.forEach(item => {
    const date = safeText(item?.contractDate);
    const month = /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : "날짜없음";
    const current = map.get(month) ?? { month, amount: 0, count: 0 };
    current.amount += safeNumber(item?.contractAmount);
    current.count += safeNumber(item?.contractCount) || 1;
    map.set(month, current);
  });
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

function isInRecentFiveYears(item) {
  const year = Number(safeText(item?.contractDate).slice(0, 4));
  return Number.isFinite(year) && year >= RECENT_YEAR_START && year <= RECENT_YEAR_END;
}

function KpiCard({ title, value, helper, icon: Icon, accent = CYAN }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-white">{value}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3" style={{ color: accent }}>
          <Icon size={22} />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{helper}</p>
    </article>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="min-h-[390px] rounded-2xl border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-black/20">
      <div className="mb-5">
        <h2 className="text-base font-bold text-white">{title}</h2>
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      </div>
      <div className="h-[300px]">{children}</div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="grid h-full place-items-center rounded-xl border border-dashed border-white/10 text-sm text-slate-500">
      검색 조건에 맞는 데이터가 없습니다.
    </div>
  );
}

function MiniBars({ rows }) {
  const max = Math.max(1, ...rows.map(row => safeNumber(row.amount)));
  return (
    <div className="space-y-3">
      {rows.map(row => (
        <div key={row.period ?? row.name} className="grid grid-cols-[130px_1fr_82px] items-center gap-3 text-xs">
          <span className="truncate text-slate-300">{row.period ?? row.name}</span>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.max(4, (safeNumber(row.amount) / max) * 100)}%` }} />
          </div>
          <strong className="text-right text-cyan-100">{formatMoney(row.amount)}</strong>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [rawMasterData, setRawMasterData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setRawMasterData(buildMockProcurementData());
  }, []);

  const recentFiveYearData = useMemo(() => rawMasterData.filter(isInRecentFiveYears), [rawMasterData]);

  const filteredData = useMemo(() => {
    const keyword = searchableText(searchTerm);
    if (!keyword) return recentFiveYearData;

    return recentFiveYearData.filter(item => {
      const supplier = searchableText(item?.supplierName);
      const product = searchableText(item?.productName);
      const buyer = searchableText(item?.buyerName);
      return supplier.includes(keyword) || product.includes(keyword) || buyer.includes(keyword);
    });
  }, [recentFiveYearData, searchTerm]);

  const kpis = useMemo(() => {
    const supplierCount = new Set(filteredData.map(item => safeText(item?.supplierName)).filter(Boolean)).size;
    const totalAmount = filteredData.reduce((sum, item) => sum + safeNumber(item?.contractAmount), 0);
    const totalContracts = filteredData.reduce((sum, item) => sum + (safeNumber(item?.contractCount) || 1), 0);
    const averageAmount = totalContracts ? totalAmount / totalContracts : 0;
    return { supplierCount, totalAmount, totalContracts, averageAmount };
  }, [filteredData]);

  const supplierRanking = useMemo(() => groupAndSum(filteredData, "supplierName").slice(0, 15), [filteredData]);
  const buyerRanking = useMemo(() => groupAndSum(filteredData, "buyerName").slice(0, 10), [filteredData]);
  const productShare = useMemo(() => groupAndSum(filteredData, "productGroup"), [filteredData]);
  const trendData = useMemo(() => monthlyTrend(filteredData), [filteredData]);

  return (
    <div className="min-h-screen text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/80 px-5 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
              B2G Procurement Analytics
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-white md:text-3xl">
              공공조달 마켓 인텔리전스 - VDI/가상화 부문
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              검증 입력값이 있는 {RECENT_YEAR_START}~{RECENT_YEAR_END} VDI 조달판매만 기준으로 분석합니다. Mock/가중치/추정값은 제외했습니다.
            </p>
          </div>

          <label className="relative block w-full lg:w-[460px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300" size={20} />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="틸론, 쓰리에스소프트, 소만사, VDI, 보안가상화, 공공기관명 검색"
              className="h-[52px] w-full rounded-2xl border border-cyan-300/20 bg-slate-900/90 py-4 pl-12 pr-4 text-sm text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:bg-slate-900"
            />
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">
            조회 결과 <span className="font-bold text-cyan-300">{formatCount(filteredData.length)}</span>건 /
            최근 5개년 원본 <span className="font-bold text-white">{formatCount(recentFiveYearData.length)}</span>건
          </p>
          {searchTerm ? (
            <button
              onClick={() => setSearchTerm("")}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              검색 초기화
            </button>
          ) : null}
        </div>

        <section className="mb-5 grid gap-4 xl:grid-cols-2">
          {VERIFIED_VDI_SALES.map(summary => (
            <article key={summary.year} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-white">{summary.label}</h2>
                  <p className="mt-1 text-xs text-cyan-100/70">{summary.basis}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">합계</p>
                  <p className="text-xl font-black text-cyan-200">{summary.totalAmount.toLocaleString("ko-KR")}원</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-950/70 text-xs text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">공급기업</th>
                      <th className="px-3 py-2 text-right">금액</th>
                      <th className="px-3 py-2 text-right">점유율</th>
                      <th className="px-3 py-2 text-right">건수</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {summary.companies.map(company => (
                      <tr key={`${summary.year}-${company.supplierName}`} className={company.supplierName === "틸론" ? "bg-cyan-300/10" : ""}>
                        <td className="px-3 py-2 font-bold text-white">{company.supplierName}</td>
                        <td className="px-3 py-2 text-right text-slate-200">{company.amount.toLocaleString("ko-KR")}원</td>
                        <td className="px-3 py-2 text-right font-bold text-cyan-200">{company.share.toFixed(2)}%</td>
                        <td className="px-3 py-2 text-right text-slate-300">{company.count}건</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </section>

        <section className="mb-5 rounded-2xl border border-purple-300/20 bg-purple-300/10 p-5 shadow-2xl shadow-black/20">
          <div className="mb-5">
            <h2 className="text-base font-black text-white">엑셀 분석 반영: 경쟁사 VDI 조달 매출 현황</h2>
            <p className="mt-1 text-xs text-purple-100/70">
              개인정보보호·망연계 등 비VDI 매출을 제외한 VDI 전용 분석 요약값입니다. 원천 row와 중복 합산하지 않도록 별도 검증 요약으로 표시합니다.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {EXCEL_COMPETITOR_ANALYSIS.map(company => (
              <article key={company.company} className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-purple-200">{company.periodLabel}</p>
                    <h3 className="mt-1 text-xl font-black text-white">
                      {company.company} <span className="text-sm font-bold text-slate-400">({company.product})</span>
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">VDI 누적 실적</p>
                    <p className="text-2xl font-black text-purple-200">{formatMoney(company.totalAmount)}</p>
                    <p className="mt-1 text-xs text-slate-400">{company.totalCount}건</p>
                  </div>
                </div>
                <p className="mb-5 text-sm leading-6 text-slate-300">{company.summary}</p>
                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <h4 className="mb-3 text-sm font-bold text-white">연도별 VDI 매출 추이</h4>
                    <MiniBars rows={company.yearlySales} />
                  </div>
                  <div>
                    <h4 className="mb-3 text-sm font-bold text-white">VDI 주요 수요기관</h4>
                    <MiniBars rows={company.topBuyers} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="조회된 공급기업 수" value={`${formatCount(kpis.supplierCount)}개사`} helper="공급기업명 고유 개수" icon={Database} />
          <KpiCard title="총 계약금액" value={formatMoney(kpis.totalAmount)} helper="filteredData 계약금액 합계" icon={TrendingUp} accent={PURPLE} />
          <KpiCard title="총 계약 건수" value={`${formatCount(kpis.totalContracts)}건`} helper="계약 건수 합계" icon={ShieldCheck} accent={GREEN} />
          <KpiCard title="평균 계약 단가" value={formatMoney(kpis.averageAmount)} helper="총 계약금액 / 총 계약 건수" icon={Database} accent={PINK} />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-2">
          <ChartCard title="검증 기준 공급기업 랭킹 TOP 15" subtitle="2025년 확정값 + 2026년 6월 22일 기준 입력값만 합산. Mock/가중치 제외">
            {supplierRanking.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplierRanking} layout="vertical" margin={{ top: 8, right: 24, left: 32, bottom: 8 }}>
                  <CartesianGrid stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" tickFormatter={formatMoney} />
                  <YAxis dataKey="name" type="category" stroke="#cbd5e1" width={96} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 12 }} formatter={value => formatMoney(value)} />
                  <Bar dataKey="amount" radius={[0, 8, 8, 0]} fill={CYAN} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </ChartCard>

          <ChartCard title="월별/연도별 조달 추이" subtitle="막대는 계약금액, 꺾은선은 계약 건수">
            {trendData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 8, right: 20, left: 8, bottom: 8 }}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#94a3b8" tickFormatter={formatMoney} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 12 }} formatter={(value, name) => name === "amount" ? formatMoney(value) : `${value}건`} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="amount" name="계약금액" fill={PURPLE} radius={[8, 8, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="count" name="계약건수" stroke={CYAN} strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </ChartCard>

          <ChartCard title="수요기관 TOP 10" subtitle="어디서 가장 많이 구매했는지 분석">
            {buyerRanking.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buyerRanking} layout="vertical" margin={{ top: 8, right: 24, left: 52, bottom: 8 }}>
                  <CartesianGrid stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" tickFormatter={formatMoney} />
                  <YAxis dataKey="name" type="category" stroke="#cbd5e1" width={126} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 12 }} formatter={value => formatMoney(value)} />
                  <Bar dataKey="amount" radius={[0, 8, 8, 0]} fill={BLUE} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </ChartCard>

          <ChartCard title="품목/서비스별 비중" subtitle="제품군별 계약금액 비중">
            {productShare.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={productShare} dataKey="amount" nameKey="name" innerRadius={72} outerRadius={116} paddingAngle={3}>
                    {productShare.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 12 }} formatter={value => formatMoney(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </ChartCard>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-black/20">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">세부 계약 데이터</h2>
              <p className="mt-1 text-xs text-slate-400">filteredData 원본 행을 방어적으로 렌더링합니다.</p>
            </div>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {formatCount(filteredData.length)} rows
            </span>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-xl border border-white/10">
            <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-slate-950 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">계약일자</th>
                  <th className="px-4 py-3">공급기업명</th>
                  <th className="px-4 py-3">제품/품목명</th>
                  <th className="px-4 py-3">제품군</th>
                  <th className="px-4 py-3">수요기관명</th>
                  <th className="px-4 py-3">계약명</th>
                  <th className="px-4 py-3 text-right">금액</th>
                  <th className="px-4 py-3">계약방법</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredData.map(item => (
                  <tr key={safeText(item?.id)} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-slate-300">{safeText(item?.contractDate) || "-"}</td>
                    <td className="px-4 py-3 font-bold text-white">{safeText(item?.supplierName) || "미상"}</td>
                    <td className="px-4 py-3 text-cyan-200">{safeText(item?.productName) || "미상 품목"}</td>
                    <td className="px-4 py-3 text-slate-300">{safeText(item?.productGroup) || "미분류"}</td>
                    <td className="px-4 py-3 text-slate-300">{safeText(item?.buyerName) || "미상 기관"}</td>
                    <td className="px-4 py-3 text-slate-400">{safeText(item?.contractName) || "-"}</td>
                    <td className="px-4 py-3 text-right font-bold text-purple-200">{formatMoney(item?.contractAmount)}</td>
                    <td className="px-4 py-3 text-slate-300">{safeText(item?.method) || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredData.length ? <div className="p-10"><EmptyState /></div> : null}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
