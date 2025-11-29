import { RefreshCw } from "lucide-react";

export default function LoadingToast() {
  return (
    <div className="fixed inset-0 bg-opacity-75 pointer-events-none flex items-end justify-end h-svh z-10 rounded-lg p-6">
      <div className="flex items-center gap-3 bg-white px-6 py-2 rounded-md shadow-md">
        <RefreshCw className="w-5 h-5 text-red-600 animate-spin" />
        <p className="text-sm font-medium text-gray-700">
          Actualizando datos...
        </p>
      </div>
    </div>
  );
}
