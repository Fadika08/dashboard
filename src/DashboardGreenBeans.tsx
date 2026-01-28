import React, { useEffect, useMemo, useRef, useState } from "react";
import mqtt from "mqtt";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Cloud,
  Database,
  Gauge,
  Layers,
  ShieldAlert,
  Thermometer,
  Wifi,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import { motion } from "framer-motion";

const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

const MC_IDEAL_MIN = 10;
const MC_IDEAL_MAX = 12.5;
// 👇 Type data yang dipakai grafik & kartu
type TelemetryPoint = {
  ts: number; // epoch ms
  T: number;
  RH: number;
  CO2: number;
  MC: number;
};

const MQTT_HOST = import.meta.env.VITE_MQTT_HOST;
const MQTT_PORT = import.meta.env.VITE_MQTT_PORT;
const MQTT_PATH = import.meta.env.VITE_MQTT_PATH;
const MQTT_TOPIC_DATA = "kopi/greenbeans/data";
const MQTT_TOPIC_PRED = "kopi/greenbeans/prediction";
const LS_LAST_MC = "gb:last_mc";

function useMqttStream() {
  const [points, setPoints] = useState<TelemetryPoint[]>([]);
  const [latest, setLatest] = useState<TelemetryPoint | null>(null);

  // ✅ init ref sekali (tidak dipanggil ())
  const lastMcRef = useRef<number>(
    Number(localStorage.getItem(LS_LAST_MC) ?? NaN),
  );

  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${MQTT_HOST}:${MQTT_PORT}${MQTT_PATH}`;

    const client = mqtt.connect(url, { keepalive: 60, reconnectPeriod: 2000 });

    client.on("connect", () => {
      client.subscribe(MQTT_TOPIC_DATA);
      client.subscribe(MQTT_TOPIC_PRED);
    });

    client.on("message", (topic, msg) => {
      try {
        const payload: any = JSON.parse(msg.toString());
        const now = Date.now();

        if (topic === MQTT_TOPIC_PRED) {
          const mc = Number(payload.mc_pred);
          if (Number.isFinite(mc)) {
            lastMcRef.current = mc;
            localStorage.setItem(LS_LAST_MC, String(mc));
          }
          setLatest((prev) =>
            prev
              ? { ...prev, MC: mc }
              : { ts: now, T: 0, RH: 0, CO2: 0, MC: mc },
          );

          setPoints((prev) => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            return [...prev.slice(0, -1), { ...last, MC: mc }];
          });
          return;
        }

        if (topic === MQTT_TOPIC_DATA) {
          const fallbackMC = Number.isFinite(lastMcRef.current)
            ? lastMcRef.current
            : (latest?.MC ?? 0);

          const point: TelemetryPoint = {
            ts: now,
            T: Number(payload.temp_c),
            RH: Number(payload.rh),
            CO2: Number(payload.co2_ppm),
            MC: fallbackMC,
          };

          setPoints((prev) => [...prev.slice(-600), point]);
          setLatest(point);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    });

    client.on("error", (err) => console.error("MQTT error:", err));

    return () => client.end(true);
  }, []);
  // tetap []

  return { points, latest };
}

function useMockStream(deviceId: string) {
  const [points, setPoints] = useState<any[]>([]);
  const [latest, setLatest] = useState<any | null>(null);
  const tRef = useRef<any>(null);

  useEffect(() => {
    const now = Date.now();
    const seed: any[] = [];
    let baseT = 26.0 + Math.random();
    let baseRH = 65 + Math.random() * 5;
    let baseCO2 = 550 + Math.random() * 50;
    for (let i = 60; i >= 0; i--) {
      const ts = new Date(now - i * 60_000);
      const T = baseT + Math.sin(i / 18) * 0.5 + (Math.random() - 0.5) * 0.2;
      const RH = baseRH + Math.sin(i / 26) * 2 + (Math.random() - 0.5) * 1.2;
      const CO2 = baseCO2 + Math.sin(i / 14) * 15 + (Math.random() - 0.5) * 8;
      const MC = Math.max(
        8.0,
        Math.min(14.0, 7.5 + RH / 10 - T / 30 + (Math.random() - 0.5) * 0.25),
      );
      seed.push({
        ts,
        T: +T.toFixed(2),
        RH: +RH.toFixed(2),
        CO2: Math.round(CO2),
        MC: +MC.toFixed(2),
      });
    }
    setPoints(seed);
    setLatest(seed[seed.length - 1]);

    if (tRef.current) clearInterval(tRef.current);
    tRef.current = setInterval(() => {
      const prev = (latest || seed[seed.length - 1]) as any;
      const ts = new Date();
      const T = prev.T + (Math.random() - 0.5) * 0.2;
      const RH = prev.RH + (Math.random() - 0.5) * 1.0;
      const CO2 = prev.CO2 + Math.round((Math.random() - 0.5) * 10);
      const MC = Math.max(
        8.0,
        Math.min(14.0, 7.5 + RH / 10 - T / 30 + (Math.random() - 0.5) * 0.25),
      );
      const p = {
        ts,
        T: +T.toFixed(2),
        RH: +RH.toFixed(2),
        CO2: CO2,
        MC: +MC.toFixed(2),
      };
      setPoints((s) => [...s.slice(-600), p]);
      setLatest(p);
    }, 2000);

    return () => {
      if (tRef.current) clearInterval(tRef.current);
    };
  }, [deviceId]);

  return { points, latest };
}

function StatCard({ title, value, unit, icon, warn }: any) {
  const Icon = icon;
  return (
    <Card className={`shadow-sm ${warn ? "ring-2 ring-red-400" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon
          className={`h-5 w-5 ${
            warn ? "text-red-500" : "text-muted-foreground"
          }`}
        />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {value}
          <span className="text-base font-medium ml-1 text-muted-foreground">
            {unit}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ online }: { online: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {online ? (
        <Badge className="bg-emerald-600 hover:bg-emerald-600/90">Online</Badge>
      ) : (
        <Badge variant="destructive">Offline</Badge>
      )}
    </div>
  );
}

