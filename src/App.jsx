import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Database, ShieldCheck, TrendingUp } from "lucide-react";
import productDictionary from "../data/dictionary/vdi_product_dictionary.json";
import companySummary from "../data/output/vdi_company_summary.json";

const CYAN = "#22d3ee";
const PURPLE = "#a855f7";
const BLUE = "#38bdf8";
const PINK = "#f472b6";
const GREEN = "#34d399";
const AMBER = "#fbbf24";
const CHART_COLORS = [CYAN, PURPLE, BLUE, PINK, GREEN, AMBER, "#818cf8", "#2dd4bf"];
const RECENT_YEAR_START = 2021;
const RECENT_YEAR_END = 2025;
const YTD_YEAR = 2026;
const VERIFIED_VDI_SALES = companySummary.annualVerifiedSales;
const FIVE_YEAR_VDI_RANKING = companySummary.fiveYearVdiRanking;
const TILON_DSTATION_ANALYSIS = companySummary.tilonDstation;
const EXCEL_COMPETITOR_ANALYSIS = companySummary.competitorAnalysis;

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
const formatNullableMoney = value => value === null || value === undefined || value === "" ? "미확인" : formatMoney(value);
const formatCount = value => safeNumber(value).toLocaleString("ko-KR");

function splitAmount(totalAmount, count) {
  const base = Math.floor(totalAmount / count);
  const remainder = totalAmount - base * count;
  return Array.from({ length: count }, (_, index) => base + (index === count - 1 ? remainder : 0));
}

function pickValue(row, candidates) {
  const key = candidates.find(candidate => row[candidate] !== undefined && row[candidate] !== null && row[candidate] !== "");
  return key ? row[key] : "";
}

function classifyRecord(row) {
  const supplierName = safeText(pickValue(row, ["supplierName", "공급기업명", "업체명", "계약업체명", "제조사"]));
  const productName = safeText(pickValue(row, ["productName", "제품명", "품명", "물품명", "품목명", "세부품명"]));
  const itemId = safeText(pickValue(row, ["물품식별번호", "productIdentificationNumber", "itemIdentifier"]));
  const text = searchableText(`${supplierName} ${productName} ${pickValue(row, ["계약명", "납품요구명", "규격"])}`);

  const matched = productDictionary.find(entry => {
    const hasExcluded = (entry.excludedKeywords ?? []).some(keyword => text.includes(searchableText(keyword)));
    if (hasExcluded) return false;
    const idMatch = (entry.productIdentificationNumbers ?? []).some(id => id && id === itemId);
    const productMatch = (entry.productAliases ?? []).some(alias => text.includes(searchableText(alias)));
    const companyMatch = [entry.standardCompanyName, ...(entry.companyAliases ?? [])].some(alias => searchableText(supplierName).includes(searchableText(alias)));
    return idMatch || productMatch || companyMatch;
  });

  return matched ?? {
    standardCompanyName: supplierName || "미확인",
    standardProductName: productName || "미확인",
    category: "REVIEW_REQUIRED",
    directVdi: false,
    verificationStatus: "REVIEW_REQUIRED"
  };
}

function normalizeUploadedRow(row, index) {
  const classification = classifyRecord(row);
  const date = safeText(pickValue(row, ["contractDate", "계약일자", "납품요구일자", "requestDate"])) || `${RECENT_YEAR_END}-01-01`;
  const amount = safeNumber(pickValue(row, ["contractAmount", "금액", "계약금액", "납품금액", "amount"]));
  const requestNo = safeText(pickValue(row, ["납품요구번호", "requestNo", "계약번호", "contractNo"])) || `UPLOAD-${index}`;
  const lineNo = safeText(pickValue(row, ["물품순번", "lineNo"])) || "1";
  const changeSeq = safeText(pickValue(row, ["변경차수", "changeSeq"])) || "0";

  return {
    id: `${requestNo}-${lineNo}-${changeSeq}`,
    dedupeKey: `${requestNo}-${lineNo}-${changeSeq}`,
    supplierName: classification.standardCompanyName,
    supplierAliases: classification.companyAliases ?? [],
    productName: classification.standardProductName,
    productGroup: classification.category === "DIRECT_VDI" ? "직접 VDI" : classification.category,
    buyerName: safeText(pickValue(row, ["buyerName", "수요기관명", "수요기관", "기관명"])) || "미확인",
    contractName: safeText(pickValue(row, ["contractName", "계약명", "납품요구명"])) || "업로드 데이터",
    contractDate: date,
    contractAmount: amount,
    contractCount: 1,
    region: safeText(pickValue(row, ["region", "지역"])) || "미확인",
    method: safeText(pickValue(row, ["method", "계약방법"])) || "미확인",
    source: "엑셀/CSV 업로드",
    verificationStatus: classification.verificationStatus,
    directVdi: Boolean(classification.directVdi)
  };
}

