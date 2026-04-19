// 出没種別
export type SightingType = "目撃" | "痕跡" | "人身被害" | "不明";

// 危険度
export type DangerLevel = "高" | "中" | "低";

// 出没情報エントリ
export interface BearSighting {
  id: string;
  date: string;          // ISO date string (YYYY-MM-DD)
  dateRaw: string;       // 元の日付文字列
  city: string;          // 市町村名
  location: string;      // 場所（詳細）
  type: SightingType;
  dangerLevel: DangerLevel;
  rawText: string;       // 原文全体
  source: string;        // データソースURL
}

// API レスポンス
export interface BearApiResponse {
  sightings: BearSighting[];
  fetchedAt: string;
  totalCount: number;
  sourceUrl: string;
  note: string;
}
