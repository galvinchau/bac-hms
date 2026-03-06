"use client";

import React from "react";

type Props = {
  titleRight?: string; // e.g. "HEALTH & INCIDENT REPORT"
  subtitleRight?: React.ReactNode; // e.g. "Status: SUBMITTED"
};

export default function HealthIncidentReportHeader({
  titleRight = "HEALTH & INCIDENT REPORT",
  subtitleRight,
}: Props) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black pb-3">
      <div className="flex items-start gap-3">
        <div className="h-16 w-16">
          <img
            src="/Logo.png"
            alt="BAC"
            className="h-16 w-16 object-contain"
          />
        </div>

        <div className="text-[12px] leading-4">
          <div className="font-semibold">Blue Angels Care, LLC</div>
          <div>MPI #: 104322079</div>
          <div>3107 Beale Avenue, Altoona, PA 16601</div>
          <div>Phone: (814) 600-2313</div>
          <div>Email: blueangelscarellc@gmail.com</div>
          <div>Website: blueangelscare.org</div>
        </div>
      </div>

      <div className="text-right">
        <div className="text-[18px] font-bold">{titleRight}</div>
        {subtitleRight ? (
          <div className="mt-1 text-[12px]">{subtitleRight}</div>
        ) : null}
      </div>
    </div>
  );
}