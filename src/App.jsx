import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Download, Trophy } from "lucide-react";
import companySummary from "../data/output/vdi_company_summary.json";

const BRAND_BLUE = "#005BAC";
const BRAND_DARK = "#083B73";
const GOLD = "#F59E0B";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const SOFT_LINE = "#D8E1EA";
const COMPETITOR = "#CBD5E1";
const COMPETITOR_DARK = "#94A3B8";

const ranking = companySummary.fiveYearVdiRanking?.companies ?? [];
const tilon = ranking.find(company => company.supplierName === "틸론") ?? ranking[0] ?? {};
const annualSales = companySummary.annualVerifiedSales ?? [];
const sourceRows = companySummary.sourceRows ?? [];

const safeNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatEok = value =>
  `${(safeNumber(value) / 100000000).toLocaleString("ko-KR", {
    maximumFractionDigits: 1
  })}억원`;

const formatWon = value => `${safeNumber(value).toLocaleString("ko-KR")}원`;
const formatLicense = value => `${safeNumber(value).toLocaleString("ko-KR")} License`;
const formatPercent = value => `${safeNumber(value).toFixed(2)}%`;
const isDelivered = company => safeNumber(company.amount) > 0 || safeNumber(company.count) > 0;

function SalesTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-black text-slate-900">{label}</p>
      {payload.map(item => (
        <p key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {formatEok(item.value)}
        </p>
      ))}
    </div>
  );
}

function MoneyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-black text-slate-900">{label}</p>
      <p className="mt-1 text-slate-600">{formatEok(item.value)}</p>
    </div>
  );
}

