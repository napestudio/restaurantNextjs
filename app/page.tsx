import Hero from "@/components/home/hero";
import Navbar from "@/components/navbar";
import homepageData from "@/config/homepage.json";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        logo={homepageData.navbar.logo}
        loginButton={homepageData.navbar.loginButton}
      />
      <Hero
        title={homepageData.hero.title}
        subtitle={homepageData.hero.subtitle}
        ctaButton={homepageData.hero.ctaButton}
        secondaryButton={homepageData.hero.secondaryButton}
        reservationTitle={homepageData.hero.reservationTitle}
        branchId={process.env.BRANCH_ID || ""}
      />
    </div>
  );
}
