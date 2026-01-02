import { getRestaurant } from "@/actions/Restaurant";
import Avatar from "@/components/avatar";
import WhatsappIcon from "@/components/ui/icons/Whatsapp";
import { MapPin } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const restaurantId = process.env.RESTAURANT_ID || "";

  if (!restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-lg">El restaurante no está configurado.</p>
      </div>
    );
  }

  const restaurant = await getRestaurant(restaurantId);
  return (
    <div className="min-h-screen place-content-center bg-black text-white">
      <div className="max-w-100 mx-auto px-8 md:px-0 flex justify-center flex-col items-center gap-9">
        <Avatar />
        <div className="flex flex-col items-center justify-center gap-4 w-full">
          <Link
            href="/reservas"
            prefetch={true}
            className="bg-black border-2 border-purple-900 hover:bg-purple-900  transition-colors rounded-full py-2 text-xl text-center font-bold uppercase w-full"
          >
            Reservas
          </Link>
          {/* <Link
            href="/carta/menu-principal"
            className="bg-black border-2 border-purple-900 hover:bg-purple-900 transition-colors rounded-full py-2 text-xl text-center font-bold uppercase w-full"
          >
            Carta
          </Link> */}
          {/* <a
            href="#"
            className="bg-black rounded-md py-2 text-xl text-center font-bold uppercase w-full"
          >
            Pedidos
          </a>
          <a
            href="#"
            className="bg-black rounded-md py-2 text-xl text-center font-bold uppercase w-full"
          >
            Take Away
          </a> */}
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
            {/* <p className="text-sm text-gray-400 mt-1">
              {restaurant.data.websiteUrl && (
                <a
                  href={restaurant.data.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:underline"
                >
                  Sitio Web
                </a>
              )}
            </p> */}
          </div>
        )}
      </div>
    </div>
  );
}
