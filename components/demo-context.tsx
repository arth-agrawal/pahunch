"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { DemoState } from "@/lib/domain/dto";

export type Role = "hub" | "customer" | "neighbour" | "rider" | "pilot";

export const ROLES: Array<{ id: Role; href: string; label: string }> = [
  { id: "customer", href: "/", label: "Buyer" },
  { id: "neighbour", href: "/neighbour", label: "Neighbour" },
  { id: "hub", href: "/hub", label: "Hub" },
  { id: "rider", href: "/rider", label: "Rider" },
  { id: "pilot", href: "/pilot", label: "Pilot" },
];

type ActionJson = { message?: string; shipmentId?: string; error?: string };

type DemoController = {
  role: Role;
  orderId: string;
  setOrderId: (id: string) => void;
  data: DemoState | null;
  loading: boolean;
  error: string | null;
  notice: string | null;
  offlineFrozen: boolean;
  act: (body: Record<string, unknown>) => Promise<ActionJson>;
  reload: () => Promise<void>;
};

const DemoContext = createContext<DemoController | null>(null);

export function useDemo(): DemoController {
  const value = useContext(DemoContext);
  if (!value) throw new Error("Pahunch screens must render inside the demo shell.");
  return value;
}

export function DemoProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const orderId = params.get("order") ?? "PH-2401";
  const [data, setData] = useState<DemoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [offlineFrozen, setOfflineFrozen] = useState(false);

  const setOrderId = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params.toString());
      next.set("order", id);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  const reload = useCallback(async () => {
    const response = await fetch(`/api/state?order=${encodeURIComponent(orderId)}`, { cache: "no-store" });
    if (!response.ok) {
      setError("The shared demo state could not be loaded.");
      setLoading(false);
      return;
    }
    const json = (await response.json()) as DemoState;
    setData(json);
    setOfflineFrozen(json.riderOffline);
    setError(null);
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const response = await fetch(`/api/state?order=${encodeURIComponent(orderId)}`, { cache: "no-store" });
      if (cancelled) return;
      if (!response.ok) {
        setError("The shared demo state could not be loaded.");
        setLoading(false);
        return;
      }
      const json = (await response.json()) as DemoState;
      if (json.riderOffline) {
        setData((current) => current ?? json);
        setOfflineFrozen(true);
      } else {
        setData(json);
        setOfflineFrozen(false);
      }
      setError(null);
      setLoading(false);
    };
    void run();
    const timer = setInterval(() => {
      if (!offlineFrozen) void run();
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [orderId, offlineFrozen]);

  const act = useCallback(
    async (body: Record<string, unknown>) => {
      const response = await fetch("/api/act", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await response.json()) as ActionJson;
      if (!response.ok) {
        throw new Error(json.error || "That action was rejected.");
      }
      setNotice(json.message ?? "Saved.");
      if (json.shipmentId) setOrderId(json.shipmentId);
      if (body.action === "setOffline" && body.offline === true) {
        setOfflineFrozen(true);
      } else if (body.action === "setOffline" && body.offline === false) {
        setOfflineFrozen(false);
      }
      if (!(body.action === "setOffline" && body.offline === true)) {
        await reload();
      }
      return json;
    },
    [reload, setOrderId],
  );

  return (
    <DemoContext.Provider value={{ role, orderId, setOrderId, data, loading, error, notice, offlineFrozen, act, reload }}>
      {children}
    </DemoContext.Provider>
  );
}
