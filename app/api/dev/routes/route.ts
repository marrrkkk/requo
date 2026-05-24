import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join, relative } from "path";

/**
 * Dev-only route that scans the app directory and returns route structure.
 * Blocked in production.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Dev-only endpoint" },
      { status: 403 },
    );
  }

  const appDir = join(process.cwd(), "app");
  const routes = await scanRoutes(appDir, appDir);

  return NextResponse.json({ routes });
}

type RouteInfo = {
  path: string;
  segment: string;
  hasPage: boolean;
  hasLayout: boolean;
  hasLoading: boolean;
  hasError: boolean;
  hasNotFound: boolean;
  isRouteGroup: boolean;
  isDynamic: boolean;
  isParallel: boolean;
  isIntercepting: boolean;
  isApiRoute: boolean;
};

async function scanRoutes(
  dir: string,
  appDir: string,
): Promise<RouteInfo[]> {
  const routes: RouteInfo[] = [];

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return routes;
  }

  const relPath = relative(appDir, dir);
  const segment = relPath || "/";

  // Check for route files
  const fileNames = entries
    .filter((e) => e.isFile())
    .map((e) => e.name);

  const hasPage =
    fileNames.some((f) => f.startsWith("page.")) ||
    fileNames.some((f) => f.startsWith("route."));
  const hasLayout = fileNames.some((f) => f.startsWith("layout."));
  const hasLoading = fileNames.some((f) => f.startsWith("loading."));
  const hasError = fileNames.some((f) => f.startsWith("error."));
  const hasNotFound = fileNames.some((f) => f.startsWith("not-found."));
  const isApiRoute = relPath.startsWith("api");

  const dirName = dir.split(/[/\\]/).pop() ?? "";
  const isRouteGroup = dirName.startsWith("(") && dirName.endsWith(")");
  const isDynamic = dirName.startsWith("[") && dirName.endsWith("]");
  const isParallel = dirName.startsWith("@");
  const isIntercepting = dirName.startsWith("(.)") || dirName.startsWith("(..)");

  if (hasPage || hasLayout || hasLoading || hasError) {
    routes.push({
      path: "/" + relPath.replace(/\\/g, "/"),
      segment,
      hasPage,
      hasLayout,
      hasLoading,
      hasError,
      hasNotFound,
      isRouteGroup,
      isDynamic,
      isParallel,
      isIntercepting,
      isApiRoute,
    });
  }

  // Recurse into subdirectories
  const dirs = entries.filter(
    (e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules",
  );

  for (const d of dirs) {
    const subRoutes = await scanRoutes(join(dir, d.name), appDir);
    routes.push(...subRoutes);
  }

  return routes;
}
