import { getRestaurant } from "@/actions/Restaurant";
import { getActiveHomePageLinks } from "@/actions/HomePageLinks";
import Avatar from "@/components/avatar";
import WhatsappIcon from "@/components/ui/icons/Whatsapp";
import { MapPin } from "lucide-react";
import Link from "next/link";
import type { SerializedHomePageLink } from "@/actions/HomePageLinks";

export default async function Home() {
  const restaurantId = process.env.RESTAURANT_ID || "";
  const branchId = process.env.BRANCH_ID || "";

  if (!restaurantId || !branchId) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-black text-white">
        <p className="text-lg">El restaurante no está configurado.</p>
      </div>
    );
  }

  const [restaurant, linksResult] = await Promise.all([
    getRestaurant(restaurantId),
    getActiveHomePageLinks(branchId),
  ]);

  const generateLinkUrl = (link: SerializedHomePageLink): string => {
    switch (link.type) {
      case "MENU":
        return link.menu?.slug ? `/carta/${link.menu.slug}` : "/";
      case "TIMESLOT":
        return "/reservas";
      case "RESERVATION":
        return "/reservas";
      case "PEDIDOS":
        return "/pedidos";
      case "CUSTOM":
        return link.customUrl || "#";
      default:
        return "/";
    }
  };

  const links = linksResult.success && linksResult.data ? linksResult.data : [];

  // Default link if no links configured
  const hasLinks = links.length > 0;

  return (
    <div className="min-h-svh place-content-center bg-black text-white">
      <div className="max-w-100 mx-auto px-8 md:px-0 flex justify-center flex-col items-center gap-9">
        <Avatar />
        <div className="flex flex-col items-center justify-center gap-4 w-full">
          {hasLinks &&
            links.map((link) => (
              <Link
                key={link.id}
                href={generateLinkUrl(link)}
                prefetch={true}
                className="bg-black border-2 border-purple-900 group relative transition-colors rounded-full py-2 text-xl text-center font-bold uppercase w-full overflow-hidden"
              >
                <div className="absolute h-full w-full inset-0 bg-purple-900 scale-y-0 group-hover:scale-y-100 origin-bottom transition-transform duration-500"></div>
                <div className="relative overflow-hidden w-max mx-auto">
                  <span className="inline-block group-hover:translate-y-14 group-hover:skew-12 transition-transform duration-500">
                    {link.label}
                  </span>
                  <span className="inline-block absolute left-0 -top-full skew-12 group-hover:skew-0 group-hover:translate-y-full -translate-y-full transition-transform duration-500">
                    {link.label}
                  </span>
                </div>
              </Link>
            ))}
        </div>
      </div>
      <div>
        {restaurant.success && restaurant.data && (
          <div className="text-center mt-8">
            <p className="text-lg">
              {restaurant.data.description || "Disfruta de nuestra comida"}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              <MapPin className="inline-block mr-1 w-4 h-4" />
              {restaurant.data.address}, {restaurant.data.city},{" "}
              {restaurant.data.state}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {restaurant.data.phone && (
                <Link
                  href={`https://api.whatsapp.com/send/?phone=${restaurant.data.phone}&text=Hola!+Quisiera+hacer+una+consulta.&app_absent=0`}
                  className="flex items-center self-center justify-center"
                >
                  <span className="inline-block mr-1 w-4 h-4">
                    <WhatsappIcon />
                  </span>
                  {restaurant.data.phone}
                </Link>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
