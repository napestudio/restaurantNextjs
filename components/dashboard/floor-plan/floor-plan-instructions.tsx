import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FloorPlanInstructions() {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg">Cómo Usar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-semibold mb-2">🖱️ Mover Mesas</div>
            <p className="text-muted-foreground">
              Haz clic y arrastra cualquier mesa para reposicionarla en el
              plano
            </p>
          </div>
          <div>
            <div className="font-semibold mb-2">✏️ Editar Propiedades</div>
            <p className="text-muted-foreground">
              Selecciona una mesa para editar su forma, capacidad y estado
            </p>
          </div>
          <div>
            <div className="font-semibold mb-2">🔄 Rotar Mesas</div>
            <p className="text-muted-foreground">
              Selecciona una mesa y usa el botón de rotar para cambiar su
              orientación
            </p>
          </div>
          <div>
            <div className="font-semibold mb-2">💾 Guardar Distribución</div>
            <p className="text-muted-foreground">
              Exporta tu plano para guardarlo, o importa una distribución
              previamente guardada
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
