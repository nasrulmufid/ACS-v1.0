import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getGenieConfig() {
  const baseUrl = process.env.GENIEACS_BASE_URL || "http://192.168.0.238:7557";
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

function pickVlanKeyFromVendor(deviceRaw: any, vendor: string, customKey?: string) {
  if (vendor === 'custom' && customKey) return customKey;
  const candidatesByVendor: Record<string, string[]> = {
    auto: [
      'X_CMCC_VLANIDMark', 'X_HW_VLANID', 'X_HW_VLANIDMark', 'X_ZTE-COM_VLANID',
      'X_FH_VLANID', 'X_CT-COM_VLANID', 'X_CU_VLANID', 'VLANID', 'VLANIDMark'
    ],
    cmcc: ['X_CMCC_VLANIDMark'],
    huawei: ['X_HW_VLANID', 'X_HW_VLANIDMark'],
    zte: ['X_ZTE-COM_VLANID'],
    ct: ['X_CT-COM_VLANID'],
    cu: ['X_CU_VLANID'],
  };
  const list = candidatesByVendor[vendor as keyof typeof candidatesByVendor] || candidatesByVendor.auto;

  // Try detect from WANPPPConnection.1 keys
  const ppp1 = deviceRaw?.InternetGatewayDevice?.WANDevice?.["1"]?.WANConnectionDevice?.["1"]?.WANPPPConnection;
  if (ppp1 && typeof ppp1 === 'object') {
    const sample = ppp1?.["1"] || Object.values(ppp1)[0];
    if (sample && typeof sample === 'object') {
      for (const k of list) if (k in sample) return k;
    }
  }
  return list[0];
}

function buildServiceListKeyFromVendor(vendor: string) {
  const map: Record<string, string[]> = {
    auto: ['X_CMCC_ServiceList', 'X_HW_ServiceList', 'X_ZTE-COM_ServiceList', 'ServiceList'],
    cmcc: ['X_CMCC_ServiceList'],
    huawei: ['X_HW_ServiceList'],
    zte: ['X_ZTE-COM_ServiceList'],
    ct: ['ServiceList'],
    cu: ['ServiceList'],
  };
  return (map[vendor] || map.auto)[0];
}

// POST /api/devices/[id]/wan
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = await req.json().catch(() => ({}));

  // If client sends raw GenieACS task, just forward it
  if (payload?.name) {
    const { status, data } = await upstream(
      "POST",
      `/devices/${encodeURIComponent(id)}/tasks?connection_request`,
      payload
    );
    return NextResponse.json(data, { status });
  }

  // Our guided flow: addObject -> refreshObject -> compute last instance -> setParameterValues
  const username = String(payload?.username || '').trim();
  const password = String(payload?.password || '').trim();
  const vlanId = Number.isFinite(Number(payload?.vlanId)) ? Number(payload.vlanId) : undefined;
  const serviceList = String(payload?.serviceList || 'INTERNET');
  const vendor = String(payload?.vendor || 'auto');
  const customVlanKey = payload?.customVlanKey as string | undefined;

  if (!username || !password) {
    return NextResponse.json({ error: { message: 'username/password required' } }, { status: 400 });
  }

  // 1) addObject
  await upstream("POST", `/devices/${encodeURIComponent(id)}/tasks?connection_request`, {
    name: "addObject",
    objectName: "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection",
  });

  // 2) refreshObject (ensure latest structure)
  await upstream("POST", `/devices/${encodeURIComponent(id)}/tasks?connection_request`, {
    name: "refreshObject",
    objectName: "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection",
  });

  // 3) fetch device and detect last PPP instance index
  const deviceArr = await getDeviceObject(id);
  const deviceRaw = Array.isArray(deviceArr) ? deviceArr[0] : null;
  const pppObj = deviceRaw?.InternetGatewayDevice?.WANDevice?.["1"]?.WANConnectionDevice?.["1"]?.WANPPPConnection || {};
  const indices = Object.keys(pppObj)
    .map(k => Number(k))
    .filter(n => Number.isFinite(n))
    .sort((a, b) => a - b);
  const lastIndex = indices.length ? indices[indices.length - 1] : 1;

  const vlanKey = pickVlanKeyFromVendor(deviceRaw, vendor, customVlanKey);
  const serviceListKey = buildServiceListKeyFromVendor(vendor);

  const parameterValues: any[] = [
    [
      `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.${lastIndex}.ConnectionType`,
      "PPPoE_Routed",
      "xsd:string",
    ],
    [
      `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.${lastIndex}.Username`,
      username,
      "xsd:string",
    ],
    [
      `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.${lastIndex}.Password`,
      password,
      "xsd:string",
    ],
    [
      `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.${lastIndex}.${serviceListKey}`,
      serviceList,
      "xsd:string",
    ],
    [
      `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.${lastIndex}.${vlanKey}`,
      vlanId ?? 0,
      "xsd:unsignedInt",
    ],
    [
      `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.${lastIndex}.Enable`,
      true,
      "xsd:boolean",
    ],
  ];

  const { status, data } = await upstream(
    "POST",
    `/devices/${encodeURIComponent(id)}/tasks?connection_request`,
    { name: "setParameterValues", parameterValues }
  );

  // 4) optional: refresh again
  await upstream("POST", `/devices/${encodeURIComponent(id)}/tasks?connection_request`, {
    name: "refreshObject",
    objectName: "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection",
  });

  return NextResponse.json(data, { status });
}

