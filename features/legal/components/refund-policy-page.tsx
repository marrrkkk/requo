import { legalConfig } from "@/features/legal/config";
import {
  LegalDocumentPage,
  type LegalDocumentSection,
  LegalList,
  LegalParagraph,
  LegalSectionHeading,
  LegalSubheading,
} from "@/features/legal/components/legal-document-page";

const refundSections: LegalDocumentSection[] = [
  {
    id: "overview",
    title: "1. Overview",
    content: (
      <>
        <LegalSectionHeading>1. Overview</LegalSectionHeading>
        <LegalParagraph>
          This Refund Policy explains the terms and conditions under which{" "}
          {legalConfig.companyName} (&quot;{legalConfig.companyName},&quot;
          &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides refunds
          for subscriptions purchased through{" "}
          <a
            className="text-foreground underline-offset-4 hover:underline"
            href={legalConfig.domain}
          >
            {legalConfig.domain}
          </a>
          .
        </LegalParagraph>
        <LegalParagraph>
          Subscription payments are processed by {legalConfig.paymentProvider},
          the merchant of record for {legalConfig.companyName}. Refunds are
          issued through {legalConfig.paymentProvider} and returned to the
          original payment method used for the purchase. By subscribing to a
          paid plan, you agree to the terms outlined in this Refund Policy and
          our Terms of Service.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "2. Refund Eligibility",
    content: (
      <>
        <LegalSectionHeading>2. Refund Eligibility</LegalSectionHeading>
        <LegalParagraph>
          {legalConfig.companyName} offers a 30-day money-back guarantee for
          paid subscriptions.
        </LegalParagraph>
        <LegalSubheading>Eligibility Requirements</LegalSubheading>
        <LegalList
          items={[
            "Refund requests must be submitted within 30 days of the original payment date",
            "Refunds are issued to the original payment method used for the purchase",
            "Each individual payment can only be refunded once",
            "A refund request in progress blocks additional refund requests for the same payment",
          ]}
        />
        <LegalSubheading>Refund Amount</LegalSubheading>
        <LegalParagraph>
          Eligible refunds are issued for the full amount of the original
          payment. Partial refunds are not offered. Currency conversion rates
          may differ from the original transaction rate depending on your
          payment provider or card issuer.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "requesting-refund",
    title: "3. How To Request A Refund",
    content: (
      <>
        <LegalSectionHeading>3. How To Request A Refund</LegalSectionHeading>
        <LegalParagraph>
          You can request a refund directly from your account:
        </LegalParagraph>
        <LegalList
          items={[
            <>
              Open{" "}
              <span className="text-foreground">
                Account &rsaquo; Billing &rsaquo; Order history
              </span>
              .
            </>,
            "Find the payment you'd like to refund.",
            "Click Request refund and confirm. You may add an optional reason.",
          ]}
        />
        <LegalParagraph>
          If you&apos;d prefer, you can also email{" "}
          <a
            className="text-foreground underline-offset-4 hover:underline"
            href={`mailto:${legalConfig.supportEmail}`}
          >
            {legalConfig.supportEmail}
          </a>{" "}
          with the email address on your account and the date of the payment.
        </LegalParagraph>
        <LegalSubheading>Approval Process</LegalSubheading>
        <LegalParagraph>
          When you submit a refund request, {legalConfig.companyName} forwards
          it to our payment provider. The provider reviews each refund and may
          return one of the following outcomes:
        </LegalParagraph>
        <LegalList
          items={[
            <>
              <span className="text-foreground">Pending:</span>{" "}
              The provider is reviewing the request. Your subscription remains
              active in the meantime.
            </>,
            <>
              <span className="text-foreground">Approved:</span> The refund is
              processed. Your subscription is canceled and paid features remain
              available until the end of the current billing period.
            </>,
            <>
              <span className="text-foreground">Failed:</span> The refund could
              not be processed. Your subscription remains unchanged. You may
              contact us for assistance.
            </>,
          ]}
        />
        <LegalSubheading>Processing Timeframe</LegalSubheading>
        <LegalParagraph>
          Most approved refunds are initiated within 1-5 business days. The
          time it takes for the refund to appear in your account depends on
          your payment provider or card issuer and can take up to 10 business
          days after approval.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "cancellation",
    title: "4. Subscription Cancellation",
    content: (
      <>
        <LegalSectionHeading>4. Subscription Cancellation</LegalSectionHeading>
        <LegalParagraph>
          You can cancel your subscription at any time from your account
          billing page. Cancellation is separate from a refund and does not, by
          itself, issue money back.
        </LegalParagraph>
        <LegalSubheading>Cancellation Process</LegalSubheading>
        <LegalList
          items={[
            "Open Account > Billing.",
            "Click Cancel subscription and confirm.",
            "You will receive an in-app confirmation once the cancellation is recorded.",
          ]}
        />
        <LegalSubheading>Access After Cancellation</LegalSubheading>
        <LegalParagraph>
          When you cancel a subscription, you keep paid features until the end
          of the current billing period. At the end of that period your account
          reverts to the free plan. If you also need the payment refunded,
          submit a refund request using the steps above.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "payment-provider",
    title: "5. Payment Provider",
    content: (
      <>
        <LegalSectionHeading>5. Payment Provider</LegalSectionHeading>
        <LegalParagraph>
          {legalConfig.companyName} uses {legalConfig.paymentProvider} as its
          merchant of record. All paid plans are billed in USD. Depending on
          your location, an approximate local currency amount may be displayed
          at checkout for convenience, but the authoritative charge is in USD.
          Refunds are issued through {legalConfig.paymentProvider} and are
          subject to the provider&apos;s review and standard processing times.
        </LegalParagraph>
        <LegalParagraph>
          We will work with {legalConfig.paymentProvider} to process your refund
          request as quickly as possible, but we cannot guarantee specific
          processing times for delays introduced by the provider or your card
          issuer.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "exceptions",
    title: "6. Exceptions And Limitations",
    content: (
      <>
        <LegalSectionHeading>6. Exceptions And Limitations</LegalSectionHeading>
        <LegalParagraph>
          The following situations are not eligible for a refund:
        </LegalParagraph>
        <LegalList
          items={[
            "Refund requests submitted more than 30 days after the payment date",
            "Payments that have already been refunded",
            "Payments with a refund request already in progress",
            "Partial refunds for unused portions of a billing period after cancellation",
            "Violations of our Terms of Service or acceptable use policies",
            "Chargebacks or payment disputes initiated through your payment provider or card issuer without contacting us first",
          ]}
        />
        <LegalSubheading>Abuse Prevention</LegalSubheading>
        <LegalParagraph>
          We reserve the right to deny refund requests that appear to be
          fraudulent, abusive, or in violation of this policy. Repeated refund
          requests or patterns of subscription abuse may result in account
          suspension or termination.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "contact",
    title: "7. Questions And Contact",
    content: (
      <>
        <LegalSectionHeading>7. Questions And Contact</LegalSectionHeading>
        <LegalParagraph>
          If you have questions about this Refund Policy or need help with a
          refund request, please contact us:
        </LegalParagraph>
        <LegalList
          items={[
            <>
              Email:{" "}
              <a
                className="text-foreground underline-offset-4 hover:underline"
                href={`mailto:${legalConfig.supportEmail}`}
              >
                {legalConfig.supportEmail}
              </a>
            </>,
            <>Address: {legalConfig.address}</>,
          ]}
        />
        <LegalParagraph>
          We aim to respond to refund-related questions within 2-3 business
          days. For general privacy inquiries, you may also contact{" "}
          <a
            className="text-foreground underline-offset-4 hover:underline"
            href={`mailto:${legalConfig.privacyEmail}`}
          >
            {legalConfig.privacyEmail}
          </a>
          .
        </LegalParagraph>
      </>
    ),
  },
];

export function RefundPolicyPage() {
  return <LegalDocumentPage title="Refund Policy" sections={refundSections} />;
}
