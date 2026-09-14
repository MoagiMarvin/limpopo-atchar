import Link from "next/link";

export const metadata = {
  title: "Refund and Cancellation Policy | Limpopo Atchar",
  description:
    "Read the Limpopo Atchar refund and cancellation policy. Clear rules for order cancellations, damaged or wrong products, refunds, and how to contact us.",
  alternates: {
    canonical: "/refund-policy",
  },
  openGraph: {
    title: "Refund and Cancellation Policy | Limpopo Atchar",
    description:
      "Clear refund & cancellation rules for Limpopo Atchar customers. Cancellations before dispatch, damaged or wrong products replaced or refunded.",
    type: "article",
    url: "/refund-policy",
    siteName: "Limpopo Atchar",
    locale: "en_ZA",
    countryName: "South Africa",
  },
  twitter: {
    card: "summary",
    title: "Refund and Cancellation Policy | Limpopo Atchar",
    description:
      "Clear refund & cancellation rules for Limpopo Atchar customers.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RefundPolicyPage() {
  const updated = "14 September 2026";
  const whatsapp = "https://wa.me/27637326719";
  const phoneDisplay = "063 732 6719";

  return (
    <>
      <main className="policy-page">
        <div className="policy-wrap">
          <p className="back-link">
            <Link href="/">← Back to Shop</Link>
          </p>

          <h1>Refund &amp; Cancellation Policy</h1>
          <p className="policy-updated">
            <strong>Last updated:</strong> {updated}
          </p>

          <p className="policy-intro">
            At <strong>Limpopo Atchar</strong> we take pride in the quality,
            freshness, and authenticity of our homemade atchar. This policy
            explains your rights, our responsibilities, and exactly how
            cancellations, refunds and exchanges are handled.
          </p>

          <section>
            <h2>1. Order Cancellations</h2>
            <ul>
              <li>
                You may <strong>cancel free of charge</strong> at any time
                <strong> before</strong> your order has been prepared or
                dispatched for delivery.
              </li>
              <li>
                To cancel, please message us on WhatsApp at{" "}
                <a href={whatsapp}>{phoneDisplay}</a> — cancellations by call
                or SMS are also accepted, but WhatsApp with your order number
                is fastest.
              </li>
              <li>
                Once an order has been prepared and handed over to the
                delivery driver, it can <strong>no longer be cancelled</strong>.
              </li>
            </ul>
          </section>

          <section>
            <h2>2. Change of Mind — No Refunds</h2>
            <p>
              Because our atchar is a <strong>perishable, handmade food
              product</strong> prepared on demand, we do <em>not</em> offer
              refunds, returns, or exchanges for:
            </p>
            <ul>
              <li>Change of mind after delivery or collection</li>
              <li>If you "don't like the taste" or find it too spicy / mild</li>
              <li>Ordering the wrong size or quantity</li>
            </ul>
            <p>
              If you are unsure which product to try, please send us a
              WhatsApp first — we are happy to advise on flavour and heat
              level before you order.
            </p>
          </section>

          <section>
            <h2>3. When We DO Offer a Refund or Replacement</h2>
            <p>
              We will happily offer a <strong>full refund</strong> or{" "}
              <strong>free replacement</strong> (your choice) in any of the
              following cases:
            </p>
            <ul>
              <li>
                <strong>Damaged / spoiled on arrival:</strong> tubs leaking,
                broken seal, or product that arrived warm / unrefrigerated
                when it was supposed to be kept cool.
              </li>
              <li>
                <strong>Wrong product received:</strong> the items you got
                are not the ones on your order confirmation.
              </li>
              <li>
                <strong>Wrong quantity:</strong> missing items from your
                order.
              </li>
              <li>
                <strong>Non-delivery:</strong> your order never arrived after
                the confirmed delivery window.
              </li>
              <li>
                <strong>Quality fault:</strong> visible mould, strange smell,
                or expired product at the time of delivery.
              </li>
            </ul>
          </section>

          <section>
            <h2>4. How to Request a Refund or Replacement</h2>
            <ol>
              <li>
                Contact us on <a href={whatsapp}>{phoneDisplay}</a>{" "}
                <strong>within 24 hours</strong> of receiving (or attempting to
                receive) your order.
              </li>
              <li>
                Include your <strong>order confirmation code</strong> from
                your receipt or WhatsApp message.
              </li>
              <li>
                Attach <strong>clear photos</strong> showing the problem (e.g.,
                leaking tub, wrong product label, broken seal, etc.).
              </li>
              <li>
                We will reply within <strong>2 business hours</strong> on
                normal business days to confirm the next step.
              </li>
            </ol>
            <p>
              Claims received after 24 hours, or without photos where a
              product fault is alleged, will be assessed on a case-by-case
              basis and may not qualify.
            </p>
          </section>

          <section>
            <h2>5. Refund Processing Time</h2>
            <ul>
              <li>
                <strong>Cash on Delivery (COD):</strong> No payment has been
                made yet, so no refund is required for cancellations before
                dispatch. If COD payment was already taken and a refund is
                approved, we will refund via EFT or cash-back on your next
                order within 3 business days.
              </li>
              <li>
                <strong>Card / Online (Paystack):</strong> Approved refunds
                are reversed to your original payment card within{" "}
                <strong>5–7 business days</strong>. Some banks may take an
                additional 1–3 days to reflect the reversal.
              </li>
            </ul>
          </section>

          <section>
            <h2>6. Delivery Fees</h2>
            <p>
              The R20 delivery fee is <strong>non-refundable</strong> for
              change-of-mind returns. If we are at fault (wrong order,
              damaged, non-delivery), the full amount including delivery fee
              will be refunded, or a <strong>free re-delivery</strong> will
              be arranged for the replacement.
            </p>
          </section>

          <section>
            <h2>7. Business Hours &amp; Response Times</h2>
            <p>
              We operate Monday – Sunday (incl. public holidays) for order
              preparation. WhatsApp messages are attended to{" "}
              <strong>08:00 – 20:00 daily</strong>. Messages received outside
              these hours will be responded to first thing the next morning.
            </p>
          </section>

          <section>
            <h2>8. Customer Complaints</h2>
            <p>
              We do our absolute best for every customer. If you are not
              satisfied, please reach out to us on WhatsApp{" "}
              <a href={whatsapp}>{phoneDisplay}</a> and allow us to resolve
              the issue before leaving a negative review — 99% of issues are
              resolved with a quick conversation.
            </p>
          </section>

          <section className="contact-block">
            <h2>9. Contact Us</h2>
            <p>
              For questions about this policy, cancellations, or refund
              requests:
            </p>
            <ul className="contact-list">
              <li>
                💬 <strong>WhatsApp:</strong>{" "}
                <a href={whatsapp}>{phoneDisplay}</a>
              </li>
              <li>
                🇿🇦 <strong>Based in:</strong> Limpopo, South Africa
              </li>
              <li>
                🌐 <strong>Website:</strong>{" "}
                <a href="https://limpopoatchar.co.za" target="_blank" rel="noreferrer">
                  limpopoatchar.co.za
                </a>
              </li>
            </ul>
          </section>

          <p className="policy-footer-note">
            By placing an order with Limpopo Atchar you agree to this Refund
            &amp; Cancellation Policy in full. We reserve the right to update
            this policy from time to time; any updates will be posted on this
            page and take effect immediately.
          </p>

          <p className="back-link bottom-back">
            <Link href="/">← Back to Shop</Link>
          </p>
        </div>
      </main>

      <footer id="contact" className="policy-footer">
        <strong>LIMPOPO ATCHAR</strong>
        <a href={whatsapp} target="_blank" rel="noreferrer">
          WhatsApp Orders: {phoneDisplay}
        </a>
        <a href="/refund-policy">Refund &amp; Cancellation Policy</a>
        <a href="/admin">Admin</a>
        <p className="footer-copy">
          © {new Date().getFullYear()} Limpopo Atchar. All rights reserved.
        </p>
      </footer>
    </>
  );
}