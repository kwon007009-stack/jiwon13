import fs from "node:fs";
import XLSX from "xlsx";

const workbookPath = process.argv[2] ?? "DstationX-pricing.xlsx";
const workbook = XLSX.readFile(workbookPath);
const rows = XLSX.utils
  .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: null, raw: false })
  .slice(1)
  .filter(row => row.__EMPTY && row.__EMPTY_1);

const years = [2021, 2022, 2023, 2024, 2025, 2026];
const parseNumber = value => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};
const normalizeCompany = name => String(name).startsWith("3S") ? "쓰리에스소프트" : String(name);
const formatEok = value => `${(value / 100000000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억`;
const formatInteger = value => value.toLocaleString("ko-KR");

const normalized = rows.map(row => {
  const keys = Object.keys(row);
  const yearlyQty = Object.fromEntries(years.map((year, index) => [year, parseNumber(row[keys[8 + index]])]));
  const unitPrice = parseNumber(row[keys[6]]);
  const yearlyAmount = Object.fromEntries(years.map(year => [year, yearlyQty[year] * unitPrice]));
  const yearlyQtySum = years.reduce((sum, year) => sum + yearlyQty[year], 0);

  return {
    company: normalizeCompany(row[keys[0]]),
    product: String(row[keys[1]] ?? "").trim(),
    itemId: String(row[keys[2]] ?? "").trim(),
    category: String(row[keys[3]] ?? "").trim(),
    spec: String(row[keys[4]] ?? "").trim(),
    specDoc: String(row[keys[5]] ?? "").trim(),
    unitPrice,
    yearlyQty,
    yearlyAmount,
    yearlyQtySum,
    statedQtyTotal: parseNumber(row[keys[14]])
  };
});

const companies = [...new Set(normalized.map(row => row.company))];
const totalsByCompany = companies.map(company => {
  const companyRows = normalized.filter(row => row.company === company);
  const yearly = years.map(year => ({
    year,
    qty: companyRows.reduce((sum, row) => sum + row.yearlyQty[year], 0),
    amount: companyRows.reduce((sum, row) => sum + row.yearlyAmount[year], 0)
  }));
  const amount = yearly.reduce((sum, row) => sum + row.amount, 0);
  const count = yearly.reduce((sum, row) => sum + row.qty, 0);
  const specs = companyRows
    .map(row => ({
      name: `${row.product} / ${row.spec}`,
      amount: years.reduce((sum, year) => sum + row.yearlyAmount[year], 0),
      count: years.reduce((sum, year) => sum + row.yearlyQty[year], 0),
      itemId: row.itemId,
      unitPrice: row.unitPrice
    }))
    .sort((a, b) => b.amount - a.amount || b.count - a.count);

  return { company, product: companyRows[0]?.product ?? company, amount, count, yearly, specs };
});

const totalAmount = totalsByCompany.reduce((sum, row) => sum + row.amount, 0);
const totalCount = totalsByCompany.reduce((sum, row) => sum + row.count, 0);
const rankedCompanies = totalsByCompany
  .map(row => ({ ...row, share: totalAmount ? Number(((row.amount / totalAmount) * 100).toFixed(2)) : 0 }))
  .sort((a, b) => b.amount - a.amount || b.count - a.count);

const annualVerifiedSales = years.map(year => {
  const companiesForYear = totalsByCompany
    .map(company => ({
      supplierName: company.company,
      productName: company.product,
      amount: company.yearly.find(row => row.year === year)?.amount ?? 0,
      count: company.yearly.find(row => row.year === year)?.qty ?? 0
    }))
    .sort((a, b) => b.amount - a.amount || b.count - a.count);
  const yearTotalAmount = companiesForYear.reduce((sum, company) => sum + company.amount, 0);

  return {
    year,
    label: `${year}년 VDI 조달판매`,
    totalAmount: yearTotalAmount,
    basis: "DstationX 가격정하기.xlsx 단가×판매라이선스 기준",
    companies: companiesForYear.map(company => ({
      ...company,
      share: yearTotalAmount ? Number(((company.amount / yearTotalAmount) * 100).toFixed(2)) : 0
    }))
  };
});

const tilon = rankedCompanies.find(row => row.product.toLowerCase().includes("dstation")) ?? rankedCompanies[0];
const tilonDstation = {
  company: tilon.company,
  product: tilon.product,
  periodLabel: "2021~2026 엑셀 기준",
  totalAmount: tilon.amount,
  totalCount: tilon.count,
  summary: `DstationX 가격정하기.xlsx 기준, ${tilon.company}은 ${tilon.product} 판매라이선스 ${formatInteger(tilon.count)}개와 환산 매출 ${formatEok(tilon.amount)}을 기록했습니다. 동일 엑셀 내 비교 대상사 대비 누적 매출 1위입니다.`,
  yearlySales: tilon.yearly.map(row => ({ period: `${row.year}년`, amount: row.amount, count: row.qty })),
  topBuyers: tilon.specs.map(spec => ({ name: spec.name, amount: spec.amount, count: spec.count }))
};

