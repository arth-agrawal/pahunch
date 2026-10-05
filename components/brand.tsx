import type { ReactNode } from "react";

export function MeeshoLogo({
  light = false,
  className = "",
}: {
  light?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-block text-[26px] leading-none font-black tracking-[-0.07em] ${light ? "text-white" : "text-meesho"} ${className}`}
      aria-label="Meesho"
    >
      meesho
    </span>
  );
}

const ARTS: Record<string, { bg: string; shape: ReactNode }> = {
  "PH-2401": {
    bg: "bg-[#f6ddd2]",
    shape: (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <path
          fill="#8e2b45"
          d="M8 24c7-3 9 3 12 5 1-8 5-14 12-14s11 6 12 14c3-2 5-8 12-5-3 8-7 8-9 11l2 22H15l2-22c-2-3-6-3-9-11z"
        />
        <path d="M26 18c2 5 10 5 12 0" fill="none" stroke="#f6ddd2" strokeWidth="1.6" />
        <path d="M24 36h16M24 42h16" stroke="#e6c27a" strokeWidth="1.4" />
      </svg>
    ),
  },
  "PH-2402": {
    bg: "bg-[#f6e2b8]",
    shape: (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <path d="M32 10c8 8 10 14 8 22H24c-2-8 0-14 8-22z" fill="#e0a23a" />
        <rect x="30" y="32" width="4" height="14" fill="#8a6a32" />
        <ellipse cx="32" cy="48" rx="12" ry="3" fill="#c9842a" />
      </svg>
    ),
  },
  "PH-2403": {
    bg: "bg-[#d9e4f5]",
    shape: (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <rect x="12" y="16" width="40" height="32" rx="3" fill="#2f4d8a" />
        <path d="M12 28h40M12 38h40M24 16v32M40 16v32" stroke="#f2d27a" strokeWidth="2" />
      </svg>
    ),
  },
  "PH-2404": {
    bg: "bg-[#e7e7e7]",
    shape: (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <rect x="18" y="22" width="28" height="26" rx="4" fill="#c5c8ce" stroke="#8d929a" />
        <rect x="22" y="16" width="20" height="8" rx="2" fill="#9aa0a8" />
        <path d="M24 34h16" stroke="#fff" strokeWidth="2" />
      </svg>
    ),
  },
  "PH-2405": {
    bg: "bg-[#f8d7e6]",
    shape: (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <path d="M16 22c8 4 8 16 0 20 6 2 14 2 18-4 4 6 12 6 18 4-8-4-8-16 0-20-6-2-14-2-18 4-4-6-12-6-18-4z" fill="#f43397" />
        <path d="M30 28c2 6 2 10 0 14M34 28c-2 6-2 10 0 14" stroke="#fff" strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  "PH-2406": {
    bg: "bg-[#dceee4]",
    shape: (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <rect x="16" y="14" width="28" height="36" rx="2" fill="#1f6b45" />
        <rect x="20" y="18" width="28" height="36" rx="2" fill="#f7f1e4" />
        <path d="M26 28h16M26 34h16M26 40h10" stroke="#1f6b45" strokeWidth="1.5" />
      </svg>
    ),
  },
};

export function ProductShot({ id, name }: { id: string; name: string }) {
  const art = ARTS[id] ?? ARTS["PH-2401"];
  return (
    <div className={`grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-md ${art?.bg ?? "bg-canvas"}`}>
      {art?.shape}
      <span className="sr-only">{name}</span>
    </div>
  );
}

export function MeeshoScreen({
  title,
  onBack,
  children,
  footer,
  partner = false,
}: {
  title: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  partner?: boolean;
}) {
  return (
    <div className={`flex min-h-[100dvh] flex-col lg:h-full lg:min-h-0 ${partner ? "bg-[#f6f6f6]" : "bg-[#f4f4f4]"}`}>
      <header className={`z-10 flex shrink-0 items-center gap-3 px-3 py-2.5 ${partner ? "bg-[#1c1c1c] text-white" : "bg-white"}`}>
        {onBack ? (
          <button type="button" onClick={onBack} className="grid h-9 w-9 place-items-center text-lg" aria-label="Back">
            ←
          </button>
        ) : (
          <span className="w-1" />
        )}
        <MeeshoLogo light={partner} className="text-[22px]" />
        <span className={`text-sm font-bold ${partner ? "text-white" : "text-ink"}`}>{title}</span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer ? <div className="shrink-0 border-t border-line bg-white px-3 pt-3 pb-20 lg:pb-3">{footer}</div> : null}
    </div>
  );
}

export function OrdersTabBar() {
  const tabs = [
    { id: "home", label: "Home" },
    { id: "categories", label: "Categories" },
    { id: "mall", label: "Mall" },
    { id: "orders", label: "Orders" },
    { id: "account", label: "Account" },
  ];
  return (
    <nav className="grid grid-cols-5 border-t border-line bg-white px-1 py-1.5 text-[11px] font-bold" aria-label="Meesho">
      {tabs.map((tab) => {
        const current = tab.id === "orders";
        return (
          <span
            key={tab.id}
            className={`flex flex-col items-center gap-0.5 py-1 ${current ? "text-meesho" : "text-[#9a9a9a]"}`}
            aria-current={current ? "page" : undefined}
          >
            <TabGlyph id={tab.id} />
            {tab.label}
          </span>
        );
      })}
    </nav>
  );
}

function TabGlyph({ id }: { id: string }) {
  const common = "h-5 w-5";
  if (id === "orders") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="6" width="16" height="13" rx="2" />
        <path d="M8 6V5a4 4 0 0 1 8 0v1" />
      </svg>
    );
  }
  if (id === "home") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 11.5 12 4l8 7.5V20H4v-8.5z" />
      </svg>
    );
  }
  if (id === "categories") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="7" height="7" rx="1" />
        <rect x="13" y="4" width="7" height="7" rx="1" />
        <rect x="4" y="13" width="7" height="7" rx="1" />
        <rect x="13" y="13" width="7" height="7" rx="1" />
      </svg>
    );
  }
  if (id === "mall") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 10h16v10H4zM6 10 8 4h8l2 6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 19c1.5-3 3.8-4.5 7-4.5S17.5 16 19 19" />
    </svg>
  );
}
