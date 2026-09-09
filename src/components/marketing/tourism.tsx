import { Reveal } from "@/components/ui/reveal";
import { getT } from "@/lib/i18n";

const places = [
  { name: "Ouidah", when: "sur la côte", note: "La route de l'esclave, le temple des pythons, la forêt sacrée de Kpassè." },
  { name: "Abomey", when: "à l'intérieur", note: "Les palais royaux du Dahomey, classés au patrimoine mondial de l'UNESCO." },
  { name: "Lac Noir", when: "excursion", note: "Des eaux paisibles bordées de végétation, en barque, à l'écart de la ville." },
  { name: "Agouland", when: "excursion", note: "Une nature préservée, pour une journée au vert loin de l'agitation." },
  { name: "Kpalimé", when: "vers le Togo", note: "Des collines verdoyantes, des cascades et des plantations, côté frontière." },
  { name: "Lomé", when: "vers le Togo", note: "La capitale togolaise, son grand marché et sa longue corniche en bord de mer." },
];

export async function Tourism() {
  const { t } = await getT();
  return (
    <section id="le-lieu" className="grain relative overflow-hidden bg-forest text-bone">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <Reveal className="max-w-xl">
          <h2 className="display text-[2.1rem] leading-[1.06] sm:text-[2.7rem]">
            {t("home.tourismTitle")}
            <span className="mt-1 block italic font-normal text-brass-3">
              {t("home.tourismTitleEm")}
            </span>
          </h2>
          <p className="measure mt-6 text-[1.02rem] leading-relaxed text-bone/70">
            {t("home.tourismLede")}
          </p>
        </Reveal>

        <Reveal as="ul" className="mt-14 border-t border-line-dark">
          {places.map((p) => (
            <li
              key={p.name}
              className="flex flex-col gap-1.5 border-b border-line-dark py-6 sm:grid sm:grid-cols-[10rem_1fr_8rem] sm:items-baseline sm:gap-8 sm:py-7"
            >
              <span className="display text-[1.5rem] text-bone sm:text-[1.7rem]">{p.name}</span>
              <p className="max-w-md text-[14px] leading-snug text-bone/55">{p.note}</p>
              <span className="text-[12px] uppercase tracking-[0.12em] text-brass-3 sm:text-right">
                {p.when}
              </span>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
