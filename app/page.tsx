"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CheckCircledIcon,
  CrossCircledIcon,
  LayersIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ReloadIcon,
  InfoCircledIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import type { CheckedState } from "@radix-ui/react-checkbox";
import * as RDialog from "@radix-ui/react-dialog";
import StatCard from "./components/StatCard";
import StatusBadge from "./components/StatusBadge";
export type { Status as DeviceStatus } from "./components/StatusBadge";
import Th from "./components/Th";
import ThSortable from "./components/ThSortable";
import Td from "./components/Td";
import IconButton from "./components/IconButton";
import ActionButton from "./components/ActionButton";
import PagerButton from "./components/PagerButton";
import PagerNumber from "./components/PagerNumber";
import TableCheckbox from "./components/TableCheckbox";
import Button from "./components/Button";
import { useRouter } from "next/navigation";

// Device type definition
export type Device = {
  status: "online" | "offline";
  pppUsername: string;
  ssid1: string;
  connectedDevices: number;
  rxPower: string; // e.g., -20.4 dBm or N/A for xDSL/ethernet
  ipWan: string;
  productClass: string;
  serialNumber: string;
};

// Dummy data (replace later with real data from GenieACS API)
const seedDevices: Device[] = [
  {
    status: "online",
    pppUsername: "cpe001@isp",
    ssid1: "HomeNet-001",
    connectedDevices: 7,
    rxPower: "-18.2 dBm",
    ipWan: "100.64.10.21",
    productClass: "HG8245X6",
    serialNumber: "SN00A1B2C3",
  },
  {
    status: "offline",
    pppUsername: "cpe002@isp",
    ssid1: "HomeNet-002",
    connectedDevices: 0,
    rxPower: "N/A",
    ipWan: "100.64.10.22",
    productClass: "ZTE-F660",
    serialNumber: "SN00D4E5F6",
  },
  {
    status: "online",
    pppUsername: "alpha@corp",
    ssid1: "Alpha-Office",
    connectedDevices: 24,
    rxPower: "-20.9 dBm",
    ipWan: "10.20.30.40",
    productClass: "HG8010H",
    serialNumber: "SN00G7H8I9",
  },
  {
    status: "online",
    pppUsername: "beta@corp",
    ssid1: "Beta-Guest",
    connectedDevices: 12,
    rxPower: "-15.4 dBm",
    ipWan: "172.16.1.10",
    productClass: "FiberHome-AN5506",
    serialNumber: "SN00J1K2L3",
  },
  {
    status: "offline",
    pppUsername: "cpe099@isp",
    ssid1: "Rumah-099",
    connectedDevices: 0,
    rxPower: "N/A",
    ipWan: "100.64.11.99",
    productClass: "TP-Link-AX1500",
    serialNumber: "SN00M4N5O6",
  },
  {
    status: "online",
    pppUsername: "gamma@corp",
    ssid1: "Gamma-Office",
    connectedDevices: 33,
    rxPower: "-19.7 dBm",
    ipWan: "192.168.50.2",
    productClass: "MikroTik-hAP",
    serialNumber: "SN00P7Q8R9",
  },
  {
    status: "online",
    pppUsername: "cpe123@isp",
    ssid1: "Keluarga-123",
    connectedDevices: 6,
    rxPower: "-21.1 dBm",
    ipWan: "100.64.12.123",
    productClass: "Huawei-AX3",
    serialNumber: "SN00S1T2U3",
  },
  {
    status: "offline",
    pppUsername: "cpe200@isp",
    ssid1: "Rumah-200",
    connectedDevices: 0,
    rxPower: "N/A",
    ipWan: "100.64.12.200",
    productClass: "ZTE-AX1800",
    serialNumber: "SN00V4W5X6",
  },
  {
    status: "online",
    pppUsername: "delta@corp",
    ssid1: "Delta-IoT",
    connectedDevices: 14,
    rxPower: "-17.0 dBm",
    ipWan: "10.10.10.10",
    productClass: "Ubiquiti-UniFi",
    serialNumber: "SN00Y7Z8A9",
  },
  {
    status: "online",
    pppUsername: "cpe321@isp",
    ssid1: "Keluarga-321",
    connectedDevices: 9,
    rxPower: "-22.8 dBm",
    ipWan: "100.64.13.45",
    productClass: "IndiHome-ZXHN",
    serialNumber: "SN00B1C2D3",
  },
  {
    status: "offline",
    pppUsername: "cpe404@isp",
    ssid1: "Rumah-404",
    connectedDevices: 0,
    rxPower: "N/A",
    ipWan: "100.64.13.99",
    productClass: "D-Link-842",
    serialNumber: "SN00E4F5G6",
  },
  {
    status: "online",
    pppUsername: "omega@corp",
    ssid1: "Omega-Office",
    connectedDevices: 41,
    rxPower: "-16.2 dBm",
    ipWan: "172.20.10.5",
    productClass: "Cisco-CPE300",
    serialNumber: "SN00H7I8J9",
  },
];

