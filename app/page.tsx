import { Suspense } from "react";
import { CustomerView } from "@/components/customer-view";
import { Shell } from "@/components/shell";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="p-6">Opening Meesho…</p>}>
      <Shell role="customer">
        <CustomerView />
      </Shell>
    </Suspense>
  );
}
