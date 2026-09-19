// pages/NotFound.tsx
import RippleButton from "../components/RippleButton";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-6">
            <div className="max-w-md w-full text-center">
                {/* Ícone com glow */}
                <div className="relative inline-flex items-center justify-center mb-8">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-500 to-red-600 opacity-20 blur-2xl w-24 h-24" />
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-sm">
                        <SearchX className="w-9 h-9 text-white" />
                    </div>
                </div>
                <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 mb-4">
                    Página não encontrada
                </h1>
                <p className="text-base text-slate-500 leading-relaxed mb-10">
                    O endereço que você tentou acessar não existe ou foi movido.
                    Verifique o link ou volte para o início.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                        to="/"
                        className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium shadow-sm transition-all duration-300 hover:bg-slate-800 hover:shadow-md"
                    >
                        <Home className="w-4 h-4" />
                        Ir para o início
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium transition-all duration-300 hover:border-slate-300 hover:text-slate-900"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </button>
                </div>
            </div>
        </div>
    );
}