// PUT /api/devices/[id]/wan -> tetap dukung payload langsung
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = await req.json().catch(() => ({}));
  const { status, data } = await upstream(
    "POST",
    `/devices/${encodeURIComponent(id)}/tasks?connection_request`,
    payload
  );
  return NextResponse.json(data, { status });
}

// PATCH /api/devices/[id]/wan -> edit/update WANPPPConnection yang sudah ada
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = await req.json().catch(() => ({} as any));

  // Opsional: refresh untuk memastikan struktur terbaru sebelum edit
  await upstream("POST", `/devices/${encodeURIComponent(id)}/tasks?connection_request`, {
    name: "refreshObject",
    objectName: "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection",
  });

  // Ambil device untuk menentukan index target (bisa dari payload.index, kalau tidak ada pakai index terakhir)
  const deviceArr = await getDeviceObject(id);
  const deviceRaw = Array.isArray(deviceArr) ? deviceArr[0] : null;
  const pppObj = deviceRaw?.InternetGatewayDevice?.WANDevice?.["1"]?.WANConnectionDevice?.["1"]?.WANPPPConnection || {};
  const indices = Object.keys(pppObj)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const lastIndex = indices.length ? indices[indices.length - 1] : 1;
  const targetIndex = Number.isFinite(Number(payload?.index)) ? Number(payload.index) : lastIndex;

  // Siapkan kunci berdasarkan vendor
  const vendor = String(payload?.vendor || 'auto');
  const customVlanKey = payload?.customVlanKey as string | undefined;
  const vlanKey = pickVlanKeyFromVendor(deviceRaw, vendor, customVlanKey);
  const serviceListKey = buildServiceListKeyFromVendor(vendor);

  // Kumpulkan parameter yang ingin diupdate (hanya field yang dikirim saja)
  const parameterValues: any[] = [];

  if (typeof payload?.connectionType === 'string' && payload.connectionType.trim()) {
    parameterValues.push([
      `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.${targetIndex}.ConnectionType`,
      String(payload.connectionType),
      "xsd:string",
    ]);
  }

  if (typeof payload?.username === 'string') {
    parameterValues.push([
      `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.${targetIndex}.Username`,
      String(payload.username),
      "xsd:string",
    ]);
  }

  if (typeof payload?.password === 'string') {
    parameterValues.push([
      `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.${targetIndex}.Password`,
      String(payload.password),
      "xsd:string",
    ]);
  }

  if (typeof payload?.serviceList === 'string') {
    parameterValues.push([
      `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.${targetIndex}.${serviceListKey}`,
      String(payload.serviceList),
      "xsd:string",
    ]);
  }

  if (payload?.vlanId !== undefined) {
    const vlanIdNum = Number(payload.vlanId);
    if (!Number.isFinite(vlanIdNum)) {
      return NextResponse.json({ error: { message: 'vlanId must be a number' } }, { status: 400 });
    }
    parameterValues.push([
      `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.${targetIndex}.${vlanKey}`,
      vlanIdNum,
      "xsd:unsignedInt",
    ]);
  }

  if (payload?.enable !== undefined) {
    parameterValues.push([
      `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.${targetIndex}.Enable`,
      Boolean(payload.enable),
      "xsd:boolean",
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

  // Opsional: refresh lagi setelah perubahan
  await upstream("POST", `/devices/${encodeURIComponent(id)}/tasks?connection_request`, {
    name: "refreshObject",
    objectName: "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection",
  });

  return NextResponse.json(data, { status });
}