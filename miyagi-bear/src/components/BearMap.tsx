"use client";
import { useEffect, useRef, useCallback } from "react";
import type { BearSighting } from "@/lib/types";
import { getCityCoords, MIYAGI_CENTER, MIYAGI_ZOOM } from "@/lib/geo";

// マーカー色の定義
const TYPE_COLOR: Record<string, string> = {
  目撃:     "#1e5fa0",
  痕跡:     "#c86020",
  人身被害: "#b01818",
  不明:     "#666666",
};

const TYPE_ICON_CHAR: Record<string, string> = {
  目撃:     "👁",
  痕跡:     "🐾",
  人身被害: "⚠",
  不明:     "?",
};

interface BearMapProps {
  sightings: BearSighting[];
  focusCity?: string;        // カードクリック時にフォーカスする市町村
  onMarkerClick?: (id: string) => void;
}

export default function BearMap({ sightings, focusCity, onMarkerClick }: BearMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);

  // Leafletを動的インポートして初期化
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let L: typeof import("leaflet");

    (async () => {
      L = (await import("leaflet")).default;

      // Leaflet デフォルトアイコン画像パス修正（Next.js対応）
      // @ts-expect-error _getIconUrl exists on prototype
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // 地図を初期化
      const map = L.map(mapRef.current!, {
        center: MIYAGI_CENTER,
        zoom: MIYAGI_ZOOM,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // OpenStreetMapタイル
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;

      // マーカーを配置
      renderMarkers(L, map, sightings, onMarkerClick);
    })();

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
    // 初回のみ実行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sightingsが変わったらマーカーを更新
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    (async () => {
      const L = (await import("leaflet")).default;
      // 既存マーカーを削除
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      renderMarkers(L, mapInstanceRef.current, sightings, onMarkerClick);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sightings]);

  // focusCityが変わったら地図をパン
  useEffect(() => {
    if (!mapInstanceRef.current || !focusCity || focusCity === "すべて") return;
    const coords = getCityCoords(focusCity);
    mapInstanceRef.current.flyTo(coords, 12, { duration: 0.8 });
  }, [focusCity]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderMarkers(L: any, map: any, items: BearSighting[], onClick?: (id: string) => void) {
    // 座標ごとに少しずらして重複を避けるためにグループ化
    const coordMap: Record<string, BearSighting[]> = {};
    items.forEach((s) => {
      const [lat, lng] = getCityCoords(s.city);
      const key = `${lat},${lng}`;
      if (!coordMap[key]) coordMap[key] = [];
      coordMap[key].push(s);
    });

    const newMarkers: unknown[] = [];

    Object.entries(coordMap).forEach(([key, group]) => {
      const [lat, lng] = key.split(",").map(Number);

      group.forEach((sighting, idx) => {
        // 同一座標を円状にずらす（最大12件想定、半径0.008度）
        const angle = (idx / Math.max(group.length, 1)) * 2 * Math.PI;
        const spread = group.length > 1 ? 0.006 : 0;
        const jLat = lat + Math.cos(angle) * spread;
        const jLng = lng + Math.sin(angle) * spread * 1.4;

        const color = TYPE_COLOR[sighting.type] ?? "#666";
        const icon = TYPE_ICON_CHAR[sighting.type] ?? "?";

        // SVGベースのカスタムアイコン
        const svgIcon = L.divIcon({
          className: "",
          html: `
            <div style="
              width:28px;height:28px;
              background:${color};
              border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);
              border:2px solid white;
              box-shadow:0 1px 4px rgba(0,0,0,0.4);
              display:flex;align-items:center;justify-content:center;
            ">
              <span style="transform:rotate(45deg);font-size:12px;line-height:1;">${icon}</span>
            </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
          popupAnchor: [0, -30],
        });

        const marker = L.marker([jLat, jLng], { icon: svgIcon })
          .addTo(map)
          .bindPopup(buildPopupHtml(sighting), { maxWidth: 260 });

        marker.on("click", () => onClick?.(sighting.id));
        newMarkers.push(marker);
      });
    });

    markersRef.current = newMarkers as never[];
  }

  return (
    <>
      {/* Leaflet CSS を head に注入 */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div
        ref={mapRef}
        style={{ width: "100%", height: "100%", borderRadius: "inherit" }}
        aria-label="クマ出没情報地図"
      />
    </>
  );
}

function buildPopupHtml(s: BearSighting): string {
  const dangerColor =
    s.dangerLevel === "高" ? "#cc2222" :
    s.dangerLevel === "中" ? "#c07000" : "#2a8a2a";
  const typeColor = TYPE_COLOR[s.type] ?? "#666";

  return `
    <div style="font-family:'Noto Sans JP',sans-serif;font-size:13px;line-height:1.5;min-width:180px;">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#1a2e1a;">
        📍 ${s.city}
      </div>
      <div style="color:#666;font-size:11px;margin-bottom:6px;">${s.date}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
        <span style="background:${typeColor}22;color:${typeColor};border:1px solid ${typeColor}66;
          border-radius:10px;padding:1px 8px;font-size:11px;font-weight:700;">
          ${s.type}
        </span>
        <span style="background:${dangerColor}22;color:${dangerColor};border:1px solid ${dangerColor}66;
          border-radius:10px;padding:1px 8px;font-size:11px;font-weight:700;">
          危険度：${s.dangerLevel}
        </span>
      </div>
      ${s.location ? `<div style="font-size:12px;color:#333;margin-bottom:4px;">🗾 ${s.location}</div>` : ""}
      <div style="font-size:10px;color:#999;border-top:1px dashed #ddd;margin-top:6px;padding-top:4px;
        white-space:normal;word-break:break-all;">
        ${s.rawText.slice(0, 100)}${s.rawText.length > 100 ? "…" : ""}
      </div>
    </div>
  `;
}
