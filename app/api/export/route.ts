import { getDb } from "@/lib/db";
import { exportAudit } from "@/lib/server/service";

export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json(exportAudit(getDb()));
}