function dedupeRows(rows) {
  const map = new Map();
  rows.forEach(row => {
    map.set(row.dedupeKey ?? row.id, row);
  });
  return [...map.values()];
}

function buildVerifiedVdiSalesRows() {
  const rows = [];

  VERIFIED_VDI_SALES.forEach(summary => {
    summary.companies.forEach(company => {
      const month = summary.year === 2026 ? 6 : 12;
      rows.push({
        id: `EXCEL-${summary.year}-${company.supplierName}`,
        dedupeKey: `EXCEL-${summary.year}-${company.supplierName}`,
        supplierName: company.supplierName,
        supplierAliases: [],
        productName: company.productName,
        productGroup: "직접 VDI",
        buyerName: "수요기관 정보 없음(가격표 기준)",
        contractName: `${summary.label} ${company.productName} 판매라이선스`,
        contractDate: `${summary.year}-${String(month).padStart(2, "0")}-01`,
        contractAmount: company.amount,
        contractCount: company.count,
        region: "미제공",
        method: "가격표×판매라이선스",
        source: "DstationX 가격정하기.xlsx",
        verificationStatus: "EXCEL_PRICE_LICENSE",
        directVdi: true
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

function buildAnnualSupplierRanking(summaries) {
  const map = new Map();
  summaries.forEach(summary => {
    summary.companies?.forEach(company => {
      const supplierName = safeText(company?.supplierName) || "미분류";
      const current = map.get(supplierName) ?? { name: supplierName, amount: 0, count: 0 };
      current.amount += safeNumber(company?.amount);
      current.count += safeNumber(company?.count);
      map.set(supplierName, current);
    });
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
            {row.amount === null || row.amount === undefined ? null : (
              <div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.max(4, (safeNumber(row.amount) / max) * 100)}%` }} />
            )}
          </div>
          <strong className="text-right text-cyan-100">{formatNullableMoney(row.amount)}</strong>
        </div>
      ))}
    </div>
  );
}

function MiniLineTrend({ rows }) {
  const chartData = rows.map(row => ({
    period: row.period ?? row.name,
    amount: row.amount === null || row.amount === undefined ? 0 : safeNumber(row.amount),
    count: safeNumber(row.count)
  }));

  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 12, right: 20, left: 4, bottom: 8 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis
            dataKey="period"
            stroke="#64748b"
            tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }}
            tickLine={false}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }}
            tickFormatter={formatMoney}
            tickLine={false}
            width={58}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              color: "#0f172a",
              boxShadow: "0 14px 30px rgba(15,23,42,0.14)"
            }}
            labelStyle={{ color: "#0f172a", fontWeight: 900 }}
            formatter={(value, _name, item) => [
              `${formatMoney(value)}${item?.payload?.count ? ` / ${formatCount(item.payload.count)}개` : ""}`,
              "매출"
            ]}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke={CYAN}
            strokeWidth={4}
            dot={{ r: 5, fill: "#ffffff", stroke: CYAN, strokeWidth: 3 }}
            activeDot={{ r: 7, fill: CYAN, stroke: "#ffffff", strokeWidth: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function App() {
  const [rawMasterData, setRawMasterData] = useState([]);
  const [selectedAnnualYear, setSelectedAnnualYear] = useState(VERIFIED_VDI_SALES.at(-1)?.year ?? YTD_YEAR);

  useEffect(() => {
    setRawMasterData(buildMockProcurementData());
  }, []);

  const directVdiData = useMemo(() => rawMasterData.filter(item => item.directVdi !== false), [rawMasterData]);

  const filteredData = useMemo(() => directVdiData, [directVdiData]);

  const kpis = useMemo(() => {
    const supplierCount = new Set(filteredData.map(item => safeText(item?.supplierName)).filter(Boolean)).size;
    const totalAmount = filteredData.reduce((sum, item) => sum + safeNumber(item?.contractAmount), 0);
    const totalContracts = filteredData.reduce((sum, item) => sum + (safeNumber(item?.contractCount) || 1), 0);
    const averageAmount = totalContracts ? totalAmount / totalContracts : 0;
    return { supplierCount, totalAmount, totalContracts, averageAmount };
  }, [filteredData]);

  const supplierRanking = useMemo(
    () => (FIVE_YEAR_VDI_RANKING?.companies ?? buildAnnualSupplierRanking(VERIFIED_VDI_SALES))
      .map(company => ({
        name: company.supplierName,
        amount: safeNumber(company.amount),
        count: safeNumber(company.count),
        share: safeNumber(company.share)
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 15),
    []
  );
  const specRanking = useMemo(
    () => (companySummary.sourceRows ?? [])
      .map(row => ({
        name: `${safeText(row?.company)} ${safeText(row?.spec)}`.trim(),
        amount: Object.values(row?.yearlyAmount ?? {}).reduce((sum, value) => sum + safeNumber(value), 0),
        count: safeNumber(row?.yearlyQtySum)
      }))
      .filter(row => row.amount > 0 || row.count > 0)
      .sort((a, b) => b.amount - a.amount || b.count - a.count)
      .slice(0, 10),
    []
  );
  const productShare = useMemo(() => groupAndSum(filteredData, "productGroup"), [filteredData]);
  const trendData = useMemo(() => monthlyTrend(filteredData), [filteredData]);
  const selectedAnnualSummary = useMemo(
    () => VERIFIED_VDI_SALES.find(summary => summary.year === selectedAnnualYear) ?? VERIFIED_VDI_SALES.at(-1),
    [selectedAnnualYear]
  );
  const annualShareData = useMemo(
    () => selectedAnnualSummary?.companies?.map(company => ({
      name: company.supplierName,
      productName: company.productName,
      amount: safeNumber(company.amount),
      share: safeNumber(company.share),
      count: safeNumber(company.count),
      isLeader: searchableText(company.productName).includes("dstation")
    })).filter(company => company.amount > 0 || company.count > 0) ?? [],
    [selectedAnnualSummary]
  );

  return (
    <div className="theme-light min-h-screen text-slate-100">
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

        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">
            조회 결과 <span className="font-bold text-cyan-300">{formatCount(filteredData.length)}</span>개 요약 /
            분석 대상 원본 <span className="font-bold text-white">{formatCount(directVdiData.length)}</span>개 요약
          </p>
        </div>
        <section className="mb-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 shadow-2xl shadow-black/20">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">{TILON_DSTATION_ANALYSIS.periodLabel}</p>
              <h2 className="mt-1 text-xl font-black text-white">
                틸론 <span className="text-sm font-bold text-slate-300">({TILON_DSTATION_ANALYSIS.product}) 공공조달 핵심 실적</span>
              </h2>
              <div className="mt-3 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-200">
                최근 5개년 VDI 조달 누적 매출 1위
              </div>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">{TILON_DSTATION_ANALYSIS.summary}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">5개년 Dstation 누적 실적</p>
              <p className="text-3xl font-black text-cyan-100">{formatMoney(TILON_DSTATION_ANALYSIS.totalAmount)}</p>
              <p className="mt-1 text-sm text-slate-300">{formatCount(TILON_DSTATION_ANALYSIS.totalCount)}개</p>
            </div>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <article className="h-full rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <h3 className="mb-3 text-sm font-bold text-white">연도별 Dstation 매출 추이</h3>
              <MiniLineTrend rows={TILON_DSTATION_ANALYSIS.yearlySales} />
            </article>
            <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <h3 className="mb-3 text-sm font-bold text-white">Dstation 제품 규격별 매출</h3>
              <MiniBars rows={TILON_DSTATION_ANALYSIS.topBuyers} />
            </article>
          </div>
        </section>

        <section className="mb-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 shadow-2xl shadow-black/20">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-white">연도별 VDI 조달판매 상세 분석</h2>
              <p className="mt-1 text-xs text-cyan-100/70">연도를 선택하면 공급기업별 금액, 점유율, 판매라이선스 수와 원형 점유율 그래프가 함께 갱신됩니다.</p>
            </div>
            <div className="flex rounded-xl border border-white/10 bg-slate-950/70 p-1">
              {VERIFIED_VDI_SALES.map(summary => (
                <button
                  key={summary.year}
                  type="button"
                  onClick={() => setSelectedAnnualYear(summary.year)}
                  className={`h-9 rounded-lg px-4 text-sm font-black transition ${
                    selectedAnnualYear === summary.year
                      ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/30"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {summary.year}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <article className="h-full rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-white">{selectedAnnualSummary?.label}</h3>
                  <p className="mt-1 text-xs text-cyan-100/70">{selectedAnnualSummary?.basis}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">합계</p>
                  <p className="text-2xl font-black text-cyan-200">{safeNumber(selectedAnnualSummary?.totalAmount).toLocaleString("ko-KR")}원</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full table-fixed border-collapse text-sm">
                  <colgroup>
                    <col className="w-[19%]" />
                    <col className="w-[35%]" />
                    <col className="w-[20%]" />
                    <col className="w-[11%]" />
                    <col className="w-[15%]" />
                  </colgroup>
                  <thead className="bg-slate-950/70 text-xs text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">공급기업</th>
                      <th className="px-3 py-2 text-left">제품명</th>
                      <th className="px-3 py-2 text-right">금액</th>
                      <th className="px-3 py-2 text-right">점유율</th>
                      <th className="whitespace-nowrap px-3 py-2 text-right">라이선스</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {selectedAnnualSummary?.companies?.map(company => {
                      const isTilon = company.supplierName === "틸론";
                      return (
                      <tr
                        key={`${selectedAnnualSummary.year}-${company.supplierName}`}
                        className={isTilon ? "bg-cyan-300/15 text-[15px] shadow-[inset_4px_0_0_#0891b2]" : ""}
                      >
                        <td className={`truncate px-3 ${isTilon ? "py-3 font-black" : "py-2 font-bold"} text-white`}>{company.supplierName}</td>
                        <td className={`truncate px-3 ${isTilon ? "py-3 font-bold" : "py-2"} text-cyan-100`}>{company.productName}</td>
                        <td className={`whitespace-nowrap px-3 ${isTilon ? "py-3 font-black" : "py-2"} text-right text-slate-200`}>{company.amount.toLocaleString("ko-KR")}원</td>
                        <td className={`whitespace-nowrap px-3 ${isTilon ? "py-3 text-base" : "py-2"} text-right font-bold text-cyan-200`}>{company.share.toFixed(2)}%</td>
                        <td className={`whitespace-nowrap px-3 ${isTilon ? "py-3 font-black" : "py-2"} text-right text-slate-300`}>{formatCount(company.count)}개</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-white">{selectedAnnualSummary?.year}년 공급기업 점유율</h3>
                  <p className="mt-1 text-xs text-slate-400">환산 매출 기준 비중</p>
                </div>
                <p className="text-right text-xs font-bold text-cyan-200">{formatCount(annualShareData.length)}개사</p>
              </div>
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={annualShareData}
                      dataKey="amount"
                      nameKey="name"
                      innerRadius={82}
                      outerRadius={132}
                      paddingAngle={3}
                    >
                      {annualShareData.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: 12,
                        color: "#0f172a",
                        boxShadow: "0 14px 30px rgba(15,23,42,0.14)"
                      }}
                      labelStyle={{ color: "#0f172a", fontWeight: 900 }}
                      formatter={(value, _name, item) => [
                        `${formatMoney(value)} / ${safeNumber(item?.payload?.share).toFixed(2)}%`,
                        item?.payload?.name ?? "공급기업"
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
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
                    <p className="mt-1 text-xs text-slate-400">{formatCount(company.totalCount)}개</p>
                  </div>
                </div>
                <p className="mb-5 text-sm leading-6 text-slate-300">{company.summary}</p>
                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <h4 className="mb-3 text-sm font-bold text-white">연도별 VDI 매출 추이</h4>
                    <MiniBars rows={company.yearlySales} />
                  </div>
                  <div>
                    <h4 className="mb-3 text-sm font-bold text-white">제품 규격별 매출</h4>
                    <MiniBars rows={company.topBuyers} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <ChartCard title="최근 5개년 VDI 공급기업 랭킹 TOP 15" subtitle={`${FIVE_YEAR_VDI_RANKING?.periodLabel ?? "최근 5개년"} 기준. 틸론 엑셀 실적과 경쟁사 VDI 전용 검증값 합산`}>
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

          <ChartCard title="월별/연도별 조달 추이" subtitle="막대는 환산 매출, 꺾은선은 판매라이선스 수">
            {trendData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 8, right: 20, left: 8, bottom: 8 }}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#94a3b8" tickFormatter={formatMoney} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 12 }} formatter={(value, name) => name === "amount" ? formatMoney(value) : `${formatCount(value)}개`} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="amount" name="환산매출" fill={PURPLE} radius={[8, 8, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="count" name="판매라이선스" stroke={CYAN} strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </ChartCard>

          <ChartCard title="제품 규격 TOP 10" subtitle="엑셀 가격표 기준 규격별 환산 매출">
            {specRanking.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={specRanking} layout="vertical" margin={{ top: 8, right: 24, left: 52, bottom: 8 }}>
                  <CartesianGrid stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" tickFormatter={formatMoney} />
                  <YAxis dataKey="name" type="category" stroke="#cbd5e1" width={126} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155", borderRadius: 12 }} formatter={value => formatMoney(value)} />
                  <Bar dataKey="amount" radius={[0, 8, 8, 0]} fill={BLUE} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </ChartCard>

          <ChartCard title="품목/서비스별 비중" subtitle="제품군별 환산 매출 비중">
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

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="조회된 공급기업 수" value={`${formatCount(kpis.supplierCount)}개사`} helper="공급기업명 고유 개수" icon={Database} />
          <KpiCard title="총 환산 매출" value={formatMoney(kpis.totalAmount)} helper="가격×판매라이선스 합계" icon={TrendingUp} accent={PURPLE} />
          <KpiCard title="총 판매라이선스" value={`${formatCount(kpis.totalContracts)}개`} helper="연도별 판매라이선스 합계" icon={ShieldCheck} accent={GREEN} />
          <KpiCard title="평균 라이선스 단가" value={formatMoney(kpis.averageAmount)} helper="총 환산 매출 / 총 판매라이선스" icon={Database} accent={PINK} />
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-black/20">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">엑셀 요약 데이터</h2>
              <p className="mt-1 text-xs text-slate-400">DstationX 가격정하기.xlsx의 회사×연도별 환산 매출 요약입니다.</p>
            </div>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-200">
              {formatCount(filteredData.length)} rows
            </span>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-xl border border-white/10">
            <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-slate-950 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">기준일</th>
                  <th className="px-4 py-3">공급기업명</th>
                  <th className="px-4 py-3">제품/품목명</th>
                  <th className="px-4 py-3">제품군</th>
                  <th className="px-4 py-3">정보</th>
                  <th className="px-4 py-3">분석명</th>
                  <th className="px-4 py-3 text-right">금액</th>
                  <th className="px-4 py-3">산출기준</th>
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
