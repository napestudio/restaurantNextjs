"use client";

import { useState } from "react";
import { FiscalConfigData } from "@/actions/FiscalConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

// Sub-components
import { FiscalDataForm } from "./components/fiscal-data-form";
import { CertificatesForm } from "./components/certificates-form";
import { SalesPointsConfig } from "./components/sales-points-config";
import { ConnectionTest } from "./components/connection-test";

interface FiscalConfigClientProps {
  initialConfig: FiscalConfigData | null;
  restaurantId: string;
}

export function FiscalConfigClient({
  initialConfig,
  restaurantId,
}: FiscalConfigClientProps) {
  const [activeTab, setActiveTab] = useState("fiscal-data");

  // Show configuration status badge
  const getStatusBadge = () => {
    if (!initialConfig) {
      return (
        <Badge variant="destructive" className="ml-2">
          <XCircle className="h-3 w-3 mr-1" />
          No configurado
        </Badge>
      );
    }

    if (!initialConfig.isEnabled) {
      return (
        <Badge variant="secondary" className="ml-2">
          <AlertCircle className="h-3 w-3 mr-1" />
          Deshabilitado
        </Badge>
      );
    }

    if (initialConfig.environment === "test") {
      return (
        <Badge className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Ambiente de prueba
        </Badge>
      );
    }

    return (
      <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Configurado (Producción)
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          Facturación Electrónica AFIP
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Administra la configuración de facturación electrónica para AFIP
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="fiscal-data">Datos Fiscales</TabsTrigger>
            <TabsTrigger value="certificates">Certificados</TabsTrigger>
            <TabsTrigger value="sales-points">Puntos de Venta</TabsTrigger>
            <TabsTrigger value="testing">Pruebas</TabsTrigger>
          </TabsList>

          <TabsContent value="fiscal-data">
            <FiscalDataForm
              initialConfig={initialConfig}
              restaurantId={restaurantId}
            />
          </TabsContent>

          <TabsContent value="certificates">
            <CertificatesForm
              initialConfig={initialConfig}
              restaurantId={restaurantId}
            />
          </TabsContent>

          <TabsContent value="sales-points">
            <SalesPointsConfig
              initialConfig={initialConfig}
              restaurantId={restaurantId}
            />
          </TabsContent>

          <TabsContent value="testing">
            <ConnectionTest
              restaurantId={restaurantId}
              isConfigured={!!initialConfig?.isEnabled}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
