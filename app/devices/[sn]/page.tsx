"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "../../components/Button";
import IconButton from "../../components/IconButton";
import StatusBadge from "../../components/StatusBadge";
import Th from "../../components/Th";
import Td from "../../components/Td";
import {
  Pencil2Icon,
  TrashIcon,
  PlusCircledIcon,
  LockClosedIcon,
  Crosshair2Icon,
  ArrowLeftIcon,
} from "@radix-ui/react-icons";
import * as RDialog from "@radix-ui/react-dialog";

// Types
export type WifiInfo = {
  ssid: string;
  connected: number; // jumlah perangkat terhubung
  power: string; // radio power
};

export type WanInfo = {
  ipPppoe: string;
  usernamePpp: string;
  status: "connected" | "disconnected";
  vlanId?: number | string;
};

export type DeviceDetail = {
  status: "online" | "offline";
  serialNumber: string;
  productClass: string;
  manufacture: string;
  rxPower: string; // e.g., "-20.1 dBm" or "N/A"
  wan: WanInfo;
  wifi: WifiInfo;
  clients: Array<{
    hostname: string;
    ip: string;
    mac: string;
  }>;
};

// Mock list (bisa diganti ke fetch API nantinya)
const MOCK_DEVICES: Record<string, DeviceDetail> = {
  "SN-ABC-123456": {
    status: "online",
    serialNumber: "SN-ABC-123456",
    productClass: "HG8245X6",
    manufacture: "Huawei",
    rxPower: "-19.4 dBm",
    wan: { ipPppoe: "100.64.10.21", usernamePpp: "cpe001@isp", status: "connected", vlanId: 100 },
    wifi: { ssid: "HomeNet-001", connected: 7, power: "20 dBm" },
    clients: [
      { hostname: "Laptop-Work", ip: "192.168.1.10", mac: "AC:DE:48:00:11:22" },
      { hostname: "iPhone-Rudi", ip: "192.168.1.15", mac: "80:EA:CA:12:34:56" },
      { hostname: "TV-Ruang", ip: "192.168.1.30", mac: "F0:9F:C2:AA:BB:CC" },
    ],
  },
  "SN-XYZ-654321": {
    status: "offline",
    serialNumber: "SN-XYZ-654321",
    productClass: "ZTE-F660",
    manufacture: "ZTE",
    rxPower: "N/A",
    wan: { ipPppoe: "100.64.12.40", usernamePpp: "cpe040@isp", status: "disconnected", vlanId: 200 },
    wifi: { ssid: "Rumah-040", connected: 0, power: "18 dBm" },
    clients: [],
  },
};

