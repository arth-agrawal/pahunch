import { getDb } from "@/lib/db";
import { DomainError } from "@/lib/domain/errors";
import { getDemoState } from "@/lib/server/service";

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  try {
    const order = new URL(request.url).searchParams.get("order");
    return Response.json(getDemoState(getDb(), order));
  } catch (error) {
    if (error instanceof DomainError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return Response.json({ error: "The demo state could not be loaded." }, { status: 500 });
  }
}
