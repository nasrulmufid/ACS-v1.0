import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getGenieConfig() {
  const baseUrl = process.env.GENIEACS_BASE_URL || "";
  const username = process.env.GENIEACS_USERNAME || "";
  const password = process.env.GENIEACS_PASSWORD || "";
  const timeoutMs = Number(process.env.GENIEACS_TIMEOUT_MS ?? 10000);
  const auth = username && password ? Buffer.from(`${username}:${password}`).toString("base64") : undefined;
  return { baseUrl, auth, timeoutMs };
}

async function proxyToGenie(path: string, searchParams?: URLSearchParams) {
  const { baseUrl, auth, timeoutMs } = getGenieConfig();
  const url = new URL(path, baseUrl);
  if (searchParams) {
    searchParams.forEach((v, k) => url.searchParams.set(k, v));
  }

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(auth ? { Authorization: `Basic ${auth}` } : {}),
      },
      signal: controller.signal,
    });

    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    return NextResponse.json(body, { status: res.status });
  } catch (err: any) {
    const status = err?.name === "AbortError" ? 504 : 502;
    return NextResponse.json(
      { error: { message: "Upstream request failed", detail: String(err?.message || err) } },
      { status }
    );
  } finally {
    clearTimeout(to);
  }
}

// GET /api/devices -> proxy ke GET {BASE}/devices
// Mendukung query yang sama, contoh: /api/devices?query=%7B%22_id%22%3A%22SN...%22%7D
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  return proxyToGenie("/devices", searchParams);
}