function Kpi({ title, value, helper }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </article>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-black tracking-tight text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function App() {
  const topFive = useMemo(
    () => ranking
      .filter(isDelivered)
      .slice(0, 5)
      .map(company => ({
        ...company,
        displayAmount: formatEok(company.amount),
        fill: company.supplierName === "틸론" ? BRAND_BLUE : COMPETITOR
      })),
    []
  );

  const trendCompanies = useMemo(() => {
    const competitors = ranking.filter(company => company.supplierName !== "틸론" && isDelivered(company)).slice(0, 2);
    return ["틸론", ...competitors.map(company => company.supplierName)];
  }, []);

  const yearlyTrend = useMemo(
    () => annualSales.map(year => {
      const row = { year: `${year.year}` };
      trendCompanies.forEach(name => {
        const found = year.companies?.find(company => company.supplierName === name);
        row[name] = safeNumber(found?.amount);
      });
      return row;
    }),
    [trendCompanies]
  );

  const specRows = useMemo(
    () => sourceRows
      .filter(row => row.company === "틸론")
      .map(row => ({
        name: `${row.product} ${row.spec}`,
        amount: Object.values(row.yearlyAmount ?? {}).reduce((sum, value) => sum + safeNumber(value), 0)
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
    []
  );

  const comparisonRows = useMemo(
    () => ranking.map(company => {
      const years = annualSales
        .filter(year => {
          const found = year.companies?.find(item => item.supplierName === company.supplierName);
          return safeNumber(found?.amount) > 0 || safeNumber(found?.count) > 0;
        })
        .map(year => year.year);
      return {
        ...company,
        years: years.length ? years.join(", ") : "미확인",
        status: isDelivered(company) ? "납품 확인" : "미확인"
      };
    }),
    []
  );

  const unitPriceRows = useMemo(
    () => sourceRows.map(row => ({
      name: row.company,
      product: row.product,
      spec: row.spec,
      price: safeNumber(row.unitPrice)
    })),
    []
  );

  const specShareRows = useMemo(
    () => sourceRows
      .filter(row => row.company === "틸론")
      .map(row => ({
        name: row.spec,
        value: Object.values(row.yearlyQty ?? {}).reduce((sum, value) => sum + safeNumber(value), 0)
      })),
    []
  );

  const evidenceRows = useMemo(
    () => annualSales
      .flatMap(year => year.companies
        .filter(company => company.supplierName === "틸론" || isDelivered(company))
        .map(company => ({
          date: year.year === 2026 ? "2026 누적" : `${year.year}`,
          supplier: company.supplierName,
          product: company.productName,
          buyer: "미확인",
          contract: "가격표×판매라이선스 기준",
          count: company.count,
          amount: company.amount
        })))
      .sort((a, b) => safeNumber(b.amount) - safeNumber(a.amount))
      .slice(0, 8),
    []
  );

  const totalDeliveredSuppliers = ranking.filter(isDelivered).length;
  const totalLicenses = safeNumber(companySummary.fiveYearVdiRanking?.totalCount);
  const totalAmount = safeNumber(companySummary.fiveYearVdiRanking?.totalAmount);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto grid min-h-[810px] max-w-[1440px] grid-rows-[auto_auto_1fr_auto] gap-6 px-10 py-8">
        <header className="flex items-start justify-between gap-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Executive Summary</p>
            <h1 className="mt-3 text-5xl font-black tracking-tight text-slate-950">
              공공 조달 VDI 시장, 틸론 Dstation 누적 1위
            </h1>
            <p className="mt-4 text-lg font-medium text-slate-600">
              2021~2026년 조달 납품 확인 실적 기준 경쟁사 대비 시장 우위 확보
            </p>
          </div>
          <div className="flex min-w-[230px] items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-700">
            <Trophy size={42} strokeWidth={2.4} />
            <div>
              <p className="text-sm font-black uppercase tracking-wide">No.1</p>
              <p className="text-lg font-black text-slate-950">2021~2026 연속 1위</p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-3 gap-5">
          <Kpi title="누적 조달 실적" value={formatEok(tilon.amount)} helper="Dstation 조달 납품 실적 기준" />
          <Kpi title="누적 시장점유율" value={formatPercent(tilon.share)} helper="분석 대상 경쟁 제품 합산 기준" />
          <Kpi title="연속 시장 1위 기간" value="2021~2026" helper="6개년 연속" />
        </section>

        <section className="grid grid-cols-2 gap-6">
          <article className="rounded-2xl bg-white p-6">
            <SectionTitle
              title="경쟁사 대비 압도적인 누적 조달 실적"
              subtitle="2021~2026년 확인된 VDI 조달 납품실적 합산"
            />
            <div className="h-[310px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topFive} layout="vertical" margin={{ top: 10, right: 54, left: 42, bottom: 4 }}>
                  <CartesianGrid stroke={SOFT_LINE} horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="supplierName" type="category" width={104} tick={{ fill: TEXT, fontWeight: 800 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<MoneyTooltip />} />
                  <Bar dataKey="amount" radius={[0, 8, 8, 0]} barSize={32}>
                    {topFive.map(item => <Cell key={item.supplierName} fill={item.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-2xl bg-white p-6">
            <SectionTitle
              title="단년 성과가 아닌 지속된 시장 리더십"
              subtitle="2021년부터 2026년까지 매년 조달 판매 선두 유지"
            />
            <div className="h-[310px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearlyTrend} margin={{ top: 12, right: 20, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke={SOFT_LINE} strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fill: MUTED, fontWeight: 700 }} />
                  <YAxis tickFormatter={formatEok} tick={{ fill: MUTED }} width={72} />
                  <Tooltip content={<SalesTooltip />} />
                  <Line type="monotone" dataKey="틸론" name="틸론 Dstation" stroke={BRAND_BLUE} strokeWidth={4} dot={{ r: 5, fill: BRAND_BLUE }} />
                  {trendCompanies.filter(name => name !== "틸론").map((name, index) => (
                    <Line key={name} type="monotone" dataKey={name} name={name} stroke={index ? COMPETITOR_DARK : GOLD} strokeWidth={2.5} dot={{ r: 4 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-[1fr_1.05fr] items-center gap-8 border-t border-slate-200 pt-5">
          <article>
            <SectionTitle
              title="조달 판매가 확인된 주요 도입 규격"
              subtitle="수요기관 원천 컬럼은 엑셀에 없어, 확인 가능한 제품 규격별 실적으로 표시"
            />
            <div className="space-y-3">
              {specRows.map(row => (
                <div key={row.name} className="grid grid-cols-[190px_1fr_90px] items-center gap-4 text-sm">
                  <p className="font-bold leading-snug text-slate-900">{row.name}</p>
                  <div className="h-2.5 rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-blue-700" style={{ width: `${Math.max(8, (row.amount / specRows[0].amount) * 100)}%` }} />
                  </div>
                  <p className="text-right font-black text-blue-800">{formatEok(row.amount)}</p>
                </div>
              ))}
            </div>
          </article>
          <p className="text-2xl font-black leading-snug text-slate-950">
            틸론 Dstation은 다년간 축적된 조달 납품실적과 검증된 판매 데이터를 바탕으로 VDI 시장 리더십을 확보했습니다.
          </p>
        </section>
      </section>

      <section className="mx-auto mt-8 grid min-h-[810px] max-w-[1440px] grid-rows-[auto_auto_1fr_auto] gap-6 px-10 py-8">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Detailed Evidence</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            등록 제품이 아닌 실제 판매실적으로 입증된 조달 경쟁력
          </h1>
        </header>

        <section className="grid grid-cols-4 gap-4">
          <Kpi title="분석 대상 공급기업 수" value={`${ranking.length}개사`} helper="등록 제품 포함" />
          <Kpi title="누적 계약 건수" value="미확인" helper="엑셀에 계약 건수 원천 컬럼 없음" />
          <Kpi title="누적 판매 라이선스" value={formatLicense(totalLicenses)} helper="2021~2026 합산" />
          <Kpi title="누적 조달 실적" value={formatEok(totalAmount)} helper="분석 대상 제품 합산" />
        </section>

        <section className="grid grid-cols-[1.25fr_0.75fr] gap-6">
          <article className="rounded-2xl bg-white p-6">
            <SectionTitle title="경쟁 제품별 납품 확인 현황" subtitle="미확인 업체는 0이 아닌 미확인으로 구분" />
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-slate-200 text-left text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="py-3">업체</th>
                  <th>대표 제품</th>
                  <th className="text-right">누적 판매량</th>
                  <th className="text-right">누적 조달 실적</th>
                  <th>확인 연도</th>
                  <th>조달 납품 여부</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(row => (
                  <tr key={row.supplierName} className={`border-b border-slate-100 ${row.supplierName === "틸론" ? "bg-blue-50" : ""}`}>
                    <td className="py-3 font-black text-slate-950">{row.supplierName}</td>
                    <td className="max-w-[220px] py-3 text-slate-700">{row.productName}</td>
                    <td className="py-3 text-right font-bold">{row.count ? formatLicense(row.count) : "미확인"}</td>
                    <td className="py-3 text-right font-bold">{row.amount ? formatEok(row.amount) : "미확인"}</td>
                    <td className="py-3 text-slate-600">{row.years}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${row.status === "납품 확인" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="rounded-2xl bg-white p-6">
            <SectionTitle title="경쟁사별 1User 조달 등록단가 비교" subtitle="규격이 다른 경우 규격을 함께 표기" />
            <div className="space-y-3">
              {unitPriceRows.map(row => (
                <div key={`${row.name}-${row.product}-${row.spec}`} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{row.name}</p>
                      <p className="mt-1 text-xs leading-snug text-slate-500">{row.product} · {row.spec}</p>
                    </div>
                    <p className="shrink-0 font-black text-blue-800">{formatWon(row.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid grid-cols-[0.9fr_1.1fr] gap-6">
          <article className="rounded-2xl bg-white p-6">
            <SectionTitle title="100User 이상 / 1~99User 판매 비중" subtitle="Dstation 판매 라이선스 기준" />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={specShareRows} layout="vertical" margin={{ top: 10, right: 24, left: 80, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={112} tick={{ fill: TEXT, fontWeight: 800 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={value => formatLicense(value)} />
                  <Bar dataKey="value" fill={BRAND_BLUE} radius={[0, 8, 8, 0]} barSize={34} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle title="대표 데이터 확인 내역" subtitle="최근/대표 요약 8건만 노출" />
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-600">
                <Download size={16} />
                전체 데이터 다운로드
              </button>
            </div>
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-slate-200 text-left text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="py-2">계약일</th>
                  <th>공급기업</th>
                  <th>제품명</th>
                  <th>수요기관</th>
                  <th>계약명</th>
                  <th className="text-right">판매수량</th>
                  <th className="text-right">계약금액</th>
                </tr>
              </thead>
              <tbody>
                {evidenceRows.map((row, index) => (
                  <tr key={`${row.date}-${row.supplier}-${index}`} className="border-b border-slate-100">
                    <td className="py-2 font-bold">{row.date}</td>
                    <td className="font-bold">{row.supplier}</td>
                    <td className="max-w-[140px] text-slate-600">{row.product}</td>
                    <td className="text-slate-500">{row.buyer}</td>
                    <td className="text-slate-500">{row.contract}</td>
                    <td className="text-right font-bold">{formatLicense(row.count)}</td>
                    <td className="text-right font-black text-blue-800">{formatEok(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </section>
      </section>
    </main>
  );
}

export default App;
