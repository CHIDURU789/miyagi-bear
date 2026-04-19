import { NextRequest, NextResponse } from "next/server";
import { parseExcelRows, parseHtmlText, generateSampleData } from "@/lib/parser";
import type { BearApiResponse } from "@/lib/types";

// 宮城県公式ページのURL（令和8年度）
const SOURCE_PAGE = "https://www.pref.miyagi.jp/soshiki/sizenhogo/r8kumamokugeki.html";

// キャッシュ（60分）
let cache: { data: BearApiResponse; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

async function fetchExcelUrl(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MiyagiBearBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // エクセルファイルのリンクを探す
    const xlsxMatch = html.match(/href="([^"]*\.xlsx?[^"]*)"/i);
    if (!xlsxMatch) return null;

    const href = xlsxMatch[1];
    if (href.startsWith("http")) return href;
    const base = new URL(pageUrl);
    return `${base.origin}${href.startsWith("/") ? "" : "/"}${href}`;
  } catch {
    return null;
  }
}

async function fetchAndParseExcel(xlsxUrl: string) {
  const { read, utils } = await import("xlsx");

  const res = await fetch(xlsxUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MiyagiBearBot/1.0)" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Excel fetch failed: ${res.status}`);

  const buf = await res.arrayBuffer();
  const wb = read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  return parseExcelRows(rows);
}

async function fetchHtmlFallback(pageUrl: string) {
  const res = await fetch(pageUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MiyagiBearBot/1.0)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTML fetch failed: ${res.status}`);
  const html = await res.text();
  return parseHtmlText(html, pageUrl);
}

export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get("force") === "1";

  // キャッシュチェック
  if (!force && cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  let sightings = [];
  let usedSample = false;
  let note = "";

  try {
    // 1. ページからExcelリンクを取得
    const xlsxUrl = await fetchExcelUrl(SOURCE_PAGE);

    if (xlsxUrl) {
      try {
        sightings = await fetchAndParseExcel(xlsxUrl);
        note = `Excelデータを取得しました。`;
      } catch (e) {
        // Excel取得失敗 → HTMLフォールバック
        try {
          sightings = await fetchHtmlFallback(SOURCE_PAGE);
          note = `HTMLページからデータを解析しました（Excel取得失敗）。`;
        } catch {
          throw e;
        }
      }
    } else {
      // ExcelリンクなしのHTMLフォールバック
      sightings = await fetchHtmlFallback(SOURCE_PAGE);
      note = `HTMLページからデータを解析しました。`;
    }

    if (sightings.length === 0) {
      throw new Error("No data parsed from source");
    }
  } catch (err) {
    // 全失敗 → サンプルデータ
    sightings = generateSampleData();
    usedSample = true;
    note = `⚠️ 宮城県公式サイトからのデータ取得に失敗しました。デモ用サンプルデータを表示しています。実際の出没情報は宮城県公式サイトをご確認ください。エラー: ${err instanceof Error ? err.message : "不明"}`;
  }

  const response: BearApiResponse = {
    sightings: sightings.sort((a, b) => b.date.localeCompare(a.date)),
    fetchedAt: new Date().toISOString(),
    totalCount: sightings.length,
    sourceUrl: SOURCE_PAGE,
    note: usedSample
      ? note
      : `データソース: 宮城県公式サイト。${note}このサービスは情報提供のみを目的とし、安全を保証するものではありません。`,
  };

  cache = { data: response, ts: Date.now() };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60",
    },
  });
}
