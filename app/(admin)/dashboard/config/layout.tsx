import ConfigLayoutClient from "./config-layout-client";

export default async function ConfigPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConfigLayoutClient>{children}</ConfigLayoutClient>;
}
