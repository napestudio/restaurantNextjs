import SushiLoader from "@/components/dashboard/sushi-loader";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <SushiLoader />
    </div>
  );
}
