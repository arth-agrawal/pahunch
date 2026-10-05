import { Suspense } from "react";
import { CustomerView } from "@/components/customer-view";
import { Shell } from "@/components/shell";

export default function CustomerPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading the delivery update…</p>}>
      <Shell role="customer">
        <CustomerView />
      </Shell>
    </Suspense>
  );
}
