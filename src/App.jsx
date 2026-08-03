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

function buildMockProcurementData() {
  const suppliers = [
    { name: "틸론", products: ["Dstation", "Dstation X", "센터버스 VDI"], group: "VDI 라이선스" },
    { name: "크로센트", products: ["DaaSXpert", "Cloud Desktop", "서비스형 데스크톱"], group: "DaaS/클라우드" },
    { name: "이트론", products: ["JDesktop", "JDesktop Enterprise", "가상 업무환경"], group: "VDI 라이선스" },
    { name: "VMware", products: ["Horizon", "Workspace ONE", "vSphere Desktop"], group: "상용 가상화" },
    { name: "소만사", products: ["VD-i", "VD-i V2.0", "Privacy-i"], group: "보안 가상화" },
    { name: "쓰리에스소프트", products: ["NEPYX NetDesktop", "NEPYX NDT", "NetworkBridge"], group: "망분리/연계" },
    { name: "엔컴퓨팅", products: ["VERDE VDI", "VERDE Enterprise", "vSpace"], group: "VDI 라이선스" },
    { name: "에스피소프트", products: ["gDaaS", "Cloud PC", "DaaS 운영관리"], group: "DaaS/클라우드" }
  ];
  const buyers = [
    "서울특별시교육청", "한국전력공사", "국민건강보험공단", "경기도청", "인천국제공항공사",
    "부산대학교병원", "한국도로공사", "대전광역시", "한국교육학술정보원", "국방전산정보원",
    "한국수자원공사", "성남시청", "한국산업은행", "한국인터넷진흥원", "전라남도교육청"
  ];
  const contractNames = [
    "업무망 VDI 라이선스 증설", "가상 데스크톱 기반 망분리 구축", "클라우드 PC 시범사업",
    "재택근무 보안가상화 환경 도입", "자료전송 및 VDI 연계 고도화", "행정업무용 DaaS 서비스 구매"
  ];

  return Array.from({ length: 50 }, (_, index) => {
    const supplier = suppliers[index % suppliers.length];
    const buyer = buyers[(index * 3) % buyers.length];
    const productName = supplier.products[index % supplier.products.length];
    const year = 2022 + (index % 5);
    const month = (index % 12) + 1;
    const base = 28000000 + ((index * 17300000) % 420000000);
    const amount = Math.round(base / 10000) * 10000;

    return {
      id: `VDI-${year}-${String(index + 1).padStart(3, "0")}`,
      supplierName: supplier.name,
      productName,
      productGroup: supplier.group,
      buyerName: buyer,
      contractName: contractNames[index % contractNames.length],
      contractDate: `${year}-${String(month).padStart(2, "0")}-${String((index % 25) + 1).padStart(2, "0")}`,
      contractAmount: amount,
      contractCount: 1,
      region: buyer.includes("서울") ? "서울" : buyer.includes("경기") || buyer.includes("성남") ? "경기" : buyer.includes("부산") ? "부산" : "전국",
      method: index % 4 === 0 ? "수의계약" : index % 4 === 1 ? "일반경쟁" : index % 4 === 2 ? "제한경쟁" : "조달구매",
      source: "Mock API"
    };
  });
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

function App() {
  const [rawMasterData, setRawMasterData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setRawMasterData(buildMockProcurementData());
  }, []);

  const filteredData = useMemo(() => {
    const keyword = searchableText(searchTerm);
    if (!keyword) return rawMasterData;

    return rawMasterData.filter(item => {
      const supplier = searchableText(item?.supplierName);
      const product = searchableText(item?.productName);
      const buyer = searchableText(item?.buyerName);
      return supplier.includes(keyword) || product.includes(keyword) || buyer.includes(keyword);
    });
  }, [rawMasterData, searchTerm]);

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
              원본 rawMasterData를 보존하고, 모든 KPI와 차트는 검색 결과 filteredData만 기준으로 렌더링합니다.
            </p>
          </div>

          <label className="relative block w-full lg:w-[460px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300" size={20} />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="틸론, 크로센트, 이트론, VDI, 보안가상화, 공공기관명 검색"
              className="h-[52px] w-full rounded-2xl border border-cyan-300/20 bg-slate-900/90 py-4 pl-12 pr-4 text-sm text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:bg-slate-900"
            />
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">
            조회 결과 <span className="font-bold text-cyan-300">{formatCount(filteredData.length)}</span>건 /
            원본 <span className="font-bold text-white">{formatCount(rawMasterData.length)}</span>건
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="조회된 공급기업 수" value={`${formatCount(kpis.supplierCount)}개사`} helper="공급기업명 고유 개수" icon={Database} />
          <KpiCard title="총 계약금액" value={formatMoney(kpis.totalAmount)} helper="filteredData 계약금액 합계" icon={TrendingUp} accent={PURPLE} />
          <KpiCard title="총 계약 건수" value={`${formatCount(kpis.totalContracts)}건`} helper="계약 건수 합계" icon={ShieldCheck} accent={GREEN} />
          <KpiCard title="평균 계약 단가" value={formatMoney(kpis.averageAmount)} helper="총 계약금액 / 총 계약 건수" icon={Database} accent={PINK} />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-2">
          <ChartCard title="공급기업 랭킹 TOP 15" subtitle="누가 제일 많이 팔았는지 계약금액 기준으로 비교">
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
