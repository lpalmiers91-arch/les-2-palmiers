import { Hero } from "@/components/marketing/hero";
import { Concierge } from "@/components/marketing/concierge";
import { Apartment } from "@/components/marketing/apartment";
import { Services } from "@/components/marketing/services";
import { Tourism } from "@/components/marketing/tourism";
import { Closing } from "@/components/marketing/closing";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Concierge />
      <Apartment />
      <Services />
      <Tourism />
      <Closing />
    </>
  );
}
