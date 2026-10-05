import { Suspense } from "react";
import { HubView } from "@/components/hub-view";
import { Shell } from "@/components/shell";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="p-6">Loading Pahunch…</p>}>
      <Shell role="hub">
        <HubView />
      </Shell>
    </Suspense>
  );
}