export default function Home() {
  const [data, setData] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const [sort, setSort] = useState<{ key: keyof Device; direction: "asc" | "desc" }>(
    { key: "serialNumber", direction: "asc" }
  );
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Load data from API
  useEffect(() => {
    let aborted = false;
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/devices', { cache: 'no-store' });
        const json = await res.json();
        const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        const now = Date.now();
        const mapped: Device[] = arr.map((item: any) => {
          const id = item?._id ?? item?._deviceId?._SerialNumber ?? '';
          const vp = item?.VirtualParameters ?? item?.virtualParameters ?? {};
          const getVP = (k: string) => vp?.[k]?._value ?? undefined;
          const rx = getVP('RXPower');
          const rxPower = typeof rx === 'string' && rx.trim() !== '' ? `${rx} dBm` : 'N/A';
          const connected = Number(getVP('activedevices') ?? 0);
          const pppUser = getVP('pppoeUsername') ?? getVP('pppoeUsername2') ?? '-';
          const ipPppoe = getVP('pppoeIP') ?? '-';
          const ssid = item?.InternetGatewayDevice?.LANDevice?.["1"]?.WLANConfiguration?.["1"]?.SSID?._value;
          const productClass = item?._deviceId?._ProductClass ?? item?.productClass ?? '-';
          const lastInform = item?._lastInform ? new Date(item._lastInform).getTime() : 0;
          const online = lastInform ? (now - lastInform) < 10 * 60 * 1000 : false; // online jika _lastInform <10 menit
          return {
            status: online ? 'online' : 'offline',
            pppUsername: pppUser,
            ssid1: (typeof ssid === 'string' && ssid.trim() !== '' ? ssid : '-'),
            connectedDevices: Number.isFinite(connected) ? connected : 0,
            rxPower,
            ipWan: ipPppoe,
            productClass,
            serialNumber: id || '-', // gunakan _id GenieACS untuk navigasi
          };
        });
        if (!aborted) setData(mapped);
      } catch (e) {
        if (!aborted) setData([]);
      } finally {
        if (!aborted) setIsLoading(false);
      }
    }
    load();
    return () => { aborted = true; };
  }, []);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Modal states
  const [detailDevice, setDetailDevice] = useState<Device | null>(null);
  const [pendingDeleteSN, setPendingDeleteSN] = useState<string | null>(null);
  const [pendingRebootSN, setPendingRebootSN] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkRebootOpen, setBulkRebootOpen] = useState(false);

  // KPIs
  const onlineCount = useMemo(() => data.filter((d) => d.status === "online").length, [data]);
  const totalCount = data.length;
  const offlineCount = totalCount - onlineCount;

  // Filtering
  const filtered = useMemo(() => {
    if (isLoading) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (d) =>
        d.serialNumber.toLowerCase().includes(q) ||
        d.pppUsername.toLowerCase().includes(q) ||
        d.ssid1.toLowerCase().includes(q) ||
        d.ipWan.toLowerCase().includes(q)
    );
  }, [data, query, isLoading]);

  // Sorting
  const sorted = useMemo(() => {
    const getComparable = (d: Device, key: keyof Device) => {
      if (key === "status") return d.status === "online" ? 0 : 1; // online first
      if (key === "connectedDevices") return d.connectedDevices;
      if (key === "rxPower") {
        if (!d.rxPower || d.rxPower.toLowerCase() === "n/a") return Number.POSITIVE_INFINITY;
        const n = parseFloat(d.rxPower);
        return isNaN(n) ? Number.POSITIVE_INFINITY : n;
      }
      return String(d[key]).toLowerCase();
    };

    const list = [...filtered];
    list.sort((a, b) => {
      const va = getComparable(a, sort.key as keyof Device);
      const vb = getComparable(b, sort.key as keyof Device);
      if (va < vb) return sort.direction === "asc" ? -1 : 1;
      if (va > vb) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filtered, sort]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageItems = useMemo(() => {
    if (isLoading) return [];
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, isLoading]);

  // Reset page on query/sort change
  useEffect(() => {
    setPage(1);
  }, [query, sort.key, sort.direction]);

  // Clean selection if data items removed
  useEffect(() => {
    setSelected((prev) => new Set([...prev].filter((sn) => data.some((d) => d.serialNumber === sn))));
  }, [data]);

  // Actions (mock) with modals
  const handleDelete = (sn: string) => {
    setPendingDeleteSN(sn);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteSN) return;
    const sn = pendingDeleteSN;
    try {
      const res = await fetch(`/api/devices/${encodeURIComponent(sn)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      setData((prev) => prev.filter((d) => d.serialNumber !== sn));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(sn);
        return next;
      });
    } catch (e) {
      console.error(e);
      alert('Gagal menghapus perangkat.');
    } finally {
      setPendingDeleteSN(null);
    }
  };

  const handleReboot = (sn: string) => {
    setPendingRebootSN(sn);
  };

  const confirmReboot = () => {
    // mock send reboot
    setPendingRebootSN(null);
  };

  const handleDetail = (d: Device) => {
    setDetailDevice(d);
  };

  const toggleSort = (key: keyof Device) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  // Selection helpers
  const pageSNs = useMemo(() => pageItems.map((d) => d.serialNumber), [pageItems]);
  const allPageSelected = pageSNs.length > 0 && pageSNs.every((sn) => selected.has(sn));
  const somePageSelected = pageSNs.some((sn) => selected.has(sn));
  const headerChecked: CheckedState = isLoading ? false : allPageSelected ? true : somePageSelected ? "indeterminate" : false;

  const toggleRow = (sn: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(sn);
      else next.delete(sn);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageSNs.forEach((sn) => next.delete(sn));
      } else {
        pageSNs.forEach((sn) => next.add(sn));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    setBulkDeleteOpen(true);
  };

  const confirmBulkDelete = () => {
    setData((prev) => prev.filter((d) => !selected.has(d.serialNumber)));
    clearSelection();
    setBulkDeleteOpen(false);
  };

  const handleBulkReboot = () => {
    if (selected.size === 0) return;
    setBulkRebootOpen(true);
  };

  const confirmBulkReboot = () => {
    // mock send bulk reboot
    setBulkRebootOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/70 text-foreground">
      <div className="mx-auto max-w-7xl p-6 sm:p-10 space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              CPE Management Dashboard
            </h1>
            <p className="text-sm text-foreground/60 mt-1">
              Monitoring perangkat CPE terintegrasi dengan GenieACS
            </p>
          </div>
        </header>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            title="Device Online"
            value={onlineCount}
            subtitle="Perangkat aktif"
            intent="success"
            Icon={CheckCircledIcon}
          />
          <StatCard
            title="Device Offline"
            value={offlineCount}
            subtitle="Perangkat tidak aktif"
            intent="danger"
            Icon={CrossCircledIcon}
          />
          <StatCard
            title="Total Device"
            value={totalCount}
            subtitle="Keseluruhan perangkat"
            intent="neutral"
            Icon={LayersIcon}
          />
        </section>

        {/* Filters + Bulk actions */}
        <section className="space-y-3">
          {/* Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/60" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari Perangkat..."
                className="w-full h-11 rounded-xl pl-11 pr-3 bg-background/60 border border-foreground/10 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary/60 transition text-sm"
              />
            </div>
            <div className="text-sm text-foreground/60">
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                  Memuat data...
                </span>
              ) : (
                <>Menampilkan {sorted.length} hasil, halaman {page} / {totalPages}</>
              )}
            </div>
          </div>

          {/* Bulk action bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-foreground/60">
              {selected.size > 0 ? (
                <span>
                  {selected.size} dipilih
                </span>
              ) : (
                <span className="opacity-70">Tidak ada yang dipilih</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ActionButton
                title="Reboot terpilih"
                onClick={handleBulkReboot}
                disabled={selected.size === 0}
                intent="warning"
              >
                <ReloadIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Reboot</span>
              </ActionButton>
              <ActionButton
                title="Hapus terpilih"
                onClick={handleBulkDelete}
                disabled={selected.size === 0}
                intent="danger"
              >
                <TrashIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Delete</span>
              </ActionButton>
              <ActionButton
                title="Bersihkan pilihan"
                onClick={clearSelection}
                disabled={selected.size === 0}
              >
                <Cross2Icon className="h-4 w-4" />
                <span className="hidden sm:inline">Clear</span>
              </ActionButton>
            </div>
          </div>
        </section>

        {/* Table */}
        <section>
          <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-foreground/[.03] text-foreground/70">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <TableCheckbox
                        checked={headerChecked}
                        onCheckedChange={() => togglePage()}
                        ariaLabel="Pilih semua di halaman"
                      />
                    </th>
                    <ThSortable
                      label="Status"
                      onClick={() => toggleSort("status")}
                      active={sort.key === "status"}
                      direction={sort.key === "status" ? sort.direction : undefined}
                    />
                    <ThSortable
                      label="PPP Username"
                      onClick={() => toggleSort("pppUsername")}
                      active={sort.key === "pppUsername"}
                      direction={sort.key === "pppUsername" ? sort.direction : undefined}
                    />
                    <ThSortable
                      label="SSID1 Wifi"
                      onClick={() => toggleSort("ssid1")}
                      active={sort.key === "ssid1"}
                      direction={sort.key === "ssid1" ? sort.direction : undefined}
                    />
                    <ThSortable
                      label="Perangkat Terhubung"
                      onClick={() => toggleSort("connectedDevices")}
                      active={sort.key === "connectedDevices"}
                      direction={sort.key === "connectedDevices" ? sort.direction : undefined}
                    />
                    <ThSortable
                      label="RX Power"
                      onClick={() => toggleSort("rxPower")}
                      active={sort.key === "rxPower"}
                      direction={sort.key === "rxPower" ? sort.direction : undefined}
                    />
                    <ThSortable
                      label="IP WAN"
                      onClick={() => toggleSort("ipWan")}
                      active={sort.key === "ipWan"}
                      direction={sort.key === "ipWan" ? sort.direction : undefined}
                    />
                    <ThSortable
                      label="Product class"
                      onClick={() => toggleSort("productClass")}
                      active={sort.key === "productClass"}
                      direction={sort.key === "productClass" ? sort.direction : undefined}
                    />
                    <ThSortable
                      label="Serial number"
                      onClick={() => toggleSort("serialNumber")}
                      active={sort.key === "serialNumber"}
                      direction={sort.key === "serialNumber" ? sort.direction : undefined}
                    />
                    <Th>Aksi</Th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    [...Array(10)].map((_, i) => (
                      <tr key={`skeleton-${i}`} className="border-t border-foreground/5">
                        <Td>
                          <div className="h-5 w-5 rounded-md bg-foreground/10 animate-pulse" />
                        </Td>
                        <Td>
                          <div className="h-6 w-20 rounded bg-foreground/10 animate-pulse" />
                        </Td>
                        <Td>
                          <div className="h-4 w-40 rounded bg-foreground/10 animate-pulse" />
                        </Td>
                        <Td>
                          <div className="h-4 w-32 rounded bg-foreground/10 animate-pulse" />
                        </Td>
                        <Td>
                          <div className="h-4 w-10 rounded bg-foreground/10 animate-pulse" />
                        </Td>
                        <Td>
                          <div className="h-4 w-16 rounded bg-foreground/10 animate-pulse" />
                        </Td>
                        <Td>
                          <div className="h-4 w-28 rounded bg-foreground/10 animate-pulse" />
                        </Td>
                        <Td>
                          <div className="h-4 w-24 rounded bg-foreground/10 animate-pulse" />
                        </Td>
                        <Td>
                          <div className="h-4 w-24 rounded bg-foreground/10 animate-pulse" />
                        </Td>
                        <Td>
                          <div className="h-6 w-24 rounded bg-foreground/10 animate-pulse" />
                        </Td>
                      </tr>
                    ))
                  )}

                  {!isLoading && pageItems.map((d) => {
                    const isChecked = selected.has(d.serialNumber);
                    return (
                      <tr
                        key={d.serialNumber}
                        className="border-t border-foreground/5 hover:bg-foreground/[.02] transition-colors cursor-pointer"
                        onClick={() => router.push(`/devices/${d.serialNumber}`)}
                      >
                        <Td onClick={(e) => e.stopPropagation()}>
                          <TableCheckbox
                            checked={isChecked}
                            onCheckedChange={(v) => toggleRow(d.serialNumber, Boolean(v))}
                            ariaLabel={`Pilih ${d.serialNumber}`}
                          />
                        </Td>
                        <Td>
                          <StatusBadge status={d.status} />
                        </Td>
                        <Td>{d.pppUsername}</Td>
                        <Td>{d.ssid1}</Td>
                        <Td>
                          <span className="font-medium">{d.connectedDevices}</span>
                        </Td>
                        <Td>{d.rxPower}</Td>
                        <Td>
                          <code className="text-xs bg-foreground/[.06] px-1.5 py-0.5 rounded">
                            {d.ipWan}
                          </code>
                        </Td>
                        <Td>{d.productClass}</Td>
                        <Td>
                          <code className="text-xs bg-foreground/[.06] px-1.5 py-0.5 rounded">
                            {d.serialNumber}
                          </code>
                        </Td>
                        <Td onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <IconButton
                              title="Detail"
                              onClick={() => handleDetail(d)}
                              intent="neutral"
                            >
                              <InfoCircledIcon className="h-4 w-4" />
                            </IconButton>
                            <IconButton
                              title="Reboot"
                              onClick={() => handleReboot(d.serialNumber)}
                              intent="warning"
                            >
                              <ReloadIcon className="h-4 w-4" />
                            </IconButton>
                            <IconButton
                              title="Delete"
                              onClick={() => handleDelete(d.serialNumber)}
                              intent="danger"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </IconButton>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}

                  {!isLoading && pageItems.length === 0 && (
                    <tr>
                      <Td colSpan={10}>
                        <div className="py-10 text-center text-foreground/60">
                          Tidak ada data untuk ditampilkan
                        </div>
                      </Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-foreground/10 text-sm">
              <div className="text-foreground/60">
                {sorted.length > 0 ? (
                  <span>
                    Menampilkan {Math.min((page - 1) * pageSize + 1, sorted.length)}-
                    {Math.min(page * pageSize, sorted.length)} dari {sorted.length} hasil
                  </span>
                ) : (
                  <span>0 hasil</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <PagerButton
                  title="Halaman pertama"
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                >
                  <DoubleArrowLeftIcon />
                </PagerButton>
                <PagerButton
                  title="Sebelumnya"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeftIcon />
                </PagerButton>

                {/* Page numbers (compact) */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span key={`gap-${p}`} className="px-1 text-foreground/40">
                          …
                        </span>
                      )}
                      <PagerNumber key={p} active={p === page} onClick={() => setPage(p)}>
                        {p}
                      </PagerNumber>
                    </>
                  ))}

                <PagerButton
                  title="Berikutnya"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRightIcon />
                </PagerButton>
                <PagerButton
                  title="Halaman terakhir"
                  disabled={page === totalPages}
                  onClick={() => setPage(totalPages)}
                >
                  <DoubleArrowRightIcon />
                </PagerButton>
              </div>
            </div>
          </div>
        </section>

        {/* Dialogs (Radix) */}
        {/* Detail Modal */}
        <RDialog.Root open={Boolean(detailDevice)} onOpenChange={(o) => !o && setDetailDevice(null)}>
          <RDialog.Portal>
            <RDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <RDialog.Content className="fixed z-50 left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-foreground/15 bg-background p-5 shadow-xl focus:outline-none">
              <div className="flex items-center justify-between gap-4">
                <RDialog.Title className="text-base font-semibold">Detail Perangkat</RDialog.Title>
                <RDialog.Close asChild>
                  <button type="button" className="inline-grid place-items-center h-8 w-8 rounded-lg border border-foreground/20 text-foreground hover:bg-foreground/[.06]" title="Tutup">
                    <Cross2Icon className="h-4 w-4" />
                  </button>
                </RDialog.Close>
              </div>
              {detailDevice && (
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-foreground/60">Status</span><span className="font-medium capitalize">{detailDevice.status}</span></div>
                  <div className="flex justify-between"><span className="text-foreground/60">PPP Username</span><span className="font-medium">{detailDevice.pppUsername}</span></div>
                  <div className="flex justify-between"><span className="text-foreground/60">SSID1</span><span className="font-medium">{detailDevice.ssid1}</span></div>
                  <div className="flex justify-between"><span className="text-foreground/60">Connected</span><span className="font-medium">{detailDevice.connectedDevices}</span></div>
                  <div className="flex justify-between"><span className="text-foreground/60">RX Power</span><span className="font-medium">{detailDevice.rxPower}</span></div>
                  <div className="flex justify-between"><span className="text-foreground/60">IP WAN</span><span className="font-medium">{detailDevice.ipWan}</span></div>
                  <div className="flex justify-between"><span className="text-foreground/60">Product Class</span><span className="font-medium">{detailDevice.productClass}</span></div>
                  <div className="flex justify-between"><span className="text-foreground/60">Serial Number</span><span className="font-medium">{detailDevice.serialNumber}</span></div>
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <RDialog.Close asChild>
                  <Button>Tutup</Button>
                </RDialog.Close>
              </div>
            </RDialog.Content>
          </RDialog.Portal>
        </RDialog.Root>

        {/* Confirm single delete */}
        <RDialog.Root open={Boolean(pendingDeleteSN)} onOpenChange={(o) => !o && setPendingDeleteSN(null)}>
          <RDialog.Portal>
            <RDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <RDialog.Content className="fixed z-50 left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rose-500/30 bg-background p-5 shadow-xl ring-1 ring-rose-500/30 focus:outline-none">
              <div className="flex items-center justify-between gap-4">
                <RDialog.Title className="text-base font-semibold text-rose-600 dark:text-rose-400">Hapus Perangkat</RDialog.Title>
                <RDialog.Close asChild>
                  <button type="button" className="inline-grid place-items-center h-8 w-8 rounded-lg border border-foreground/20 text-foreground hover:bg-foreground/[.06]" title="Tutup">
                    <Cross2Icon className="h-4 w-4" />
                  </button>
                </RDialog.Close>
              </div>
              {pendingDeleteSN && (
                <p className="mt-4 text-sm text-foreground/70">Yakin ingin menghapus perangkat dengan SN <code className="px-1 py-0.5 rounded bg-foreground/[.06] text-xs">{pendingDeleteSN}</code>?</p>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <RDialog.Close asChild>
                  <Button variant="ghost">Batal</Button>
                </RDialog.Close>
                <RDialog.Close asChild>
                  <Button intent="danger" onClick={confirmDelete}>Hapus</Button>
                </RDialog.Close>
              </div>
            </RDialog.Content>
          </RDialog.Portal>
        </RDialog.Root>

        {/* Confirm single reboot */}
        <RDialog.Root open={Boolean(pendingRebootSN)} onOpenChange={(o) => !o && setPendingRebootSN(null)}>
          <RDialog.Portal>
            <RDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <RDialog.Content className="fixed z-50 left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-amber-500/30 bg-background p-5 shadow-xl ring-1 ring-amber-500/30 focus:outline-none">
              <div className="flex items-center justify-between gap-4">
                <RDialog.Title className="text-base font-semibold text-amber-600 dark:text-amber-400">Reboot Perangkat</RDialog.Title>
                <RDialog.Close asChild>
                  <button type="button" className="inline-grid place-items-center h-8 w-8 rounded-lg border border-foreground/20 text-foreground hover:bg-foreground/[.06]" title="Tutup">
                    <Cross2Icon className="h-4 w-4" />
                  </button>
                </RDialog.Close>
              </div>
              {pendingRebootSN && (
                <p className="mt-4 text-sm text-foreground/70">Kirim perintah reboot untuk SN <code className="px-1 py-0.5 rounded bg-foreground/[.06] text-xs">{pendingRebootSN}</code>?</p>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <RDialog.Close asChild>
                  <Button variant="ghost">Batal</Button>
                </RDialog.Close>
                <RDialog.Close asChild>
                  <Button intent="warning" onClick={confirmReboot}>Kirim</Button>
                </RDialog.Close>
              </div>
            </RDialog.Content>
          </RDialog.Portal>
        </RDialog.Root>

        {/* Confirm bulk delete */}
        <RDialog.Root open={bulkDeleteOpen} onOpenChange={(o) => !o && setBulkDeleteOpen(false)}>
          <RDialog.Portal>
            <RDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <RDialog.Content className="fixed z-50 left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-rose-500/30 bg-background p-5 shadow-xl ring-1 ring-rose-500/30 focus:outline-none">
              <div className="flex items-center justify-between gap-4">
                <RDialog.Title className="text-base font-semibold text-rose-600 dark:text-rose-400">Hapus Perangkat Terpilih</RDialog.Title>
                <RDialog.Close asChild>
                  <button type="button" className="inline-grid place-items-center h-8 w-8 rounded-lg border border-foreground/20 text-foreground hover:bg-foreground/[.06]" title="Tutup">
                    <Cross2Icon className="h-4 w-4" />
                  </button>
                </RDialog.Close>
              </div>
              <p className="mt-4 text-sm text-foreground/70">Yakin ingin menghapus <span className="font-semibold">{selected.size}</span> perangkat terpilih?</p>
              <div className="mt-6 flex justify-end gap-2">
                <RDialog.Close asChild>
                  <Button variant="ghost">Batal</Button>
                </RDialog.Close>
                <RDialog.Close asChild>
                  <Button intent="danger" onClick={confirmBulkDelete}>Hapus</Button>
                </RDialog.Close>
              </div>
            </RDialog.Content>
          </RDialog.Portal>
        </RDialog.Root>

        {/* Confirm bulk reboot */}
        <RDialog.Root open={bulkRebootOpen} onOpenChange={(o) => !o && setBulkRebootOpen(false)}>
          <RDialog.Portal>
            <RDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <RDialog.Content className="fixed z-50 left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-amber-500/30 bg-background p-5 shadow-xl ring-1 ring-amber-500/30 focus:outline-none">
              <div className="flex items-center justify-between gap-4">
                <RDialog.Title className="text-base font-semibold text-amber-600 dark:text-amber-400">Reboot Perangkat Terpilih</RDialog.Title>
                <RDialog.Close asChild>
                  <button type="button" className="inline-grid place-items-center h-8 w-8 rounded-lg border border-foreground/20 text-foreground hover:bg-foreground/[.06]" title="Tutup">
                    <Cross2Icon className="h-4 w-4" />
                  </button>
                </RDialog.Close>
              </div>
              <p className="mt-4 text-sm text-foreground/70">Kirim perintah reboot untuk <span className="font-semibold">{selected.size}</span> perangkat terpilih?</p>
              <div className="mt-6 flex justify-end gap-2">
                <RDialog.Close asChild>
                  <Button variant="ghost">Batal</Button>
                </RDialog.Close>
                <RDialog.Close asChild>
                  <Button intent="warning" onClick={confirmBulkReboot}>Kirim</Button>
                </RDialog.Close>
              </div>
            </RDialog.Content>
          </RDialog.Portal>
        </RDialog.Root>

      </div>
    </div>
  );
}

