import ConfigSideBar from "@/components/dashboard/config-side-bar";

export default async function ConfigPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 w-full flex pt-11">
      <ConfigSideBar />
      <main className="mx-auto pt-11">{children}</main>
    </div>
  );
}
