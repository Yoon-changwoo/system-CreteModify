"use client";

/** 헤더 이니셜 */
export const ATTR_MARK = "ELAND C.Y.";

/** 헤더 — 은은한 워드마크 (워터마크 박스 표기 없음) */
export function AttributionChip() {
  return (
    <span
      className="select-none text-[11px] font-semibold italic tracking-[0.35em] text-white/45"
      style={{ fontFamily: 'Georgia, "Times New Roman", "Noto Serif KR", serif' }}
      title={ATTR_MARK}
    >
      {ATTR_MARK}
    </span>
  );
}
