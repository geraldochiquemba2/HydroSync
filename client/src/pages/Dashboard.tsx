import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { useLocation, useRoute } from "wouter";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plot as DbPlot, InsertPlot } from "@shared/schema";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";

import React, { useState, useEffect, useRef } from "react";
import {
  Droplets, Map, Activity, CloudRain,
  Settings, User, Bell, ChevronRight, Menu, MapPin,
  Cloud, CloudLightning, Waves, Layers, Plus, Trash2, X, MessageSquare, Send, RefreshCw, CloudSun, Loader2,
  Sprout, Sun, Wind, ThermometerSun, AlertTriangle, Sunrise, Eye, Gauge, Moon, Volume2, VolumeX
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
import { GlobalAIChat } from "@/components/dashboard/GlobalAIChat";
import { useSpeech } from "@/hooks/use-speech";

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
  area: string;
  health: string | null;
  lat: string;
  lng: string;
  altitude: string;
  boundaryPoints?: [number, number][];
  analysis?: string | null;
  chatHistory?: string | null;
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

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const { speak, stop, isSpeaking, isSupported, currentText } = useSpeech();

  useEffect(() => {
    if (scrollRef.current) {
      const isLastMessageAssistant = history.length > 0 && history[history.length - 1].role === "assistant";
      if (isLastMessageAssistant && lastMessageRef.current) {
        lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [history]);

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
        <MessageSquare className="w-3 h-3" /> Chat Agrosatelite IA
      </h4>

      <div
        ref={scrollRef}
        className="max-h-[300px] overflow-y-auto space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 custom-scrollbar"
      >
        {history.length > 0 ? (
          history.map((m: any, idx: number) => (
            <div key={idx} className="flex flex-col">
              {/* TTS for AI messages - MOVED ABOVE */}
              {m.role === "assistant" && isSupported && (
                <button
                  onClick={() => isSpeaking && currentText === m.content ? stop() : speak(m.content)}
                  className={cn(
                    "self-start mb-1 flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full transition-all",
                    isSpeaking && currentText === m.content
                      ? "bg-primary/15 text-primary animate-pulse"
                      : "text-slate-400 hover:text-primary hover:bg-primary/5"
                  )}
                >
                  {isSpeaking && currentText === m.content
                    ? <><VolumeX className="w-3 h-3" /> Parar</>
                    : <><Volume2 className="w-3 h-3" /> Ouvir</>
                  }
                </button>
              )}
              <div
                ref={idx === history.length - 1 ? lastMessageRef : null}
                className={cn(
                  "p-3 rounded-2xl text-[11px] max-w-[90%] shadow-sm",
                  m.role === "user"
                    ? "bg-primary text-white ml-auto"
                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700"
                )}
              >
                <span className={cn(
                  "font-bold block mb-1 uppercase text-[9px] opacity-70",
                  m.role === "user" ? "text-white/80" : "text-primary"
                )}>
                  {m.role === "user" ? "Produtor" : "AgriSat IA"}
                </span>
                {m.content}
              </div>
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
            {isSupported && <p className="text-[9px] text-primary/60">🔊 As respostas da IA podem ser ouvidas em voz alta</p>}
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
  const { speak, stop, isSpeaking, isSupported, currentText } = useSpeech();
  // Always read from React Query cache so chat history updates after each message
  const { data: dbPlots = [] } = useQuery<DbPlot[]>({ queryKey: ["/api/plots"] });
  const plot = dbPlots.find(p => p.id === plotId) ?? null;

  if (!plot) return null;

  const plotForDisplay: Plot = {
    ...plot,
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
                {isSupported && plot.analysis && !analyzeMutation.isPending && (
                  <button
                    onClick={() => isSpeaking && currentText === plot.analysis ? stop() : speak(plot.analysis!)}
                    className={cn(
                      "ml-auto flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border transition-all shadow-sm",
                      isSpeaking && currentText === plot.analysis
                        ? "bg-primary/20 text-primary border-primary/30 animate-pulse"
                        : "bg-white text-slate-500 hover:text-primary hover:border-primary/30 border-slate-200"
                    )}
                  >
                    {isSpeaking && currentText === plot.analysis
                      ? <><VolumeX className="w-3 h-3" /> Parar</>
                      : <><Volume2 className="w-3 h-3" /> Ouvir Relatório</>
                    }
                  </button>
                )}
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

function PlotSoilMoistureBadge({ plotId }: { plotId: string }) {
  const { data: telemetry, isLoading } = useQuery<any>({
    queryKey: [`/api/plots/${plotId}/telemetry`],
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: false,
  });

  const soil = telemetry?.weather?.soilMoisture;

  if (isLoading) {
    return (
      <div className="mt-2 flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/50 animate-pulse" />
        <span className="text-[10px] text-slate-400 font-medium">Obtendo humidade do solo...</span>
      </div>
    );
  }

  if (!soil) return null;

  const color = soil.percentage < 30
    ? "text-red-600 bg-red-50 border-red-200"
    : soil.percentage < 60
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : "text-green-700 bg-green-50 border-green-200";

  return (
    <div className={`mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold ${color}`}>
      <Sprout className="w-3 h-3" />
      Solo: {soil.percentage}% — {soil.status}
    </div>
  );
}

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/dashboard/:tab");
  const activeTab = (params?.tab === "climate" || params?.tab === "plots") ? params.tab : "climate";

  // Redirect to climate if on an invalid or removed tab
  useEffect(() => {
    if (!params?.tab || (params.tab !== "climate" && params.tab !== "plots")) {
      setLocation("/dashboard/climate");
    }
  }, [params?.tab, setLocation]);

  const setActiveTab = (tab: string) => {
    setLocation(`/dashboard/${tab}`);
  };

  const [newPlot, setNewPlot] = useState({ name: "", crop: "Soja", area: "", lat: "", lng: "", altitude: "", analysis: "", plantingDate: "" });
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
      setNewPlot({ name: "", crop: "Soja", area: "", lat: "", lng: "", altitude: "", analysis: "", plantingDate: "" });
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
    onError: (error: Error) => {
      toast({
        title: "Erro no Chat",
        description: error.message || "A IA não conseguiu responder no momento.",
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
      boundaryPoints: polygonPoints.length >= 3 ? JSON.stringify(polygonPoints) : null,
      analysis: newPlot.analysis || null,
      plantingDate: newPlot.plantingDate || null
    };

    createPlotMutation.mutate(insertData);
  };

  const viewOnMap = (plot: Plot) => {
    setIsSwitchingPlot(true);
    setNewPlot({
      name: plot.name,
      crop: plot.crop,
      area: plot.area,
      lat: plot.lat,
      lng: plot.lng,
      altitude: plot.altitude,
      analysis: plot.analysis || "",
      plantingDate: (plot as any).plantingDate || ""
    });

    if (plot.boundaryPoints) {
      setPolygonPoints(plot.boundaryPoints);
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

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-brand-white font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab as 'climate' | 'plots'}
        setActiveTab={(tab) => setLocation(`/dashboard/${tab}`)}
        onNavigate={(view) => setLocation(view === 'dashboard' ? '/dashboard' : view === 'landing' ? '/' : `/${view}`)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setIsSidebarOpen(prev => !prev)} />

        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8">

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

                      {/* Soil Moisture Section */}
                      {selectedProvince.weather.soilMoisture && (
                        <div className="mt-6 p-5 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                          <h4 className="text-sm font-bold flex items-center gap-2 mb-4 text-amber-300">
                            <Sprout className="w-4 h-4" /> Humidade do Solo (Satélite Open-Meteo)
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                              { label: "Superfície (0-1cm)", value: selectedProvince.weather.soilMoisture.surface, color: "bg-amber-400" },
                              { label: "Raízes (3-9cm)", value: selectedProvince.weather.soilMoisture.root, color: "bg-green-400" },
                              { label: "Profunda (9-27cm)", value: selectedProvince.weather.soilMoisture.deep, color: "bg-blue-400" },
                            ].map((layer) => (
                              <div key={layer.label} className="bg-white/5 rounded-xl p-3 border border-white/10">
                                <div className="text-[10px] text-white/60 font-bold uppercase mb-2">{layer.label}</div>
                                <div className="text-xl font-black text-white">{layer.value}%</div>
                                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div className={`h-full ${layer.color} rounded-full transition-all`} style={{ width: `${Math.min(100, layer.value * 2.5)}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${selectedProvince.weather.soilMoisture.percentage < 30 ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                              selectedProvince.weather.soilMoisture.percentage < 60 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                'bg-green-500/20 text-green-300 border border-green-500/30'
                              }`}>
                              {selectedProvince.weather.soilMoisture.status} — {selectedProvince.weather.soilMoisture.percentage}% capacidade de campo
                            </div>
                          </div>
                        </div>
                      )}

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
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 md:gap-3">
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
                          setNewPlot({ name: "", crop: "Soja", area: "", lat: "", lng: "", altitude: "", analysis: "", plantingDate: "" });
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
                              <Marker position={[Number(newPlot.lat), Number(newPlot.lng)]} icon={redIcon} />
                            )}
                            {polygonPoints.length > 0 && (
                              <>
                                <Polygon
                                  positions={polygonPoints}
                                  pathOptions={{ color: 'yellow', fillColor: 'yellow', fillOpacity: 0.3 }}
                                />
                                {polygonPoints.map((pos, idx) => (
                                  <Marker key={idx} position={pos} icon={blueIcon} />
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

                              <div className="space-y-2">
                                <Label htmlFor="plantingDate">Data de Plantio</Label>
                                <Input
                                  id="plantingDate"
                                  type="date"
                                  value={newPlot.plantingDate}
                                  onChange={(e) => setNewPlot({ ...newPlot, plantingDate: e.target.value })}
                                />
                                <p className="text-[10px] text-slate-500 italic">Essencial para a IA calcular a fase de crescimento e dar conselhos exatos.</p>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

                        {/* Real-time soil moisture per plot */}
                        <PlotSoilMoistureBadge plotId={plot.id} />

                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 group-hover:bg-primary group-hover:text-white transition-colors"
                            onClick={() => viewOnMap(plot)}
                          >
                            <Eye className="w-4 h-4 mr-2" /> Detalhes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-rose-500 border-rose-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Tem certeza que deseja excluir este talhão?")) {
                                removePlot(plot.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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

      <GlobalAIChat
        weatherContext={provincialWeather?.map(p => ({
          name: p.name,
          temp: p.weather.temp,
          description: p.weather.description
        }))}
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