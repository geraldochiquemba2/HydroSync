import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plot as DbPlot, InsertPlot } from "@shared/schema";

import { useState } from "react";
import {
  Droplets, Map, Activity, CloudRain,
  Settings, User, Bell, ChevronRight, Menu, MapPin,
  ThermometerSun, Sprout, CheckCircle2, AlertTriangle, TrendingUp, Sun, Wind,
  Cloud, CloudLightning, Waves, Layers, Plus, Trash2, X, MessageSquare, Send, RefreshCw
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Assets generated
import satelliteFarm from "@/assets/images/satellite-farm.png";
import soilHeatmap from "@/assets/images/soil-heatmap.png";

const waterForecastData = [
  { name: 'Seg', need: 45, evaporated: 20 },
  { name: 'Ter', need: 52, evaporated: 25 },
  { name: 'Qua', need: 38, evaporated: 15 },
  { name: 'Qui', need: 65, evaporated: 35 },
  { name: 'Sex', need: 48, evaporated: 22 },
  { name: 'Sáb', need: 50, evaporated: 24 },
  { name: 'Dom', need: 42, evaporated: 18 },
];

const healthHistoryData = [
  { name: 'Sem 1', ndvi: 0.65 },
  { name: 'Sem 2', ndvi: 0.72 },
  { name: 'Sem 3', ndvi: 0.78 },
  { name: 'Sem 4', ndvi: 0.82 },
  { name: 'Sem 5', ndvi: 0.88 },
];
interface Plot {
  id: string;
  name: string;
  crop: string;
  area: number;
  health: number;
  lat: string;
  lng: string;
  altitude: string;
  boundaryPoints?: [number, number][];
  analysis?: string;
  chatHistory?: string; // Campo novo para o histórico
}

// ... rest of the interface ...

// Utility to calculate polygon area in hectares
const calculateArea = (points: [number, number][]): number => {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    // Flat approximation (Degrees to Meters approx)
    // 1 deg lat approx 111.32km
    // 1 deg lng approx 111.32km * cos(lat)
    const lat1 = points[i][0] * (Math.PI / 180);
    const lng1 = points[i][1] * (Math.PI / 180);
    const lat2 = points[j][0] * (Math.PI / 180);
    const lng2 = points[j][1] * (Math.PI / 180);

    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = Math.abs(area * 6378137 * 6378137 / 2.0);
  return Number((area / 10000).toFixed(2)); // Convert m2 to hectares
};

// Fix Leaflet marker icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapEvents({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function Dashboard() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: dbPlots = [], isLoading } = useQuery<DbPlot[]>({
    queryKey: ["/api/plots"],
  });

  const plots: Plot[] = dbPlots.map((p: any) => ({
    ...p,
    area: Number(p.area),
    health: Number(p.health),
    boundaryPoints: p.boundaryPoints ? JSON.parse(p.boundaryPoints) : undefined
  }));

  const createPlotMutation = useMutation({
    mutationFn: async (plot: InsertPlot) => {
      const res = await apiRequest("POST", "/api/plots", plot);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plots"] });
      setNewPlot({ name: "", crop: "Soja", area: "", lat: "", lng: "", altitude: "" });
      setPolygonPoints([]);
      setIsAddDialogOpen(false);
      toast({
        title: "Área Salva no Neon",
        description: "Os dados foram persistidos com sucesso no banco de dados.",
      });
    },
  });

  const deletePlotMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/plots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plots"] });
      toast({
        title: "Talhão Removido",
        description: "O registro foi excluído permanentemente.",
      });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/plots/${id}/analyze`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plots"] });
      toast({
        title: "Análise Groq Concluída",
        description: "O relatório agronômico foi gerado via IA.",
      });
    },
  });

  const [chatMessage, setChatMessage] = useState("");
  const chatMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const res = await apiRequest("POST", `/api/plots/${id}/chat`, { message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plots"] });
      setChatMessage("");
      toast({
        title: "IA Respondeu",
        description: "Nova mensagem técnica disponível.",
      });
    },
  });

  const [newPlot, setNewPlot] = useState({ name: "", crop: "Soja", area: "", lat: "", lng: "", altitude: "", analysis: "" });
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
  const [mapFocus, setMapFocus] = useState<{ center: [number, number], zoom: number }>({ center: [-11.2027, 17.8739], zoom: 6 });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const addPlot = () => {
    if (!newPlot.name || !newPlot.lat || !newPlot.lng) return;

    const insertData: InsertPlot = {
      name: newPlot.name,
      crop: newPlot.crop,
      area: newPlot.area,
      health: (Math.floor(Math.random() * (95 - 75 + 1)) + 75).toString(),
      lat: newPlot.lat,
      lng: newPlot.lng,
      altitude: newPlot.altitude || "0",
      boundaryPoints: polygonPoints.length >= 3 ? JSON.stringify(polygonPoints) : null
    };

    createPlotMutation.mutate(insertData);
  };

  const viewOnMap = (plot: Plot) => {
    setNewPlot({
      name: plot.name,
      crop: plot.crop,
      area: plot.area.toString(),
      lat: plot.lat,
      lng: plot.lng,
      altitude: plot.altitude,
      analysis: plot.analysis || ""
    });
    // ... resto ...
    if (plot.boundaryPoints) {
      setPolygonPoints(plot.boundaryPoints);
    } else {
      setPolygonPoints([]);
    }
    setMapFocus({ center: [Number(plot.lat), Number(plot.lng)], zoom: 16 });
    setIsAddDialogOpen(true);
  };

  const removePlot = (id: string) => {
    deletePlotMutation.mutate(id);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Sidebar Navigation */}
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-20`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          {isSidebarOpen && (
            <div className="flex items-center gap-2 text-primary font-heading font-bold text-xl">
              <Sprout className="w-6 h-6" />
              <span>AgriSat</span>
            </div>
          )}
          {!isSidebarOpen && <Sprout className="w-6 h-6 text-primary mx-auto" />}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem icon={<Map className="w-5 h-5" />} label="Visão Geral" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} isOpen={isSidebarOpen} />
          <NavItem icon={<Droplets className="w-5 h-5" />} label="Irrigação" active={activeTab === "irrigation"} onClick={() => setActiveTab("irrigation")} isOpen={isSidebarOpen} />
          <NavItem icon={<Activity className="w-5 h-5" />} label="Saúde da Cultura" active={activeTab === "health"} onClick={() => setActiveTab("health")} isOpen={isSidebarOpen} />
          <NavItem icon={<CloudRain className="w-5 h-5" />} label="Clima" active={activeTab === "climate"} onClick={() => setActiveTab("climate")} isOpen={isSidebarOpen} />
          <NavItem icon={<MapPin className="w-5 h-5" />} label="Talhões" active={activeTab === "plots"} onClick={() => setActiveTab("plots")} isOpen={isSidebarOpen} />
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <NavItem icon={<Settings className="w-5 h-5" />} label="Configurações" isOpen={isSidebarOpen} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!isSidebarOpen)} className="hidden md:flex">
              <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </Button>
            <h1 className="font-heading font-semibold text-lg text-slate-800 dark:text-white hidden sm:block">Fazenda Vale Verde</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 mr-4">
              <span className="flex items-center gap-1"><Sun className="w-4 h-4 text-amber-500" /> 28°C</span>
              <span className="flex items-center gap-1"><Wind className="w-4 h-4 text-blue-400" /> 12 km/h</span>
            </div>
            <Avatar className="h-8 w-8 border border-slate-200">
              <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Agricultor" />
              <AvatarFallback>AG</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {activeTab === "overview" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Resumo da Fazenda</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Status global monitorado via satélite.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 bg-gradient-to-br from-blue-500 to-blue-700 text-white border-0 shadow-lg relative overflow-hidden">
                    <CardHeader className="relative z-10">
                      <CardTitle className="text-lg flex items-center gap-2">Recomendação de Irrigação</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 grid grid-cols-3 gap-4">
                      <div className="bg-white/10 p-4 rounded-xl">
                        <div className="text-xs text-blue-100">Volume</div>
                        <div className="text-2xl font-bold">12mm</div>
                      </div>
                      <div className="bg-white/10 p-4 rounded-xl">
                        <div className="text-xs text-blue-100">Janela</div>
                        <div className="text-2xl font-bold">22:00h</div>
                      </div>
                      <div className="bg-white/10 p-4 rounded-xl">
                        <div className="text-xs text-blue-100">Status</div>
                        <div className="text-2xl font-bold">Pendente</div>
                      </div>
                    </CardContent>
                    <CardFooter className="relative z-10">
                      <Button onClick={() => setActiveTab("irrigation")} variant="secondary" className="w-full">Detalhes da Irrigação</Button>
                    </CardFooter>
                  </Card>

                  <Card className="glass-panel text-center flex flex-col items-center justify-center p-6">
                    <div className="text-sm text-slate-500 mb-2">Score de Saúde</div>
                    <div className="text-6xl font-bold text-primary">88</div>
                    <Badge className="mt-4 bg-green-100 text-green-700">Excelente</Badge>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="glass-panel h-64 overflow-hidden relative cursor-pointer group" onClick={() => setActiveTab("plots")}>
                    <img src={satelliteFarm} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex flex-col justify-end">
                      <div className="text-white font-bold flex items-center gap-2"><Layers className="w-4 h-4" /> Mapa de Talhões</div>
                    </div>
                  </Card>
                  <Card className="glass-panel h-64 overflow-hidden relative cursor-pointer group" onClick={() => setActiveTab("health")}>
                    <img src={soilHeatmap} className="w-full h-full object-cover transition-transform group-hover:scale-105 grayscale" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex flex-col justify-end">
                      <div className="text-white font-bold flex items-center gap-2"><Activity className="w-4 h-4" /> Saúde por NDVI</div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "irrigation" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h2 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Gerenciamento de Irrigação</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="glass-panel p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Waves className="w-6 h-6 text-blue-500" />
                      <span className="font-bold">Ciclo Atual</span>
                    </div>
                    <div className="text-3xl font-bold mb-1">42%</div>
                    <Progress value={42} className="h-2 mb-2" />
                    <p className="text-xs text-slate-500">Próxima rega automática em 4h</p>
                  </Card>
                  <Card className="glass-panel p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CloudRain className="w-6 h-6 text-blue-400" />
                      <span className="font-bold">Economia de Água</span>
                    </div>
                    <div className="text-3xl font-bold mb-1">1.2k m³</div>
                    <p className="text-xs text-green-600 font-medium">↑ 12% vs mês anterior</p>
                  </Card>
                  <Card className="glass-panel p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <ThermometerSun className="w-6 h-6 text-orange-400" />
                      <span className="font-bold">Umidade Solo</span>
                    </div>
                    <div className="text-3xl font-bold mb-1">32%</div>
                    <p className="text-xs text-amber-600 font-medium">Limiar de estresse: 25%</p>
                  </Card>
                </div>
                <Card className="glass-panel p-6">
                  <CardTitle className="mb-4 text-lg">Histórico de Consumo (7 dias)</CardTitle>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={waterForecastData}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip />
                        <Bar dataKey="need" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "health" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h2 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Saúde da Cultura (NDVI)</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="glass-panel overflow-hidden border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-sm">Mapa de Vigor Vegetativo</CardTitle>
                    </CardHeader>
                    <div className="h-80 relative">
                      <img src={satelliteFarm} className="w-full h-full object-cover" />
                      <div className="absolute top-4 right-4 bg-black/80 text-white p-2 rounded text-[10px] space-y-1">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div> Saudável (0.8+)</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div> Atenção (0.5-0.7)</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Alerta (&lt;0.4)</div>
                      </div>
                    </div>
                  </Card>
                  <Card className="glass-panel p-6">
                    <CardTitle className="text-sm mb-6">Tendência de Crescimento</CardTitle>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={healthHistoryData}>
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 1]} />
                          <Tooltip />
                          <Area type="monotone" dataKey="ndvi" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-bold text-sm text-blue-900 dark:text-blue-300">Insights de IA</div>
                        <p className="text-xs text-blue-700 dark:text-blue-400">O crescimento acelerado na última semana sugere necessidade de aumento na suplementação de nitrogênio no Talhão 02.</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "climate" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h2 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Central Climática</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-6 bg-amber-500 text-white rounded-2xl flex flex-col items-center justify-center">
                    <Sun className="w-10 h-10 mb-2" />
                    <div className="text-3xl font-bold">28°C</div>
                    <div className="text-xs opacity-80">Céu Limpo</div>
                  </div>
                  <div className="p-6 bg-blue-500 text-white rounded-2xl flex flex-col items-center justify-center">
                    <CloudRain className="w-10 h-10 mb-2" />
                    <div className="text-3xl font-bold">12%</div>
                    <div className="text-xs opacity-80">Prob. Chuva</div>
                  </div>
                  <div className="p-6 bg-slate-800 text-white rounded-2xl flex flex-col items-center justify-center">
                    <Wind className="w-10 h-10 mb-2" />
                    <div className="text-3xl font-bold">14km/h</div>
                    <div className="text-xs opacity-80">Vento SE</div>
                  </div>
                  <div className="p-6 bg-indigo-600 text-white rounded-2xl flex flex-col items-center justify-center">
                    <CloudLightning className="w-10 h-10 mb-2" />
                    <div className="text-3xl font-bold">Baixo</div>
                    <div className="text-xs opacity-80">Risco Raios</div>
                  </div>
                </div>
                <Card className="glass-panel p-6">
                  <CardTitle className="mb-6">Previsão Semanal</CardTitle>
                  <div className="grid grid-cols-7 gap-2">
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, i) => (
                      <div key={day} className="text-center p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="text-xs text-slate-500 mb-2">{day}</div>
                        {i === 2 ? <CloudRain className="w-6 h-6 mx-auto text-blue-400" /> : <Sun className="w-6 h-6 mx-auto text-amber-400" />}
                        <div className="mt-2 font-bold text-sm">{24 + i}°</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "plots" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Gerenciamento de Talhões</h2>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        className="gap-2 shadow-lg hover:shadow-primary/20 transition-all"
                        onClick={() => {
                          setNewPlot({ name: "", crop: "Soja", area: "", lat: "", lng: "", altitude: "" });
                          setPolygonPoints([]);
                          setMapFocus({ center: [-11.2027, 17.8739], zoom: 6 });
                        }}
                      >
                        <Plus className="w-4 h-4" /> Adicionar Talhão
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[1000px] p-0 overflow-hidden border-0 gap-0">
                      <div className="flex flex-col md:flex-row h-[600px] max-h-[90vh]">
                        {/* Map Section */}
                        <div className="w-full md:w-3/5 h-64 md:h-full relative bg-slate-200 z-0">
                          <MapContainer
                            center={mapFocus.center}
                            zoom={mapFocus.zoom}
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={true}
                          >
                            <MapController center={mapFocus.center} zoom={mapFocus.zoom} />
                            <TileLayer
                              attribution='&copy; Google Maps'
                              url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                              subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                            />
                            <MapEvents onLocationSelect={(lat, lng) => {
                              if (!newPlot.lat || !newPlot.lng) {
                                // Primeiro clique: Centro e Telemetria
                                const simulatedAlt = Math.floor((Math.abs(lat) * 15) + (Math.abs(lng) * 8) + 350);
                                setNewPlot(prev => ({
                                  ...prev,
                                  lat: lat.toFixed(6),
                                  lng: lng.toFixed(6),
                                  altitude: simulatedAlt.toString()
                                }));
                                toast({
                                  title: "Centro Definido",
                                  description: "Agora clique em 4 pontos para delimitar a área.",
                                });
                              } else if (polygonPoints.length < 4) {
                                // Próximos 4 cliques: Polígono
                                const newPoints: [number, number][] = [...polygonPoints, [lat, lng]];
                                setPolygonPoints(newPoints);

                                if (newPoints.length === 4) {
                                  // Calcular área automaticamente
                                  const areaHectares = calculateArea(newPoints);
                                  setNewPlot(prev => ({ ...prev, area: areaHectares.toString() }));
                                  toast({
                                    title: "Zona Delimitada",
                                    description: `Área de ${areaHectares}ha calculada automaticamente.`,
                                  });
                                }
                              }
                            }} />
                            {newPlot.lat && newPlot.lng && (
                              <Marker position={[Number(newPlot.lat), Number(newPlot.lng)]} />
                            )}
                            {polygonPoints.length > 0 && (
                              <Polygon
                                positions={polygonPoints}
                                pathOptions={{ color: 'yellow', fillColor: 'yellow', fillOpacity: 0.3 }}
                              />
                            )}
                          </MapContainer>
                          <div className="absolute top-4 left-4 z-[1000] space-y-2">
                            <div className="bg-white/90 backdrop-blur p-2 rounded-lg shadow-xl border border-slate-200 pointer-events-none">
                              <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1">
                                <Activity className="w-3 h-3" /> Modo: {!newPlot.lat ? "Definir Centro" : polygonPoints.length < 4 ? `Delimitar (${polygonPoints.length}/4)` : "Pronto"}
                              </span>
                            </div>
                            <div className="bg-white/90 backdrop-blur p-2 rounded-lg shadow-xl border border-slate-200 pointer-events-none">
                              <span className="text-[10px] font-mono text-slate-800 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-primary" />
                                {!newPlot.lat ? "1º clique: Centro do Talhão" : polygonPoints.length < 4 ? "Clique nos limites da área" : "Área Delimitada com Sucesso"}
                              </span>
                            </div>
                          </div>
                          {polygonPoints.length > 0 && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="absolute bottom-4 left-4 z-[1000] h-8 text-[10px]"
                              onClick={() => { setPolygonPoints([]); setNewPlot(p => ({ ...p, area: "" })); }}
                            >
                              <Trash2 className="w-3 h-3 mr-1" /> Limpar Pontos
                            </Button>
                          )}
                        </div>

                        {/* Form Section */}
                        <div className="w-full md:w-2/5 p-6 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
                          <DialogHeader className="mb-6">
                            <DialogTitle className="text-xl font-heading">Novo Mapeamento</DialogTitle>
                            <DialogDescription>
                              Insira os detalhes do terreno e as coordenadas geográficas.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4 flex-1">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="name">Identificação</Label>
                                <Input id="name" value={newPlot.name} onChange={(e) => setNewPlot({ ...newPlot, name: e.target.value })} placeholder="Ex: Talhão 04" />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="crop">Cultura</Label>
                                <Select value={newPlot.crop} onValueChange={(v) => setNewPlot({ ...newPlot, crop: v })}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Cultura" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Soja">Soja</SelectItem>
                                    <SelectItem value="Milho">Milho</SelectItem>
                                    <SelectItem value="Algodão">Algodão</SelectItem>
                                    <SelectItem value="Trigo">Trigo</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="area">Área Total (Equitários)</Label>
                              <div className="relative">
                                <Input id="area" type="number" value={newPlot.area} onChange={(e) => setNewPlot({ ...newPlot, area: e.target.value })} placeholder="0.00" />
                                <span className="absolute right-3 top-2.5 text-xs text-slate-400">ha</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="lat">Latitude</Label>
                                <Input id="lat" value={newPlot.lat} onChange={(e) => setNewPlot({ ...newPlot, lat: e.target.value })} placeholder="-12.3456" />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="lng">Longitude</Label>
                                <Input id="lng" value={newPlot.lng} onChange={(e) => setNewPlot({ ...newPlot, lng: e.target.value })} placeholder="-45.6789" />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="altitude">Altitude (Metros)</Label>
                              <div className="relative">
                                <Input id="altitude" value={newPlot.altitude} onChange={(e) => setNewPlot({ ...newPlot, altitude: e.target.value })} placeholder="Ex: 520" />
                                <span className="absolute right-3 top-2.5 text-xs text-slate-400">m</span>
                              </div>
                            </div>

                            {newPlot.analysis && (
                              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
                                <h4 className="text-xs font-bold text-primary flex items-center gap-1 uppercase">
                                  <Activity className="w-3 h-3" /> Análise Agronômica Groq AI
                                </h4>
                                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                  "{newPlot.analysis}"
                                </p>
                              </div>
                            )}

                            {dbPlots.find(p => p.name === newPlot.name && p.lat === newPlot.lat) && (
                              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                  <MessageSquare className="w-3 h-3" /> Chat Agrosatelite IA
                                </h4>

                                <div className="max-h-[200px] overflow-y-auto space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                                  {plots.find(p => p.name === newPlot.name)?.chatHistory ? (
                                    JSON.parse(plots.find(p => p.name === newPlot.name)!.chatHistory!).map((m: any, idx: number) => (
                                      <div key={idx} className={cn(
                                        "p-2 rounded-lg text-[11px] max-w-[90%]",
                                        m.role === "user" ? "bg-primary/10 ml-auto text-primary-dark" : "bg-white dark:bg-slate-800 shadow-sm border border-slate-100"
                                      )}>
                                        <span className="font-bold block mb-1 opacity-50 uppercase text-[9px]">
                                          {m.role === "user" ? "Produtor" : "AgriSat IA"}
                                        </span>
                                        {m.content}
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-[10px] text-slate-400 text-center py-4 italic">
                                      Inicie uma conversa técnica sobre este talhão...
                                    </p>
                                  )}
                                  {chatMutation.isPending && (
                                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg text-[11px] max-w-[90%] shadow-sm border border-slate-100 animate-pulse">
                                      Digitando...
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Pergunte sobre o solo, clima ou plantio..."
                                    className="text-xs h-9"
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && chatMessage) {
                                        const p = dbPlots.find(idx => idx.name === newPlot.name);
                                        if (p) chatMutation.mutate({ id: p.id, message: chatMessage });
                                      }
                                    }}
                                  />
                                  <Button
                                    size="icon"
                                    className="h-9 w-9 shrink-0"
                                    disabled={!chatMessage || chatMutation.isPending}
                                    onClick={() => {
                                      const p = dbPlots.find(idx => idx.name === newPlot.name);
                                      if (p) chatMutation.mutate({ id: p.id, message: chatMessage });
                                    }}
                                  >
                                    <Send className="w-4 h-4" />
                                  </Button>
                                </div>

                                <Button
                                  onClick={() => {
                                    const p = dbPlots.find(idx => idx.name === newPlot.name);
                                    if (p) analyzeMutation.mutate(p.id);
                                  }}
                                  variant="ghost"
                                  className="w-full gap-2 text-[10px] text-slate-400 hover:text-primary"
                                  disabled={analyzeMutation.isPending}
                                >
                                  {analyzeMutation.isPending ? <Activity className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                  Atualizar Análise Base
                                </Button>
                              </div>
                            )}
                          </div>

                          <DialogFooter className="mt-8">
                            <Button
                              onClick={addPlot}
                              className="w-full flex items-center justify-center gap-2 py-6 text-base"
                              disabled={!newPlot.name || !newPlot.lat || !newPlot.lng || polygonPoints.length < 4}
                            >
                              <Layers className="w-4 h-4" />
                              {polygonPoints.length < 4 ? `Marque ${4 - polygonPoints.length} pontos para salvar` : "Registrar Talhão"}
                            </Button>
                          </DialogFooter>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plots.map(plot => (
                    <Card key={plot.id} className="glass-panel overflow-hidden group relative">
                      <div className="h-32 bg-slate-200 relative">
                        <img src={satelliteFarm} className="w-full h-full object-cover opacity-50" />
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-slate-800 text-xl">{plot.name}</div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                          onClick={() => removePlot(plot.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Cultura</span>
                          <span className="font-medium">{plot.crop}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Área</span>
                          <span className="font-medium">{plot.area} ha</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Saúde</span>
                          <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">{plot.health}%</Badge>
                        </div>

                        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                            <MapPin className="w-3 h-3" /> {plot.lat}, {plot.lng}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                            <Activity className="w-3 h-3" /> Elev: {plot.altitude}m
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 group-hover:bg-primary group-hover:text-white transition-colors"
                          onClick={() => viewOnMap(plot)}
                        >
                          Mapear Terreno
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {plots.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      Nenhum talhão registrado. Adicione um para iniciar o monitoramento.
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

// Helper Component for Sidebar
function NavItem({ icon, label, active = false, onClick, isOpen }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, isOpen: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group cursor-pointer
        ${active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
        } `}
    >
      <div className={`${active ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
        {icon}
      </div>
      {isOpen && <span>{label}</span>}
    </button>
  );
}