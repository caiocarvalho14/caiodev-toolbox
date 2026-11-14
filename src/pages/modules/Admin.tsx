import { UserCog } from "lucide-react";
import { useCargo } from "../../contexts/CargoContext";
import PageLayout, { type TabItem } from "../PageLayouts";
import { Navigate } from "react-router-dom";

// tabs
import UsuarioManager from "./admin/components/usuarioManager";

const tabs: TabItem[] = [
    { id: 'users', label: 'Usuários', icon: UserCog, component: UsuarioManager },

]

export default function AdminPage() {
    const { temCargo, loading } = useCargo()

    if (loading) return null

    if (!temCargo('administrador')) {
        return <Navigate to="/"/>
    }

    return <PageLayout
        title="Página Administrativa"
        description="Página de controle do sistema."
        icon={UserCog}
        gradient="from-rose-500 to-red-600"
        activeTabClassName="border-rose-500 text-rose-600"
        backTo="/"
        tabs={tabs}
        defaultTabId="users"
    />
}