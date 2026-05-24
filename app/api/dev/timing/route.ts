import { NextResponse } from "next/server";

/**
 * Dev-only route that returns server performance metrics.
 * Blocked in production.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Dev-only endpoint" },
      { status: 403 },
    );
  }

  const memoryUsage = process.memoryUsage();

  return NextResponse.json({
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    },
    uptime: Math.round(process.uptime()),
    nodeVersion: process.version,
    pid: process.pid,
  });
}