// Baca VLAN ID dari path PPPoE dengan fallback vendor-specific
function readVlanIdFromPPP(raw: any): number | string | undefined {
  try {
    const ppp = raw?.InternetGatewayDevice?.WANDevice?.["1"]?.WANConnectionDevice?.["1"]?.WANPPPConnection?.["1"];
    if (!ppp || typeof ppp !== 'object') return undefined;

    // Kandidat umum dari beberapa vendor
    const candidates = [
      'X_CMCC_VLANIDMark',
      'X_HW_VLANID',
      'X_HW_VLANIDMark',
      'X_ZTE-COM_VLANID',
      'X_FH_VLANID',
      'X_CT-COM_VLANID',
      'X_CU_VLANID',
      'VLANID',
      'VLANIDMark',
    ];

    for (const key of candidates) {
      const v = (ppp as any)?.[key]?._value ?? (ppp as any)?.[key];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return v;
      }
    }

    // Fallback: scan key yang mengandung "VLAN"
    for (const [k, obj] of Object.entries(ppp)) {
      if (/vlan/i.test(k)) {
        const v = (obj as any)?._value ?? (obj as any);
        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
      }
    }
  } catch {}
  return undefined;
}

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sn = (params?.sn as string) ?? "";

  const [detail, setDetail] = useState<DeviceDetail | null>(null);

  useEffect(() => {
    let aborted = false;
    async function load() {
      setDetail(null);
      try {
        const res = await fetch(`/api/devices/${encodeURIComponent(sn)}`, { cache: 'no-store' });
        const json = await res.json();
        const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        const raw = list?.[0] ?? null; // GenieACS query by _id returns array
        if (!raw) { if (!aborted) setDetail(null); return; }
        const now = Date.now();
        const lastInform = raw?._lastInform ? new Date(raw._lastInform).getTime() : 0;
        const online = lastInform ? (now - lastInform) < 10 * 60 * 1000 : false;

        const vp = raw?.VirtualParameters ?? raw?.virtualParameters ?? {};
        const getVP = (k: string) => vp?.[k]?._value ?? undefined;

        const rx = getVP('RXPower');
        const rxPower = typeof rx === 'string' && rx.trim() !== '' ? `${rx}` : 'N/A';
        const connected = Number(getVP('activedevices') ?? 0);
        const pppUser = getVP('pppoeUsername') ?? getVP('pppoeUsername2') ?? '-';
        const ipPppoe = getVP('pppoeIP') ?? '-';

        // Ambil VLAN ID dari PPPoE sesuai path yang diminta
        const vlanId = readVlanIdFromPPP(raw);

        const mapped: DeviceDetail = {
          status: online ? 'online' : 'offline',
          serialNumber: raw?._id ?? raw?._deviceId?._SerialNumber ?? sn,
          productClass: raw?._deviceId?._ProductClass ?? raw?.productClass ?? '-',
          manufacture: raw?._deviceId?._Manufacturer ?? raw?.manufacturer ?? '-',
          rxPower,
          wan: {
            ipPppoe: ipPppoe,
            usernamePpp: pppUser,
            status: online ? 'connected' : 'disconnected',
            vlanId: vlanId ?? undefined,
          },
          wifi: {
            ssid: ((): string => {
              const v = raw?.InternetGatewayDevice?.LANDevice?.["1"]?.WLANConfiguration?.["1"]?.SSID?._value;
              return (typeof v === 'string' && v.trim() !== '') ? v : '-';
            })(),
            connected: Number.isFinite(connected) ? connected : 0,
            power: ((): string => {
              const tp = raw?.InternetGatewayDevice?.LANDevice?.["1"]?.WLANConfiguration?.["1"]?.TransmitPower?._value;
              if (tp === undefined || tp === null) return '-';
              const s = String(tp).trim();
              if (s === '') return '-';
              return s.endsWith('%') ? s : `${s}%`;
            })(),
          },
          clients: (() => {
            const hostsObj = raw?.InternetGatewayDevice?.LANDevice?.["1"]?.Hosts?.Host;
            const hostsArr: any[] = hostsObj && typeof hostsObj === 'object' ? Object.values(hostsObj) : [];
            return hostsArr.map((h: any) => ({
              hostname: h?.HostName?._value ?? '-',
              ip: h?.IPAddress?._value ?? '-',
              mac: h?.MACAddress?._value ?? '-',
            }));
          })(),
        };
        if (!aborted) setDetail(mapped);
      } catch (e) {
        if (!aborted) setDetail(null);
      }
    }
    if (sn) load();
    return () => { aborted = true; };
  }, [sn]);

  const badgeWanStatus: { label: string; color: string } = useMemo(() => {
    if (!detail) return { label: "-", color: "border-foreground/20 text-foreground/60" };
    return detail.wan.status === "connected"
      ? {
          label: "Connected",
          color:
            "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
        }
      : {
          label: "Disconnected",
          color:
            "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10",
        };
  }, [detail]);

  // UI state untuk modal Add WAN
  const [showAddWan, setShowAddWan] = useState(false);
  const [wanUsername, setWanUsername] = useState("");
  const [wanPassword, setWanPassword] = useState("");
  const [wanVlanId, setWanVlanId] = useState<string | number>("");
  const [wanServiceList, setWanServiceList] = useState("INTERNET");
  const [wanVendor, setWanVendor] = useState("auto"); // auto | cmcc | huawei | zte | ct | cu | custom
  const [wanCustomVlanKey, setWanCustomVlanKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // UI state untuk modal Delete WAN
  const [showDeleteWan, setShowDeleteWan] = useState(false);

  // UI state untuk modal Edit WAN
  const [showEditWan, setShowEditWan] = useState(false);
  const [editIndexOptions, setEditIndexOptions] = useState<number[]>([]);
  const [editIndex, setEditIndex] = useState<number | "">("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editVlanId, setEditVlanId] = useState<string | number>("");
  const [editServiceList, setEditServiceList] = useState("INTERNET");
  const [editVendor, setEditVendor] = useState("auto");
  const [editCustomVlanKey, setEditCustomVlanKey] = useState("");
  const [editEnable, setEditEnable] = useState<boolean | "">("");
  const [editConnectionType, setEditConnectionType] = useState<string>("");

  // Handlers
  const handleOpenEditWan = async () => {
    if (!sn) return;
    // Prefill dari detail yang ada
    setEditUsername(detail?.wan.usernamePpp || "");
    setEditPassword("");
    setEditVlanId(detail?.wan.vlanId ?? "");
    setEditServiceList("INTERNET");
    setEditVendor("auto");
    setEditCustomVlanKey("");
    setEditEnable("");
    setEditConnectionType("");

    // Ambil daftar index PPP dari device untuk pilihan instance
    try {
      const res = await fetch(`/api/devices/${encodeURIComponent(sn)}`, { cache: 'no-store' });
      const json = await res.json();
      const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      const raw = list?.[0] ?? null;
      const pppObj = raw?.InternetGatewayDevice?.WANDevice?.["1"]?.WANConnectionDevice?.["1"]?.WANPPPConnection || {};
      const indices = Object.keys(pppObj)
        .map((k) => Number(k))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);
      setEditIndexOptions(indices);
      setEditIndex(indices.length ? indices[indices.length - 1] : 1);
    } catch (e) {
      setEditIndexOptions([1]);
      setEditIndex(1);
    }

    setShowEditWan(true);
  };

  const handleSubmitEditWan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sn) return;
    setSubmitting(true);
    try {
      const payload: any = { index: editIndex, vendor: editVendor };
      if (editUsername !== "") payload.username = editUsername;
      if (editPassword !== "") payload.password = editPassword;
      if (editVlanId !== "") payload.vlanId = Number(editVlanId);
      if (editServiceList !== "") payload.serviceList = editServiceList;
      if (editCustomVlanKey) payload.customVlanKey = editCustomVlanKey;
      if (editEnable !== "") payload.enable = Boolean(editEnable);
      if (editConnectionType.trim() !== "") payload.connectionType = editConnectionType.trim();

      const res = await fetch(`/api/devices/${encodeURIComponent(sn)}/wan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      setShowEditWan(false);
      location.reload();
    } catch (e) {
      console.error(e);
      alert('Gagal mengubah WAN');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWan = () => {
    setShowDeleteWan(true);
  };
  const handleAddWan = () => {
    setWanUsername("");
    setWanPassword("");
    setWanVlanId("");
    setWanServiceList("INTERNET");
    setWanVendor("auto");
    setWanCustomVlanKey("");
    setShowAddWan(true);
  };
  const handleSubmitAddWan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sn) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/devices/${encodeURIComponent(sn)}/wan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addWan',
          username: wanUsername,
          password: wanPassword,
          vlanId: wanVlanId === '' ? undefined : Number(wanVlanId),
          serviceList: wanServiceList,
          vendor: wanVendor, // auto detect or selected
          customVlanKey: wanCustomVlanKey || undefined,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setShowAddWan(false);
      // Optional: reload detail to reflect changes
      location.reload();
    } catch (e) {
      console.error(e);
      alert('Gagal menambahkan WAN');
    } finally {
      setSubmitting(false);
    }
  };
  const [showEditWifi, setShowEditWifi] = useState(false);
  const [editSsid, setEditSsid] = useState("");
  const [editWifiPassword, setEditWifiPassword] = useState("");
  const [wifiSubmitting, setWifiSubmitting] = useState(false);

  const handleEditSsid = () => {
    if (!detail) return;
    setEditSsid(detail.wifi.ssid || "");
    setEditWifiPassword("");
    setShowEditWifi(true);
  };
  const handleEditPassword = () => {
    handleEditSsid(); // Open the same modal for editing password as well
  };

  const handleSubmitEditWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sn) return;
    setWifiSubmitting(true);
    try {
      const payload: any = {};
      if (editSsid.trim() !== "") payload.ssid = editSsid.trim();
      if (editWifiPassword.trim() !== "") payload.password = editWifiPassword;
      if (!("ssid" in payload) && !("password" in payload)) {
        setWifiSubmitting(false);
        return alert('Tidak ada perubahan yang dikirim.');
      }
      const res = await fetch(`/api/devices/${encodeURIComponent(sn)}/wifi`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      setShowEditWifi(false);
      location.reload();
    } catch (e) {
      console.error(e);
      alert('Gagal mengubah WiFi');
    } finally {
      setWifiSubmitting(false);
    }
  };

  if (!sn) {
    return (
      <div className="min-h-screen grid place-items-center text-foreground/70">
        Parameter serial number tidak ditemukan.
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen grid place-items-center text-foreground/70">
        <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                  Memuat data {sn}...
                </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/70 text-foreground">
      <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6">
        {/* Back */}
        <div>
          <Button variant="ghost" onClick={() => router.push("/")} className="text-sm">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Kembali ke daftar
          </Button>
        </div>

        {/* Title */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">Detail Perangkat</h1>
            <p className="text-xs sm:text-sm text-foreground/60 mt-1 break-all">SN: {detail.serialNumber}</p>
          </div>
          <div className="flex-shrink-0">
            <StatusBadge status={detail.status} />
          </div>
        </header>

        {/* Grid Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Card Informasi Perangkat */}
          <div className="rounded-2xl border bg-gradient-to-br from-emerald-500/20 to-emerald-500/0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-4 sm:p-5 lg:p-6 space-y-4">
            <h2 className="text-lg font-semibold">Informasi Perangkat</h2>
            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-foreground/10 pb-2 gap-1">
                <dt className="text-foreground/60 text-xs sm:text-sm">Serial Number</dt>
                <dd className="font-medium break-all text-sm">{detail.serialNumber}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-foreground/10 pb-2 gap-1">
                <dt className="text-foreground/60 text-xs sm:text-sm">Product Class</dt>
                <dd className="font-medium break-all text-sm">{detail.productClass}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-foreground/10 pb-2 gap-1">
                <dt className="text-foreground/60 text-xs sm:text-sm">Manufacture</dt>
                <dd className="font-medium break-all text-sm">{detail.manufacture}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <dt className="text-foreground/60 text-xs sm:text-sm">RX Power</dt>
                <dd className="font-medium text-sm">{detail.rxPower}dbm</dd>
              </div>
            </dl>
          </div>

          {/* Card Informasi WAN */}
          <div className="rounded-2xl border bg-gradient-to-br bg-background/60 from-indigo-500/20 to-indigo-500/0 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 p-4 sm:p-5 lg:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Informasi WAN</h2>
              <div className="flex items-center gap-1 sm:gap-2">
                <IconButton title="Edit WAN" onClick={handleOpenEditWan}>
                  <Pencil2Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                </IconButton>
                <IconButton title="Delete WAN" onClick={handleDeleteWan} intent="danger">
                  <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </IconButton>
                <IconButton title="Add WAN" onClick={handleAddWan} intent="warning">
                  <PlusCircledIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </IconButton>
              </div>
            </div>

            {/* Confirm Delete WAN */}
            <RDialog.Root open={showDeleteWan} onOpenChange={(o) => !o && setShowDeleteWan(false)}>
              <RDialog.Portal>
                <RDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
                <RDialog.Content className="fixed z-50 left-1/2 top-1/2 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-rose-500/30 bg-background p-3 sm:p-5 shadow-xl ring-1 ring-rose-500/30 focus:outline-none max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between gap-4">
                    <RDialog.Title className="text-base font-semibold text-rose-600 dark:text-rose-400">Hapus WAN</RDialog.Title>
                    <RDialog.Close asChild>
                      <button className="inline-grid place-items-center h-7 w-7 rounded-md border border-foreground/20 text-foreground hover:bg-foreground/[.06] flex-shrink-0">✕</button>
                    </RDialog.Close>
                  </div>

                  <p className="mt-3 text-sm text-foreground/70">Anda yakin ingin menghapus konfigurasi WAN perangkat ini?</p>

                  <div className="mt-6 flex flex-col sm:flex-row justify-end gap-2">
                    <RDialog.Close asChild>
                      <Button variant="ghost" className="w-full sm:w-auto">Batal</Button>
                    </RDialog.Close>
                    <RDialog.Close asChild>
                      <Button intent="danger" className="w-full sm:w-auto" onClick={async () => {
                        try {
                          const res = await fetch(`/api/devices/${encodeURIComponent(sn)}/wan`, { method: 'DELETE' });
                          if (!res.ok) throw new Error(String(res.status));
                          location.reload();
                        } catch (e) {
                          console.error(e);
                          alert('Gagal menghapus WAN');
                        }
                      }}>Hapus</Button>
                    </RDialog.Close>
                  </div>
                </RDialog.Content>
              </RDialog.Portal>
            </RDialog.Root>

            <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium w-max ${badgeWanStatus.color}`}>
              {badgeWanStatus.label}
            </span>

            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-foreground/10 pb-2 gap-1">
                <dt className="text-foreground/60 text-xs sm:text-sm">IP PPPOE</dt>
                <dd className="font-medium break-all text-sm">{detail.wan.ipPppoe}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-foreground/10 pb-2 gap-1">
                <dt className="text-foreground/60 text-xs sm:text-sm">Username PPP</dt>
                <dd className="font-medium break-all text-sm">{detail.wan.usernamePpp}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <dt className="text-foreground/60 text-xs sm:text-sm">Vlan ID</dt>
                <dd className="font-medium text-sm">{detail.wan.vlanId ?? "-"}</dd>
              </div>
            </dl>

            {/* Modal Add WAN */}
            <RDialog.Root open={showAddWan} onOpenChange={(o) => !o && setShowAddWan(false)}>
              <RDialog.Portal>
                <RDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
                <RDialog.Content className="fixed z-50 left-1/2 top-1/2 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-foreground/15 bg-background p-3 sm:p-5 shadow-xl focus:outline-none max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <RDialog.Title className="text-sm sm:text-base font-semibold">Tambah WAN (PPPoE)</RDialog.Title>
                    <RDialog.Close asChild>
                      <button className="inline-grid place-items-center h-7 w-7 rounded-md border border-foreground/20 text-foreground hover:bg-foreground/[.06] flex-shrink-0">✕</button>
                    </RDialog.Close>
                  </div>

                  <form onSubmit={handleSubmitAddWan} className="space-y-3">
                    <div>
                      <label className="block text-sm text-foreground/60 mb-1">Username</label>
                      <input
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                        value={wanUsername}
                        onChange={(e) => setWanUsername(e.target.value)}
                        placeholder="PPPoE username"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-foreground/60 mb-1">Password</label>
                      <input
                        type="password"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                        value={wanPassword}
                        onChange={(e) => setWanPassword(e.target.value)}
                        placeholder="PPPoE password"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-foreground/60 mb-1">VLAN ID</label>
                      <input
                        type="number"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                        value={wanVlanId}
                        onChange={(e) => setWanVlanId(e.target.value)}
                        placeholder="mis. 220"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-foreground/60 mb-1">Service List</label>
                      <input
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                        value={wanServiceList}
                        onChange={(e) => setWanServiceList(e.target.value)}
                        placeholder="INTERNET/IPTV/VOIP"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-foreground/60 mb-1">Vendor</label>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                        value={wanVendor}
                        onChange={(e) => setWanVendor(e.target.value)}
                      >
                        <option value="auto">Auto detect</option>
                        <option value="cmcc">CMCC</option>
                        <option value="huawei">Huawei</option>
                        <option value="zte">ZTE</option>
                        <option value="ct">CT-COM</option>
                        <option value="cu">CU</option>
                        <option value="custom">Custom key</option>
                      </select>
                    </div>

                    {wanVendor === 'custom' && (
                      <div>
                        <label className="block text-sm text-foreground/60 mb-1">Custom VLAN Key</label>
                        <input
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                          value={wanCustomVlanKey}
                          onChange={(e) => setWanCustomVlanKey(e.target.value)}
                          placeholder="mis. X_CMCC_VLANIDMark"
                          required
                        />
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
                      <RDialog.Close asChild>
                        <Button type="button" variant="ghost" className="w-full sm:w-auto">Batal</Button>
                      </RDialog.Close>
                      <Button type="submit" intent="warning" disabled={submitting} className="w-full sm:w-auto">{submitting ? 'Menyimpan...' : 'Simpan'}</Button>
                    </div>
                  </form>
                </RDialog.Content>
              </RDialog.Portal>
            </RDialog.Root>

            {/* Modal Edit WAN */}
            <RDialog.Root open={showEditWan} onOpenChange={(o) => !o && setShowEditWan(false)}>
              <RDialog.Portal>
                <RDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
                <RDialog.Content className="fixed z-50 left-1/2 top-1/2 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-foreground/15 bg-background p-3 sm:p-5 shadow-xl focus:outline-none max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <RDialog.Title className="text-sm sm:text-base font-semibold">Edit WAN (PPPoE)</RDialog.Title>
                    <RDialog.Close asChild>
                      <button className="inline-grid place-items-center h-7 w-7 rounded-md border border-foreground/20 text-foreground hover:bg-foreground/[.06] flex-shrink-0">✕</button>
                    </RDialog.Close>
                  </div>

                  <form onSubmit={handleSubmitEditWan} className="space-y-3">
                    <div>
                      <label className="block text-sm text-foreground/60 mb-1">Instance PPP</label>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                        value={String(editIndex)}
                        onChange={(e) => setEditIndex(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                      >
                        {editIndexOptions.map((idx) => (
                          <option key={idx} value={idx}>{idx}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-foreground/60 mb-1">Username (kosongkan jika tidak diubah)</label>
                      <input
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        placeholder="PPPoE username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-foreground/60 mb-1">Password (kosongkan jika tidak diubah)</label>
                      <input
                        type="password"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="PPPoE password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-foreground/60 mb-1">VLAN ID (kosongkan jika tidak diubah)</label>
                      <input
                        type="number"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                        value={editVlanId}
                        onChange={(e) => setEditVlanId(e.target.value)}
                        placeholder="mis. 220"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-foreground/60 mb-1">Service List (kosongkan jika tidak diubah)</label>
                      <input
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                        value={editServiceList}
                        onChange={(e) => setEditServiceList(e.target.value)}
                        placeholder="INTERNET/IPTV/VOIP"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-foreground/60 mb-1">Connection Type (opsional)</label>
                      <input
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                        value={editConnectionType}
                        onChange={(e) => setEditConnectionType(e.target.value)}
                        placeholder="PPPoE_Routed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-foreground/60 mb-1">Enable (opsional)</label>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                        value={String(editEnable)}
                        onChange={(e) => setEditEnable(e.target.value === '' ? '' : e.target.value === 'true')}
                      >
                        <option value="">Tidak diubah</option>
                        <option value="true">Enable</option>
                        <option value="false">Disable</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-foreground/60 mb-1">Vendor</label>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                        value={editVendor}
                        onChange={(e) => setEditVendor(e.target.value)}
                      >
                        <option value="auto">Auto detect</option>
                        <option value="cmcc">CMCC</option>
                        <option value="huawei">Huawei</option>
                        <option value="zte">ZTE</option>
                        <option value="ct">CT-COM</option>
                        <option value="cu">CU</option>
                        <option value="custom">Custom key</option>
                      </select>
                    </div>

                    {editVendor === 'custom' && (
                      <div>
                        <label className="block text-sm text-foreground/60 mb-1">Custom VLAN Key</label>
                        <input
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                          value={editCustomVlanKey}
                          onChange={(e) => setEditCustomVlanKey(e.target.value)}
                          placeholder="mis. X_CMCC_VLANIDMark"
                          required
                        />
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
                      <RDialog.Close asChild>
                        <Button type="button" variant="ghost" className="w-full sm:w-auto">Batal</Button>
                      </RDialog.Close>
                      <Button type="submit" intent="warning" disabled={submitting} className="w-full sm:w-auto">{submitting ? 'Menyimpan...' : 'Simpan'}</Button>
                    </div>
                  </form>
                </RDialog.Content>
              </RDialog.Portal>
            </RDialog.Root>
          </div>

          {/* Card Informasi WiFi */}
          <div className="rounded-2xl border bg-gradient-to-br bg-background/60 from-amber-500/20 to-amber-500/0 border-amber-500/30 text-amber-600 dark:text-amber-400 p-4 sm:p-5 lg:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Informasi WiFi</h2>
              <div className="flex items-center gap-2">
                <IconButton onClick={handleEditSsid} intent="warning" title="Edit SSID dan Password">
                  <Pencil2Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                </IconButton>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-foreground/10 pb-2 gap-1">
                <dt className="text-foreground/60 text-xs sm:text-sm">SSID</dt>
                <dd className="font-medium break-all text-sm">{detail.wifi.ssid}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-foreground/10 pb-2 gap-1">
                <dt className="text-foreground/60 text-xs sm:text-sm">Connected</dt>
                <dd className="font-medium text-sm">{detail.wifi.connected} perangkat</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <dt className="text-foreground/60 text-xs sm:text-sm">Power</dt>
                <dd className="font-medium text-sm">{detail.wifi.power}</dd>
              </div>
            </dl>

            {/* Modal Edit WiFi (SSID & Password) */}
            <RDialog.Root open={showEditWifi} onOpenChange={(o) => !o && setShowEditWifi(false)}>
              <RDialog.Portal>
                <RDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
                <RDialog.Content className="fixed z-50 left-1/2 top-1/2 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-foreground/15 bg-background p-3 sm:p-5 shadow-xl focus:outline-none max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <RDialog.Title className="text-sm sm:text-base font-semibold">Edit WiFi</RDialog.Title>
                    <RDialog.Close asChild>
                      <button className="inline-grid place-items-center h-7 w-7 rounded-md border border-foreground/20 text-foreground hover:bg-foreground/[.06] flex-shrink-0">✕</button>
                    </RDialog.Close>
                  </div>

                  <form onSubmit={handleSubmitEditWifi} className="space-y-3">
                    <div>
                      <label className="block text-sm text-foreground/60 mb-1">SSID</label>
                      <input
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                        value={editSsid}
                        onChange={(e) => setEditSsid(e.target.value)}
                        placeholder="Nama WiFi (SSID)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-foreground/60 mb-1">Password (kosongkan jika tidak diubah)</label>
                      <input
                        type="password"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
                        value={editWifiPassword}
                        onChange={(e) => setEditWifiPassword(e.target.value)}
                        placeholder="Password WiFi"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
                      <RDialog.Close asChild>
                        <Button type="button" variant="ghost" className="w-full sm:w-auto">Batal</Button>
                      </RDialog.Close>
                      <Button type="submit" intent="warning" disabled={wifiSubmitting} className="w-full sm:w-auto">{wifiSubmitting ? 'Menyimpan...' : 'Simpan'}</Button>
                    </div>
                  </form>
                </RDialog.Content>
              </RDialog.Portal>
            </RDialog.Root>
          </div>
        </section>

        {/* Tabel daftar perangkat terhubung */}
        <section className="rounded-2xl border bg-background/60">
          <div className="p-4 sm:p-5 lg:p-6">
            <h3 className="text-lg font-semibold mb-4">Perangkat Terhubung</h3>
            
            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-3">
              {detail.clients.map((c) => (
                <div key={c.mac} className="rounded-lg border border-foreground/10 p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-foreground/60">Hostname</span>
                    <span className="text-sm font-medium break-all text-right">{c.hostname}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-foreground/60">IP Address</span>
                    <span className="text-sm font-medium">{c.ip}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-foreground/60">MAC Address</span>
                    <span className="text-sm font-medium font-mono break-all text-right">{c.mac}</span>
                  </div>
                </div>
              ))}
              {detail.clients.length === 0 && (
                <div className="text-center text-foreground/60 py-8 text-sm">
                  Tidak ada perangkat yang terhubung.
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block w-full overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-foreground/10">
                  <tr>
                    <Th>Hostname</Th>
                    <Th>IP Address</Th>
                    <Th>MAC Address</Th>
                  </tr>
                </thead>
                <tbody>
                  {detail.clients.map((c) => (
                    <tr key={c.mac} className="border-b border-foreground/5 last:border-b-0">
                      <Td className="break-all">{c.hostname}</Td>
                      <Td>{c.ip}</Td>
                      <Td className="font-mono break-all">{c.mac}</Td>
                    </tr>
                  ))}
                  {detail.clients.length === 0 && (
                    <tr>
                      <Td colSpan={3}>
                        <div className="text-center text-foreground/60 py-6">Tidak ada perangkat yang terhubung.</div>
                      </Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}