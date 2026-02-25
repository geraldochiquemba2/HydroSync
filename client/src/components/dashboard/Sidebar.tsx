
import {
    Droplets,
    Map as MapIcon,
    Settings,
    LogOut,
    BrainCircuit,
    LayoutDashboard,
    FileText,
    PieChart,
    ChevronRight
} from 'lucide-react';

interface SidebarProps {
    activeTab: 'climate' | 'plots';
    setActiveTab: (tab: 'climate' | 'plots') => void;
    onNavigate: (view: 'landing' | 'login' | 'register' | 'dashboard') => void;
}

export function Sidebar({ activeTab, setActiveTab, onNavigate }: SidebarProps) {
    return (
        <aside className="w-72 bg-white flex flex-col border-r border-gray-200 z-50 shadow-sm relative h-screen">
            {/* Logo Area */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-center md:justify-start gap-3 cursor-pointer" onClick={() => onNavigate('landing')}>
                <div className="bg-brand-primary text-white p-2 rounded-xl shadow-md rotate-3 hover:rotate-0 transition-transform">
                    <Droplets size={26} strokeWidth={2.5} />
                </div>
                <div>
                    <span className="text-2xl font-black tracking-tighter text-brand-black block leading-none">HydroSync</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mt-1">Plataforma Hídrica</span>
                </div>
            </div>

            {/* Primary Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-3 mb-4 mt-2">Menu Principal</p>
                <button
                    onClick={() => setActiveTab('climate')}
                    className={`w-full flex items-center justify-between px-4 py-3.5 font-bold text-sm rounded-xl transition-all ${activeTab === 'climate' ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20 translate-x-1' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                    <div className="flex items-center gap-3"><LayoutDashboard size={20} className={activeTab === 'climate' ? 'text-brand-accent' : 'text-gray-400'} /> Clima (Satélite)</div>
                    {activeTab === 'climate' && <ChevronRight size={16} className="text-white/70" />}
                </button>
                <button
                    onClick={() => setActiveTab('plots')}
                    className={`w-full flex items-center justify-between px-4 py-3.5 font-bold text-sm rounded-xl transition-all ${activeTab === 'plots' ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20 translate-x-1' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                    <div className="flex items-center gap-3"><MapIcon size={20} className={activeTab === 'plots' ? 'text-brand-accent' : 'text-gray-400'} /> Gestão de Talhões</div>
                    {activeTab === 'plots' && <ChevronRight size={16} className="text-white/70" />}
                </button>

                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-3 mb-4 mt-8">Energia & IA</p>
                <button className="w-full flex items-center justify-between px-4 py-3 font-medium text-sm rounded-xl text-brand-dark hover:bg-brand-dark/5 transition-colors">
                    <div className="flex items-center gap-3"><BrainCircuit size={20} className="text-brand-accent" /> Agrosatelite IA <span className="text-[9px] bg-brand-primary text-white px-1.5 py-0.5 rounded-full ml-1">ATIVO</span></div>
                </button>
            </nav>

            {/* Sidebar Footer (Settings & User) */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 mt-auto">
                <button className="w-full flex items-center gap-3 px-4 py-3 font-medium text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors mb-2">
                    <Settings size={18} className="text-gray-400" /> Configurações
                </button>
                <div className="flex items-center gap-3 group px-4 py-3 rounded-xl hover:bg-white border text-left border-transparent hover:border-gray-200 transition-all cursor-pointer shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-brand-dark flex items-center justify-center text-white font-bold text-sm shrink-0">
                        JA
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-gray-900 leading-tight truncate">João Almeida</p>
                        <p className="text-[11px] text-brand-primary font-bold truncate mt-0.5">Admin • Fazenda Esp.</p>
                    </div>
                </div>
                <button
                    onClick={() => onNavigate('landing')}
                    className="mt-4 flex items-center justify-center gap-2 w-full py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100">
                    <LogOut size={16} /> Sair
                </button>
            </div>
        </aside>
    );
}
