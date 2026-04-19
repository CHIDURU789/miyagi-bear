"use client";
import dynamic from "next/dynamic";
import type { BearSighting } from "@/lib/types";

// SSR無効で動的インポート（Leafletはブラウザ専用）
const BearMap = dynamic(() => import("./BearMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f4f0",
        borderRadius: "inherit",
        color: "#555",
        flexDirection: "column",
        gap: 8,
        fontSize: "0.9rem",
      }}
    >
      <span style={{ fontSize: "2rem" }}>🗺️</span>
      地図を読み込み中…
    </div>
  ),
});

interface Props {
  sightings: BearSighting[];
  focusCity?: string;
  onMarkerClick?: (id: string) => void;
}

export default function BearMapWrapper(props: Props) {
  return <BearMap {...props} />;
}
