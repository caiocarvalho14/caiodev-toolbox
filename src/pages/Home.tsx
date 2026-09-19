import type { LucideIcon } from 'lucide-react';
import { LayoutGrid, ArrowRight, LucideToolbox, LogOut, Wrench } from 'lucide-react';
import { useRouteAccess } from '../contexts/RouteAccessContext.tsx';

// Record<string, ...> dá o index signature que faltava — sem isso o TS não
// deixa indexar o objeto com uma string qualquer (rota.path)
const visual: Record<string, { icon: LucideIcon; gradient: string }> = {
    "/conferencia": { icon: LucideToolbox, gradient: "from-rose-500 to-red-600" },
    "/admin": { icon: LayoutGrid, gradient: "from-indigo-500 to-blue-600" },
};

const visualPadrao = { icon: LayoutGrid, gradient: "from-slate-300 to-slate-400" };

export default function WorkHub() {
    const { rotasPermitidas, loading } = useRouteAccess();
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando...</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
                <div className="mb-14">
                    <div className='flex justify-between text-xs'>
                        <span className="inline-flex items-center gap-2  font-medium tracking-widest uppercase text-slate-500 mb-4">
                            <Wrench className="w-4 h-4" /> CaioDev - ToolBox
                        </span>
                        <a href="/logout"><LogOut className='text-slate-500 cursor-pointer'/></a>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 mb-4">
                        Centro de ferramentas
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl">
                        Desenvolvido por Caio Carvalho.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                    {rotasPermitidas.map((rota) => {
                        const { icon: IconComponent, gradient } = visual[rota.path] ?? visualPadrao;
                        return (
                            <a key={rota.id} className="block" href={rota.path}>
                                <div className="group relative h-full bg-white rounded-2xl border border-slate-200 p-7 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-0.5">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 shadow-sm`}>
                                        <IconComponent className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{rota.nome}</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed mb-6">{rota.descricao}</p>
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                                        Acessar <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </a>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}