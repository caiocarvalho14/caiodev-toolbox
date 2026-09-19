import React, { useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, type LucideIcon } from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  component: ComponentType<any>;
  props?: Record<string, any>;
}

interface PageLayoutProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  gradient?: string;
  activeTabClassName?: string; // classes Tailwind completas da aba ativa
  backTo?: string;
  backLabel?: string;
  tabs?: TabItem[];
  defaultTabId?: string;
}

/**
 * Layout reutilizável para páginas de módulo (ex: Açougue, futuros módulos do toolbox).
 * Cada seção é descrita em `tabs`: { id, label, icon, component, props }.
 */
export default function PageLayout({
  title,
  description,
  icon: Icon,
  gradient = "from-rose-500 to-red-600",
  activeTabClassName = "border-rose-500 text-rose-600",
  backTo = "/",
  backLabel = "Hub",
  tabs = [],
  defaultTabId,
}: PageLayoutProps) {
  const [activeTab, setActiveTab] = useState<string | undefined>(
    defaultTabId || tabs[0]?.id
  );

  const active = tabs.find((t) => t.id === activeTab);
  const ActiveComponent = active?.component;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={backTo}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel}
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2.5">
              {Icon && (
                <div
                  className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-semibold text-slate-900 leading-tight">{title}</h1>
                {description && <p className="text-xs text-slate-500">{description}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        {tabs.length > 0 && (
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex gap-1 -mb-px">
              {tabs.map((t) => {
                const TabIcon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      isActive
                        ? activeTabClassName
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {TabIcon && <TabIcon className="w-4 h-4" />}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo da seção ativa */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {ActiveComponent && <ActiveComponent {...(active?.props || {})} />}
      </div>
    </div>
  );
}