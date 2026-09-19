import { handleBackend } from "@/lib/backend/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(req: Request, context: { params: Promise<{ path: string[] }> }) {
  return handleBackend(req, (await context.params).path);
}
export { handle as GET, handle as POST };
