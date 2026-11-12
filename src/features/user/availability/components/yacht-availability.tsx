import Link from "next/link";

import { INK, SANS, SERIF } from "@/components/user/marina-chrome";
import { userRoutes } from "@/constants/routes";
import { BODY, FRAME, MUTED } from "@/features/user/checkout/components/checkout-ui";

import { YachtReservation, type YachtReservationProps } from "./yacht-reservation";

/** The availability page: the same reservation section as the yacht page, on its own. */
export function YachtAvailability(props: YachtReservationProps) {
  const { slug, name } = props;

  return (
    <div className="bg-white pb-[120px] antialiased" style={{ ...SANS, color: INK }}>
      <section className={`${FRAME} pt-[37px]`}>
        <nav
          aria-label="Breadcrumb"
          className="text-[12px] leading-[16px]"
          style={{ color: MUTED }}
        >
          <ol className="flex flex-wrap items-center gap-[12px]">
            <li>
              <Link href={userRoutes.yachts} className="hover:underline">
                Our yachts
              </Link>
            </li>
            <li aria-hidden="true" className="text-[#b5b8bc]">
              /
            </li>
            <li>
              <Link href={userRoutes.yacht(slug)} className="hover:underline">
                {name}
              </Link>
            </li>
            <li aria-hidden="true" className="text-[#b5b8bc]">
              /
            </li>
            <li aria-current="page" style={{ color: INK }}>
              Availability
            </li>
          </ol>
        </nav>

        <h1 className="mt-[40px] text-[48px] leading-[1.1] font-normal tracking-[-1.5px] lg:text-[72px] lg:tracking-[-2.21px]">
          Check <span style={SERIF}>availability</span>
        </h1>
        <p className="mt-[20px] max-w-[560px] text-[16px] leading-[26px]" style={{ color: BODY }}>
          Choose a date to see the charters open on {name}.
        </p>
      </section>

      <div className={`${FRAME} mt-[64px]`}>
        <YachtReservation {...props} />
      </div>
    </div>
  );
}
