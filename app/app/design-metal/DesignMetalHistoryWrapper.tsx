"use client";
import { DesignMetalHistory } from "@/app/app/design-metal/DesignMetalHistory";

export function DesignMetalHistoryWrapper({ currentSector }: { currentSector: string }) {
  return <DesignMetalHistory currentSector={currentSector} />;
}
