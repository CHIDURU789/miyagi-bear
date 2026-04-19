import type { BearSighting, SightingType, DangerLevel } from "./types";

// 和暦→西暦変換
function convertJapaneseDate(raw: string): string {
  if (!raw) return "";
  const str = String(raw).trim();

  // Excel日付シリアル値（数値）
  const num = parseFloat(str);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    // Excel epoch: 1900-01-01 = 1, but Excel has leap year bug
    const date = new Date((num - 25569) * 86400 * 1000);
    return date.toISOString().slice(0, 10);
  }

  // 令和表記
  const reiwaMatch = str.match(/令和\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/);
  if (reiwaMatch) {
    const y = 2018 + parseInt(reiwaMatch[1]);
    const m = reiwaMatch[2].padStart(2, "0");
    const d = reiwaMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // R8/4/1 形式
  const shortMatch = str.match(/[Rr](\d+)[\/.\-](\d+)[\/.\-](\d+)/);
  if (shortMatch) {
    const y = 2018 + parseInt(shortMatch[1]);
    const m = shortMatch[2].padStart(2, "0");
    const d = shortMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // 月/日 (年省略)のみ → 当年を補完
  const mdMatch = str.match(/^(\d{1,2})[\/月](\d{1,2})日?$/);
  if (mdMatch) {
    const year = new Date().getFullYear();
    const m = mdMatch[1].padStart(2, "0");
    const d = mdMatch[2].padStart(2, "0");
    return `${year}-${m}-${d}`;
  }

  // YYYY-MM-DD または YYYY/MM/DD
  const isoMatch = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${isoMatch[1]}-${m}-${d}`;
  }

  return str;
}

// 種別を判定
function detectType(texts: string[]): SightingType {
  const combined = texts.join(" ");
  if (/人身被害|負傷|死亡|けが|ケガ/.test(combined)) return "人身被害";
  if (/痕跡|足跡|フン|糞|食痕|爪跡|爪痕/.test(combined)) return "痕跡";
  if (/目撃/.test(combined)) return "目撃";
  return "不明";
}

// 危険度を判定
function calcDangerLevel(type: SightingType, location: string): DangerLevel {
  if (type === "人身被害") return "高";
  const urban =
    /住宅|市街|学校|公園|田|畑|農地|道路|国道|県道/.test(location);
  if (type === "目撃" && urban) return "高";
  if (type === "目撃") return "中";
  if (type === "痕跡" && urban) return "中";
  return "低";
}

// Excelワークブックの行をパース（xlsx ライブラリのutils.sheet_to_json結果）
export function parseExcelRows(
  rows: Record<string, unknown>[]
): BearSighting[] {
  const results: BearSighting[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const values = Object.values(row).map((v) => String(v ?? "").trim());
    const combined = values.join(" ");

    // ヘッダー行や空行をスキップ
    if (
      !combined ||
      combined.replace(/\s/g, "") === "" ||
      /^(No|番号|報告|整理)/.test(values[0])
    )
      continue;

    // 列マッピング（宮城県の典型的なExcel構造）
    // 列: No | 報告日 | 市町村 | 場所 | 種別 | 頭数 | 備考
    const keys = Object.keys(row);
    const dateRaw = String(row[keys[1]] ?? row[keys[0]] ?? "").trim();
    const city = String(
      row[keys[2]] ?? row["市町村"] ?? row["市町村名"] ?? ""
    ).trim();
    const location = String(
      row[keys[3]] ?? row["場所"] ?? row["目撃場所"] ?? ""
    ).trim();
    const typeSrc = String(row[keys[4]] ?? row["種別"] ?? "").trim();

    if (!city && !dateRaw) continue;

    const dateISO = convertJapaneseDate(dateRaw);
    const type = typeSrc
      ? detectType([typeSrc])
      : detectType([combined]);
    const dangerLevel = calcDangerLevel(type, location);

    results.push({
      id: `xlsx-${i}`,
      date: dateISO,
      dateRaw,
      city: city || "不明",
      location: location || "",
      type,
      dangerLevel,
      rawText: values.filter(Boolean).join(" | "),
      source: "宮城県公式Excelデータ",
    });
  }

  return results;
}

// HTML一覧ページのテキストをパース（フォールバック用）
export function parseHtmlText(html: string, sourceUrl: string): BearSighting[] {
  const results: BearSighting[] = [];

  // テーブル行を正規表現で抽出（簡易パース）
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellPattern = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  const tagPattern = /<[^>]+>/g;

  let rowMatch;
  let rowIndex = 0;

  while ((rowMatch = rowPattern.exec(html)) !== null) {
    rowIndex++;
    if (rowIndex === 1) continue; // ヘッダースキップ

    const cells: string[] = [];
    let cellMatch;
    const cellRegex = new RegExp(cellPattern.source, "gi");
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(cellMatch[1].replace(tagPattern, "").trim());
    }

    if (cells.length < 3) continue;

    const dateRaw = cells[0] || cells[1] || "";
    const city = cells[1] || cells[2] || "不明";
    const location = cells[2] || cells[3] || "";
    const typeSrc = cells[3] || "";

    if (!city || city === "不明" && !dateRaw) continue;

    const dateISO = convertJapaneseDate(dateRaw);
    const type = detectType([typeSrc, location, cells.join(" ")]);
    const dangerLevel = calcDangerLevel(type, location);
    const rawText = cells.filter(Boolean).join(" | ");

    results.push({
      id: `html-${rowIndex}`,
      date: dateISO,
      dateRaw,
      city,
      location,
      type,
      dangerLevel,
      rawText,
      source: sourceUrl,
    });
  }

  return results;
}

// サンプルデータ（フォールバック・デモ用）
export function generateSampleData(): BearSighting[] {
  const cities = [
    "仙台市", "大崎市", "栗原市", "登米市", "気仙沼市",
    "石巻市", "加美町", "色麻町", "大衡村", "富谷市",
    "川崎町", "七ヶ宿町", "蔵王町", "白石市", "角田市",
  ];
  const locations = [
    "山林付近", "農地脇", "住宅街の斜面", "河川敷", "国道沿い",
    "集落近く", "学校付近", "田んぼ脇", "林道", "公園付近",
  ];
  const types: SightingType[] = ["目撃", "目撃", "目撃", "痕跡", "痕跡", "人身被害"];
  const baseDate = new Date("2026-04-01");

  return Array.from({ length: 40 }, (_, i) => {
    const city = cities[i % cities.length];
    const location = locations[i % locations.length];
    const type = types[i % types.length];
    const dangerLevel = calcDangerLevel(type, location);
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i * 2);
    const dateStr = d.toISOString().slice(0, 10);

    return {
      id: `sample-${i}`,
      date: dateStr,
      dateRaw: dateStr,
      city,
      location,
      type,
      dangerLevel,
      rawText: `${dateStr} ${city} ${location} ${type}確認`,
      source: "サンプルデータ（実データ取得失敗時のデモ用）",
    };
  });
}
