import { Hero } from "@/components/marketing/hero";
import { Concierge } from "@/components/marketing/concierge";
import { Apartment } from "@/components/marketing/apartment";
import { Services } from "@/components/marketing/services";
import { Tourism } from "@/components/marketing/tourism";
import { Reviews } from "@/components/marketing/reviews";
import { Closing } from "@/components/marketing/closing";
import { getPageBlocks, type Block } from "@/lib/cms";

const COMPONENTS: Record<
  string,
  (props: { content: Record<string, unknown> }) => React.ReactNode
> = {
  hero: () => null, // Hero se charge lui-même (image prioritaire)
  concierge: ({ content }) => <Concierge content={content} />,
  apartment: ({ content }) => <Apartment content={content} />,
  services: ({ content }) => <Services content={content} />,
  tourism: ({ content }) => <Tourism content={content} />,
  reviews: ({ content }) => <Reviews content={content} />,
  closing: ({ content }) => <Closing content={content} />,
};

export default async function HomePage() {
  const blocks = await getPageBlocks("home");
  const visible = blocks.filter((b) => b.visible);
  // repli si le CMS n'a pas encore de blocs
  const list: Block[] =
    visible.length > 0
      ? visible
      : ["hero", "concierge", "apartment", "services", "tourism", "reviews", "closing"].map(
          (type, i) => ({ id: type, type, position: i, visible: true, content: {} }),
        );

  return (
    <>
      <Hero />
      {list
        .filter((b) => b.type !== "hero")
        .map((b) => {
          const Render = COMPONENTS[b.type];
          return Render ? <div key={b.id}>{Render({ content: b.content })}</div> : null;
        })}
    </>
  );
}
