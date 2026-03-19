import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Landmark, TrendingUp, Lightbulb, Tractor, Wallet, ArrowRight, ShieldCheck, Zap, Globe, Sparkles, Building2, Coins, Receipt, HandCoins, Info } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const marketData = [
    { month: 'Jan', milho: 450, soja: 820 },
    { month: 'Fev', milho: 480, soja: 850 },
    { month: 'Mar', milho: 520, soja: 890 },
    { month: 'Abr', milho: 510, soja: 920 },
    { month: 'Mai', milho: 590, soja: 980 },
    { month: 'Jun', milho: 640, soja: 1050 },
];

interface FinancingOpportunity {
    id: string;
    bank: string;
    title: string;
    description: string;
    description_full: string;
    interestRate: string;
    term: string;
    quota: number;
    badge: string;
    badgeColor: string;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    requirements: string[];
}

const financingOpportunities: FinancingOpportunity[] = [
    {
        id: 'bai',
        bank: 'Banco BAI',
        title: 'BAI: Plano Nacional',
        description: 'Linha de crédito para cereais 2026',
        description_full: 'O Plano de Apoio à Produção Nacional do BAI foca no financiamento de curto e médio prazo para produtores de milho, soja e trigo, visando a autossuficiência alimentar.',
        interestRate: '7.5% - 9%',
        term: 'Até 60 meses',
        quota: 68,
        badge: 'PNA Aberto',
        badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        icon: <Landmark className="w-6 h-6" />,
        iconBg: 'bg-blue-50 dark:bg-blue-900/20',
        iconColor: 'text-blue-600',
        requirements: [
            'Registo no Portal do Produtor Nacional',
            'Relatório de Saúde do Solo (Disponível no Dashboard)',
            'Garantia real ou aval bancário',
            'Plano de negócio validado'
        ]
    },
    {
        id: 'fada',
        bank: 'Fundo FADA',
        title: 'FADA: Fundo Agrário',
        description: 'Apoio à mecanização e colheitas',
        description_full: 'O Fundo de Apoio ao Desenvolvimento Agrário (FADA) oferece condições especiais para aquisição de tratores e alfaias agrícolas, com carência alargada.',
        interestRate: '3% - 5%',
        term: 'Até 48 meses',
        quota: 42,
        badge: 'Mecanização',
        badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        icon: <Tractor className="w-6 h-6" />,
        iconBg: 'bg-amber-50 dark:bg-amber-900/20',
        iconColor: 'text-amber-600',
        requirements: [
            'Ser titular de exploração agrícola ativa',
            'Factura pró-forma dos equipamentos',
            'Comprovativo de competência técnica',
            'Regularidade fiscal'
        ]
    },
    {
        id: 'bda',
        bank: 'Banco BDA',
        title: 'BDA: Projecto Leste',
        description: 'Desenvolvimento do corredor do Luau',
        description_full: 'Linha específica do Banco de Desenvolvimento de Angola para fomento agro-industrial no Luena e Moxico, aproveitando a logística ferroviária.',
        interestRate: '4% (Fixo)',
        term: 'Até 120 meses',
        quota: 85,
        badge: 'Regional',
        badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        icon: <Building2 className="w-6 h-6" />,
        iconBg: 'bg-purple-50 dark:bg-purple-900/20',
        iconColor: 'text-purple-600',
        requirements: [
            'Projecto localizado no Corredor do Lobito/Leste',
            'Impacto social verificado',
            'Investimento mínimo de 50 Milhões Kz',
            'Estudo de viabilidade ambiental'
        ]
    },
    {
        id: 'caixa',
        bank: 'Caixa Angola',
        title: 'Caixa: Agronegócio 26',
        description: 'Financiamento de sementes e fertilizantes',
        description_full: 'Crédito de campanha para aquisição de inputs agrícolas no início da época de plantio, com liquidação baseada na entrega da safra.',
        interestRate: '12%',
        term: '12 meses (Renovável)',
        quota: 25,
        badge: 'Curto Prazo',
        badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        icon: <Coins className="w-6 h-6" />,
        iconBg: 'bg-sky-50 dark:bg-sky-900/20',
        iconColor: 'text-sky-600',
        requirements: [
            'Contrato de escoamento com comprador final',
            'Seguro agrícola ativo',
            'Conta bancária na instituição',
            'Mínimo 2 colheitas reportadas'
        ]
    }
];

