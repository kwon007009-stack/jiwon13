# VDI Analysis Changelog

## 2026-08-03

- 현재 UI 디자인을 유지하면서 데이터 원천을 `data/output/vdi_company_summary.json`으로 분리했다.
- 제품 분류 사전 `data/dictionary/vdi_product_dictionary.json`을 생성했다.
- 검증되지 않은 2021~2024 및 일부 회사 데이터는 0원이 아니라 미확인으로 표시하도록 산출 파일에 빈 값으로 기록했다.
- 2025년 검증값과 2026년 YTD 검증 입력값을 별도 기준값으로 관리한다.
- 추후 API/엑셀 원천자료가 제공되면 `data/raw` → `data/processed` → `data/output` 흐름으로 재계산한다.
