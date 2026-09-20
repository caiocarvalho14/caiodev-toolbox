import React, { useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { SyncButton } from '../components/SyncButton'

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
  activeTabClassName?: string;
  backTo?: string;
  backLabel?: string;
  tabs?: TabItem[];
  defaultTabId?: string;
}

export default function PageLayout({
  title,
  description,
  icon: Icon,
  gradient = "from-rose-500 to-red-600",
  activeTabClassName = "border-rose-500 text-rose-600",
  backTo = "/",
  backLabel = "Voltar",
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
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex flex-col items-start sm:items-center sm:flex-row gap-4 min-w-0">
            <Link
              to={backTo}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel}
            </Link>
            <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0" />
            <div className="flex items-center gap-2.5 min-w-0">
              {Icon && (
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} hidden sm:flex items-center justify-center shrink-0`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-slate-900 leading-tight truncate">{title}</h1>
                {description && <p className="text-xs text-slate-500 truncate">{description}</p>}
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <SyncButton />
          </div>
        </div>

        {/* Tabs */}
        {tabs.length > 0 && (
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex gap-1 -mb-px overflow-x-scroll">
              {tabs.map((t) => {
                const TabIcon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${isActive
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