export const StrategicRecommendations: React.FC = () => {
    const [selectedOpp, setSelectedOpp] = useState<FinancingOpportunity | null>(null);
    const [viewAll, setViewAll] = useState(false);
    const [actionMsg, setActionMsg] = useState("");

    const handleActionClick = (msg: string) => {
        setActionMsg(msg);
        setTimeout(() => setActionMsg(""), 3000);
    };
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Hero Section / AI Summary */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl border border-white/10"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/20 rounded-lg backdrop-blur-md border border-white/10">
                            <Sparkles className="w-6 h-6 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold uppercase tracking-widest text-blue-200">Visão Estratégica 2026</h2>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
                        Campanha de Expansão: <span className="text-blue-400 font-serif italic italic underline decoration-blue-500/50">Angola Agrícola</span>
                    </h1>
                    <p className="text-slate-300 max-w-2xl leading-relaxed text-lg italic">
                        "Com base na análise de satélite dos seus talhões e nas tendências de mercado para 2026, recomendamos focar na
                        <span className="text-white font-bold"> mecanização via fundo FADA</span> para reduzir custos operacionais em até 22% antes da colheita de Junho."
                    </p>
                    <div className="flex gap-4 mt-8 flex-wrap">
                        <Badge className="bg-white/10 hover:bg-white/20 text-white border-white/20 py-1 px-4 text-xs backdrop-blur-md">
                            <ShieldCheck className="w-3 h-3 mr-2 text-green-400" /> Risco de Crédito: Baixo
                        </Badge>
                        <Badge className="bg-white/10 hover:bg-white/20 text-white border-white/20 py-1 px-4 text-xs backdrop-blur-md">
                            <Zap className="w-3 h-3 mr-2 text-amber-400" /> Potencial de Exportação: Alto
                        </Badge>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Financial Opportunities */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-blue-600" /> Oportunidades de Financiamento 2026
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 text-xs font-bold uppercase hover:bg-blue-50"
                            onClick={() => setViewAll(true)}
                        >
                            Ver Todos
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {financingOpportunities.slice(0, 2).map((opp) => (
                            <Card
                                key={opp.id}
                                className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                                onClick={() => setSelectedOpp(opp)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className={`p-2 rounded-xl border ${opp.iconBg} ${opp.iconColor.replace('text-', 'border-').replace('600', '100')}`}>
                                            {opp.icon}
                                        </div>
                                        <Badge className={opp.badgeColor}>{opp.badge}</Badge>
                                    </div>
                                    <CardTitle className={`text-lg mt-4 group-hover:${opp.iconColor} transition-colors uppercase font-black tracking-tight`}>{opp.bank}</CardTitle>
                                    <CardDescription className="text-xs text-slate-500">{opp.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-slate-500">Taxa de Juro</span>
                                        <span className="text-slate-900 dark:text-slate-100">{opp.interestRate}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400">
                                            <span>Capacidade de Alocação</span>
                                            <span>{opp.quota}%</span>
                                        </div>
                                        <Progress
                                            value={opp.quota}
                                            className="h-1.5 bg-slate-100 dark:bg-slate-800"
                                            indicatorClassName={opp.iconColor.replace('text-', 'bg-')}
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-0 flex justify-end">
                                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-primary opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        Candidatar <ArrowRight className="w-3 h-3" />
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>

                    {/* Market Trends Section */}
                    <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-green-600" /> Tendência de Preço 2026/27
                                    </CardTitle>
                                    <CardDescription className="text-xs">Previsão baseada no mercado de Luanda e exportação SADC (Kz/Kg)</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Soja
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Milho
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={marketData}>
                                        <defs>
                                            <linearGradient id="colorSoja" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorMilho" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="month"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                                            dx={-10}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '10px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="soja"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorSoja)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="milho"
                                            stroke="#f59e0b"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorMilho)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: AI Strategy Assistant */}
                <div className="space-y-6">
                    <Card className="bg-slate-900 border border-white/10 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mb-16"></div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2 text-blue-400">
                                <Lightbulb className="w-5 h-5" /> Plano de Ação IA
                            </CardTitle>
                            <CardDescription className="text-blue-200/60 text-xs tracking-wide uppercase font-bold">Gerado Hoje, 22:30</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 group hover:border-blue-500/30 transition-colors">
                                <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-2 uppercase tracking-tighter">
                                    <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                                    Oportunidade Leste (BAD)
                                </h4>
                                <p className="text-xs text-slate-400 leading-relaxed italic group-hover:text-slate-300">
                                    "Visto que possui talhões de Soja, o projeto do BAD para o corredor leste está a oferecer subsídios de 30%
                                    na semente certificada. Recomendamos o registo imediato via Portal do IRAD."
                                </p>
                            </div>

                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 group hover:border-amber-500/30 transition-colors">
                                <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-2 uppercase tracking-tighter">
                                    <div className="w-1.5 h-4 bg-amber-500 rounded-full"></div>
                                    Dica de Eficiência
                                </h4>
                                <p className="text-xs text-slate-400 leading-relaxed italic group-hover:text-slate-300">
                                    "A previsão de chuvas tardias em Abril sugere que deve antecipar a aplicação de potássio em 10 dias para
                                    maximizar a absorção radicular antes da lixiviação."
                                </p>
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <AnimatePresence>
                                    {actionMsg && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="mb-4 p-3 bg-blue-500/20 rounded-xl border border-blue-400/30 text-xs text-blue-200 text-center"
                                        >
                                            {actionMsg}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-sm gap-2 font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    onClick={() => handleActionClick("Plano de expansão enviado para análise técnica. Entraremos em contacto em breve.")}
                                >
                                    <Wallet className="w-4 h-4" /> Expandir Financiamento
                                </Button>
                                <p className="text-[10px] text-center text-slate-500 mt-3 font-medium uppercase tracking-widest">
                                    Validado pelo Motor Agro-Llama 3.3
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl p-6 group">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                <Globe className="w-6 h-6 text-slate-500 group-hover:text-primary transition-colors" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">Mercado Global SADC</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Angola vs Zâmbia</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                            O escoamento para a Zâmbia pela fronteira do Luau está a valorizar as colheitas do leste de Angola.
                            Considere o Porto Seco de Luso como ponto logístico estratégico.
                        </p>
                        <Button
                            variant="outline"
                            className="w-full text-xs font-bold uppercase tracking-tight gap-2 group-hover:border-primary group-hover:text-primary transition-all"
                            onClick={() => handleActionClick("Mapeando rotas logísticas para o corredor do Lobito...")}
                        >
                            Explorar Cadeia de Valor <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </Card>
                </div>
            </div>

            {/* Opportunity Detail Dialog */}
            <Dialog open={!!selectedOpp} onOpenChange={(open) => !open && setSelectedOpp(null)}>
                <DialogContent className="max-w-2xl bg-white dark:bg-slate-950 rounded-3xl overflow-hidden border-0 p-0 shadow-2xl">
                    {selectedOpp && (
                        <>
                            <div className={`h-32 ${selectedOpp.iconBg} relative overflow-hidden`}>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                <div className="absolute bottom-4 left-8 flex items-end gap-4">
                                    <div className={`p-4 bg-white dark:bg-slate-950 rounded-2xl shadow-xl ${selectedOpp.iconColor}`}>
                                        {React.cloneElement(selectedOpp.icon as React.ReactElement, { size: 32 })}
                                    </div>
                                    <div className="mb-2">
                                        <Badge className={`mb-2 ${selectedOpp.badgeColor}`}>{selectedOpp.badge}</Badge>
                                        <h2 className="text-2xl font-black uppercase text-slate-900 dark:text-white leading-none">{selectedOpp.bank}</h2>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold">{selectedOpp.title}</DialogTitle>
                                    <DialogDescription className="text-slate-600 dark:text-slate-400 text-lg italic mt-2">
                                        {selectedOpp.description_full}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Taxa Estimada</p>
                                        <p className="text-lg font-black text-primary">{selectedOpp.interestRate}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Prazo Máximo</p>
                                        <p className="text-lg font-black text-slate-700 dark:text-slate-200">{selectedOpp.term}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-bold flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-green-600" /> Requisitos de Elegibilidade
                                    </h4>
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {selectedOpp.requirements.map((req, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                <div className="w-5 h-5 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0 mt-0.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                                                </div>
                                                {req}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 sm:justify-between items-center gap-4">
                                    <div className="text-[10px] text-slate-400 max-w-[200px] leading-tight">
                                        Sujeito a análise de risco e disponibilidade de fundos do BNA/Governo.
                                    </div>
                                    <Button
                                        className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-primary/20"
                                        onClick={() => {
                                            alert(`Iniciando processo de candidatura para ${selectedOpp.bank}. Por favor, aguarde o carregamento do formulário PNA...`);
                                            setSelectedOpp(null);
                                        }}
                                    >
                                        Submeter Candidatura
                                    </Button>
                                </DialogFooter>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* View All Opportunities Dialog */}
            <Dialog open={viewAll} onOpenChange={setViewAll}>
                <DialogContent className="max-w-4xl bg-slate-50 dark:bg-slate-950 rounded-3xl overflow-hidden border-0 p-0 shadow-2xl h-[90vh] flex flex-col">
                    <DialogHeader className="p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-xl text-white">
                                <HandCoins className="w-6 h-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black uppercase text-slate-900 dark:text-white">Linhas de Crédito Agrícola 2026</DialogTitle>
                                <DialogDescription>Explore todas as oportunidades de financiamento disponíveis para a campanha atual.</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="flex-1 p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                            {financingOpportunities.map((opp) => (
                                <Card
                                    key={opp.id}
                                    className="border-0 shadow-md hover:shadow-xl transition-all cursor-pointer group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                                    onClick={() => {
                                        setSelectedOpp(opp);
                                        setViewAll(false);
                                    }}
                                >
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div className={`p-2 rounded-xl border ${opp.iconBg} ${opp.iconColor.replace('text-', 'border-').replace('600', '100')}`}>
                                                {opp.icon}
                                            </div>
                                            <Badge className={opp.badgeColor}>{opp.badge}</Badge>
                                        </div>
                                        <CardTitle className="text-lg mt-4 uppercase font-black tracking-tight">{opp.bank}</CardTitle>
                                        <CardDescription className="text-xs line-clamp-1">{opp.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-4 text-[10px] items-center">
                                            <div className="flex items-center gap-1.5 font-bold text-slate-600">
                                                <Receipt className="w-3 h-3" /> {opp.interestRate}
                                            </div>
                                            <div className="flex items-center gap-1.5 font-bold text-slate-600">
                                                <ShieldCheck className="w-3 h-3" /> {opp.term}
                                            </div>
                                            <div className="ml-auto text-primary font-black uppercase flex items-center gap-1 group-hover:gap-2 transition-all">
                                                Detalhes <ArrowRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            <Card className="border-2 border-dashed border-slate-200 dark:border-slate-800 bg-transparent flex flex-col items-center justify-center p-8 text-center text-slate-500 hover:border-primary/50 transition-colors">
                                <Info className="w-8 h-8 mb-2 opacity-20" />
                                <p className="text-xs font-bold uppercase mb-1">Novas Linhas em Breve</p>
                                <p className="text-[10px]">O BNA está a validar 3 novas linhas para micro-crédito.</p>
                            </Card>
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
            );
};
