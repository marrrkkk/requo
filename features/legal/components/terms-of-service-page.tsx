import { legalConfig } from "@/features/legal/config";
import {
  LegalDocumentPage,
  type LegalDocumentSection,
  LegalList,
  LegalParagraph,
  LegalSectionHeading,
  LegalSubheading,
} from "@/features/legal/components/legal-document-page";

const termsSections: LegalDocumentSection[] = [
  {
    id: "acceptance",
    title: "1. Acceptance Of These Terms",
    content: (
      <>
        <LegalSectionHeading>1. Acceptance Of These Terms</LegalSectionHeading>
        <LegalParagraph>
          These Terms of Service (&quot;Terms&quot;) are a legally binding
          agreement between you and Requo (&quot;Requo,&quot; &quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;) governing your access to and use
          of Requo, including the website, application, public inquiry pages,
          public quote pages, and related communications made available at{" "}
          <a
            className="text-foreground underline-offset-4 hover:underline"
            href={legalConfig.domain}
          >
            {legalConfig.domain}
          </a>
          .
        </LegalParagraph>
        <LegalParagraph>
          By accessing or using the Service, you agree to these Terms. If you do
          not agree, do not use the Service.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "2. Eligibility And Authority",
    content: (
      <>
        <LegalSectionHeading>2. Eligibility And Authority</LegalSectionHeading>
        <LegalParagraph>
          You may use the Service only if you are legally capable of entering
          into a binding agreement and, if you use the Service on behalf of a
          business or other organization, you have authority to bind that entity
          to these Terms.
        </LegalParagraph>
        <LegalParagraph>
          If you use the Service on behalf of an organization, &quot;you&quot;
          includes both you and that organization.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "accounts",
    title: "3. Accounts, Authentication, And Security",
    content: (
      <>
        <LegalSectionHeading>
          3. Accounts, Authentication, And Security
        </LegalSectionHeading>
        <LegalParagraph>
          You may need an account to use certain parts of the Service. You agree
          to provide accurate information, keep your login credentials
          confidential, and promptly update your information if it changes.
        </LegalParagraph>
        <LegalParagraph>
          The Service currently supports email-and-password sign-in, password
          reset, session management, account deletion, and optional Google or
          Microsoft social sign-in when enabled.
        </LegalParagraph>
        <LegalParagraph>
          You are responsible for all activity that occurs under your account to
          the extent caused by your actions or failure to safeguard access. If
          you believe your account has been compromised, contact us promptly at{" "}
          <a
            className="text-foreground underline-offset-4 hover:underline"
            href={`mailto:${legalConfig.supportEmail}`}
          >
            {legalConfig.supportEmail}
          </a>
          .
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "workspaces",
    title: "4. Business Workspaces, Multi-Business Access, And Invites",
    content: (
      <>
        <LegalSectionHeading>
          4. Business Workspaces, Multi-Business Access, And Invites
        </LegalSectionHeading>
        <LegalParagraph>
          Requo supports business workspaces, member invites, role-based access,
          and multi-business switching. A user may belong to more than one
          business workspace if invited or otherwise authorized.
        </LegalParagraph>
        <LegalParagraph>
          If you create or administer a business workspace, you are responsible
          for managing the people you invite, the permissions you grant, and the
          content you or your team make available through that workspace.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "permitted-use",
    title: "5. Permitted Use",
    content: (
      <>
        <LegalSectionHeading>5. Permitted Use</LegalSectionHeading>
        <LegalParagraph>
          Subject to these Terms, Requo grants you a limited, non-exclusive,
          non-transferable, revocable right to access and use the Service for
          your internal business use in managing inquiries, quotes, and related
          customer communications.
        </LegalParagraph>
        <LegalParagraph>
          The Service is designed for owner-led service businesses and related
          workflows such as inquiry intake, lead qualification, quote delivery,
          follow-up, knowledge-file management, and internal drafting support.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "prohibited-use",
    title: "6. Prohibited Use",
    content: (
      <>
        <LegalSectionHeading>6. Prohibited Use</LegalSectionHeading>
        <LegalList
          items={[
            "Use the Service in violation of law, regulation, contractual restrictions, or the rights of others.",
            "Upload, submit, or transmit unlawful, infringing, abusive, fraudulent, defamatory, or harmful content.",
            "Attempt to gain unauthorized access to the Service, another user's account, or another business workspace.",
            "Interfere with the operation, security, or integrity of the Service, including by introducing malware or abusive traffic.",
            "Use automated means to scrape, copy, or extract data from the Service except as expressly permitted by us.",
            "Use public inquiry pages or public quote links in a way that misrepresents identity, collects unrelated data, or circumvents the intended workflow of the Service.",
            "Use the Service in a way that could create material legal, security, or operational risk for Requo, our users, or others.",
          ]}
        />
      </>
    ),
  },
  {
    id: "user-content",
    title: "7. User Content, Uploaded Content, And Public Submissions",
    content: (
      <>
        <LegalSectionHeading>
          7. User Content, Uploaded Content, And Public Submissions
        </LegalSectionHeading>
        <LegalSubheading>A. What counts as user content</LegalSubheading>
        <LegalParagraph>
          &quot;User Content&quot; includes business information, inquiry forms,
          inquiry submissions, quotes, messages, uploaded files, notes, pricing
          entries, knowledge files, public quote responses, and other content
          you or your customers submit through the Service.
        </LegalParagraph>
        <LegalSubheading>B. Ownership</LegalSubheading>
        <LegalParagraph>
          As between you and Requo, you retain ownership of your User Content.
        </LegalParagraph>
        <LegalSubheading>
          C. License you grant to operate the Service
        </LegalSubheading>
        <LegalParagraph>
          You grant Requo a non-exclusive, worldwide, royalty-free license to
          host, store, reproduce, process, transmit, display, and otherwise use
          your User Content as necessary to operate, maintain, secure, and
          provide the Service and its features.
        </LegalParagraph>
        <LegalSubheading>D. Your responsibilities</LegalSubheading>
        <LegalList
          items={[
            "You are responsible for the legality, accuracy, and appropriateness of your User Content.",
            "You represent that you have all rights and permissions needed to submit User Content and allow us to process it as described in these Terms and the Privacy Policy.",
            "You are responsible for your relationship with your own customers, including the content of inquiries, quotes, offers, and underlying business commitments.",
          ]}
        />
      </>
    ),
  },
  {
    id: "public-pages",
    title: "8. Public Inquiry Pages And Public Quote Links",
    content: (
      <>
        <LegalSectionHeading>
          8. Public Inquiry Pages And Public Quote Links
        </LegalSectionHeading>
        <LegalSubheading>A. Public inquiry pages and forms</LegalSubheading>
        <LegalParagraph>
          Requo allows businesses to publish public inquiry pages and inquiry
          forms that can be accessed without a Requo login. You are responsible
          for the content, configuration, and collection practices of the public
          inquiry pages and forms you publish through the Service.
        </LegalParagraph>
        <LegalSubheading>B. Public quote links</LegalSubheading>
        <LegalParagraph>
          Public quote links are designed to let a recipient view and respond to
          a quote without a separate customer login. Anyone who has the link may
          be able to access the corresponding quote page while the link remains
          active, so you should treat public quote links as sensitive.
        </LegalParagraph>
        <LegalSubheading>C. Underlying business relationship</LegalSubheading>
        <LegalParagraph>
          Requo is not a party to the underlying transaction or service
          relationship between a business using Requo and that business&rsquo;s
          customer. We do not guarantee customer payment, service performance,
          legal enforceability of a quote, or compliance of a business&rsquo;s
          own documents or commitments.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "third-party-services",
    title: "9. Third-Party Services And Integrations",
    content: (
      <>
        <LegalSectionHeading>
          9. Third-Party Services And Integrations
        </LegalSectionHeading>
        <LegalParagraph>
          The Service uses third-party services for hosting, data and file
          storage, transactional email, AI request routing, and optional social
          sign-in. The providers supported in the current Service include:
        </LegalParagraph>
        <LegalList
          items={[
            `${legalConfig.hostingProvider}, for hosting and application delivery.`,
            `${legalConfig.storageProvider}, for database, storage, and related backend infrastructure.`,
            "Resend, for transactional email delivery.",
            "OpenRouter, for AI request routing when AI features are used.",
            "Google or Microsoft, for optional social sign-in when those sign-in methods are enabled.",
          ]}
        />
        <LegalParagraph>
          Your use of a third-party login provider may also be subject to that
          provider&rsquo;s own terms and privacy practices. Requo is not
          responsible for third-party services we do not control.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "ai-features",
    title: "10. AI Features",
    content: (
      <>
        <LegalSectionHeading>10. AI Features</LegalSectionHeading>
        <LegalParagraph>
          Requo includes AI-assisted drafting features intended for internal use
          by authorized business workspace users. These features may send
          prompts and related business workspace content through OpenRouter and,
          depending on configuration, to the model provider used through
          OpenRouter to generate drafts, summaries, and suggestions.
        </LegalParagraph>
        <LegalParagraph>
          AI outputs are provided for convenience only. They can be incomplete,
          inaccurate, or unsuitable for your use case, and you are responsible
          for reviewing and approving any output before you rely on it, send it,
          or act on it.
        </LegalParagraph>
        <LegalParagraph>
          Do not treat AI output as legal, financial, compliance, or
          professional advice, and do not rely on it without human review.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "fees",
    title: "11. Paid Plans And Fees",
    content: (
      <>
        <LegalSectionHeading>11. Paid Plans And Fees</LegalSectionHeading>
        <LegalParagraph>
          Requo may offer free access today and may introduce paid plans or
          other fees later. If paid plans are introduced, the applicable
          pricing and billing terms will be presented at that time.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "availability",
    title: "12. Service Availability And Changes",
    content: (
      <>
        <LegalSectionHeading>
          12. Service Availability And Changes
        </LegalSectionHeading>
        <LegalParagraph>
          We may modify, suspend, or discontinue all or part of the Service at
          any time, including features, integrations, access methods, or
          supported plans. We do not guarantee that the Service will always be
          available, uninterrupted, timely, or error-free.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "suspension",
    title: "13. Suspension And Termination",
    content: (
      <>
        <LegalSectionHeading>
          13. Suspension And Termination
        </LegalSectionHeading>
        <LegalParagraph>
          We may suspend or terminate your access to the Service if we believe,
          in good faith, that you have violated these Terms, your use creates
          security or legal risk, or suspension is needed to protect the Service,
          our users, or others.
        </LegalParagraph>
        <LegalParagraph>
          You may stop using the Service at any time. Account deletion and
          business deletion tools are available in the current Service, but
          deletion may not be immediate in all systems, including backups or
          operational logs.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "ownership",
    title: "14. Ownership Of The Service And Limited License",
    content: (
      <>
        <LegalSectionHeading>
          14. Ownership Of The Service And Limited License
        </LegalSectionHeading>
        <LegalParagraph>
          The Service, including its software, design, trademarks, and related
          materials, is owned by Requo or its licensors and is protected by
          applicable intellectual property and other laws.
        </LegalParagraph>
        <LegalParagraph>
          Except for the limited rights expressly granted in these Terms, Requo
          reserves all rights in and to the Service.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "feedback",
    title: "15. Feedback",
    content: (
      <>
        <LegalSectionHeading>15. Feedback</LegalSectionHeading>
        <LegalParagraph>
          If you provide suggestions, ideas, or feedback about the Service, you
          grant Requo a non-exclusive, royalty-free right to use that feedback
          to operate and improve the Service without compensation to you.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "16. Disclaimers",
    content: (
      <>
        <LegalSectionHeading>16. Disclaimers</LegalSectionHeading>
        <LegalParagraph>
          To the maximum extent permitted by applicable law, the Service is
          provided &quot;as is&quot; and &quot;as available.&quot; Requo
          disclaims all warranties of any kind, whether express, implied,
          statutory, or otherwise, including implied warranties of
          merchantability, fitness for a particular purpose, title, and
          non-infringement.
        </LegalParagraph>
        <LegalParagraph>
          Without limiting the foregoing, Requo does not warrant that the
          Service will meet your requirements, be uninterrupted, be secure, be
          error-free, or produce any particular business result.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "liability",
    title: "17. Limitation Of Liability",
    content: (
      <>
        <LegalSectionHeading>
          17. Limitation Of Liability
        </LegalSectionHeading>
        <LegalParagraph>
          To the maximum extent permitted by applicable law, Requo and its
          affiliates, officers, directors, employees, agents, suppliers, and
          licensors will not be liable for any indirect, incidental, special,
          consequential, exemplary, or punitive damages, or for any loss of
          profits, revenues, goodwill, data, or business opportunities, arising
          out of or relating to the Service or these Terms.
        </LegalParagraph>
        <LegalParagraph>
          To the maximum extent permitted by applicable law, Requo&rsquo;s
          aggregate liability arising out of or relating to the Service or these
          Terms will not exceed the greater of (a) the total amount you paid to
          Requo for the Service during the twelve (12) months preceding the
          event giving rise to the claim, or (b) one hundred U.S. dollars
          (US$100). If you have not paid any amounts to Requo, Requo&rsquo;s
          total liability will not exceed one hundred U.S. dollars (US$100).
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "18. Indemnity",
    content: (
      <>
        <LegalSectionHeading>18. Indemnity</LegalSectionHeading>
        <LegalParagraph>
          You agree to defend, indemnify, and hold harmless Requo, its
          affiliates, and their respective officers, directors, employees,
          agents, suppliers, and licensors from and against claims, losses,
          liabilities, damages, judgments, and expenses (including reasonable
          attorneys&rsquo; fees) arising out of or related to your use of the
          Service, your User Content, your violation of these Terms, or your
          violation of law or the rights of another person or entity.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "19. Governing Law And Venue",
    content: (
      <>
        <LegalSectionHeading>
          19. Governing Law And Venue
        </LegalSectionHeading>
        <LegalParagraph>
          These Terms and any dispute arising out of or relating to these Terms
          or the Service will be governed by and construed in accordance with{" "}
          {legalConfig.governingLaw}, without regard to conflict of law
          principles.
        </LegalParagraph>
        <LegalParagraph>
          Any dispute, claim, or controversy arising out of or relating to these
          Terms or the Service will be brought exclusively in {legalConfig.venue}
          , and you consent to the personal jurisdiction and venue of those
          courts.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "changes-and-contact",
    title: "20. Changes To These Terms And Contact Information",
    content: (
      <>
        <LegalSectionHeading>
          20. Changes To These Terms And Contact Information
        </LegalSectionHeading>
        <LegalParagraph>
          We may update these Terms from time to time. If we make material
          changes, we will post the updated version on this page and update the
          effective date above. By continuing to use the Service after the
          updated Terms take effect, you agree to the revised Terms.
        </LegalParagraph>
        <LegalParagraph>
          If you have questions about these Terms, you may contact us at{" "}
          <a
            className="text-foreground underline-offset-4 hover:underline"
            href={`mailto:${legalConfig.supportEmail}`}
          >
            {legalConfig.supportEmail}
          </a>{" "}
          or{" "}
          <a
            className="text-foreground underline-offset-4 hover:underline"
            href={`mailto:${legalConfig.privacyEmail}`}
          >
            {legalConfig.privacyEmail}
          </a>
          , or by mail at {legalConfig.address}.
        </LegalParagraph>
      </>
    ),
  },
];

export function TermsOfServicePage() {
  return <LegalDocumentPage title="Terms of Service" sections={termsSections} />;
}
