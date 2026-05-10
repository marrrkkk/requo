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
          for business subscriptions purchased through{" "}
          <a
            className="text-foreground underline-offset-4 hover:underline"
            href={legalConfig.domain}
          >
            {legalConfig.domain}
          </a>
          .
        </LegalParagraph>
        <LegalParagraph>
          This policy applies to all subscription plans and payment methods
          offered through the Service. By subscribing to a business plan, you
          agree to the terms outlined in this Refund Policy and our Terms of
          Service.
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
          first-time subscribers to business plans.
        </LegalParagraph>
        <LegalSubheading>Eligibility Requirements</LegalSubheading>
        <LegalList
          items={[
            "Refunds apply only to the first billing cycle of a new subscription",
            "Refund requests must be submitted within 30 days of the initial payment",
            "Refunds are issued to the original payment method used for the purchase",
            "Refunds are not available for subscription renewals or subsequent billing periods",
          ]}
        />
        <LegalSubheading>Refund Amount</LegalSubheading>
        <LegalParagraph>
          Eligible refunds will be issued for the full amount of the first
          billing cycle payment. No partial refunds are provided for unused
          portions of a billing period.
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
          To request a refund, contact our support team at{" "}
          <a
            className="text-foreground underline-offset-4 hover:underline"
            href={`mailto:${legalConfig.supportEmail}`}
          >
            {legalConfig.supportEmail}
          </a>{" "}
          with the following information:
        </LegalParagraph>
        <LegalList
          items={[
            "Your business name or slug",
            "The email address associated with your account",
            "The date of your subscription payment",
            "A brief explanation of your reason for requesting a refund",
          ]}
        />
        <LegalSubheading>Processing Timeframe</LegalSubheading>
        <LegalParagraph>
          Refund requests are typically processed within 5-10 business days
          after approval. The time it takes for the refund to appear in your
          account depends on your payment provider and financial institution.
        </LegalParagraph>
        <LegalParagraph>
          Processing times may vary depending on the payment provider used for
          the original transaction and financial institution. Paddle-processed
          card refunds may appear at different times depending on the bank.
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
          You may cancel your business subscription at any time through your
          account dashboard. Cancellation does not automatically result in a
          refund.
        </LegalParagraph>
        <LegalSubheading>Cancellation Process</LegalSubheading>
        <LegalList
          items={[
            "Navigate to your business settings and select the billing or subscription section",
            "Follow the cancellation prompts to cancel your subscription",
            "You will receive a confirmation email once the cancellation is processed",
          ]}
        />
        <LegalSubheading>Access After Cancellation</LegalSubheading>
        <LegalParagraph>
          When you cancel a subscription, your business will retain access to
          paid features until the end of the current billing period. No refunds
          are provided for the remaining time in the billing period after
          cancellation.
        </LegalParagraph>
        <LegalParagraph>
          After the billing period expires, your business will revert to the
          free plan (if available) or lose access to paid features, depending on
          the plan structure at that time.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "payment-providers",
    title: "5. Payment Provider Considerations",
    content: (
      <>
        <LegalSectionHeading>
          5. Payment Provider Considerations
        </LegalSectionHeading>
        <LegalParagraph>
          {legalConfig.companyName} uses Paddle to process subscription
          payments:
        </LegalParagraph>
        <LegalList
          items={[
            "Paddle: Processes card payments for subscriptions",
          ]}
        />
        <LegalSubheading>Provider-Specific Differences</LegalSubheading>
        <LegalParagraph>
          Refund processing times and procedures may vary depending on the
          payment provider used for your subscription:
        </LegalParagraph>
        <LegalList
          items={[
            "Card payments through Paddle are processed as recurring subscriptions",
            "Currency conversion rates (if applicable) are determined by the payment provider and may differ from the original transaction rate",
          ]}
        />
        <LegalParagraph>
          We will work with the appropriate payment provider to process your
          refund request as quickly as possible, but we cannot guarantee
          specific processing times for provider-specific delays.
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
          The following situations are not eligible for refunds:
        </LegalParagraph>
        <LegalList
          items={[
            "Refund requests submitted more than 30 days after the initial payment",
            "Subscription renewals or payments for subsequent billing periods",
            "Partial refunds for unused portions of a billing period after cancellation",
            "Subscriptions that have been cancelled but are still within the paid billing period",
            "Violations of our Terms of Service or acceptable use policies",
            "Chargebacks or payment disputes initiated through your financial institution (contact us first)",
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
          If you have questions about this Refund Policy or need assistance with
          a refund request, please contact us:
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
          We aim to respond to all refund requests within 2-3 business days. For
          general privacy inquiries, you may also contact{" "}
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
