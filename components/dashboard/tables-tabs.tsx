"use client";

import { useState } from "react";

interface TabsProps {
  children: React.ReactNode;
  defaultTab?: "simple" | "floor-plan";
}

export function TablesTabs({ children, defaultTab = "simple" }: TabsProps) {
  const [activeTab, setActiveTab] = useState<"simple" | "floor-plan">(
    defaultTab
  );

  const tabs = [
    { id: "simple" as const, label: "Vista Simple" },
    { id: "floor-plan" as const, label: "Plano de Planta" },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {Array.isArray(children) ? children[tabs.findIndex((t) => t.id === activeTab)] : children}
      </div>
    </div>
  );
}
