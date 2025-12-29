import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";

export interface Sector {
  id: string;
  name: string;
  color: string;
  order: number;
  width: number;
  height: number;
  _count: {
    tables: number;
  };
}

interface SectorSelectorProps {
  sectors: Sector[];
  selectedSector: string | null;
  onSelectSector: (sectorId: string | null) => void;
  onAddSector?: () => void;
  onEditSector?: (sector: Sector) => void;
}

export const SectorSelector = memo(function SectorSelector({
  sectors,
  selectedSector,
  onSelectSector,
  onAddSector,
  onEditSector,
}: SectorSelectorProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {sectors.map((sector) => (
        <div key={sector.id} className="relative group">
          <Button
            variant={selectedSector === sector.id ? "default" : "outline"}
            onClick={() => onSelectSector(sector.id)}
            className={
              selectedSector === sector.id
                ? onEditSector ? "pr-10" : ""
                : onEditSector ? "hover:bg-gray-100 border-2 pr-10" : "hover:bg-gray-100 border-2"
            }
            style={{
              backgroundColor:
                selectedSector === sector.id ? sector.color : "transparent",
              borderColor: sector.color,
              color: selectedSector === sector.id ? "white" : sector.color,
            }}
          >
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: sector.color }}
            />
            {sector.name}
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-background/20">
              {sector._count.tables}
            </span>
          </Button>
          {onEditSector && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditSector(sector);
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                color: selectedSector === sector.id ? "white" : sector.color,
              }}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      {onAddSector && (
        <Button
          variant="outline"
          onClick={() => onAddSector()}
          className="border-dashed"
          aria-label="Agregar Sector"
        >
          +
        </Button>
      )}
    </div>
  );
});
