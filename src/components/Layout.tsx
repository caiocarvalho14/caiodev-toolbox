// Layout.tsx
import { UserShield, Settings, LogOut } from "lucide-react";
import { Outlet } from "react-router-dom";
import { useCargo } from "../contexts/CargoContext";

export default function Layout() {
    const { temCargo, loading } = useCargo()
    return (
        <>
            {/* Mini cabeçalho fixo */}
            <header className="sticky top-0 z-10 bg-white backdrop-blur-sm border-b border-slate-200">

                <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-2">
                    <a href="/"><span className="inline-flex justify-center  items-center gap-2 font-medium tracking-widest uppercase text-slate-500 ">
                        CaioDev - ToolBox
                    </span></a>
                    <div className='flex items-center justify-end'>
                        {temCargo('administrador') ? <a
                            href="/admin"
                            type="button"
                            title="Sessão Administrativa"
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <UserShield className="w-5 h-5" />
                        </a> : ''}
                        <button
                            type="button"
                            title="Configurações"
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                        <a href="/logout"
                            title="Sair"
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer">

                            <LogOut className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </header>
            <Outlet />
        </>
    );
}