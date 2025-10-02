import Navbar from "@/lib/components/Navbar";
import Hero from "@/lib/components/Hero";
import homepageData from "@/lib/data/homepage.json";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar logo={homepageData.navbar.logo} loginButton={homepageData.navbar.loginButton} />
      <Hero
        title={homepageData.hero.title}
        subtitle={homepageData.hero.subtitle}
        ctaButton={homepageData.hero.ctaButton}
        secondaryButton={homepageData.hero.secondaryButton}
      />
    </div>
  );
}
