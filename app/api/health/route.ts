import { route } from "@/lib/api";

export const GET = route(() => ({ ok: true, time: new Date().toISOString() }));
