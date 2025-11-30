import Avatar from "@/components/avatar";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen place-content-center bg-neutral-800 text-white">
      <div className="max-w-[400px] mx-auto px-8 md:px-0 flex justify-center flex-col items-center gap-9">
        <Avatar />
        <div className="flex flex-col items-center justify-center gap-4 w-full">
          <Link
            href="/reservas"
            prefetch={true}
            className="bg-black hover:bg-purple-900  transition-colors rounded-md py-2 text-xl text-center font-bold uppercase w-full"
          >
            Reservas
          </Link>
          <Link
            href="/carta/menu-principal"
            className="bg-black hover:bg-purple-900  transition-colors rounded-md py-2 text-xl text-center font-bold uppercase w-full"
          >
            Carta
          </Link>
          <a
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
          </a>
        </div>
      </div>
      {/* <Navbar
        logo={homepageData.navbar.logo}
        loginButton={homepageData.navbar.loginButton}
      /> */}
      {/* <Hero
        title={homepageData.hero.title}
        subtitle={homepageData.hero.subtitle}
        ctaButton={homepageData.hero.ctaButton}
        secondaryButton={homepageData.hero.secondaryButton}
        reservationTitle={homepageData.hero.reservationTitle}
        branchId={process.env.BRANCH_ID || ""}
      /> */}
    </div>
  );
}
