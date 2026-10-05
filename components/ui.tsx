import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "gold" | "ghost" | "danger";
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-meesho text-white hover:bg-meesho-deep",
  gold: "bg-gold text-white hover:bg-[#e67a0a]",
  ghost: "border border-line bg-white text-ink hover:bg-[#fafafa]",
  danger: "border border-rose bg-white text-rose hover:bg-[#fff5f5]",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <div className="mt-1 font-normal">{children}</div>
      {hint ? <span className="mt-1 block text-sm font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink";

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink">
      {children}
    </p>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-rose/30 bg-white px-3 py-2 text-sm text-rose">
      {children}
    </p>
  );
}
