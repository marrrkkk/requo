import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth/server";

export const preferredRegion = "syd1";

export const { GET, POST } = toNextJsHandler(auth);
