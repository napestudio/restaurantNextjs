"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchClients, type ClientData } from "@/actions/clients";
import { Plus } from "lucide-react";

interface ClientPickerProps {
  branchId: string;
  selectedClient: ClientData | null;
  onSelectClient: (client: ClientData | null) => void;
  onCreateNew: (searchQuery: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function ClientPicker({
  branchId,
  selectedClient,
  onSelectClient,
  onCreateNew,
  label = "Cliente",
  placeholder = "Buscar cliente...",
  disabled = false,
}: ClientPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Debounced search
  const searchClientsDebounced = useCallback(
    async (query: string) => {
      if (!query || query.trim().length === 0) {
        setClients([]);
        return;
      }

      setIsLoading(true);
      const result = await searchClients(branchId, query);
      if (result.success && result.data) {
        setClients(result.data);
      } else {
        setClients([]);
      }
      setIsLoading(false);
    },
    [branchId]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      searchClientsDebounced(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchClientsDebounced]);

  // Update search query when selected client changes externally
  useEffect(() => {
    if (selectedClient) {
      const displayText = selectedClient.phone
        ? `${selectedClient.name} - ${selectedClient.phone}`
        : selectedClient.name;
      setSearchQuery(displayText);
    }
  }, [selectedClient]);

  const handleSelectClient = (client: ClientData) => {
    onSelectClient(client);
    const displayText = client.phone
      ? `${client.name} - ${client.phone}`
      : client.name;
    setSearchQuery(displayText);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    onSelectClient(null);
    setSearchQuery("");
    setClients([]);
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setShowSuggestions(true);
    // If user is typing, clear the selected client
    if (selectedClient) {
      onSelectClient(null);
    }
  };

  const handleCreateNew = () => {
    setShowSuggestions(false);
    onCreateNew(searchQuery);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="client-search">{label}</Label>
      <div className="relative">
        <Input
          id="client-search"
          type="text"
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
        />

        {selectedClient && searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        )}

        {showSuggestions && searchQuery && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {isLoading ? (
              <div className="p-3 text-sm text-gray-500">Buscando...</div>
            ) : (
              <>
                {clients.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">
                    No se encontraron clientes
                  </div>
                ) : (
                  clients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur
                        handleSelectClient(client);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {client.name}
                            {client.phone && (
                              <span className="text-gray-500 ml-2">
                                - {client.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
                {/* Create new client option */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleCreateNew();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-t border-gray-200 text-blue-600 font-medium"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Nuevo Cliente</span>
                  </div>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
