import Link from "next/link";
import type { ReactNode } from "react";

import { INK, SANS } from "@/components/user/marina-chrome";
import { userRoutes } from "@/constants/routes";

/*
 * TEMPORARY DRAFT. Written from what this website actually does (forms, bookings,
 * Razorpay, Google sign-in, browser storage). It has not been approved: replace it
 * with the officially approved Privacy Policy as soon as it is available, e.g. by
 * publishing it in the backend and showing GET /content/pages/{slug} here instead.
 */

const BODY = "#4a4f55";
const MUTED = "#7a7f85";
/** The Figma page frame used by the yacht and content pages. */
const FRAME = "mx-auto w-full max-w-[1728px] px-5 lg:px-[100px]";

/** The date of the latest change to the text below. */
const LAST_UPDATED = "23 November 2026";

const CONTACT_EMAIL = "sitharamarina@gmail.com";
const CONTACT_PHONE = "+91 97245 53452";
const CONTACT_PHONE_HREF = "tel:+919724553452";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-[48px] lg:mt-[64px]">
      <h2
        id={id}
        className="text-[28px] leading-[36px] tracking-[-0.5px] lg:text-[32px] lg:leading-[40px]"
        style={{ ...SANS, color: INK }}
      >
        {title}
      </h2>
      <div className="mt-[16px] space-y-[16px] text-[16px] leading-[27px]" style={{ color: BODY }}>
        {children}
      </div>
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-[8px] pl-[22px] marker:text-[#b5b8bc]">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

const linkClass = "underline underline-offset-2 hover:text-[#0d1b2a]";

/** The Privacy Policy page, in the same Figma style as the site's content pages. */
export function PrivacyPolicy() {
  return (
    <article className="bg-white pb-[120px] antialiased lg:pb-[160px]" style={{ ...SANS, color: INK }}>
      <div className={`${FRAME} pt-[37px]`}>
        <nav aria-label="Breadcrumb" className="text-[12px] leading-[16px]" style={{ color: MUTED }}>
          <ol className="flex flex-wrap items-center gap-[12px]">
            <li>
              <Link href={userRoutes.home} className="hover:underline">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-[#b5b8bc]">
              /
            </li>
            <li aria-current="page" style={{ color: INK }}>
              Privacy policy
            </li>
          </ol>
        </nav>

        <h1 className="motion-safe:animate-fade-up mt-[50px] max-w-[1100px] text-[48px] leading-[1.05] font-normal tracking-[-1.5px] lg:mt-[70px] lg:text-[72px] lg:tracking-[-2.21px]">
          Privacy policy
        </h1>
        <p className="mt-[24px] max-w-[640px] text-[18px] leading-[28px]" style={{ color: BODY }}>
          How Sithara Marina collects, uses and protects your personal information when you browse
          our website, send an enquiry, book a charter or create an account.
        </p>
        <p className="mt-[16px] text-[13px] leading-[18px]" style={{ color: MUTED }}>
          Last updated {LAST_UPDATED}
        </p>

        <div className="max-w-[790px]">
          <Section id="who-we-are" title="Who we are">
            <p>
              Sithara Marina arranges private yacht charters in Kerala, India. In this policy, “we”,
              “us” and “our” mean Sithara Marina, and “you” means anyone who uses our website or our
              services.
            </p>
          </Section>

          <Section id="what-we-collect" title="Information we collect">
            <p>We only collect the information we need to answer you and to arrange your charter:</p>
            <List
              items={[
                <>
                  <strong className="font-medium text-[#0d1b2a]">Enquiries.</strong> Your name, email
                  address and phone number, and the details you choose to share about your charter:
                  the yacht, preferred date, number of guests, destinations, occasion, budget, special
                  requests, a message, and how you would like us to contact you.
                </>,
                <>
                  <strong className="font-medium text-[#0d1b2a]">Bookings.</strong> The lead guest’s
                  name, email address and phone number, any special requests, and your charter
                  details: yacht, date, start time, package, number of guests and any add-ons.
                </>,
                <>
                  <strong className="font-medium text-[#0d1b2a]">Your account.</strong> Your name,
                  email address and password, and, if you add them, your phone number, address, city,
                  state, postal code, country and profile photo, your notification preferences, and
                  your enquiries, proposals, bookings and cancellation requests.
                </>,
                <>
                  <strong className="font-medium text-[#0d1b2a]">Sign in with Google.</strong> If you
                  choose it, Google shares your name and email address with us so we can sign you in.
                  We never receive your Google password.
                </>,
                <>
                  <strong className="font-medium text-[#0d1b2a]">Payments.</strong> The amount,
                  status and reference of each payment. Your card, UPI or bank details are entered
                  directly with our payment provider, Razorpay, and are never seen or stored by us.
                </>,
                <>
                  <strong className="font-medium text-[#0d1b2a]">Messages.</strong> What you send us
                  by email or phone, and our replies.
                </>,
              ]}
            />
          </Section>

          <Section id="how-we-use" title="How we use your information">
            <List
              items={[
                "To answer your enquiries and prepare tailored charter proposals.",
                "To check availability, take your booking and payment, and send confirmations, invoices and reminders.",
                "To create and secure your account, verify your email address and help you reset your password.",
                "To handle changes, cancellations and refunds.",
                "To send essential updates about your charter, and, only if you choose to receive them, occasional offers and inspiration.",
                "To keep our website and services secure and working properly, and to meet our legal, tax and accounting obligations.",
              ]}
            />
            <p>We do not sell your personal information.</p>
          </Section>

          <Section id="sharing" title="Who we share it with">
            <p>We share your information only where it is needed to provide our services:</p>
            <List
              items={[
                "Razorpay, to process your payments securely.",
                "Google, if you choose to sign in with your Google account.",
                "The crew and, where a yacht is operated by a partner, the yacht’s operator, so they can prepare and run your charter.",
                "The providers that host our website, our booking system and our files, and that send our emails.",
                "Authorities, where the law requires it.",
              ]}
            />
          </Section>

          <Section id="browser-storage" title="Cookies and browser storage">
            <p>
              Our website does not use advertising or analytics trackers, and does not set cookies of
              its own. While you use it, your browser keeps your sign-in session and your booking
              progress in its session storage, which is cleared when you close the tab.
            </p>
            <p>
              Some pages load fonts, images and the secure payment window from Google Fonts,
              Fontshare, Unsplash and Razorpay. Like any website, these services receive basic
              technical information, such as your IP address and browser type, when they deliver
              their content.
            </p>
          </Section>

          <Section id="retention" title="How long we keep it">
            <p>
              We keep your information for as long as your account is open or as long as we need it
              to provide our services. Booking, payment and invoice records are kept for as long as
              tax and accounting laws require. When we no longer need your information, we delete or
              anonymise it.
            </p>
          </Section>

          <Section id="security" title="How we protect it">
            <p>
              Our website is served over a secure, encrypted connection, passwords are never stored
              in a readable form, and payments are handled by Razorpay. We limit access to your
              information to the people who need it to arrange your charter. No system is completely
              secure, so please keep your password private and contact us if you notice anything
              unusual.
            </p>
          </Section>

          <Section id="your-rights" title="Your choices and rights">
            <p>
              Subject to applicable law, including India’s Digital Personal Data Protection Act,
              2023, you can ask us to:
            </p>
            <List
              items={[
                "show you the personal information we hold about you;",
                "correct or update it (you can change most details yourself in your account);",
                "delete it, where we are not required to keep it;",
                "stop sending you offers: turn off “Offers and updates” in your notification preferences, or contact us.",
              ]}
            />
            <p>
              To make a request, or if you have a concern about how we handle your information,
              contact us using the details below. We may need to confirm your identity first.
            </p>
          </Section>

          <Section id="children" title="Children">
            <p>
              Enquiries, bookings and accounts are for adults. A parent or guardian may include
              children in a booking as guests, and provides their details on their behalf.
            </p>
          </Section>

          <Section id="changes" title="Changes to this policy">
            <p>
              We may update this policy from time to time. The latest version is always on this page,
              with the date it was last updated.
            </p>
          </Section>

          <Section id="contact" title="Contact us">
            <p>
              Sithara Marina, Kerala, India
              <br />
              Email:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
                {CONTACT_EMAIL}
              </a>
              <br />
              Phone:{" "}
              <a href={CONTACT_PHONE_HREF} className={linkClass}>
                {CONTACT_PHONE}
              </a>
            </p>
          </Section>
        </div>
      </div>
    </article>
  );
}
