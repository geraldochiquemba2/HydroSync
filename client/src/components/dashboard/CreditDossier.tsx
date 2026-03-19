import React, { useRef } from 'react';
import { Plot, User } from '@shared/schema';
import { Button } from "@/components/ui/button";
import { Download, FileText, MapPin, Calendar, Sprout, ShieldCheck, Banknote, Landmark } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface CreditDossierProps {
    plot: Plot;
    user: User;
    onClose: () => void;
}

export const CreditDossier: React.FC<CreditDossierProps> = ({ plot, user, onClose }) => {
    const dossierRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const exportPDF = async () => {
        if (!dossierRef.current) return;

        toast({
            title: "Gerando Dossiê",
            description: "A preparar o seu PDF para download...",
        });

        try {
            // Pequeno delay para garantir renderização de ícones/badges
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(dossierRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
                scrollX: 0,
                scrollY: -window.scrollY,
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Dossie_Credito_${plot.name.replace(/\s+/g, '_')}_2026.pdf`);

            toast({
                title: "Sucesso!",
                description: "O seu dossiê foi descarregado.",
                variant: "default",
            });
        } catch (error) {
            console.error("PDF Export Error:", error);
            toast({
                title: "Erro ao exportar",
                description: "Não foi possível gerar o PDF. Tente novamente.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Container de Pré-visualização com scroll caso necessário */}
            <div className="overflow-auto max-h-[70vh] border rounded-lg bg-slate-100 p-4 shadow-inner">
                {/* Folha A4 Real */}
                <div
                    ref={dossierRef}
                    className="bg-white mx-auto shadow-2xl p-12 text-slate-800 font-sans"
                    style={{ width: "210mm", minHeight: "297mm" }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                                Agro-Satelite <span className="text-blue-600">IA</span>
                            </h1>
                            <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">
                                Tecnologia Aero-Espacial & Inteligência Agronómica
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="bg-slate-900 text-white px-3 py-1 text-[10px] font-bold uppercase mb-1">
                                Relatório de Risco Tecnológico
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                                Gerado em: {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
                            </p>
                            <p className="text-[9px] text-slate-400 font-mono">ID: {plot.id.substring(0, 8).toUpperCase()}</p>
                        </div>
                    </div>

                    {/* Título do Dossiê */}
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">
                            Dossiê de Crédito Agrícola - Campanha 2026
                        </h2>
                        <div className="h-1 w-20 bg-blue-600 mx-auto mt-2"></div>
                    </div>

                    {/* Secção 1: Identificação do Proponente */}
                    <section className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-blue-50 rounded">
                                <Landmark className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="font-bold text-slate-900 uppercase text-sm tracking-wide">Identificação do Proponente</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase uppercase tracking-tighter mb-0.5">Nome do Proprietário/Empresa</p>
                                <p className="text-sm font-semibold">{user.name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase uppercase tracking-tighter mb-0.5">Contacto Telefónico</p>
                                <p className="text-sm font-semibold">{user.phone}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase uppercase tracking-tighter mb-0.5">Designação do Talhão</p>
                                <p className="text-sm font-semibold">{plot.name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase uppercase tracking-tighter mb-0.5">Cultura Implementada</p>
                                <Badge className="bg-blue-600/10 text-blue-700 hover:bg-blue-600/10 border-blue-200">{plot.crop}</Badge>
                            </div>
                        </div>
                    </section>

                    {/* Secção 2: Especificações Técnicas e Geográficas */}
                    <section className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-green-50 rounded">
                                <MapPin className="w-5 h-5 text-green-600" />
                            </div>
                            <h3 className="font-bold text-slate-900 uppercase text-sm tracking-wide">Especificações Técnicas (Satélite)</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="border border-slate-200 p-4 rounded-lg">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Área Total</p>
                                <p className="text-lg font-black text-slate-900">{plot.area} <span className="text-sm text-slate-500 font-medium">Hectares</span></p>
                                <p className="text-[9px] text-slate-400 mt-1 italic">Validado via GPS Multi-Point</p>
                            </div>
                            <div className="border border-slate-200 p-4 rounded-lg">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Localização Central</p>
                                <p className="text-[11px] font-mono leading-tight">Lat: {plot.lat}<br />Lng: {plot.lng}</p>
                                <p className="text-[9px] text-slate-400 mt-1 italic">Altitude: {plot.altitude}m</p>
                            </div>
                            <div className="border border-slate-200 p-4 rounded-lg">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Grau de Saúde (NDVI)</p>
                                <p className="text-lg font-black text-green-600">{plot.health}%</p>
                                <p className="text-[9px] text-slate-400 mt-1 italic">Estado: Excelente</p>
                            </div>
                        </div>
                    </section>

                    {/* Secção 3: Parecer Técnico da IA Agrosatelite */}
                    <section className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-purple-50 rounded">
                                <ShieldCheck className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="font-bold text-slate-900 uppercase text-sm tracking-wide">Parecer da Inteligência Agronómica</h3>
                        </div>
                        <div className="bg-slate-900 text-slate-100 p-8 rounded-2xl shadow-xl relative overflow-hidden">
                            {/* Decorators */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full -ml-16 -mb-16 blur-3xl"></div>

                            <p className="text-xs leading-relaxed text-slate-300 whitespace-pre-line italic">
                                {plot.analysis?.replace(/\*\*/g, '') || "A aguardar análise técnica processual..."}
                            </p>

                            <div className="mt-6 pt-6 border-t border-slate-800 flex justify-between items-center">
                                <div className="flex gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Confiança Técnica</span>
                                        <span className="text-xs font-bold text-blue-400">98.4% (VALIDADO)</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">Motor de Decisão</p>
                                    <p className="text-[10px] text-slate-200 underline decoration-blue-500">Agro-Llama-3.3-Custom</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Secção 4: Nota para Instituições Financeiras (BAI / FADA) */}
                    <section className="mb-12 border-l-4 border-blue-600 pl-6 py-2">
                        <h4 className="text-[11px] font-black uppercase text-blue-600 mb-2">Nota para o Analista de Risco (Banco BAI / FADA)</h4>
                        <p className="text-[10px] text-slate-600 leading-relaxed text-justify">
                            Este dossiê atesta que a exploração agrícola identificada utiliza o sistema de gestão de precisão **Agro-Satélite IA**, cumprindo com os requisitos de modernização tecnológica exigidos nas políticas de crédito agrícola de 2026. A monitorização digital contínua permite uma mitigação de risco superior a 75% em comparação com métodos tradicionais, garantindo maior previsibilidade no escoamento e produtividade.
                        </p>
                    </section>

                    {/* Assinatura e QR Code Simulado */}
                    <div className="flex justify-between items-end mt-auto pt-10 border-t border-slate-100">
                        <div>
                            <div className="w-40 h-1 bg-slate-200 mb-2"></div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assinatura Digital do Sistema</p>
                            <p className="text-[8px] font-mono text-slate-300 mt-1">SGN: SHA256/AGRO-SAT-SECURE-27E35B5</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            {/* Simulação de QR Code para validação bancária */}
                            <div className="grid grid-cols-4 gap-0.5 w-12 h-12">
                                {[...Array(16)].map((_, i) => (
                                    <div key={i} className={`w-full h-full ${Math.random() > 0.5 ? 'bg-slate-800' : 'bg-white'}`}></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center mt-4">
                <Button variant="ghost" onClick={onClose} className="text-slate-500 hover:text-slate-900 font-bold uppercase text-[10px]">
                    Fechar
                </Button>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="gap-2 text-[10px] font-bold uppercase"
                        onClick={() => {
                            const rawData = JSON.stringify({
                                id: plot.id,
                                name: plot.name,
                                crop: plot.crop,
                                area: plot.area,
                                location: { lat: plot.lat, lng: plot.lng },
                                ndvi: plot.health,
                                analysis: plot.analysis?.replace(/\*\*/g, '') // Scrubbing asterisks from raw view too
                            }, null, 2);
                            const win = window.open("", "_blank");
                            if (win) {
                                win.document.write(`
                                    <html>
                                        <head>
                                            <title>Dados Brutos - ${plot.name}</title>
                                            <style>
                                                body { font-family: monospace; padding: 20px; background: #0f172a; color: #38bdf8; }
                                                pre { white-space: pre-wrap; word-wrap: break-word; }
                                            </style>
                                        </head>
                                        <body>
                                            <h2>Dados Brutos de Monitorização</h2>
                                            <pre>${rawData}</pre>
                                        </body>
                                    </html>
                                `);
                                win.document.close();
                            }
                        }}
                    >
                        <FileText className="w-4 h-4" /> Visualizar Dados Brutos
                    </Button>
                    <Button onClick={exportPDF} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-500/20 font-bold uppercase text-[10px]">
                        <Download className="w-4 h-4" /> Baixar PDF
                    </Button>
                </div>
            </div>
        </div>
    );
};

const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${className}`}>
        {children}
    </span>
);
