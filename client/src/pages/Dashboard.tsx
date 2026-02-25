import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { useLocation, useRoute } from "wouter";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plot as DbPlot, InsertPlot } from "@shared/schema";

import React, { useState, useEffect } from "react";
import {
  Droplets, Map, Activity, CloudRain,
  Settings, User, Bell, ChevronRight, Menu, MapPin,
  Cloud, CloudLightning, Waves, Layers, Plus, Trash2, X, MessageSquare, Send, RefreshCw, CloudSun, Loader2,
  Sprout, Sun, Wind, ThermometerSun, AlertTriangle, Sunrise, Eye, Gauge, Moon
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
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";

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

function MapEvents({ onLocationSelect, onMapChange }: { onLocationSelect: (lat: number, lng: number) => void, onMapChange: (center: [number, number], zoom: number) => void }) {
  useMapEvents({
    click(e: any) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
    moveend(e: any) {
      const map = e.target;
      const center = map.getCenter();
      onMapChange([center.lat, center.lng], map.getZoom());
    }
  });
  return null;
}

const WeatherLayerControl = ({
  activeLayer,
  onLayerSelect,
  layers
}: {
  activeLayer: string | null,
  onLayerSelect: (id: string | null) => void,
  layers: any[]
}) => {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-2 shadow-2xl">
        <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1 tracking-wider">Camadas Ativas</div>
        <div className="flex flex-col gap-1">
          {layers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => onLayerSelect(activeLayer === layer.id ? null : layer.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                activeLayer === layer.id
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/50"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
              )}
            >
              <div className={cn("p-1 rounded-md bg-slate-800", layer.color)}>
                {layer.icon}
              </div>
              {layer.label}
              {activeLayer === layer.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
            </button>
          ))}

          {activeLayer && (
            <button
              onClick={() => onLayerSelect(null)}
              className="mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/30"
            >
              <X className="w-3 h-3" /> Limpar Filtros
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);

    // Múltiplos disparos de invalidateSize para garantir alinhamento pós-animação
    const timers = [
      setTimeout(() => map.invalidateSize(), 200),
      setTimeout(() => map.invalidateSize(), 500),
      setTimeout(() => map.invalidateSize(), 1500)
    ];

    // ResizeObserver para garantir que o mapa preencha o container se ele mudar de tamanho (ex: modal abrindo)
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    const container = map.getContainer();
    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      timers.forEach(t => clearTimeout(t));
      resizeObserver.disconnect();
    };
  }, [center, zoom, map]);
  return null;
}

function AIChatBox({ plot, chatMutation, analyzeMutation }: { plot: Plot, chatMutation: any, analyzeMutation: any }) {
  const [chatMessage, setChatMessage] = useState("");
  const history = plot.chatHistory ? JSON.parse(plot.chatHistory) : [];

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
        <MessageSquare className="w-3 h-3" /> Chat Agrosatelite IA
      </h4>

      <div className="max-h-[300px] overflow-y-auto space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 custom-scrollbar">
        {history.length > 0 ? (
          history.map((m: any, idx: number) => (
            <div key={idx} className={cn(
              "p-3 rounded-2xl text-[11px] max-w-[90%] shadow-sm",
              m.role === "user"
                ? "bg-primary text-white ml-auto"
                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700"
            )}>
              <span className={cn(
                "font-bold block mb-1 uppercase text-[9px] opacity-70",
                m.role === "user" ? "text-white/80" : "text-primary"
              )}>
                {m.role === "user" ? "Produtor" : "AgriSat IA"}
              </span>
              {m.content}
            </div>
          ))
        ) : (
          <div className="py-8 text-center space-y-2">
            <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center mx-auto text-primary">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-[10px] text-slate-400 italic">
              Inicie uma conversa técnica sobre este talhão...
            </p>
          </div>
        )}
        {chatMutation.isPending && (
          <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl text-[11px] max-w-[80%] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="animate-pulse">Analisando dados...</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Dúvidas sobre plantio, solo ou clima?"
          className="text-xs h-10 rounded-xl border-slate-200 dark:border-slate-800"
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && chatMessage) {
              chatMutation.mutate({ id: plot.id, message: chatMessage });
              setChatMessage("");
            }
          }}
        />
        <Button
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl shadow-lg shadow-primary/20"
          disabled={!chatMessage || chatMutation.isPending}
          onClick={() => {
            chatMutation.mutate({ id: plot.id, message: chatMessage });
            setChatMessage("");
          }}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <Button
        onClick={() => analyzeMutation.mutate(plot.id)}
        variant="ghost"
        className="w-full gap-2 text-[10px] text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg"
        disabled={analyzeMutation.isPending}
      >
        {analyzeMutation.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        Forçar Nova Análise de Satélite
      </Button>
    </div>
  );
}

