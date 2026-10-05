import { Suspense } from "react";
import { NeighbourView } from "@/components/neighbour-view";
import { Shell } from "@/components/shell";

export default function NeighbourPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading the consent request…</p>}>
      <Shell role="neighbour">
        <NeighbourView />
      </Shell>
    </Suspense>
  );
}
