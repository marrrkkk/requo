import { NextResponse } from "next/server";

const markdownContent = `# Requo

Requo is a SaaS platform tailored for owner-led service businesses. It streamlines the entire workflow from inquiry to quote, and finally to follow-up.

## Capabilities

- **Inquiries**: Capture and qualify leads seamlessly.
- **Quotes**: Turn inquiries into professional quotes, share them, and track their viewed, accepted, rejected, expired, and voided states.
- **Follow-ups**: Consistently follow up on pending quotes.
- **AI Assistant**: Knowledge base integration to assist with drafting responses and quotes.

## Agent Discoverability

- API Catalog: \`/.well-known/api-catalog\`
- OAuth Configuration: \`/.well-known/openid-configuration\`
- MCP Server Card: \`/.well-known/mcp/server-card.json\`
- Agent Skills: \`/.well-known/agent-skills/index.json\`
`;

export async function GET() {
  const headers = new Headers();
  headers.set("Content-Type", "text/markdown");
  headers.set("x-markdown-tokens", "110"); // Approximate token count

  return new NextResponse(markdownContent, {
    status: 200,
    headers,
  });
}
