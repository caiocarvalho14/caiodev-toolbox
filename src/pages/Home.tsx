import type { LucideIcon } from 'lucide-react';
import { LayoutGrid, ArrowRight, LucideToolbox, LogOut, UserShield, Settings } from 'lucide-react';
import { useRouteAccess } from '../contexts/RouteAccessContext.tsx';
import HomeCardSkeleton from '../components/HomeCardSkeleton.tsx';

import RippleButton from '../components/RippleButton.tsx';

const visual: Record<string, { icon: LucideIcon; gradient: string }> = {
    "/conferencia": { icon: LucideToolbox, gradient: "from-rose-500 to-red-600" },
};

const visualPadrao = { icon: LayoutGrid, gradient: "from-slate-300 to-slate-400" };

export default function WorkHub() {
    const { rotasPermitidas, loading } = useRouteAccess();

    return (
        <>
        <div className=" bg-gradient-to-b from-slate-50 to-white">
            

            <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
                <div className="mb-14">

                    <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 mb-4">
                        Centro de ferramentas
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl">
                        Desenvolvido por Caio Carvalho.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                    {loading
                        ? Array.from({ length: 2 }).map((_, i) => <HomeCardSkeleton key={i} />)
                        : rotasPermitidas.map((rota) => {
                            const { icon: IconComponent, gradient } = visual[rota.path] ?? visualPadrao;
                            return (
                                <a key={rota.id} className="block" href={rota.path}>
                                    <div className="group relative h-full bg-white rounded-2xl border border-slate-200 p-7 overflow-hidden transition-all duration-300 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/70 hover:-translate-y-1">
                                        <div
                                            className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20`}
                                        />

                                        <div className="relative flex items-start justify-between mb-5">
                                            <div
                                                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105`}
                                            >
                                                <IconComponent className="w-6 h-6 text-white" />
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-slate-300 transition-all duration-300 group-hover:text-slate-900 group-hover:translate-x-1" />
                                        </div>

                                        <h3 className="relative text-xl font-semibold text-slate-900 mb-2 tracking-tight">
                                            {rota.nome}
                                        </h3>
                                        <p className="relative text-sm text-slate-500 leading-relaxed mb-6">
                                            {rota.descricao}
                                        </p>
                                    </div>
                                </a>
                            );
                        })}
                </div>
            </div>
        </div>

        </>
    );
}