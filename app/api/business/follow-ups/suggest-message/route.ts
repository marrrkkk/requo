import { NextResponse } from "next/server";
import { z } from "zod";

import { getWorkspaceBusinessActionContext } from "@/lib/db/business-access";
import { generateWithFallback } from "@/lib/ai/router";

const requestSchema = z.object({
  followUpTitle: z.string().min(1).max(200),
  followUpReason: z.string().min(1).max(500),
  channel: z.string().min(1),
  customerName: z.string().min(1).max(200),
  businessName: z.string().min(1).max(200),
  recordKind: z.enum(["inquiry", "quote"]),
  quoteUrl: z.string().nullable().optional(),
  quoteViewed: z.boolean().optional(),
  aiTone: z.enum(["balanced", "warm", "direct", "formal"]).optional(),
});

export async function POST(request: Request) {
  const ownerAccess = await getWorkspaceBusinessActionContext();

  if (!ownerAccess.ok) {
    return NextResponse.json({ error: ownerAccess.error }, { status: 401 });
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 },
    );
  }

  const {
    followUpTitle,
    followUpReason,
    channel,
    customerName,
    businessName,
    recordKind,
    quoteUrl,
    quoteViewed,
    aiTone = "balanced",
  } = parsed.data;

  const toneInstruction = {
    balanced: "Use a professional, friendly tone.",
    warm: "Use a warm, empathetic, approachable tone.",
    direct: "Use a concise, direct, no-fluff tone.",
    formal: "Use a formal, polished business tone.",
  }[aiTone];

  const prompt = `Write a short follow-up message (2-3 sentences max) for a ${channel} message to ${customerName}.

Context:
- Business: ${businessName}
- Follow-up title: ${followUpTitle}
- Reason: ${followUpReason}
- Record type: ${recordKind}${quoteUrl ? `\n- Quote link: ${quoteUrl}` : ""}${quoteViewed ? "\n- The customer has already viewed the quote." : ""}

Rules:
- ${toneInstruction}
- Keep it under 280 characters if the channel is SMS, WhatsApp, or Messenger.
- Don't include a subject line — just the message body.
- Use the customer's first name naturally.
- End with a simple call to action (reply, let us know, etc).
- Do NOT use placeholders like [Name] — use the actual name provided.

Write only the message, nothing else.`;

  try {
    const result = await generateWithFallback({
      messages: [
        { role: "system", content: "You are a helpful business assistant that writes follow-up messages." },
        { role: "user", content: prompt },
      ],
      model: "",
      temperature: 0.7,
      maxOutputTokens: 300,
      qualityTier: "cheap",
    });

    return NextResponse.json({
      message: result.text.trim(),
      model: result.model,
      provider: result.provider,
    });
  } catch (error) {
    console.error("[follow-up-suggest] AI generation failed", error);

    return NextResponse.json(
      { error: "Could not generate a message right now." },
      { status: 503 },
    );
  }
}
