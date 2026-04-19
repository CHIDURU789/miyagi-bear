"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import BearCard from "@/components/BearCard";
import BearMapWrapper from "@/components/BearMapWrapper";
import type { BearApiResponse, SightingType } from "@/lib/types";

type FilterType = SightingType | "すべて";
type ViewMode = "list" | "map" | "split";

export default function HomePage() {
  const [data, setData] = useState<BearApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState("すべて");
  const [selectedType, setSelectedType] = useState<FilterType>("すべて");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [isWide, setIsWide] = useState(false);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    fetch("/api/bears")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });

    const mq = window.matchMedia("(min-width: 768px)");
    setIsWide(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const cities = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.sightings.map((s) => s.city));
    return ["すべて", ...Array.from(set).sort((a, b) => a.localeCompare(b, "ja"))];
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.sightings.filter((s) => {
      if (selectedCity !== "すべて" && s.city !== selectedCity) return false;
      if (selectedType !== "すべて" && s.type !== selectedType) return false;
      return true;
    });
  }, [data, selectedCity, selectedType]);

  const typeCounts = useMemo(() => {
    const src = selectedCity !== "すべて"
      ? data?.sightings.filter((s) => s.city === selectedCity) ?? []
      : data?.sightings ?? [];
    return {
      目撃:     src.filter((s) => s.type === "目撃").length,
      痕跡:     src.filter((s) => s.type === "痕跡").length,
      人身被害: src.filter((s) => s.type === "人身被害").length,
    };
  }, [data, selectedCity]);

  const handleMarkerClick = useCallback((id: string) => {
    setHighlightedId(id);
    const el = cardRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightedId(null), 3000);
  }, []);

  const isSample = data?.note?.includes("サンプルデータ");
  const effectiveView: ViewMode = viewMode === "split" && !isWide ? "map" : viewMode;
  const showMap = effectiveView === "map" || effectiveView === "split";

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <span className="header-icon" aria-hidden>🐻</span>
          <div className="header-title">
            <h1>宮城県 クマ出没情報</h1>
            <p>ツキノワグマ目撃・痕跡・人身被害マップ</p>
          </div>
        </div>
        <div className="warning-banner" role="alert">
          ⚠ クマ出没警報発令中 ― 不必要な外出を控え、クマ鈴・ラジオを携帯してください
        </div>
      </header>

      <main className="container">
        <div className="disclaimer" role="note">
          <span className="disclaimer-icon">⚠️</span>
          <div>
            このサービスは情報提供のみを目的とし、<strong>安全を保証するものではありません</strong>。
            最新情報・緊急時は
            <a href="https://www.pref.miyagi.jp/soshiki/sizenhogo/r8kumamokugeki.html"
               target="_blank" rel="noopener noreferrer" style={{ color: "#8B6914", marginLeft: 4 }}>
              宮城県公式サイト
            </a>
            および地元自治体・警察にお問い合わせください。
          </div>
        </div>

        {loading && (
          <div className="loading" aria-live="polite">
            <span className="loading-bear" aria-hidden>🐻</span>
            データを取得中…
          </div>
        )}

        {error && (
          <div className="error-box" role="alert">
            <p>⚠️ データの読み込みに失敗しました</p>
            <p style={{ fontSize: "0.8rem", marginTop: 8 }}>{error}</p>
          </div>
        )}

        {data && (
          <>
            {isSample && (
              <div className="sample-warning" role="alert">
                <span>⚠️</span>
                <div>
                  公式サイトからのデータ取得に失敗しました。デモ用サンプルデータを表示中です。
                  実際の情報は
                  <a href="https://www.pref.miyagi.jp/soshiki/sizenhogo/r8kumamokugeki.html"
                     target="_blank" rel="noopener noreferrer" style={{ color: "#664d00", fontWeight: 700 }}>
                    宮城県公式サイト
                  </a>
                  をご確認ください。
                </div>
              </div>
            )}

            <div className="status-bar">
              <div>
                <span className="status-count">{filtered.length}<span> 件表示</span></span>
                {selectedCity !== "すべて" && <span style={{ marginLeft: 6 }}>（{selectedCity}）</span>}
              </div>
              <div className="status-source">
                <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">
                  📄 宮城県公式サイト
                </a>
                <span style={{ marginLeft: 8 }}>
                  取得: {new Date(data.fetchedAt).toLocaleString("ja-JP")}
                </span>
              </div>
            </div>

            <div className="filter-panel" role="search" aria-label="絞り込み">
              <div className="filter-group">
                <div className="filter-label">市町村</div>
                <select className="city-select" value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)} aria-label="市町村で絞り込み">
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <div className="filter-label">種別</div>
                <div className="type-buttons" role="group" aria-label="種別フィルター">
                  {(["すべて", "目撃", "痕跡", "人身被害"] as const).map((t) => {
                    const cls = t === "すべて" ? "all" : t === "目撃" ? "sight" : t === "痕跡" ? "trace" : "injury";
                    return (
                      <button key={t}
                        className={`type-btn ${cls} ${selectedType === t ? "active" : ""}`}
                        onClick={() => setSelectedType(t)} aria-pressed={selectedType === t}>
                        {t === "目撃" ? "👁 目撃" : t === "痕跡" ? "🐾 痕跡" : t === "人身被害" ? "⚠️ 人身被害" : "すべて"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(selectedCity !== "すべて" || selectedType !== "すべて") && (
                <button className="reset-btn"
                  onClick={() => { setSelectedCity("すべて"); setSelectedType("すべて"); }}>
                  絞り込みをリセット
                </button>
              )}
            </div>

            <div className="summary-chips" aria-label="種別件数">
              <span className="chip chip-sight">👁 目撃 {typeCounts.目撃}件</span>
              <span className="chip chip-trace">🐾 痕跡 {typeCounts.痕跡}件</span>
              <span className="chip chip-injury">⚠️ 人身被害 {typeCounts.人身被害}件</span>
            </div>

            {/* ===== ビュー切替タブ ===== */}
            <div className="view-tabs" role="tablist" aria-label="表示切替">
              {([
                { key: "list",  label: "📋 リスト" },
                { key: "map",   label: "🗺️ 地図" },
                { key: "split", label: "⊞ 分割" },
              ] as const).map(({ key, label }) => (
                <button key={key}
                  className={`view-tab ${viewMode === key ? "active" : ""}`}
                  onClick={() => setViewMode(key)}
                  role="tab" aria-selected={viewMode === key}>
                  {label}
                  {key === "split" && !isWide && (
                    <span style={{ fontSize: "0.65rem", opacity: 0.7, marginLeft: 2 }}>PC向け</span>
                  )}
                </button>
              ))}
            </div>

            {/* 地図凡例 */}
            {showMap && (
              <div className="map-legend" aria-label="地図凡例">
                <span style={{ fontWeight: 700, marginRight: 4 }}>凡例：</span>
                <span className="legend-item"><span className="legend-dot sight" />目撃</span>
                <span className="legend-item"><span className="legend-dot trace" />痕跡</span>
                <span className="legend-item"><span className="legend-dot injury" />人身被害</span>
                <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#aaa" }}>
                  マーカーをタップで詳細表示
                </span>
              </div>
            )}

            {/* ===== リストのみ ===== */}
            {effectiveView === "list" && (
              filtered.length === 0 ? (
                <div className="empty" role="status">
                  <span style={{ fontSize: "2rem", display: "block", marginBottom: 8 }}>🔍</span>
                  該当する出没情報はありません
                </div>
              ) : (
                <div className="card-list" role="list" aria-label="出没情報一覧">
                  {filtered.map((s) => (
                    <div key={s.id} ref={(el) => { cardRefs.current[s.id] = el; }}>
                      <BearCard sighting={s} highlighted={highlightedId === s.id} />
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ===== 地図のみ ===== */}
            {effectiveView === "map" && (
              <>
                <div className="map-container">
                  <BearMapWrapper
                    sightings={filtered}
                    focusCity={selectedCity}
                    onMarkerClick={(id) => {
                      setHighlightedId(id);
                      setTimeout(() => setHighlightedId(null), 3000);
                    }}
                  />
                </div>
                <p className="map-note">
                  地図データ © <a href="https://www.openstreetmap.org/copyright"
                    target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors
                </p>
              </>
            )}

            {/* ===== 分割ビュー ===== */}
            {effectiveView === "split" && (
              <>
                <div className="split-view">
                  <div className="split-map">
                    <BearMapWrapper
                      sightings={filtered}
                      focusCity={selectedCity}
                      onMarkerClick={handleMarkerClick}
                    />
                  </div>
                  <div className="split-list" role="list" aria-label="出没情報一覧">
                    {filtered.length === 0 ? (
                      <div className="empty" role="status">
                        <span style={{ fontSize: "1.5rem", display: "block", marginBottom: 8 }}>🔍</span>
                        該当する出没情報はありません
                      </div>
                    ) : (
                      filtered.map((s) => (
                        <div key={s.id}
                          ref={(el) => { cardRefs.current[s.id] = el; }}
                          style={{ marginBottom: 8 }}>
                          <BearCard sighting={s} highlighted={highlightedId === s.id} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <p className="map-note">
                  地図データ © <a href="https://www.openstreetmap.org/copyright"
                    target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors
                </p>
              </>
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <p>
          データ出典:{" "}
          <a href="https://www.pref.miyagi.jp/soshiki/sizenhogo/r8kumamokugeki.html"
             target="_blank" rel="noopener noreferrer">
            宮城県公式サイト（令和8年度クマ目撃等情報）
          </a>
        </p>
        <p style={{ marginTop: 4 }}>
          ⚠ このサービスは情報提供のみを目的とし、安全を保証するものではありません。緊急時は 110番 または地元自治体へ。
        </p>
      </footer>
    </>
  );
}