const competitorAnalysis = rankedCompanies
  .filter(row => row.company !== tilon.company)
  .map(row => ({
    company: row.company,
    product: row.product,
    periodLabel: "2021~2026 엑셀 기준",
    totalAmount: row.amount,
    totalCount: row.count,
    summary: row.amount > 0
      ? `${row.company}는 ${row.product} 기준 판매라이선스 ${formatInteger(row.count)}개, 환산 매출 ${formatEok(row.amount)}입니다. 엑셀 기준 누적 점유율은 ${row.share.toFixed(2)}%입니다.`
      : `${row.company}는 제품과 가격 정보는 등록되어 있으나, 2021~2026 연도별 판매라이선스 값은 입력되어 있지 않습니다.`,
    yearlySales: row.yearly.map(item => ({ period: `${item.year}년`, amount: item.amount || null, count: item.qty })),
    topBuyers: row.specs.map(spec => ({ name: spec.name, amount: spec.amount || null, count: spec.count }))
  }));

const validationNotes = normalized
  .filter(row => row.statedQtyTotal && row.statedQtyTotal !== row.yearlyQtySum)
  .map(row => `${row.company} ${row.product} ${row.spec}: 판매수량 합계 ${formatInteger(row.statedQtyTotal)}개와 연도별 합 ${formatInteger(row.yearlyQtySum)}개가 불일치하여 연도별 합 기준으로 계산`);
validationNotes.push("엑셀에 수요기관/계약일자 원천 행이 없어 기관 TOP 분석은 제품 규격별 매출로 대체");
validationNotes.push("금액은 엑셀의 가격×연도별 판매라이선스 수량으로 산출");

const summary = {
  basis: "DstationX 가격정하기.xlsx 단가×판매라이선스 기반 재계산",
  annualVerifiedSales,
  fiveYearVdiRanking: {
    periodLabel: "2021~2026 엑셀 기준",
    basis: "DstationX 가격정하기.xlsx의 가격×연도별 판매라이선스 수량 기준. 수요기관 정보는 포함되지 않음.",
    totalAmount,
    totalCount,
    companies: rankedCompanies.map(row => ({
      supplierName: row.company,
      productName: row.product,
      amount: row.amount,
      share: row.share,
      count: row.count
    }))
  },
  tilonDstation,
  competitorAnalysis,
  unverifiedCompanies: rankedCompanies.filter(row => row.amount === 0).map(row => row.company),
  sourceRows: normalized.map(row => ({
    company: row.company,
    product: row.product,
    itemId: row.itemId,
    category: row.category,
    spec: row.spec,
    unitPrice: row.unitPrice,
    yearlyQty: row.yearlyQty,
    yearlyAmount: row.yearlyAmount,
    yearlyQtySum: row.yearlyQtySum,
    statedQtyTotal: row.statedQtyTotal
  })),
  validationNotes
};

fs.writeFileSync("data/output/vdi_company_summary.json", `${JSON.stringify(summary, null, 2)}\n`, "utf8");

const dictionary = normalized.map(row => ({
  standardCompanyName: row.company,
  companyAliases: row.company === "쓰리에스소프트" ? ["3S소프트", "3S Soft"] : row.company === tilon.company ? ["Tilon"] : [],
  businessRegistrationNumber: "",
  standardProductName: row.product,
  productAliases: [...new Set([row.product, row.product.replace(/ v[\d.]+$/i, ""), row.itemId].filter(Boolean))],
  productIdentificationNumbers: [row.itemId].filter(Boolean),
  productClassificationNumbers: [],
  directVdi: true,
  category: "DIRECT_VDI",
  excludedKeywords: [],
  notes: `DstationX 가격정하기.xlsx 기준 ${row.spec} / 단가 ${row.unitPrice.toLocaleString("ko-KR")}원`,
  verificationStatus: row.yearlyQtySum > 0 ? "EXCEL_VERIFIED" : "PRICE_ONLY"
}));
fs.writeFileSync("data/dictionary/vdi_product_dictionary.json", `${JSON.stringify(dictionary, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  totalAmount,
  totalCount,
  companies: rankedCompanies.map(({ company, amount, count, share }) => ({ company, amount, count, share })),
  validationNotes
}, null, 2));
