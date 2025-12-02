export default function TablesLoading() {
  return (
    <div className="bg-neutral-50 min-h-screen pt-15 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando mesas...</p>
      </div>
    </div>
  );
}
