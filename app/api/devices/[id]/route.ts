import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getGenieConfig() {
  const baseUrl = process.env.GENIEACS_BASE_URL || "http://localhost:7557";
  const username = process.env.GENIEACS_USERNAME || "";
  const password = process.env.GENIEACS_PASSWORD || "";
  const timeoutMs = Number(process.env.GENIEACS_TIMEOUT_MS ?? 10000);
  const auth = username && password ? Buffer.from(`${username}:${password}`).toString("base64") : undefined;
  return { baseUrl, auth, timeoutMs };
}

async function forward(method: string, path: string, body?: any) {
  const { baseUrl, auth, timeoutMs } = getGenieConfig();
  const url = new URL(path, baseUrl);

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      method,
      headers: {
        "Content-Type": body ? "application/json" : (undefined as any),
        Accept: "application/json",
        ...(auth ? { Authorization: `Basic ${auth}` } : {}),
      } as any,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    return NextResponse.json(data, { status: res.status });
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

// GET /api/devices/[id] -> proxy ke /devices?query={"_id":"<id>"}
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { baseUrl, auth, timeoutMs } = getGenieConfig();
  const url = new URL("/devices", baseUrl);
  url.searchParams.set("query", JSON.stringify({ _id: id }));

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
    const data = text ? JSON.parse(text) : null;
    return NextResponse.json(data, { status: res.status });
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

// DELETE /api/devices/[id] -> proxy ke DELETE /devices/<id>
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return forward("DELETE", `/devices/${encodeURIComponent(id)}`);
}