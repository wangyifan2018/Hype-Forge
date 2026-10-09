import { NextResponse } from "next/server";
import { z } from "zod";
import { probeLink } from "@/lib/forge/link-safety";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  url: z.string().min(1).max(2048),
});

/**
 * 好物链接可达性探测。
 * 浏览器直连会被 CORS 挡住，因此由服务端代探；内部含 SSRF 防护
 * （仅公网 http/https、禁内网、限重定向与超时），详见 lib/forge/link-safety.ts。
 */
export async function POST(request: Request) {
  try {
    const { url } = bodySchema.parse(await request.json());
    const result = await probeLink(url);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "链接检查失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
