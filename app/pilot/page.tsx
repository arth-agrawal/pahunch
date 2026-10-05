import { Suspense } from "react";
import { PilotView } from "@/components/pilot-view";
import { Shell } from "@/components/shell";

export default function PilotPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading the pilot view…</p>}>
      <Shell role="pilot">
        <PilotView />
      </Shell>
    </Suspense>
  );
}
