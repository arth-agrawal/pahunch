import { getDb } from "@/lib/db";
import { DomainError } from "@/lib/domain/errors";
import { dispatch } from "@/lib/server/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request body must be JSON." }, { status: 400 });
  }
  try {
    return Response.json(dispatch(getDb(), body));
  } catch (error) {
    if (error instanceof DomainError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error(error);
    return Response.json({ error: "The hub could not complete that action." }, { status: 500 });
  }
}
