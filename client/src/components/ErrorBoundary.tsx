import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Uncaught error in ${this.props.name || 'Component'}:`, error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="p-6 rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/50 flex flex-col items-center justify-center text-center space-y-4 my-4">
                    <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-rose-900">Algo correu mal</h3>
                        <p className="text-sm text-rose-700 max-w-xs mx-auto">
                            Houve um erro ao carregar este componente. Isso pode ser devido a dados corrompidos.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-rose-200 hover:bg-rose-100 text-rose-700"
                        onClick={() => this.setState({ hasError: false })}
                    >
                        <RefreshCw className="w-4 h-4" /> Tentar Novamente
                    </Button>
                    {this.state.error && (
                        <details className="text-[10px] text-rose-400 mt-2 cursor-pointer opacity-50 hover:opacity-100">
                            <summary>Ver detalhes técnicos</summary>
                            <pre className="mt-2 p-2 bg-white/50 rounded text-left overflow-auto max-w-full">
                                {this.state.error.message}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
