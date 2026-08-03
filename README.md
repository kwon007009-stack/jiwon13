# 공공조달 마켓 인텔리전스 - VDI/가상화 부문

React, Tailwind CSS, Recharts 기반의 B2G 공공조달 데이터 시각화 대시보드입니다.

## 실행

```powershell
npm install
npm start
```

브라우저에서 `http://127.0.0.1:8001`을 엽니다.

## 핵심 구조

- `src/App.jsx`: 단일 React 대시보드 컴포넌트
- `rawMasterData`: API 또는 Mock에서 받은 원본 데이터
- `filteredData`: 통합 검색어로 필터링된 렌더링 전용 데이터
- 모든 KPI, 차트, 테이블은 `filteredData`만 사용합니다.

## 검색 대상

상단 검색창은 다음 세 컬럼을 통합 검색합니다.

- 공급기업명
- 제품/품목명
- 수요기관명

null, undefined, 비정상 값은 `safeText`, `safeNumber` 헬퍼로 방어 처리합니다.
