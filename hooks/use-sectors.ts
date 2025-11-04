import { useState, useEffect, useCallback } from "react";
import { getSectorsByBranch } from "@/actions/Sector";
import type { Sector } from "@/types/tables-client";

export function useSectors(branchId: string) {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [sectorsLoaded, setSectorsLoaded] = useState(false);

  const fetchSectors = useCallback(async () => {
    const result = await getSectorsByBranch(branchId);
    if (result.success && result.data) {
      setSectors(result.data);
      // Set the first sector as default IMMEDIATELY to prevent flicker
      if (result.data.length > 0 && !selectedSector) {
        setSelectedSector(result.data[0].id);
      }
      setSectorsLoaded(true);
    }
  }, [branchId, selectedSector]);

  const refreshSectors = useCallback(async () => {
    const result = await getSectorsByBranch(branchId);
    if (result.success && result.data) {
      setSectors(result.data);
      // If current selected sector no longer exists, switch to the first one
      if (result.data.length > 0) {
        const stillExists = result.data.some((s) => s.id === selectedSector);
        if (!stillExists) {
          setSelectedSector(result.data[0].id);
        }
      }
    }
  }, [branchId, selectedSector]);

  // Fetch sectors on mount
  useEffect(() => {
    fetchSectors();
  }, [fetchSectors]);

  return {
    sectors,
    selectedSector,
    setSelectedSector,
    sectorsLoaded,
    refreshSectors,
  };
}