const devices = [
  { id: "ESP32-GB-01", name: "Chamber A", rssi: -58, location: "Gudang 1" },
  { id: "ESP32-GB-02", name: "Chamber B", rssi: -67, location: "Gudang 2" },
  { id: "ESP32-GB-03", name: "Chamber C", rssi: -71, location: "QC Roastery" },
];

export default function DashboardGreenBeans() {
  const [deviceId, setDeviceId] = useState(devices[0].id);
  const { points, latest } = useMqttStream();
  const [mcMin, setMcMin] = useState(MC_IDEAL_MIN);
  const [mcMax, setMcMax] = useState(MC_IDEAL_MAX);
  const [notify, setNotify] = useState(true);

  const online = true;
  const lastSeen = useMemo(() => (latest ? fmtTime(latest.ts) : "–"), [latest]);
  const mcWarn = latest ? latest.MC < mcMin || latest.MC > mcMax : false;

  const [alarms, setAlarms] = useState<any[]>([]);
  useEffect(() => {
    if (!latest) return;
    if (latest.MC < mcMin || latest.MC > mcMax) {
      setAlarms((s) =>
        [
          {
            ts: latest.ts,
            level: latest.MC < mcMin ? "LOW" : "HIGH",
            message: `MC ${latest.MC}% di luar rentang ${mcMin}–${mcMax}%`,
          },
          ...s,
        ].slice(0, 50),
      );
    }
  }, [latest, mcMin, mcMax]);

  return (
    <div className="min-h-screen w-full p-6 md:p-8 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 text-zinc-100">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-2xl md:text-3xl font-semibold tracking-tight"
            >
              Dashboard Kadar Air Green Beans
            </motion.h1>
            <p className="text-sm text-zinc-400">
              Pra‑Roasting • Real‑time Monitoring • Alarm Otomatis
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <Select value={deviceId} onValueChange={setDeviceId as any}>
              {devices.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name} • {d.id}
                </SelectItem>
              ))}
            </Select>
            <Button
              className="bg-zinc-800 hover:bg-zinc-700"
              onClick={() =>
                alert(
                  "Ekspor CSV tersedia di versi build / gunakan tombol di UI demo.",
                )
              }
            >
              Ekspor CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Wifi className="h-5 w-5 text-zinc-400" />
                <div className="text-sm">
                  <div className="font-medium">Status Perangkat</div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <StatusPill online={online} /> • RSSI{" "}
                    {devices.find((d) => d.id === deviceId)?.rssi} dBm
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Cloud className="h-5 w-5 text-zinc-400" />
                <div className="text-sm">
                  <div className="font-medium">Lokasi</div>
                  <div className="text-zinc-400">
                    {devices.find((d) => d.id === deviceId)?.location} • Last
                    seen {lastSeen}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-zinc-400" />
                <div className="text-sm">
                  <div className="font-medium">Sampling</div>
                  <div className="text-zinc-400">
                    Interval 2s • Retensi 24h (demo)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Layers className="h-5 w-5 text-zinc-400" />
                <div className="text-sm">
                  <div className="font-medium">Model Estimasi</div>
                  <div className="text-zinc-400">
                    Isoterm Sorpsi + Rule Edge (demo)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Moisture Content"
            value={latest?.MC ?? "–"}
            unit="%"
            icon={Gauge}
            warn={mcWarn}
          />
          <StatCard
            title="Suhu"
            value={latest?.T ?? "–"}
            unit="°C"
            icon={Thermometer}
          />
          <StatCard
            title="RH"
            value={latest?.RH ?? "–"}
            unit="%"
            icon={Thermometer}
          />
          <StatCard
            title="CO₂"
            value={latest?.CO2 ?? "–"}
            unit="ppm"
            icon={Cloud}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2 bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Grafik Deret Waktu</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={"mc"} onValueChange={() => {}}>
                <TabsList>
                  <TabsTrigger tab="mc" value={"mc"} onValueChange={() => {}}>
                    MC
                  </TabsTrigger>
                </TabsList>
                <TabsContent tab="mc" value={"mc"}>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={points}
                        margin={{ left: 8, right: 16, top: 10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="5%"
                              stopColor="currentColor"
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="95%"
                              stopColor="currentColor"
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis
                          dataKey="ts"
                          tickFormatter={(v: any) => fmtTime(Number(v))}
                          stroke="#a1a1aa"
                        />
                        <YAxis domain={[8, 14]} stroke="#a1a1aa" />
                        <Tooltip
                          contentStyle={{
                            background: "#18181b",
                            border: "1px solid #27272a",
                            borderRadius: 8,
                          }}
                          labelFormatter={(l: any) =>
                            new Date(Number(l)).toLocaleString()
                          }
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="MC"
                          stroke="#fff"
                          fill="url(#g1)"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey={() => 10}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          isAnimationActive={false}
                        />
                        <Line
                          type="monotone"
                          dataKey={() => 12}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Alarm & Ambang</CardTitle>
              {mcWarn ? (
                <Badge variant="destructive" className="gap-1">
                  Alarm
                </Badge>
              ) : (
                <Badge className="bg-emerald-600">Aman</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-zinc-400 mb-1">
                    MC Minimum (%)
                  </div>
                  <Input
                    type="number"
                    step="0.1"
                    value={mcMin}
                    onChange={(e) => setMcMin(parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <div className="text-xs text-zinc-400 mb-1">
                    MC Maksimum (%)
                  </div>
                  <Input
                    type="number"
                    step="0.1"
                    value={mcMax}
                    onChange={(e) => setMcMax(parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="flex items-center gap-2 text-sm">
                  <Bell className="h-4 w-4" /> Notifikasi
                </div>
                <Button
                  onClick={() => setNotify((v) => !v)}
                  className={
                    notify
                      ? "bg-emerald-600 hover:bg-emerald-600/90"
                      : "bg-zinc-800 hover:bg-zinc-700"
                  }
                >
                  {notify ? "Aktif" : "Nonaktif"}
                </Button>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Riwayat Alarm</div>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-zinc-800">
                  {alarms.length === 0 ? (
                    <div className="text-sm text-zinc-400 p-4 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Belum ada alarm.
                    </div>
                  ) : (
                    <ul className="divide-y divide-zinc-800">
                      {alarms.map((a, i) => (
                        <li
                          key={i}
                          className="p-3 text-sm flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium">
                              {a.level === "HIGH"
                                ? "Di Atas Batas"
                                : "Di Bawah Batas"}
                            </div>
                            <div className="text-zinc-400">
                              {new Date(a.ts).toLocaleString()} • {a.message}
                            </div>
                          </div>
                          <Badge
                            variant={
                              a.level === "HIGH" ? "destructive" : "secondary"
                            }
                          >
                            {a.level}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Integrasi MQTT (contoh topik)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-zinc-950 p-3 rounded-lg border border-zinc-800 overflow-x-auto">
                {`devices/${deviceId}/telemetry -> {"ts": 1734000000, "MC": 11.2, "T": 26.4, "RH": 64.7, "CO2": 560}
devices/${deviceId}/events/alarm -> {"ts": 1734000000, "type": "MC_HIGH", "value": 12.6}
devices/${deviceId}/status (LWT) -> {"online": true, "rssi": -58}
devices/${deviceId}/control -> {"alarm": true, "mc_min": 10, "mc_max": 12}`}
              </pre>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Skema Data (ringkas)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-zinc-950 p-3 rounded-lg border border-zinc-800 overflow-x-auto">
                {`telemetry: { ts: ISO8601, device_id: string, MC: number, T: number, RH: number, CO2: number }
alarms:    { ts: ISO8601, device_id: string, level: 'LOW'|'HIGH', metric: 'MC', value: number, min: number, max: number }
status:    { ts: ISO8601, device_id: string, online: boolean, rssi: number, fw: string }`}
              </pre>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Catatan Validasi</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm list-disc pl-4 text-zinc-300 space-y-2">
                <li>
                  Alarm lokal di edge (LED/Buzzer) tetap aktif walau internet
                  putus.
                </li>
                <li>
                  Rentang ideal MC: 10–12% (dapat disesuaikan per
                  varietas/batch).
                </li>
                <li>
                  Kalibrasi sensor RH/T multi‑point; simpan koefisien koreksi di
                  device.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-xs text-zinc-500 text-center pt-4">
          © {new Date().getFullYear()} Prototype Dashboard – Green Beans MC
          Monitoring
        </div>
      </div>
    </div>
  );
}
