import { Suspense } from "react";
import { HubView } from "@/components/hub-view";
import { Shell } from "@/components/shell";

export default function HubPage() {
  return (
    <Suspense fallback={<p className="p-6">Opening the local hub portal…</p>}>
      <Shell role="hub">
        <HubView />
      </Shell>
    </Suspense>
  );
}
