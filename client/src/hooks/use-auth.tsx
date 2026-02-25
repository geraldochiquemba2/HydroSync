import { createContext, ReactNode, useContext } from "react";
import {
    useQuery,
    useMutation,
    UseMutationResult,
    QueryObserverResult,
} from "@tanstack/react-query";
import { insertUserSchema, User, InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    error: Error | null;
    loginMutation: UseMutationResult<User, Error, InsertUser>;
    logoutMutation: UseMutationResult<void, Error, void>;
    registerMutation: UseMutationResult<User, Error, InsertUser>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { toast } = useToast();
    const {
        data: user,
        error,
        isLoading,
    } = useQuery<User | null, Error>({
        queryKey: ["/api/user"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/user");
            if (res.status === 401) return null;
            if (!res.ok) throw new Error("Could not fetch user");
            return res.json();
        },
        retry: false,
    });

    const loginMutation = useMutation({
        mutationFn: async (credentials: InsertUser) => {
            const res = await apiRequest("POST", "/api/login", credentials);
            if (!res.ok) throw new Error("Credenciais inválidas");
            return res.json();
        },
        onSuccess: (user: User) => {
            queryClient.setQueryData(["/api/user"], user);
            toast({
                title: "Bem-vindo!",
                description: `Login realizado com sucesso.`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Erro no Login",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const registerMutation = useMutation({
        mutationFn: async (credentials: InsertUser) => {
            const res = await apiRequest("POST", "/api/register", credentials);
            if (!res.ok) {
                const message = await res.text();
                throw new Error(message || "Falha no registro");
            }
            return res.json();
        },
        onSuccess: (user: User) => {
            queryClient.setQueryData(["/api/user"], user);
            toast({
                title: "Sucesso!",
                description: "Conta criada com sucesso.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Erro no Registro",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const logoutMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/logout");
            if (!res.ok) throw new Error("Falha ao sair");
        },
        onSuccess: () => {
            queryClient.setQueryData(["/api/user"], null);
            toast({
                title: "Até logo!",
                description: "Você saiu da sua conta.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Erro ao Sair",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    return (
        <AuthContext.Provider
            value={{
                user: user ?? null,
                isLoading,
                error,
                loginMutation,
                logoutMutation,
                registerMutation,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
