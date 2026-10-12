import { useId, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Check, ChevronDown, MapPin } from "lucide-react";
import { formatDate } from "@/lib/format";
import { rupees, summarisePrices, type Restaurant } from "../data/restaurants";
import { HygieneBadge } from "./HygieneBadge";

export function RestaurantCard({ restaurant, live = false }: { restaurant: Restaurant; live?: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonId = useId();
  const priced = restaurant.quotes.length > 0;
  const { rows, best, saving } = priced
    ? summarisePrices(restaurant.quotes)
    : { rows: [], best: null, saving: 0 };

  return (
    <article
      id={`listing-${restaurant.id}`}
      data-reveal="pop"
      className="group/card flex flex-col overflow-hidden rounded-card border border-line bg-canvas transition-[border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:border-control hover:shadow-raised"
    >
      <div className="overflow-hidden">
      <img
        src={restaurant.image}
        width={800}
        height={600}
        loading="lazy"
        decoding="async"
        alt={restaurant.imageAlt}
        className="aspect-4/3 w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/card:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100"
      />
      </div>

      <div className="flex flex-1 flex-col p-5">
        {!live && (
          <p className="text-[12px] font-semibold tracking-[0.08em] text-muted uppercase">
            Sample listing
          </p>
        )}
        <h3 className="sg-h3 mt-1.5">
          {restaurant.href ? (
            <Link to={restaurant.href} className="hover:text-brand-strong">
              {restaurant.name}
            </Link>
          ) : (
            restaurant.name
          )}
        </h3>
        <p className="mt-1 text-[13.5px] text-muted">{restaurant.cuisine}</p>
        <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {restaurant.neighbourhood}
        </p>

        <div className="mt-4">
          <HygieneBadge tier={restaurant.tier} />
        </div>

        <p className="mt-4 border-l-2 border-line pl-3 text-[14px] leading-relaxed text-muted">
          {restaurant.reviewNote}
        </p>

        <div className="mt-auto pt-5">
          {!best ? (
            <div className="rounded-control bg-surface p-4 text-[13.5px] text-muted">
              No delivery prices recorded yet.
              {restaurant.href && (
                <Link to={restaurant.href} className="mt-2 flex min-h-11 items-center gap-1.5 font-semibold text-brand hover:text-brand-strong">
                  Open the restaurant <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </div>
          ) : (
          <div className="rounded-control bg-surface p-4">
            <p className="text-[13px] text-muted">
              Lowest {live ? "" : "sample "}total on{" "}
              <span className="font-semibold text-ink">{best.platform}</span>
            </p>
            <p className="mt-0.5 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-brand-strong">
                {rupees(best.total)}
              </span>
              <span className="text-[13.5px] text-muted">
                {rupees(saving)} less than the highest
              </span>
            </p>

            <button
              type="button"
              id={buttonId}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((v) => !v)}
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-brand transition-colors duration-150 hover:text-brand-strong"
            >
              {open ? "Hide price breakdown" : "See price breakdown"}
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                  open ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            {open && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="pt-3"
              >
                <p className="text-[13px] text-muted">
                  {live
                    ? `Entered manually, not live${restaurant.lastUpdated ? `; updated ${formatDate(restaurant.lastUpdated)}` : ""}.`
                    : "Sample prices, not live."}{" "}
                  Same basket on every option:{" "}
                  <span className="text-ink">{restaurant.basket}</span>.
                </p>

                <table className="mt-3 w-full border-collapse text-[13.5px]">
                  <caption className="sr-only">
                    Sample cost of the same basket from {restaurant.name} on
                    each ordering option, broken down into items, charges and
                    delivery.
                  </caption>
                  <thead>
                    <tr className="text-left text-muted">
                      <th scope="col" className="pb-1.5 font-medium">
                        Option
                      </th>
                      <th scope="col" className="pb-1.5 text-right font-medium">
                        Items
                      </th>
                      <th scope="col" className="pb-1.5 text-right font-medium">
                        Charges
                      </th>
                      <th scope="col" className="pb-1.5 text-right font-medium">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const isBest = row.platform === best.platform;
                      return (
                        <tr
                          key={row.platform}
                          className={
                            isBest
                              ? "bg-brand-wash font-semibold text-brand-strong"
                              : "text-ink"
                          }
                        >
                          <th
                            scope="row"
                            className="rounded-l-[6px] py-1.5 pl-2 text-left font-medium"
                          >
                            <span className="flex items-center gap-1.5">
                              {isBest && (
                                <Check
                                  className="h-3.5 w-3.5 shrink-0"
                                  aria-hidden="true"
                                />
                              )}
                              {row.platform}
                              {isBest && (
                                <span className="sr-only">, lowest total</span>
                              )}
                            </span>
                          </th>
                          <td className="py-1.5 text-right tabular-nums">
                            {rupees(row.items)}
                          </td>
                          <td className="py-1.5 text-right tabular-nums">
                            {rupees(row.fees + row.delivery - (row.discount ?? 0))}
                          </td>
                          <td className="rounded-r-[6px] py-1.5 pr-2 text-right tabular-nums">
                            {rupees(row.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <p className="mt-3 text-[13px] text-muted">
                  Charges combine packaging, platform and delivery fees, less any discount.
                  {live
                    ? " Ordering links are on the restaurant's page."
                    : " ServeGood does not take orders, so there is nothing to click through to yet."}
                </p>
                {restaurant.href && (
                  <Link to={restaurant.href} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-brand hover:text-brand-strong">
                    Open the restaurant <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </article>
  );
}
