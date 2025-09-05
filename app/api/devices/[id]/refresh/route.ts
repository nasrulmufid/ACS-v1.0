import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getGenieConfig() {
  const baseUrl = process.env.GENIEACS_BASE_URL || "http://192.168.0.238:7557";
  const username = process.env.GENIEACS_USERNAME || "";
  const password = process.env.GENIEACS_PASSWORD || "";
  const timeoutMs = Number(process.env.GENIEACS_TIMEOUT_MS ?? 10000);
  const auth = username && password ? Buffer.from(`${username}:${password}`).toString("base64") : undefined;
  return { baseUrl, auth, timeoutMs };
}

async function sendTask(deviceId: string, taskName: string, taskData?: any) {
  const { baseUrl, auth, timeoutMs } = getGenieConfig();
  const url = new URL(`/devices/${encodeURIComponent(deviceId)}/tasks`, baseUrl);

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(auth ? { Authorization: `Basic ${auth}` } : {}),
      },
      body: JSON.stringify({
        name: taskName,
        ...taskData,
      }),
      signal: controller.signal,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    return { success: res.ok, status: res.status, data };
  } catch (err: any) {
    const status = err?.name === "AbortError" ? 504 : 502;
    return { 
      success: false, 
      status, 
      error: { message: "Upstream request failed", detail: String(err?.message || err) } 
    };
  } finally {
    clearTimeout(to);
  }
}

// POST /api/devices/[id]/refresh
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { type } = body;

    if (!type || !['device', 'wan', 'wifi'].includes(type)) {
      return NextResponse.json(
        { error: { message: "Invalid refresh type. Must be 'device', 'wan', or 'wifi'" } },
        { status: 400 }
      );
    }

    let taskResult;

    switch (type) {
      case 'device':
        // Refresh informasi dasar perangkat
        taskResult = await sendTask(id, "refreshObject", {
          objectName: "InternetGatewayDevice.DeviceInfo"
        });
        break;

      case 'wan':
        // Refresh informasi WAN/PPPoE
        taskResult = await sendTask(id, "refreshObject", {
          objectName: "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection"
        });
        break;

      case 'wifi':
        // Refresh informasi WiFi
        taskResult = await sendTask(id, "refreshObject", {
          objectName: "InternetGatewayDevice.LANDevice.*.WLANConfiguration"
        });
        break;

      default:
        return NextResponse.json(
          { error: { message: "Unknown refresh type" } },
          { status: 400 }
        );
    }

    if (!taskResult.success) {
      return NextResponse.json(
        { error: taskResult.error || { message: "Failed to send refresh task" } },
        { status: taskResult.status }
      );
    }

    // Juga trigger refresh untuk Virtual Parameters jika diperlukan
    if (type === 'device') {
      await sendTask(id, "refreshObject", {
        objectName: "VirtualParameters"
      });
    }

    return NextResponse.json({
      success: true,
      message: `${type.toUpperCase()} refresh task sent successfully`,
      taskId: taskResult.data?.taskId
    });

  } catch (error: any) {
    console.error("Refresh API error:", error);
    return NextResponse.json(
      { error: { message: "Internal server error", detail: error.message } },
      { status: 500 }
    );
  }
}