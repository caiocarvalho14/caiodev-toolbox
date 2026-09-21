import { LucideToolbox, Package } from "lucide-react";
import PageLayout from "../PageLayouts";
import { useCargo } from "../../contexts/CargoContext";

export default function AdminPage() {
    const { temCargo, loading } = useCargo()

    if (loading) return null

    if (!temCargo('administrador')) {
        return <p>Sem permissão.</p>
    }

    return <div>Conteúdo restrito a admin</div>
}