import ConfigSideBar from "@/components/dashboard/config-side-bar";

export default async function ConfigPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 w-full flex pt-11">
      <div className="left-0 h-svh sticky top-11">
        <ConfigSideBar />
      </div>
      <main className="mx-auto w-full">{children}</main>
    </div>
  );
}
