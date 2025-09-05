import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getGenieConfig() {
  const baseUrl = process.env.GENIEACS_BASE_URL || "http://localhost:7557";
  const username = process.env.GENIEACS_USERNAME || "";
  const password = process.env.GENIEACS_PASSWORD || "";
  const timeoutMs = Number(process.env.GENIEACS_TIMEOUT_MS ?? 15000);
  const auth = username && password ? Buffer.from(`${username}:${password}`).toString("base64") : undefined;
  return { baseUrl, auth, timeoutMs };
}

async function upstream(method: string, path: string, body?: any) {
  const { baseUrl, auth, timeoutMs } = getGenieConfig();
  const url = new URL(path, baseUrl);

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        Accept: "application/json",
        ...(auth ? { Authorization: `Basic ${auth}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    return { status: res.status, data };
  } finally {
    clearTimeout(to);
  }
}

async function getDeviceObject(id: string) {
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
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(to);
  }
}

// PATCH /api/devices/[id]/wifi -> update SSID dan/atau password WiFi
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = await req.json().catch(() => ({} as any));

  const newSsid = typeof payload?.ssid === 'string' ? payload.ssid.trim() : undefined;
  const newPassword = typeof payload?.password === 'string' ? payload.password : undefined;

  if (!newSsid && !newPassword) {
    return NextResponse.json({ error: { message: 'No SSID/password provided' } }, { status: 400 });
  }

  // Refresh WLANConfiguration untuk memastikan struktur
  await upstream("POST", `/devices/${encodeURIComponent(id)}/tasks?connection_request`, {
    name: "refreshObject",
    objectName: "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1",
  });

  // Dapatkan device untuk verifikasi kalau diperlukan
  await getDeviceObject(id).catch(() => null);

  const parameterValues: any[] = [];
  if (newSsid !== undefined) {
    parameterValues.push([
      `InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID`,
      newSsid,
      "xsd:string",
    ]);
  }
  if (newPassword !== undefined) {
    // Banyak perangkat memakai PreSharedKey.1.PreSharedKey/KeyPassphrase
    // Coba set kedua-duanya agar kompatibel
    parameterValues.push([
      `InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.PreSharedKey`,
      newPassword,
      "xsd:string",
    ]);
    parameterValues.push([
      `InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase`,
      newPassword,
      "xsd:string",
    ]);
  }

  if (!parameterValues.length) {
    return NextResponse.json({ error: { message: 'No updatable fields provided' } }, { status: 400 });
  }

  const { status, data } = await upstream(
    "POST",
    `/devices/${encodeURIComponent(id)}/tasks?connection_request`,
    { name: "setParameterValues", parameterValues }
  );

  // Optional: refresh lagi sesudah perubahan
  await upstream("POST", `/devices/${encodeURIComponent(id)}/tasks?connection_request`, {
    name: "refreshObject",
    objectName: "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1",
  });

  return NextResponse.json(data, { status });
}