import type { ReactNode } from "react";

export function RoleLayout({ phone, aside }: { phone: ReactNode; aside: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[390px_minmax(0,1fr)]">
      <div className="lg:rounded-[28px] lg:border lg:border-line lg:bg-white lg:p-3 lg:shadow-sm">
        <div className="bg-white lg:overflow-hidden lg:rounded-[22px] lg:border lg:border-line">{phone}</div>
      </div>
      <aside className="rounded-xl border border-line bg-white p-4 text-sm leading-6">{aside}</aside>
    </div>
  );
}
