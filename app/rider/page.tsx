import { Suspense } from "react";
import { RiderView } from "@/components/rider-view";
import { Shell } from "@/components/shell";

export default function RiderPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading the rider task…</p>}>
      <Shell role="rider">
        <RiderView />
      </Shell>
    </Suspense>
  );
}
