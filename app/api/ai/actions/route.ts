import { getCurrentUser } from "@/lib/auth/session";
import {
  aiActionRequestSchema,
  executeAiAction,
} from "@/features/ai/actions-executor";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = aiActionRequestSchema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Response.json(
      { error: firstIssue?.message ?? "Invalid action request." },
      { status: 400 },
    );
  }

  const result = await executeAiAction(user.id, parsed.data);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json(result);
}
