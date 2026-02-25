import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, Sparkles, Bot, User, Minimize2, Volume2, VolumeX, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useSpeech } from "@/hooks/use-speech";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface GlobalAIChatProps {
    weatherContext?: any[];
}

export function GlobalAIChat({ weatherContext = [] }: GlobalAIChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [history, setHistory] = useState<Message[]>([]);
    const [showVoicePicker, setShowVoicePicker] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastMessageRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const { speak, stop, isSpeaking, isSupported, voices, selectedVoice, setSelectedVoice, currentText } = useSpeech();

    const chatMutation = useMutation({
        mutationFn: async ({ message, history, weatherContext }: { message: string; history: Message[]; weatherContext: any[] }) => {
            const res = await apiRequest("POST", "/api/ai/chat", { message, history, weatherContext });
            return res.json();
        },
        onSuccess: (data) => {
            setHistory((prev) => [...prev, { role: "assistant", content: data.response }]);
        },
        onError: (error: Error) => {
            toast({
                title: "Erro no Assistente IA",
                description: error.message || "Verifique sua conexão ou tente mais tarde.",
                variant: "destructive"
            });
        }
    });

    const handleSendMessage = () => {
        if (!message.trim() || chatMutation.isPending) return;
        const newHistory: Message[] = [...history, { role: "user", content: message }];
        setHistory(newHistory);
        setMessage("");
        chatMutation.mutate({ message, history: newHistory, weatherContext });
    };

    useEffect(() => {
        if (scrollRef.current) {
            const isLastMessageAssistant = history.length > 0 && history[history.length - 1].role === "assistant";
            if (isLastMessageAssistant && lastMessageRef.current) {
                lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }
    }, [history, isOpen]);

    const handleSpeak = (text: string) => {
        if (isSpeaking && currentText === text) {
            stop();
        } else {
            speak(text);
        }
    };

    // Portuguese voices listed first in the picker
    const ptVoices = voices.filter(v => v.isPortuguese);
    const otherVoices = voices.filter(v => !v.isPortuguese).slice(0, 10);

    return (
        <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-[5000]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="mb-4"
                    >
                        <Card className="w-[calc(100vw-1.5rem)] sm:w-[400px] h-[480px] sm:h-[560px] shadow-2xl border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
                            <CardHeader className="p-4 bg-gradient-to-r from-primary to-primary/80 text-white flex flex-row items-center justify-between space-y-0 shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-white/20 rounded-lg">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm font-bold font-heading">AgroSatelite Assistente</CardTitle>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                            <span className="text-[10px] text-white/70 uppercase font-bold tracking-widest">IA Especialista Online</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Voice selector button */}
                                    {isSupported && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowVoicePicker(p => !p)}
                                                className="flex items-center gap-1 text-white/70 hover:text-white text-[10px] font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg transition-colors"
                                                title="Escolher voz"
                                            >
                                                <Volume2 className="w-3 h-3" />
                                                <span className="hidden sm:inline max-w-[80px] truncate">{selectedVoice?.name.split(" ")[0] ?? "Voz"}</span>
                                                <ChevronDown className="w-3 h-3" />
                                            </button>

                                            {showVoicePicker && (
                                                <div className="absolute right-0 top-8 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto">
                                                    <div className="p-2 sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2">Escolher Voz</p>
                                                    </div>

                                                    {ptVoices.length > 0 && (
                                                        <>
                                                            <p className="text-[9px] text-primary font-bold uppercase tracking-wider px-3 pt-2 pb-1">🇵🇹 Português</p>
                                                            {ptVoices.map(v => (
                                                                <button
                                                                    key={v.name}
                                                                    onClick={() => { setSelectedVoice(v); setShowVoicePicker(false); }}
                                                                    className={cn(
                                                                        "w-full text-left px-3 py-2 text-xs hover:bg-primary/5 transition-colors flex items-center justify-between gap-2",
                                                                        selectedVoice?.name === v.name ? "bg-primary/10 text-primary font-bold" : "text-slate-700 dark:text-slate-300"
                                                                    )}
                                                                >
                                                                    <span className="truncate">{v.name}</span>
                                                                    <span className="text-[9px] text-slate-400 shrink-0">{v.lang}</span>
                                                                </button>
                                                            ))}
                                                        </>
                                                    )}

                                                    {otherVoices.length > 0 && (
                                                        <>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider px-3 pt-2 pb-1">Outras vozes</p>
                                                            {otherVoices.map(v => (
                                                                <button
                                                                    key={v.name}
                                                                    onClick={() => { setSelectedVoice(v); setShowVoicePicker(false); }}
                                                                    className={cn(
                                                                        "w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-2",
                                                                        selectedVoice?.name === v.name ? "bg-primary/10 text-primary font-bold" : "text-slate-600 dark:text-slate-400"
                                                                    )}
                                                                >
                                                                    <span className="truncate">{v.name}</span>
                                                                    <span className="text-[9px] text-slate-400 shrink-0">{v.lang}</span>
                                                                </button>
                                                            ))}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-white hover:bg-white/10"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Minimize2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 p-0 overflow-hidden relative">
                                <div
                                    ref={scrollRef}
                                    className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar"
                                    onClick={() => setShowVoicePicker(false)}
                                >
                                    {history.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-6">
                                            <div className="p-4 bg-primary/10 rounded-full">
                                                <Sparkles className="w-8 h-8 text-primary" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Olá! Como posso ajudar na sua fazenda hoje?</h4>
                                                <p className="text-[11px] text-slate-500 mt-1">Pergunte sobre seus talhões específicos ou sobre o clima das províncias.</p>
                                                {isSupported && (
                                                    <p className="text-[10px] text-primary/70 mt-2 font-medium">🔊 Clique no ícone do alto-falante para ouvir as respostas</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {history.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            ref={idx === history.length - 1 ? lastMessageRef : null}
                                            className={cn(
                                                "flex flex-col max-w-[88%] animate-in fade-in slide-in-from-bottom-1 duration-300",
                                                msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                                            )}
                                        >
                                            <div className={cn("flex items-center gap-1.5 mb-1 opacity-50", msg.role === "user" ? "flex-reverse" : "")}>
                                                {msg.role === "assistant" ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                <span className="text-[9px] font-bold uppercase tracking-tight">
                                                    {msg.role === "assistant" ? "AgroSat IA" : "Produtor"}
                                                </span>
                                            </div>
                                            {/* TTS button for assistant messages - MOVED ABOVE */}
                                            {msg.role === "assistant" && isSupported && (
                                                <button
                                                    onClick={() => handleSpeak(msg.content)}
                                                    className={cn(
                                                        "mb-1 flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full transition-all",
                                                        isSpeaking && currentText === msg.content
                                                            ? "bg-primary/15 text-primary animate-pulse"
                                                            : "text-slate-400 hover:text-primary hover:bg-primary/5"
                                                    )}
                                                    title={isSpeaking && currentText === msg.content ? "Parar áudio" : "Ouvir resposta"}
                                                >
                                                    {isSpeaking && currentText === msg.content
                                                        ? <><VolumeX className="w-3 h-3" /> Parar</>
                                                        : <><Volume2 className="w-3 h-3" /> Ouvir</>
                                                    }
                                                </button>
                                            )}

                                            <div className={cn(
                                                "p-3 rounded-2xl text-[12px] leading-relaxed shadow-sm",
                                                msg.role === "user"
                                                    ? "bg-primary text-white rounded-tr-none"
                                                    : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-none"
                                            )}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}

                                    {chatMutation.isPending && (
                                        <div className="flex flex-col items-start max-w-[80%]">
                                            <div className="flex items-center gap-1.5 mb-1 opacity-50">
                                                <Bot className="w-3 h-3" />
                                                <span className="text-[9px] font-bold uppercase tracking-tight text-primary animate-pulse">Pensando...</span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                                <div className="flex gap-1">
                                                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>

                            <CardFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                                    className="flex w-full gap-2"
                                >
                                    <Input
                                        placeholder="Tire suas dúvidas técnicas..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="text-xs h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                    />
                                    <Button
                                        type="submit"
                                        size="icon"
                                        className="h-10 w-10 shrink-0 rounded-xl shadow-lg shadow-primary/20"
                                        disabled={!message.trim() || chatMutation.isPending}
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </form>
                            </CardFooter>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <Button
                onClick={() => setIsOpen(!isOpen)}
                size="icon"
                className={cn(
                    "h-14 w-14 rounded-full shadow-2xl transition-all duration-300 group relative overflow-hidden",
                    isOpen ? "bg-rose-500 hover:bg-rose-600 rotate-90" : "bg-primary hover:bg-primary/90"
                )}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {isOpen ? (
                    <Minimize2 className="w-6 h-6 text-white" />
                ) : (
                    <div className="relative">
                        <MessageSquare className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-primary animate-ping" />
                    </div>
                )}
            </Button>
        </div>
    );
}
