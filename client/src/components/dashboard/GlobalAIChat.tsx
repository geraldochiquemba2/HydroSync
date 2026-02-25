import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, Sparkles, Bot, User, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

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
    const scrollRef = useRef<HTMLDivElement>(null);

    const chatMutation = useMutation({
        mutationFn: async ({ message, history, weatherContext }: { message: string; history: Message[]; weatherContext: any[] }) => {
            const res = await apiRequest("POST", "/api/ai/chat", { message, history, weatherContext });
            return res.json();
        },
        onSuccess: (data) => {
            setHistory((prev) => [...prev, { role: "assistant", content: data.response }]);
        }
    });

    const handleSendMessage = () => {
        if (!message.trim() || chatMutation.isPending) return;

        const newHistory: Message[] = [...history, { role: "user", content: message }];
        setHistory(newHistory);
        setMessage("");

        chatMutation.mutate({
            message,
            history: newHistory,
            weatherContext
        });
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, isOpen]);

    return (
        <div className="fixed bottom-6 right-6 z-[5000]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="mb-4"
                    >
                        <Card className="w-[380px] h-[520px] shadow-2xl border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
                            <CardHeader className="p-4 bg-gradient-to-r from-primary to-primary/80 text-white flex flex-row items-center justify-between space-y-0">
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
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-white hover:bg-white/10"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <Minimize2 className="w-4 h-4" />
                                </Button>
                            </CardHeader>

                            <CardContent className="flex-1 p-0 overflow-hidden relative">
                                <div
                                    ref={scrollRef}
                                    className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar"
                                >
                                    {history.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-6">
                                            <div className="p-4 bg-primary/10 rounded-full">
                                                <Sparkles className="w-8 h-8 text-primary" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Olá! Como posso ajudar na sua fazenda hoje?</h4>
                                                <p className="text-[11px] text-slate-500 mt-1">Pergunte sobre seus talhões específicos ou sobre o clima das províncias.</p>
                                            </div>
                                        </div>
                                    )}

                                    {history.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                "flex flex-col max-w-[85%] animate-in fade-in slide-in-from-bottom-1 duration-300",
                                                msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex items-center gap-1.5 mb-1 opacity-50",
                                                msg.role === "user" ? "flex-reverse" : ""
                                            )}>
                                                {msg.role === "assistant" ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                <span className="text-[9px] font-bold uppercase tracking-tight">
                                                    {msg.role === "assistant" ? "AgroSat IA" : "Produtor"}
                                                </span>
                                            </div>
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

                            <CardFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
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