function AIAnalysisDialog({
  open,
  onClose,
  plotId,
  chatMutation,
  analyzeMutation
}: {
  open: boolean,
  onClose: () => void,
  plotId: string | null,
  chatMutation: any,
  analyzeMutation: any
}) {
  // Always read from React Query cache so chat history updates after each message
  const { data: dbPlots = [] } = useQuery<DbPlot[]>({ queryKey: ["/api/plots"] });
  const plot = dbPlots.find(p => p.id === plotId) ?? null;

  if (!plot) return null;

  const plotForDisplay: Plot = {
    ...plot,
    area: Number(plot.area),
    health: Number(plot.health),
    boundaryPoints: plot.boundaryPoints ? JSON.parse(plot.boundaryPoints) : undefined
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl rounded-3xl">
        <div className="bg-gradient-to-br from-slate-900 to-primary/20 p-6 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Activity className="w-24 h-24" />
          </div>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/20 rounded-xl backdrop-blur-md">
                <Sprout className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-heading font-bold">Relatório de IA Ativado</DialogTitle>
                <DialogDescription className="text-white/60 text-xs">
                  Analisando {plot.name} ({plot.crop}) em tempo real.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900">
          <div className="space-y-6">
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 relative overflow-hidden group">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                  Análise Agronômica (Groq AI)
                </h4>
              </div>

              {analyzeMutation.isPending ? (
                <div className="space-y-2 py-4">
                  <div className="h-2 w-full bg-primary/20 animate-pulse rounded" />
                  <div className="h-2 w-3/4 bg-primary/20 animate-pulse rounded" />
                  <div className="h-2 w-5/6 bg-primary/20 animate-pulse rounded" />
                  <p className="text-[10px] text-center text-primary/60 font-medium animate-pulse mt-4">
                    Sincronizando com satélite e gerando insights...
                  </p>
                </div>
              ) : (
                <div className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                  {plot.analysis || "A aguardar dados detalhados..."}
                </div>
              )}
            </div>

            <AIChatBox
              plot={plotForDisplay}
              chatMutation={chatMutation}
              analyzeMutation={analyzeMutation}
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-center">
          <Button variant="ghost" onClick={onClose} className="text-xs text-slate-500 hover:text-slate-900 uppercase font-bold tracking-widest">
            Fechar Diálogo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/:tab");
  const activeTab = params?.tab || "overview";
  const setActiveTab = (tab: string) => {
    if (tab === "overview") {
      setLocation("/");
    } else {
      setLocation(`/${tab}`);
    }
  };

  const [newPlot, setNewPlot] = useState({ name: "", crop: "Soja", area: "", lat: "", lng: "", altitude: "", analysis: "" });
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
  const [mapFocus, setMapFocus] = useState<{ center: [number, number], zoom: number }>({ center: [-11.2027, 17.8739], zoom: 6 });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeWeatherLayer, setActiveWeatherLayer] = useState<string | null>(null);
  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  const [plotForAnalysisId, setPlotForAnalysisId] = useState<string | null>(null);

  const weatherLayers = [
    { id: "precipitation_new", label: "Chuva", icon: <CloudRain className="w-3 h-3" />, color: "text-blue-400" },
    { id: "temp_new", label: "Temp", icon: <ThermometerSun className="w-3 h-3" />, color: "text-orange-400" },
    { id: "clouds_new", label: "Nuvens", icon: <Cloud className="w-3 h-3" />, color: "text-slate-300" },
    { id: "wind_new", label: "Vento", icon: <Wind className="w-3 h-3" />, color: "text-cyan-400" },
  ];

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
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data: DbPlot) => {
      queryClient.invalidateQueries({ queryKey: ["/api/plots"] });
      setNewPlot({ name: "", crop: "Soja", area: "", lat: "", lng: "", altitude: "", analysis: "" });
      setPolygonPoints([]);
      setIsAddDialogOpen(false);

      // Auto-trigger analysis and open dialog
      setPlotForAnalysisId(data.id);
      setIsAnalysisDialogOpen(true);
      if (data.id) {
        analyzeMutation.mutate(data.id);
      }

      toast({
        title: "Sucesso!",
        description: "Talhão registrado. Iniciando análise técnica...",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao registrar",
        description: error.message || "Verifique os dados e tente novamente.",
        variant: "destructive"
      });
    }
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
    onError: () => {
      toast({
        title: "Erro no Chat",
        description: "A IA não conseguiu responder no momento.",
        variant: "destructive"
      });
    }
  });

  const [telemetry, setTelemetry] = useState<any>(null);
  const { data: liveTelemetry } = useQuery({
    queryKey: ["/api/plots/telemetry", newPlot.name], // Use name as trigger for simplicity in this dialog
    queryFn: async () => {
      if (!newPlot.lat || !newPlot.lng) return null;
      const res = await apiRequest("GET", `/api/plots/fake-id/telemetry?lat=${newPlot.lat}&lng=${newPlot.lng}`);
      return res.json();
    },
    enabled: isAddDialogOpen && !!newPlot.lat,
    refetchInterval: 10000 // Refresh a cada 10s para simular alta frequência
  });

  const { data: provincialWeather, isLoading: loadingProvinces } = useQuery<any[]>({
    queryKey: ["/api/weather/provinces"],
    enabled: activeTab === "climate",
    refetchInterval: 60000 // 1 minuto para o painel global (mais frequente)
  });

  const refreshWeather = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/weather/provinces"] });
    toast({
      title: "Sincronizando...",
      description: "Buscando dados meteorológicos de satélite atualizados.",
    });
  };

  const [selectedProvince, setSelectedProvince] = useState<any>(null);
  const [isSwitchingProvince, setIsSwitchingProvince] = useState(false);
  const [isSwitchingPlot, setIsSwitchingPlot] = useState(false);

  const handleProvinceSelect = (province: any) => {
    if (selectedProvince?.name === province.name) return;
    setIsSwitchingProvince(true);
    // Simular processamento/sincronização para feedback visual
    setTimeout(() => {
      setSelectedProvince(province);
      setIsSwitchingProvince(false);
    }, 800);
  };



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

  const viewOnMap = (plot: DbPlot) => {
    setIsSwitchingPlot(true);
    setNewPlot({
      name: plot.name,
      crop: plot.crop,
      area: plot.area.toString(),
      lat: plot.lat,
      lng: plot.lng,
      altitude: plot.altitude,
      analysis: plot.analysis || ""
    });

    if (plot.boundaryPoints) {
      try {
        setPolygonPoints(JSON.parse(plot.boundaryPoints));
      } catch (e) {
        console.error("Erro ao processar geometria do talhão:", e);
        setPolygonPoints([]);
      }
    } else {
      setPolygonPoints([]);
    }
    setMapFocus({ center: [Number(plot.lat), Number(plot.lng)], zoom: 16 });
    setIsAddDialogOpen(true);

    // Pequeno delay para sensação de sincronização
    setTimeout(() => setIsSwitchingPlot(false), 600);
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
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-r border-slate-200 dark:border-slate-800">
                <SheetHeader className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <SheetTitle className="flex items-center gap-2 text-primary font-heading font-bold text-xl">
                    <Sprout className="w-6 h-6" />
                    <span>AgriSat</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="p-4 space-y-2">
                  <SheetClose asChild>
                    <NavItem icon={<Map className="w-5 h-5" />} label="Visão Geral" active={activeTab === "overview"} onClick={() => { setActiveTab("overview"); }} isOpen={true} />
                  </SheetClose>
                  <SheetClose asChild>
                    <NavItem icon={<Droplets className="w-5 h-5" />} label="Irrigação" active={activeTab === "irrigation"} onClick={() => { setActiveTab("irrigation"); }} isOpen={true} />
                  </SheetClose>
                  <SheetClose asChild>
                    <NavItem icon={<Activity className="w-5 h-5" />} label="Saúde da Cultura" active={activeTab === "health"} onClick={() => { setActiveTab("health"); }} isOpen={true} />
                  </SheetClose>
                  <SheetClose asChild>
                    <NavItem icon={<CloudRain className="w-5 h-5" />} label="Clima" active={activeTab === "climate"} onClick={() => { setActiveTab("climate"); }} isOpen={true} />
                  </SheetClose>
                  <SheetClose asChild>
                    <NavItem icon={<MapPin className="w-5 h-5" />} label="Talhões" active={activeTab === "plots"} onClick={() => { setActiveTab("plots"); }} isOpen={true} />
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>

            {/* Desktop Toggle Button */}
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
                  <Card className="glass-panel h-80 overflow-hidden relative cursor-pointer group" onClick={() => setActiveTab("plots")}>
                    <div className="w-full h-full pointer-events-none opacity-80">
                      <MapContainer
                        center={[-11.2027, 17.8739]}
                        zoom={6}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                        attributionControl={false}
                      >
                        <TileLayer
                          url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                        />
                        {activeWeatherLayer && (
                          <TileLayer
                            key={activeWeatherLayer}
                            url={`https://tile.openweathermap.org/map/${activeWeatherLayer}/{z}/{x}/{y}.png?appid=${import.meta.env.VITE_OPENWEATHER_API_KEY || 'de23633304cc83584c64369524097f74'}`}
                            opacity={0.5}
                          />
                        )}
                      </MapContainer>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end transition-all group-hover:from-black/90">
                      <div className="text-white font-bold text-lg flex items-center gap-2 mb-1">
                        <Layers className="w-5 h-5 text-primary" /> Global: Mapa de Talhões
                      </div>
                      <p className="text-white/60 text-xs">Visualize todos os seus talhões e camadas climáticas em tempo real.</p>
                      <div className="mt-4 flex gap-2">
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">SATÉLITE</Badge>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">LIVE</Badge>
                      </div>
                    </div>
                  </Card>

                  <Card className="glass-panel h-80 overflow-hidden relative cursor-pointer group" onClick={() => setActiveTab("health")}>
                    <div className="w-full h-full pointer-events-none opacity-80 grayscale-[0.5]">
                      <MapContainer
                        center={[-12.77, 15.73]}
                        zoom={8}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                        attributionControl={false}
                      >
                        <TileLayer
                          url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                        />
                      </MapContainer>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end transition-all group-hover:from-black/90">
                      <div className="text-white font-bold text-lg flex items-center gap-2 mb-1">
                        <Activity className="w-5 h-5 text-green-400" /> Vigor Vegetativo (NDVI)
                      </div>
                      <p className="text-white/60 text-xs">Análise multiespectral de biomassa e saúde foliar via Sentinel-2.</p>
                      <div className="mt-4 flex gap-2">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">SENTINEL-2</Badge>
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">AI-POWERED</Badge>
                      </div>
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
                    <CardHeader className="border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Map className="w-4 h-4 text-primary" /> Índice de Vigor Vegetativo (NDVI)
                      </CardTitle>
                    </CardHeader>
                    <div className="h-[400px] relative">
                      <MapContainer
                        center={[-12.77, 15.73]}
                        zoom={10}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={true}
                      >
                        <MapController center={[-12.77, 15.73]} zoom={10} />
                        <TileLayer
                          attribution='&copy; Google Maps'
                          url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                        />

                        {activeWeatherLayer && (
                          <TileLayer
                            key={activeWeatherLayer}
                            attribution='&copy; OpenWeatherMap'
                            url={`https://tile.openweathermap.org/map/${activeWeatherLayer}/{z}/{x}/{y}.png?appid=${import.meta.env.VITE_OPENWEATHER_API_KEY || 'de23633304cc83584c64369524097f74'}`}
                            opacity={0.6}
                            zIndex={500}
                          />
                        )}
                      </MapContainer>

                      <WeatherLayerControl
                        activeLayer={activeWeatherLayer}
                        onLayerSelect={setActiveWeatherLayer}
                        layers={weatherLayers}
                      />

                      <div className="absolute top-4 right-16 z-[1000] bg-black/80 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-white/10 text-[10px] space-y-2">
                        <div className="font-bold border-b border-white/10 pb-1 mb-1 uppercase tracking-wider text-primary">Legenda NDVI</div>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-emerald-500 rounded-sm shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                          <span className="font-medium">Saudável (0.8 - 1.0)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-amber-500 rounded-sm shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                          <span className="font-medium">Atenção (0.5 - 0.7)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-rose-600 rounded-sm shadow-[0_0_8px_rgba(225,29,72,0.5)]"></div>
                          <span className="font-medium">Alerta (&lt; 0.4)</span>
                        </div>
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
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CloudRain className="w-6 h-6 text-primary" /> Clima (Live) Nacional
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={refreshWeather}
                      className="px-3 py-1 bg-primary text-white rounded-md text-[10px] font-bold shadow-sm hover:bg-primary/90 transition-all flex items-center gap-1"
                      disabled={loadingProvinces}
                    >
                      {loadingProvinces ? "..." : "ATUALIZAR AGORA"}
                    </button>
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      Sincronizado: {new Date().toLocaleTimeString()}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {loadingProvinces ? (
                    Array(18).fill(0).map((_, i) => (
                      <Card key={i} className="h-40 animate-pulse bg-slate-100 dark:bg-slate-800" />
                    ))
                  ) : provincialWeather?.map((p) => (
                    <Card
                      key={p.name}
                      className={`p-4 cursor-pointer hover:shadow-md transition-all border-slate-200 group ${selectedProvince?.name === p.name ? 'ring-2 ring-primary border-primary' : ''} ${isSwitchingProvince && selectedProvince?.name === p.name ? 'opacity-50' : ''}`}
                      onClick={() => handleProvinceSelect(p)}
                    >
                      <div className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-primary transition-colors">{p.name}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-2xl font-bold text-slate-800 dark:text-white">{p.weather.temp}°</div>
                        {(() => {
                          const desc = p.weather.description.toLowerCase();
                          const isDay = p.weather.isDay;
                          if (desc.includes("chuva") || desc.includes("aguaceiros")) return <CloudRain className="w-5 h-5 text-blue-400" />;
                          if (desc.includes("trovoada")) return <CloudLightning className="w-5 h-5 text-purple-400" />;
                          return isDay ?
                            <Sun className="w-5 h-5 text-yellow-500" /> :
                            <Moon className="w-5 h-5 text-blue-300" />;
                        })()}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                        <Wind className="w-3 h-3" /> {p.weather.windSpeed} km/h
                      </div>
                      <div className="mt-1 text-[9px] text-slate-400 italic">
                        {p.weather.description}
                      </div>
                    </Card>
                  ))}
                </div>

                {selectedProvince && (
                  <Card className="p-6 bg-slate-900 text-white border-0 shadow-2xl relative overflow-hidden min-h-[400px]">
                    {isSwitchingProvince && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                        <div className="text-primary font-bold tracking-widest text-xs uppercase animate-pulse">Sincronizando Satélite...</div>
                      </div>
                    )}
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                      <CloudSun className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-3xl font-bold">{selectedProvince.name}</h3>
                          <p className="text-blue-300">Localização Capital: {selectedProvince.lat}, {selectedProvince.lng}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedProvince(null)} className="text-white hover:bg-white/10">
                          <X className="w-5 h-5" />
                        </Button>
                      </div>

                      <div className="flex flex-col lg:flex-row gap-6">
                        <div className="lg:w-1/4 bg-white/10 p-6 rounded-2xl flex flex-col justify-center items-center text-center">
                          <div className="text-sm opacity-60 mb-2 uppercase font-bold tracking-widest">Condição Atual</div>
                          <div className="flex flex-col items-center">
                            <div className="relative mb-2">
                              {(() => {
                                const desc = selectedProvince.weather.description.toLowerCase();
                                const isDay = selectedProvince.weather.isDay;

                                if (desc.includes("chuva") || desc.includes("aguaceiros")) return <CloudRain className="w-16 h-16 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />;
                                if (desc.includes("trovoada")) return <CloudLightning className="w-16 h-16 text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]" />;
                                if (desc.includes("nublado") || desc.includes("encoberto")) return <CloudSun className="w-16 h-16 text-slate-300" />;

                                return isDay ?
                                  <Sun className="w-16 h-16 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]" /> :
                                  <Moon className="w-16 h-16 text-blue-200 drop-shadow-[0_0_12px_rgba(191,219,254,0.6)]" />;
                              })()}
                            </div>
                            <div className="text-5xl font-black flex items-start">
                              {selectedProvince.weather.temp.toFixed(1)}
                              <span className="text-xl mt-1 ml-0.5 text-blue-100">°</span>
                            </div>
                            <p className="mt-1 text-sm text-blue-100 uppercase font-bold tracking-wide">{selectedProvince.weather.description}</p>
                            <div className="mt-4 flex items-center gap-1.5 opacity-40 text-[9px] uppercase font-bold">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                              Satélite: {selectedProvince.weather.time || "Sincronizado"}
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { icon: <Sunrise className="w-3 h-3 text-amber-400" />, label: "Nascer do Sol", value: selectedProvince.weather.sunrise || "--:--" },
                            { icon: <Sun className="w-3 h-3 text-yellow-400" />, label: "Índice UV", value: selectedProvince.weather.uvIndex?.toFixed(1) || "0.0" },
                            { icon: <Wind className="w-3 h-3 text-slate-400" />, label: "Vento", value: `${selectedProvince.weather.windSpeed?.toFixed(1) || "0.0"} km/h` },
                            { icon: <ThermometerSun className="w-3 h-3 text-orange-400" />, label: "Sensação", value: `${selectedProvince.weather.apparentTemp?.toFixed(1) || selectedProvince.weather.temp}°` },
                            { icon: <CloudRain className="w-3 h-3 text-blue-400" />, label: "Precipitação", value: `${selectedProvince.weather.rain} mm` },
                            { icon: <Droplets className="w-3 h-3 text-cyan-400" />, label: "Humidade", value: `${selectedProvince.weather.humidity}%` },
                            { icon: <Eye className="w-3 h-3 text-indigo-400" />, label: "Visibilidade", value: `${selectedProvince.weather.visibility?.toFixed(1) || "10.0"} km` },
                            { icon: <Gauge className="w-3 h-3 text-emerald-400" />, label: "Pressão", value: `${selectedProvince.weather.pressure?.toFixed(0) || "1013"} hPa` },
                          ].map((item, idx) => (
                            <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/10 group hover:bg-white/10 transition-all flex flex-col justify-between">
                              <div className="flex items-center gap-2 mb-2">
                                {item.icon}
                                <div className="text-[10px] opacity-60 uppercase font-bold tracking-tight">{item.label}</div>
                              </div>
                              <div className="text-xl font-bold whitespace-nowrap">{item.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                        <div className="lg:col-span-4 bg-white/5 p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
                          <h4 className="font-bold mb-4 text-sm flex items-center gap-2">
                            <Droplets className="w-4 h-4" /> Recomendação Hídrica
                          </h4>
                          <div className="space-y-4">
                            <div className="text-2xl font-bold text-blue-300">Irrigação Moderada</div>
                            <p className="text-[11px] opacity-70">Baseado na evapotranspiração de {selectedProvince.name}, recomenda-se janela de rega entre 18:00 e 21:00 para maximizar absorção.</p>
                            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 text-[10px] text-blue-200">
                              <span className="font-bold uppercase block mb-1">Nota Técnica:</span>
                              Evite regar durante o pico de radiação UV ({selectedProvince.weather.uvIndex}) para prevenir estresse térmico radicular.
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-8 bg-white/5 rounded-2xl border border-white/10 overflow-hidden relative min-h-[350px]">
                          <MapContainer
                            center={[Number(selectedProvince.lat), Number(selectedProvince.lng)]}
                            zoom={9}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                          >
                            <MapController center={[Number(selectedProvince.lat), Number(selectedProvince.lng)]} zoom={9} />
                            <TileLayer
                              attribution='&copy; Google Maps'
                              url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                              subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                            />

                            {activeWeatherLayer && (
                              <TileLayer
                                key={activeWeatherLayer}
                                attribution='&copy; OpenWeatherMap'
                                url={`https://tile.openweathermap.org/map/${activeWeatherLayer}/{z}/{x}/{y}.png?appid=${import.meta.env.VITE_OPENWEATHER_API_KEY || 'de23633304cc83584c64369524097f74'}`}
                                opacity={0.6}
                                zIndex={500}
                              />
                            )}

                            <div className="absolute top-2 left-2 z-[1000] bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] uppercase font-bold text-white flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-500" /> {selectedProvince.name}
                            </div>
                          </MapContainer>

                          <WeatherLayerControl
                            activeLayer={activeWeatherLayer}
                            onLayerSelect={setActiveWeatherLayer}
                            layers={weatherLayers}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <h4 className="font-bold mb-4 text-sm">Tendência (Próximos dias)</h4>
                      <div className="grid grid-cols-7 gap-3">
                        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, i) => (
                          <div key={day} className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-[10px] opacity-60 mb-2">{day}</div>
                            {i % 3 === 0 ? <CloudRain className="w-5 h-5 mx-auto text-blue-400" /> : <Sun className="w-5 h-5 mx-auto text-amber-400" />}
                            <div className="mt-2 font-bold text-xs">{selectedProvince.weather.temp + (i - 2)}°</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}
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
                      {isSwitchingPlot && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm z-[1100] flex flex-col items-center justify-center animate-in fade-in duration-300">
                          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                          <div className="text-primary font-bold tracking-widest text-xs uppercase animate-pulse">Sincronizando Telemetria...</div>
                        </div>
                      )}
                      <div className="flex flex-col md:flex-row w-full max-h-[85vh] md:h-[600px] overflow-hidden">
                        {/* Map Section */}
                        <div className="w-full md:flex-1 relative z-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 min-h-[250px] md:min-h-full">
                          <MapContainer
                            center={mapFocus.center}
                            zoom={mapFocus.zoom}
                            style={{ height: '100%', width: '100%', minHeight: '100%' }}
                            scrollWheelZoom={true}
                          >
                            <MapController center={mapFocus.center} zoom={mapFocus.zoom} />
                            <TileLayer
                              attribution='&copy; Google Maps'
                              url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                              subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                            />

                            {/* Weather Heatmap Layers */}
                            {activeWeatherLayer && (
                              <TileLayer
                                key={activeWeatherLayer}
                                attribution='&copy; OpenWeatherMap'
                                url={`https://tile.openweathermap.org/map/${activeWeatherLayer}/{z}/{x}/{y}.png?appid=${import.meta.env.VITE_OPENWEATHER_API_KEY || 'de23633304cc83584c64369524097f74'}`}
                                opacity={0.6}
                                zIndex={500}
                              />
                            )}

                            <MapEvents
                              onMapChange={(center, zoom) => setMapFocus({ center, zoom })}
                              onLocationSelect={(lat, lng) => {
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
                              }}
                            />
                            {newPlot.lat && newPlot.lng && (
                              <Marker position={[Number(newPlot.lat), Number(newPlot.lng)]} />
                            )}
                            {polygonPoints.length > 0 && (
                              <>
                                <Polygon
                                  positions={polygonPoints}
                                  pathOptions={{ color: 'yellow', fillColor: 'yellow', fillOpacity: 0.3 }}
                                />
                                {polygonPoints.map((pos, idx) => (
                                  <Marker key={idx} position={pos} />
                                ))}
                              </>
                            )}
                          </MapContainer>

                          <WeatherLayerControl
                            activeLayer={activeWeatherLayer}
                            onLayerSelect={setActiveWeatherLayer}
                            layers={weatherLayers}
                          />
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
                          {newPlot.lat && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute bottom-4 right-4 z-[1000] h-8 text-[10px] shadow-lg"
                              onClick={() => {
                                setNewPlot(prev => ({ ...prev, lat: "", lng: "", altitude: "", area: "", analysis: "" }));
                                setPolygonPoints([]);
                                toast({
                                  title: "Localização Limpa",
                                  description: "O marcador central e os dados foram removidos.",
                                });
                              }}
                            >
                              <X className="w-3 h-3 mr-1" /> Limpar Localização
                            </Button>
                          )}
                          {polygonPoints.length > 0 && !newPlot.lat && (
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
                        <div className="w-full md:w-2/5 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
                          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <DialogHeader className="mb-6">
                              <DialogTitle className="text-xl font-heading">Novo Mapeamento</DialogTitle>
                              <DialogDescription>
                                Insira os detalhes do terreno e as coordenadas geográficas.
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
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

                              {newPlot.lat && newPlot.lng && liveTelemetry && (
                                <div className="grid grid-cols-2 gap-2 py-2">
                                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800">
                                    <div className="text-[10px] text-blue-600 uppercase font-bold">Solo (V-Sensor)</div>
                                    <div className="text-lg font-bold text-blue-900 dark:text-blue-100">{liveTelemetry.soil.moisture}%</div>
                                    <div className="text-[9px] text-blue-500">{liveTelemetry.soil.status}</div>
                                  </div>
                                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-100 dark:border-amber-800">
                                    <div className="text-[10px] text-amber-600 uppercase font-bold">Clima (Live Satélite)</div>
                                    <div className="text-lg font-bold text-amber-900 dark:text-amber-100">{liveTelemetry.weather.temp}°C</div>
                                    <div className="text-[9px] text-amber-500">{liveTelemetry.weather.description}</div>
                                  </div>
                                </div>
                              )}

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
                                <AIChatBox
                                  plot={plots.find(p => p.name === newPlot.name)!}
                                  chatMutation={chatMutation}
                                  analyzeMutation={analyzeMutation}
                                />
                              )}
                            </div>
                          </div>

                          <DialogFooter className="p-6 border-t border-slate-100 dark:border-slate-800 mt-0">
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
                      <div className="h-32 bg-slate-200 relative overflow-hidden">
                        {plot.lat && plot.lng ? (
                          <MapContainer
                            center={[Number(plot.lat), Number(plot.lng)]}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                            attributionControl={false}
                            dragging={false}
                            scrollWheelZoom={false}
                            doubleClickZoom={false}
                          >
                            <TileLayer
                              url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                              subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                            />
                            {plot.boundaryPoints && (
                              <Polygon
                                positions={plot.boundaryPoints}
                                pathOptions={{ color: 'yellow', fillColor: 'yellow', fillOpacity: 0.3 }}
                              />
                            )}
                          </MapContainer>
                        ) : (
                          <img src={satelliteFarm} className="w-full h-full object-cover opacity-50" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-white text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10">{plot.name}</div>
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
      </main >

      <AIAnalysisDialog
        open={isAnalysisDialogOpen}
        onClose={() => setIsAnalysisDialogOpen(false)}
        plotId={plotForAnalysisId}
        chatMutation={chatMutation}
        analyzeMutation={analyzeMutation}
      />
    </div >
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