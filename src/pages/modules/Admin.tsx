import { LucideToolbox, Package } from "lucide-react";
import PageLayout from "../PageLayouts";

export default function Acougue() {

    function Page() {
        return (
            <>
                Conferência page
            </>
        )
    }

    return (
        <PageLayout
            title="Página de Conferência"
            description="Gestão de conferência baseado em disponível no estoque e disponível no físico."
            icon={LucideToolbox}
            gradient="from-rose-500 to-red-600"
            tabs={[
                { id: "carnes", label: "Carnes", icon: Package, component: Page },
            ]}
        />
    );
}