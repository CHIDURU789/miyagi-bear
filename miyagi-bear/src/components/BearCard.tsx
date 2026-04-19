"use client";
import { useState } from "react";
import type { BearSighting } from "@/lib/types";

const TYPE_CLASS: Record<string, string> = {
  目撃: "sight",
  痕跡: "trace",
  人身被害: "injury",
  不明: "sight",
};

const TYPE_BADGE_CLASS: Record<string, string> = {
  目撃: "badge-sight",
  痕跡: "badge-trace",
  人身被害: "badge-injury",
  不明: "badge-sight",
};

const TYPE_ICON: Record<string, string> = {
  目撃: "👁",
  痕跡: "🐾",
  人身被害: "⚠️",
  不明: "❓",
};

const DANGER_CLASS: Record<string, string> = {
  高: "danger-high",
  中: "danger-mid",
  低: "danger-low",
};

function formatDate(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const [y, m, d] = iso.split("-");
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

export default function BearCard({
  sighting,
  highlighted = false,
}: {
  sighting: BearSighting;
  highlighted?: boolean;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const typeClass = TYPE_CLASS[sighting.type] ?? "sight";

  return (
    <div
      className={`card ${typeClass}${highlighted ? " highlighted" : ""}`}
      role="listitem"
    >
      <div className="card-top">
        <span className="card-date">{formatDate(sighting.date)}</span>
        <span className="card-city">📍 {sighting.city}</span>
        <span className={`badge ${TYPE_BADGE_CLASS[sighting.type]}`}>
          {TYPE_ICON[sighting.type]} {sighting.type}
        </span>
        <span className={`danger-badge ${DANGER_CLASS[sighting.dangerLevel]}`}>
          危険度：{sighting.dangerLevel}
        </span>
      </div>

      {sighting.location && (
        <div className="card-location">🗾 {sighting.location}</div>
      )}

      <button
        className="raw-toggle"
        onClick={() => setShowRaw((v) => !v)}
        aria-expanded={showRaw}
      >
        {showRaw ? "▲ 原文を閉じる" : "▼ 原文を表示"}
      </button>

      {showRaw && (
        <div className="card-raw" aria-live="polite">
          {sighting.rawText}
        </div>
      )}
    </div>
  );
}
