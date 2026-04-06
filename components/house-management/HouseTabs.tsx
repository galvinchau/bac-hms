"use client";

import React from "react";
import { cx, HouseTabKey } from "./shared";

export default function HouseTabs({
  value,
  onChange,
}: {
  value: HouseTabKey;
  onChange: (tab: HouseTabKey) => void;
}) {
  const tabs: Array<{ key: HouseTabKey; label: string }> = [
    { key: "HOUSES", label: "Houses" },
    { key: "DASHBOARD", label: "Dashboard" },
    { key: "RESIDENTS", label: "Residents" },
    { key: "STAFFING", label: "Staffing" },
    { key: "COMPLIANCE", label: "Compliance" },
    { key: "OPERATIONS", label: "Daily Operations" },
  ];

  return (
    <div className="mb-5">
      <div className="inline-flex max-w-full flex-wrap gap-2 rounded-2xl border border-yellow-500/15 bg-[#0b1430]/70 p-2 shadow-[0_0_0_1px_rgba(234,179,8,0.04)]">
        {tabs.map((tab) => {
          const active = value === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cx(
                "group relative overflow-hidden rounded-xl border px-5 py-3 text-sm font-bold tracking-[0.01em] transition-all duration-200",
                active
                  ? "border-yellow-400/45 bg-gradient-to-b from-yellow-400/18 to-amber-500/12 text-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.14)]"
                  : "border-yellow-500/12 bg-white/[0.02] text-yellow-200/85 hover:border-yellow-400/25 hover:bg-yellow-400/10 hover:text-yellow-300"
              )}
            >
              <span className="relative z-10">{tab.label}</span>
              <span
                className={cx(
                  "absolute inset-x-3 bottom-0 h-[2px] rounded-full transition-all duration-200",
                  active
                    ? "bg-yellow-400 opacity-100"
                    : "bg-yellow-300/70 opacity-0 group-hover:opacity-100"
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}