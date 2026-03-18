"use client";

import React from "react";
import type { BillingTab } from "./BillingTypes";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const TAB_ITEMS: Array<{ key: BillingTab; label: string }> = [
  { key: "WORKSPACE", label: "Workspace" },
  { key: "CLAIMS", label: "Claims" },
  { key: "DENIALS", label: "Denials" },
  { key: "PAYMENTS", label: "Payments" },
  { key: "SETTINGS", label: "Settings" },
];

type Props = {
  value: BillingTab;
  onChange: (tab: BillingTab) => void;
};

export default function BillingTabs({ value, onChange }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-6 border-b border-bac-border">
      {TAB_ITEMS.map((item) => {
        const active = value === item.key;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={cx(
              "relative pb-3 text-[16px] font-semibold transition-all duration-150",
              
              // ✅ ACTIVE (xanh clean)
              active
                ? "text-green-400"
                : "text-yellow-500 hover:text-yellow-400"
            )}
          >
            {item.label}

            {/* underline */}
            <span
              className={cx(
                "absolute left-0 bottom-0 h-[2px] w-full rounded-full transition-all duration-200",
                active
                  ? "bg-green-400"
                  : "bg-transparent group-hover:bg-yellow-400"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}