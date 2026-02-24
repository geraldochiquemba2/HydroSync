import { useState } from "react";
import { 
  Droplets, Map, Activity, CloudRain, 
  Settings, User, Bell, ChevronRight, Menu, MapPin, 
  ThermometerSun, Sprout, CheckCircle2, AlertTriangle, TrendingUp, Sun, Wind,
  Cloud, CloudLightning, Waves, Layers, Plus, Trash2, X
} from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

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
  id: number;
  name: string;
  crop: string;
  area: number;
  health: number;
}

export default function Dashboard() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [plots, setPlots] = useState<Plot[]>([
    { id: 1, name: "Talhão 01", crop: "Soja", area: 120, health: 82 },
    { id: 2, name: "Talhão 02", crop: "Milho", area: 240, health: 84 },
    { id: 3, name: "Talhão 03", crop: "Algodão", area: 360, health: 86 },
  ]);

  const [newPlot, setNewPlot] = useState({ name: "", crop: "Soja", area: "" });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const addPlot = () => {
    if (!newPlot.name || !newPlot.area) return;
    const plot: Plot = {
      id: Date.now(),
      name: newPlot.name,
      crop: newPlot.crop,
      area: Number(newPlot.area),
      health: Math.floor(Math.random() * (95 - 75 + 1)) + 75,
    };
    setPlots([...plots, plot]);
    setNewPlot({ name: "", crop: "Soja", area: "" });
    setIsAddDialogOpen(false);
    toast({
      title: "Talhão Adicionado",
      description: `${plot.name} foi registrado com sucesso via satélite.`,
    });
  };

  const removePlot = (id: number) => {
    const plot = plots.find(p => p.id === id);
    setPlots(plots.filter(p => p.id !== id));
    toast({
      title: "Talhão Removido",
      description: `${plot?.name} foi removido do monitoramento.`,
      variant: "destructive",
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* Sidebar Navigation */}
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} 
          transition-all duration-300 ease-in-out hidden md:flex flex-col 
          bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-20`}
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
              <span className="flex items-center gap-1"><Sun className="w-4 h-4 text-amber-500"/> 28°C</span>
              <span className="flex items-center gap-1"><Wind className="w-4 h-4 text-blue-400"/> 12 km/h</span>
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
                        <div className="text-white font-bold flex items-center gap-2"><Layers className="w-4 h-4"/> Mapa de Talhões</div>
                      </div>
                   </Card>
                   <Card className="glass-panel h-64 overflow-hidden relative cursor-pointer group" onClick={() => setActiveTab("health")}>
                      <img src={soilHeatmap} className="w-full h-full object-cover transition-transform group-hover:scale-105 grayscale" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex flex-col justify-end">
                        <div className="text-white font-bold flex items-center gap-2"><Activity className="w-4 h-4"/> Saúde por NDVI</div>
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
                      <Button className="gap-2">
                        <Plus className="w-4 h-4" /> Adicionar Talhão
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Adicionar Novo Talhão</DialogTitle>
                        <DialogDescription>
                          Insira os dados da área para iniciar o monitoramento via satélite.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">Nome</Label>
                          <Input id="name" value={newPlot.name} onChange={(e) => setNewPlot({...newPlot, name: e.target.value})} className="col-span-3" placeholder="Ex: Talhão Sul" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="crop" className="text-right">Cultura</Label>
                          <Select value={newPlot.crop} onValueChange={(v) => setNewPlot({...newPlot, crop: v})}>
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Selecione a cultura" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Soja">Soja</SelectItem>
                              <SelectItem value="Milho">Milho</SelectItem>
                              <SelectItem value="Algodão">Algodão</SelectItem>
                              <SelectItem value="Trigo">Trigo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="area" className="text-right">Área (ha)</Label>
                          <Input id="area" type="number" value={newPlot.area} onChange={(e) => setNewPlot({...newPlot, area: e.target.value})} className="col-span-3" placeholder="Ex: 150" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={addPlot} disabled={!newPlot.name || !newPlot.area}>Registrar Talhão</Button>
                      </DialogFooter>
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
                        <Button variant="outline" size="sm" className="w-full mt-2">Ver Detalhes</Button>
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
        }`}
    >
      <div className={`${active ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
        {icon}
      </div>
      {isOpen && <span>{label}</span>}
    </button>
  );
}