import { legalConfig } from "@/features/legal/config";
import {
  LegalDocumentPage,
  type LegalDocumentSection,
  LegalList,
  LegalParagraph,
  LegalSectionHeading,
  LegalSubheading,
} from "@/features/legal/components/legal-document-page";

const privacySections: LegalDocumentSection[] = [
  {
    id: "introduction",
    title: "1. Introduction",
    content: (
      <>
        <LegalSectionHeading>1. Introduction</LegalSectionHeading>
        <LegalParagraph>
          Requo (&quot;Requo,&quot; &quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;) operates the Requo website and related services at{" "}
          <a
            className="text-foreground underline-offset-4 hover:underline"
            href={legalConfig.domain}
          >
            {legalConfig.domain}
          </a>
          .
        </LegalParagraph>
        <LegalParagraph>
          This Privacy Policy explains how we collect, use, disclose, and
          otherwise process personal information when you use Requo, including
          the website, application, public inquiry pages, public quote pages,
          and related communications (collectively, the &quot;Service&quot;).
        </LegalParagraph>
        <LegalParagraph>
          If you have questions about this Privacy Policy or our privacy
          practices, you may contact us at support@requo.app or privacy@requo.app,
          or by mail at Lucena City, Quezon, Philippines.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "scope",
    title: "2. Scope",
    content: (
      <>
        <LegalSectionHeading>2. Scope</LegalSectionHeading>
        <LegalParagraph>
          This Privacy Policy applies to information we process as the operator
          of Requo. It covers information from account holders, invited business
          members, people who submit public inquiries, people who receive or
          respond through public quote links, and visitors who browse our public
          pages.
        </LegalParagraph>
        <LegalParagraph>
          This Privacy Policy does not by itself describe how a business using
          Requo may handle information outside Requo. Each business using Requo
          may have its own customer-facing notices, practices, and legal
          obligations.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "3. Information We Collect",
    content: (
      <>
        <LegalSectionHeading>3. Information We Collect</LegalSectionHeading>
        <LegalSubheading>A. Information you provide directly</LegalSubheading>
        <LegalList
          items={[
            "Account information such as your name, email address, login credentials, profile details, and password-reset details.",
            "Business information such as business name, slug, logo, business profile details, team member email addresses for invites, and configuration settings for inquiry pages or forms.",
            "Operational content you create inside the Service, including inquiries, notes, replies, quotes, quote line items, terms and conditions, status changes, pricing entries, FAQs, follow-up tasks, notifications, and activity records.",
          ]}
        />
        <LegalSubheading>
          B. Information collected through public inquiry forms
        </LegalSubheading>
        <LegalList
          items={[
            "Contact details such as name, email address, phone number, and company name when requested by the form.",
            "Inquiry details such as requested services, project scope, timing, budget, free-form descriptions, and answers to custom fields configured by the business.",
            "Conversational messages exchanged with an AI-powered intake assistant, when the business has enabled conversational mode for its inquiry form.",
            "Attachments and supporting files submitted with the inquiry.",
          ]}
        />
        <LegalSubheading>
          C. Information related to quotes and public quote responses
        </LegalSubheading>
        <LegalList
          items={[
            "Customer name and email address, quote line items, notes, totals, status, validity dates, and related customer-facing quote content.",
            "Responses submitted through public quote pages, including accept or decline actions and any message a customer chooses to provide.",
            "Public quote view and response timestamps used to support quote activity tracking.",
          ]}
        />
        <LegalSubheading>D. Files and uploaded content</LegalSubheading>
        <LegalList
          items={[
            "Inquiry attachments uploaded through public inquiry forms.",
            "Knowledge files and related extracted text stored to support business features.",
            "Business logos, profile avatars, and other files you upload to the Service.",
          ]}
        />
        <LegalSubheading>
          E. Automatically collected and derived information
        </LegalSubheading>
        <LegalList
          items={[
            "Session and security information such as IP address, user agent, login activity, and device or browser details associated with account access.",
            "Operational usage information such as page requests, timestamps, business context, notification activity, and records needed to keep the Service working.",
            "Essential browser-side storage used for session handling and product preferences such as active business selection, theme preference, and sidebar state.",
          ]}
        />
      </>
    ),
  },
  {
    id: "public-inquiry-pages-and-forms",
    title: "4. Public Inquiry Pages And Forms",
    content: (
      <>
        <LegalSectionHeading>4. Public Inquiry Pages And Forms</LegalSectionHeading>
        <LegalParagraph>
          Requo allows businesses to publish inquiry pages and inquiry forms that
          can be completed without creating a Requo account. Those forms may
          collect contact details, project details, custom responses, and file
          uploads, depending on how the business configures the form.
        </LegalParagraph>
        <LegalParagraph>
          Some businesses may enable an AI-powered conversational intake mode
          for their inquiry form. In that mode, an AI assistant guides the
          visitor through the inquiry by asking follow-up questions in a chat
          interface. The messages exchanged in the conversation are processed
          through an AI provider to generate responses, and the extracted
          inquiry details are stored alongside the submission.
        </LegalParagraph>
        <LegalParagraph>
          Information submitted through a public inquiry form, including any
          conversational messages, is made available to the receiving business
          and to authorized users within that business so they can review,
          qualify, and respond to the inquiry.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "accounts-and-businesses",
    title: "5. User Accounts And Businesses",
    content: (
      <>
        <LegalSectionHeading>
          5. User Accounts And Businesses
        </LegalSectionHeading>
        <LegalParagraph>
          Requo supports account registration, authentication, password reset,
          session management, account deletion, multi-business access, and
          business member invites. Users may belong to more than one business and
          may switch between businesses they are authorized to access.
        </LegalParagraph>
        <LegalParagraph>
          We process account and business information to authenticate
          users, maintain business-scoped access, send invite or password-reset
          emails, show the correct business context, and keep records needed to
          support legitimate product and security operations.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "billing-and-payments",
    title: "5A. Billing And Payment Information",
    content: (
      <>
        <LegalSectionHeading>
          5A. Billing And Payment Information
        </LegalSectionHeading>
        <LegalParagraph>
          When you subscribe to a paid plan, payment is processed by{" "}
          {legalConfig.paymentProvider}, our merchant of record. We do not
          directly collect or store full payment card details. {legalConfig.paymentProvider}{" "}
          collects and processes payment information on our behalf.
        </LegalParagraph>
        <LegalParagraph>
          We receive and store subscription-related records including plan
          selection, billing interval, subscription status, payment attempt
          outcomes, transaction identifiers, and refund status. These records
          are used to manage your subscription, enforce plan limits, process
          refund requests, and maintain billing history.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "files-and-customer-content",
    title: "6. Files, Uploads, And Customer-Submitted Content",
    content: (
      <>
        <LegalSectionHeading>
          6. Files, Uploads, And Customer-Submitted Content
        </LegalSectionHeading>
        <LegalParagraph>
          The Service supports file uploads and customer-submitted content,
          including inquiry attachments, knowledge files, business logos, profile
          avatars, public quote responses, notes, FAQs, pricing entries, and
          other business content that users or customers provide.
        </LegalParagraph>
        <LegalParagraph>
          Some uploaded knowledge files may be processed to extract text needed
          for knowledge and AI drafting features.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    title: "7. How We Use Information",
    content: (
      <>
        <LegalSectionHeading>7. How We Use Information</LegalSectionHeading>
        <LegalList
          items={[
            "Provide, maintain, and secure the Service, including account access, businesses, public inquiry pages, public quote pages, and related workflows.",
            "Authenticate users, manage sessions, administer business membership and invites, and support business switching for authorized users.",
            "Receive, store, display, route, and deliver inquiries, quotes, follow-up tasks, notifications, and transactional emails.",
            "Support knowledge features, file handling, internal analytics features, AI drafting features, and AI-powered conversational inquiry intake.",
            "Maintain audit logs of sensitive business actions for security and accountability.",
            "Monitor usage, troubleshoot issues, investigate suspected abuse, respond to support requests, and comply with legal obligations.",
          ]}
        />
      </>
    ),
  },
  {
    id: "ai-features",
    title: "8. AI Features",
    content: (
      <>
        <LegalSectionHeading>8. AI Features</LegalSectionHeading>
        <LegalSubheading>A. Internal AI drafting</LegalSubheading>
        <LegalParagraph>
          If an authorized user uses AI-powered drafting features in the Service,
          certain inputs may be processed through Groq, Gemini, or OpenRouter
          and, depending on configuration, by the model provider used to
          generate drafts, summaries, or suggestions.
        </LegalParagraph>
        <LegalParagraph>
          Based on the current Service, those inputs may include inquiry details,
          submitted custom field responses, internal notes, FAQ content, excerpts
          from uploaded knowledge files, and the prompt or drafting request
          entered by an authorized business user.
        </LegalParagraph>
        <LegalSubheading>B. AI-powered conversational inquiry intake</LegalSubheading>
        <LegalParagraph>
          When a business enables conversational mode for its public inquiry
          form, visitors interact with an AI assistant that guides them through
          the inquiry. Messages sent by the visitor and the AI responses are
          processed through an AI provider. The AI extracts structured inquiry
          details from the conversation, which are stored alongside the
          submission and made available to the receiving business.
        </LegalParagraph>
        <LegalParagraph>
          You should avoid submitting highly sensitive personal information to
          AI-powered features unless necessary and appropriate for your use
          case.
        </LegalParagraph>
        <LegalParagraph>
          AI-generated outputs can be incomplete or inaccurate and should be
          reviewed by a human before use.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "sharing",
    title: "9. When We Share Information",
    content: (
      <>
        <LegalSectionHeading>9. When We Share Information</LegalSectionHeading>
        <LegalSubheading>A. Within a business</LegalSubheading>
        <LegalParagraph>
          Information inside a business may be shared with authorized
          users of that business, based on their role and access.
        </LegalParagraph>
        <LegalSubheading>B. With service providers</LegalSubheading>
        <LegalParagraph>
          We share information with service providers that host the Service,
          store data and files, deliver transactional email, support optional
          social sign-in, or route AI requests when AI features are used.
        </LegalParagraph>
        <LegalSubheading>C. Through public pages or links</LegalSubheading>
        <LegalParagraph>
          Information intentionally published or made available through public
          inquiry pages or public quote links may be accessible to the intended
          recipients and to anyone else who receives or accesses the relevant
          page or link.
        </LegalParagraph>
        <LegalSubheading>D. For legal and security reasons</LegalSubheading>
        <LegalParagraph>
          We may disclose information if we believe it is reasonably necessary to
          comply with applicable law, respond to lawful requests, protect the
          Service, investigate misuse, or protect the rights, safety, or property
          of Requo, our users, or others.
        </LegalParagraph>
        <LegalSubheading>E. Business transfers</LegalSubheading>
        <LegalParagraph>
          We may disclose information in connection with an actual or proposed
          merger, acquisition, financing, reorganization, sale of assets, or
          similar corporate transaction, subject to applicable law.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "service-providers",
    title: "10. Service Providers And Infrastructure",
    content: (
      <>
        <LegalSectionHeading>
          10. Service Providers And Infrastructure
        </LegalSectionHeading>
        <LegalParagraph>
          We use the following third-party services to operate Requo:
        </LegalParagraph>
        <LegalList
          items={[
            `${legalConfig.hostingProvider}, for hosting and application delivery.`,
            `${legalConfig.storageProvider}, for database, storage, and related backend infrastructure.`,
            `${legalConfig.paymentProvider}, for subscription billing, payment processing, and refunds as the merchant of record.`,
            "Resend, for transactional email delivery.",
            "Groq, Gemini, and OpenRouter, for AI request routing when AI features are used.",
            "Google, for optional OAuth sign-in when enabled, and transactional email providers for magic link sign-in when configured.",
          ]}
        />
        <LegalParagraph>
          If we materially change the services listed above, we may update this
          Privacy Policy.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "cookies-and-analytics",
    title: "11. Cookies, Browser Storage, And Analytics",
    content: (
      <>
        <LegalSectionHeading>
          11. Cookies, Browser Storage, And Analytics
        </LegalSectionHeading>
        <LegalParagraph>
          We use essential cookies and similar technologies needed to operate
          and secure the Service.
        </LegalParagraph>
        <LegalParagraph>
          The current Service also uses browser storage for product settings and
          interface preferences such as theme selection, active business
          selection, and sidebar state. If we enable additional analytics,
          performance, or advertising technologies, we will update this Privacy
          Policy to describe those tools and related choices.
        </LegalParagraph>
        <LegalParagraph>
          Requo also includes internal analytics features based on data stored
          within the Service. We did not identify a dedicated third-party web
          analytics or advertising SDK in the current app code.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "retention-and-security",
    title: "12. Data Retention And Security",
    content: (
      <>
        <LegalSectionHeading>
          12. Data Retention And Security
        </LegalSectionHeading>
        <LegalParagraph>
          We retain personal information for as long as reasonably necessary to
          provide the Service, maintain business and operational records, comply
          with legal obligations, resolve disputes, enforce our agreements, and
          protect our legitimate interests. Retention periods may vary depending
          on the type of information and the purpose for which it was collected.
        </LegalParagraph>
        <LegalParagraph>
          We use reasonable administrative, technical, and organizational
          measures designed to protect information handled through the Service.
          No method of transmission or storage is completely secure, and we
          cannot guarantee absolute security.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "transfers-and-rights",
    title: "13. International Processing And Your Choices",
    content: (
      <>
        <LegalSectionHeading>
          13. International Processing And Your Choices
        </LegalSectionHeading>
        <LegalParagraph>
          Requo operates from the Philippines, and our service providers may
          process information in other countries depending on how the Service is
          hosted or delivered. By using the Service, you understand that
          information may be processed outside your local jurisdiction, subject
          to applicable law.
        </LegalParagraph>
        <LegalParagraph>
          You may have choices about the information you provide to Requo. For
          example, you can choose whether to submit information through public
          inquiry forms, manage certain account details inside the Service, or
          contact us about access, correction, deletion, or other privacy-related
          requests where applicable.
        </LegalParagraph>
        <LegalParagraph>
          We handle personal information in a manner intended to be consistent
          with applicable privacy laws, including the Data Privacy Act of 2012
          (Republic Act No. 10173) of the Philippines, where applicable.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "lawful-basis",
    title: "14. Lawful Basis For Processing",
    content: (
      <>
        <LegalSectionHeading>
          14. Lawful Basis For Processing
        </LegalSectionHeading>
        <LegalParagraph>
          Under GDPR Article 6, we rely on the following lawful bases for each
          processing activity:
        </LegalParagraph>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70">
                <th className="pb-3 pr-4 text-left font-medium text-foreground">
                  Processing Activity
                </th>
                <th className="pb-3 text-left font-medium text-foreground">
                  Lawful Basis (Article 6)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Account creation and management
                </td>
                <td className="py-3 text-muted-foreground">
                  Performance of a contract
                </td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Inquiry form processing
                </td>
                <td className="py-3 text-muted-foreground">
                  Legitimate interest
                </td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  AI-assisted drafting
                </td>
                <td className="py-3 text-muted-foreground">
                  Legitimate interest
                </td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Conversational AI intake
                </td>
                <td className="py-3 text-muted-foreground">
                  Legitimate interest (with notice)
                </td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Transactional email
                </td>
                <td className="py-3 text-muted-foreground">
                  Performance of a contract
                </td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Internal analytics
                </td>
                <td className="py-3 text-muted-foreground">
                  Legitimate interest
                </td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Billing and subscription
                </td>
                <td className="py-3 text-muted-foreground">
                  Performance of a contract
                </td>
              </tr>
              <tr className="border-b border-border/40 last:border-b-0">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Security logging and rate limiting
                </td>
                <td className="py-3 text-muted-foreground">
                  Legitimate interest
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <LegalParagraph>
          Where we rely on legitimate interest, we have conducted balancing
          assessments to ensure our interests do not override your fundamental
          rights and freedoms.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "data-retention-schedule",
    title: "15. Data Retention Schedule",
    content: (
      <>
        <LegalSectionHeading>
          15. Data Retention Schedule
        </LegalSectionHeading>
        <LegalParagraph>
          We retain different categories of data for different periods based on
          their purpose and applicable legal requirements:
        </LegalParagraph>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70">
                <th className="pb-3 pr-4 text-left font-medium text-foreground">
                  Data Category
                </th>
                <th className="pb-3 text-left font-medium text-foreground">
                  Retention Period
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Account data
                </td>
                <td className="py-3 text-muted-foreground">
                  Duration of account plus 30 days after deletion
                </td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Business content
                </td>
                <td className="py-3 text-muted-foreground">
                  Duration of business plus 90 days
                </td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  AI token logs
                </td>
                <td className="py-3 text-muted-foreground">90 days</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Billing records
                </td>
                <td className="py-3 text-muted-foreground">7 years</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Session and security logs
                </td>
                <td className="py-3 text-muted-foreground">90 days</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Webhook events
                </td>
                <td className="py-3 text-muted-foreground">1 year</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Public action rate limit events
                </td>
                <td className="py-3 text-muted-foreground">30 days</td>
              </tr>
              <tr className="border-b border-border/40 last:border-b-0">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Analytics events
                </td>
                <td className="py-3 text-muted-foreground">
                  Duration of business
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <LegalParagraph>
          After the applicable retention period expires, data is deleted or
          anonymized in accordance with our data management procedures.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "international-data-transfers",
    title: "16. International Data Transfers",
    content: (
      <>
        <LegalSectionHeading>
          16. International Data Transfers
        </LegalSectionHeading>
        <LegalParagraph>
          Your data may be transferred to and processed in countries outside
          your jurisdiction. The following table lists the third-party providers
          we use, their data locations, and their roles:
        </LegalParagraph>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70">
                <th className="pb-3 pr-4 text-left font-medium text-foreground">
                  Provider
                </th>
                <th className="pb-3 pr-4 text-left font-medium text-foreground">
                  Data Location
                </th>
                <th className="pb-3 text-left font-medium text-foreground">
                  Role
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Vercel
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  United States
                </td>
                <td className="py-3 text-muted-foreground">Hosting</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Supabase
                </td>
                <td className="py-3 pr-4 text-muted-foreground">Singapore</td>
                <td className="py-3 text-muted-foreground">
                  Database and storage
                </td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Resend
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  United States
                </td>
                <td className="py-3 text-muted-foreground">Email</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">Groq</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  United States
                </td>
                <td className="py-3 text-muted-foreground">AI inference</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Cerebras
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  United States
                </td>
                <td className="py-3 text-muted-foreground">AI inference</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Google / Gemini
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  United States
                </td>
                <td className="py-3 text-muted-foreground">
                  AI inference and OAuth
                </td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  OpenRouter
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  United States
                </td>
                <td className="py-3 text-muted-foreground">AI routing</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Mistral
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  EU / France
                </td>
                <td className="py-3 text-muted-foreground">AI inference</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Cloudflare
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  Global edge
                </td>
                <td className="py-3 text-muted-foreground">AI inference</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  NVIDIA
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  United States
                </td>
                <td className="py-3 text-muted-foreground">AI inference</td>
              </tr>
              <tr className="border-b border-border/40 last:border-b-0">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Polar
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  United States
                </td>
                <td className="py-3 text-muted-foreground">
                  Payment processing
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <LegalParagraph>
          Where personal data is transferred outside the European Economic Area
          or the United Kingdom to a country not recognized as providing an
          adequate level of data protection, we rely on Standard Contractual
          Clauses (SCCs) approved by the European Commission as the transfer
          mechanism.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "17. Your Rights",
    content: (
      <>
        <LegalSectionHeading>17. Your Rights</LegalSectionHeading>
        <LegalParagraph>
          Depending on your jurisdiction, you may have specific rights regarding
          your personal information. Below we describe the rights available under
          the laws most relevant to our users.
        </LegalParagraph>
        <LegalSubheading>A. EU / EEA / UK (GDPR)</LegalSubheading>
        <LegalParagraph>
          If you are located in the European Union, European Economic Area, or
          United Kingdom, you have the following rights under the General Data
          Protection Regulation:
        </LegalParagraph>
        <LegalList
          items={[
            "Right of access — request a copy of the personal data we hold about you.",
            "Right to rectification — request correction of inaccurate or incomplete personal data.",
            "Right to erasure — request deletion of your personal data where there is no compelling reason for its continued processing.",
            "Right to restriction — request that we restrict processing of your personal data in certain circumstances.",
            "Right to data portability — receive your personal data in a structured, commonly used, machine-readable format.",
            "Right to object — object to processing based on legitimate interest, including profiling.",
            "Rights related to automated decision-making — not be subject to decisions based solely on automated processing that produce legal or similarly significant effects.",
          ]}
        />
        <LegalSubheading>B. California (CCPA / CPRA)</LegalSubheading>
        <LegalParagraph>
          If you are a California resident, you have the following rights under
          the California Consumer Privacy Act and California Privacy Rights Act:
        </LegalParagraph>
        <LegalList
          items={[
            "Right to know — request disclosure of the categories and specific pieces of personal information we have collected about you.",
            "Right to delete — request deletion of personal information we have collected from you.",
            "Right to opt-out of sale or sharing — direct us not to sell or share your personal information. Requo does not sell or share personal information as defined under the CCPA/CPRA.",
            "Right to non-discrimination — not receive discriminatory treatment for exercising your privacy rights.",
          ]}
        />
        <LegalSubheading>C. Philippines (Data Privacy Act)</LegalSubheading>
        <LegalParagraph>
          If you are located in the Philippines, you have the following rights
          under Republic Act No. 10173 (Data Privacy Act of 2012):
        </LegalParagraph>
        <LegalList
          items={[
            "Right to be informed — be informed of the purpose and extent of data processing before or at the time of collection.",
            "Right to access — obtain a copy of your personal data being processed.",
            "Right to correction — dispute and have corrected any inaccuracy or error in your personal data.",
            "Right to erasure or blocking — suspend, withdraw, or order blocking, removal, or destruction of your personal data.",
            "Right to data portability — obtain your personal data in an electronic or structured format.",
            "Right to object — object to the processing of your personal data, including processing for direct marketing, automated processing, or profiling.",
            "Right to damages — be indemnified for damages sustained due to inaccurate, incomplete, outdated, false, unlawfully obtained, or unauthorized use of personal data.",
          ]}
        />
        <LegalSubheading>D. How to exercise your rights</LegalSubheading>
        <LegalParagraph>
          To exercise any of the rights described above, contact us at{" "}
          <a
            className="text-foreground underline-offset-4 hover:underline"
            href={`mailto:${legalConfig.privacyEmail}`}
          >
            {legalConfig.privacyEmail}
          </a>
          . We will respond to your request within 30 days. In certain
          circumstances, this period may be extended as permitted by applicable
          regulation, in which case we will notify you of the extension and the
          reason for it.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "ai-provider-data-practices",
    title: "18. AI Provider Data Practices",
    content: (
      <>
        <LegalSectionHeading>
          18. AI Provider Data Practices
        </LegalSectionHeading>
        <LegalParagraph>
          Requo uses multiple AI providers as part of its inference and drafting
          features. None of these providers use Requo customer data submitted
          through the API to train their models. The following table summarizes
          the data handling practices of each provider:
        </LegalParagraph>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70">
                <th className="pb-3 pr-4 text-left font-medium text-foreground">
                  Provider
                </th>
                <th className="pb-3 pr-4 text-left font-medium text-foreground">
                  Training on Customer Data
                </th>
                <th className="pb-3 pr-4 text-left font-medium text-foreground">
                  Data Retention
                </th>
                <th className="pb-3 text-left font-medium text-foreground">
                  Zero Data Retention (ZDR)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">Groq</td>
                <td className="py-3 pr-4 text-muted-foreground">No</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  Not retained after processing
                </td>
                <td className="py-3 text-muted-foreground">Yes (default)</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Cerebras
                </td>
                <td className="py-3 pr-4 text-muted-foreground">No</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  Not retained after processing
                </td>
                <td className="py-3 text-muted-foreground">Yes (default)</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Google / Gemini
                </td>
                <td className="py-3 pr-4 text-muted-foreground">No</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  Transient processing; not stored beyond request
                </td>
                <td className="py-3 text-muted-foreground">
                  Yes (paid API tier)
                </td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  OpenRouter
                </td>
                <td className="py-3 pr-4 text-muted-foreground">No</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  Short-term logging for abuse prevention
                </td>
                <td className="py-3 text-muted-foreground">
                  Varies by upstream model
                </td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Mistral (API / La Plateforme)
                </td>
                <td className="py-3 pr-4 text-muted-foreground">No</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  Not retained for training; 30-day abuse log
                </td>
                <td className="py-3 text-muted-foreground">Yes (API)</td>
              </tr>
              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 font-medium text-foreground">
                  Cloudflare Workers AI
                </td>
                <td className="py-3 pr-4 text-muted-foreground">No</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  Not retained after processing
                </td>
                <td className="py-3 text-muted-foreground">Yes (default)</td>
              </tr>
              <tr className="border-b border-border/40 last:border-b-0">
                <td className="py-3 pr-4 font-medium text-foreground">
                  NVIDIA NIM
                </td>
                <td className="py-3 pr-4 text-muted-foreground">No</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  Not retained after processing
                </td>
                <td className="py-3 text-muted-foreground">Yes (default)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <LegalParagraph>
          Requo accesses all AI providers exclusively through their API services.
          API terms universally prohibit using customer data for model training.
          This is distinct from consumer-facing chat products offered by the same
          companies, which may have different data practices.
        </LegalParagraph>
        <LegalSubheading>Mistral: API vs. Consumer Chat</LegalSubheading>
        <LegalParagraph>
          Mistral is included in Requo&rsquo;s AI provider fallback chain and is
          accessed through Mistral&rsquo;s API platform (La Plateforme). Per
          Mistral&rsquo;s API terms, data sent through the API is not used for
          model training and is subject to a 30-day retention period for abuse
          and safety monitoring only. This is separate from Mistral&rsquo;s
          consumer chat product (Le Chat), which may use conversation data for
          model improvement under different terms. Requo does not use the
          consumer chat product.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "automated-decision-making",
    title: "19. Automated Decision-Making",
    content: (
      <>
        <LegalSectionHeading>19. Automated Decision-Making</LegalSectionHeading>
        <LegalParagraph>
          Requo includes AI-powered features that assist with drafting quotes,
          generating suggestions, and guiding conversational inquiry intake.
          These features are designed as assistive tools only.
        </LegalParagraph>
        <LegalParagraph>
          No automated decisions with legal or similarly significant effects are
          made about you through the Service. All AI-generated outputs, including
          draft text, suggestions, and extracted inquiry details, require human
          review before use. A business user must review, edit, and approve any
          AI-assisted content before it is sent to a customer or used to make a
          business decision.
        </LegalParagraph>
        <LegalParagraph>
          If you have questions about how AI features are used in the context of
          a specific business, you may contact that business directly or reach us
          at{" "}
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
  {
    id: "breach-notification",
    title: "20. Breach Notification",
    content: (
      <>
        <LegalSectionHeading>20. Breach Notification</LegalSectionHeading>
        <LegalParagraph>
          In the event of a confirmed personal data breach that poses a risk to
          your rights and freedoms, we will notify affected account holders via
          email within 72 hours of confirming the breach.
        </LegalParagraph>
        <LegalParagraph>
          Breach notifications will include a description of the nature of the
          breach, the categories of data affected, the likely consequences, and
          the measures we have taken or propose to take to address the breach and
          mitigate its effects.
        </LegalParagraph>
        <LegalParagraph>
          Where required by applicable law, we will also make a public disclosure
          about the breach and notify relevant supervisory authorities within the
          timeframes required by those laws.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "do-not-track-and-gpc",
    title: "21. Do Not Track And Global Privacy Control",
    content: (
      <>
        <LegalSectionHeading>
          21. Do Not Track And Global Privacy Control
        </LegalSectionHeading>
        <LegalParagraph>
          Requo does not track users across third-party websites and does not
          sell or share personal information with third parties for advertising
          or cross-site tracking purposes.
        </LegalParagraph>
        <LegalParagraph>
          We honor Global Privacy Control (GPC) signals where applicable. Because
          we do not engage in cross-site tracking or sell personal information,
          our existing practices are consistent with the choices expressed by
          Do Not Track (DNT) and GPC signals.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "children-and-changes",
    title: "22. Children's Privacy And Policy Changes",
    content: (
      <>
        <LegalSectionHeading>
          22. Children&rsquo;s Privacy And Policy Changes
        </LegalSectionHeading>
        <LegalParagraph>
          The Service is designed for businesses and business-related customer
          communications. We do not knowingly provide account features for
          children under 13. If you believe a child has provided personal
          information through the Service inappropriately, contact us at{" "}
          <a
            className="text-foreground underline-offset-4 hover:underline"
            href={`mailto:${legalConfig.privacyEmail}`}
          >
            {legalConfig.privacyEmail}
          </a>
          .
        </LegalParagraph>
        <LegalParagraph>
          We may update this Privacy Policy from time to time. If we make
          material changes, we will post the updated version on this page and
          update the effective date above. Your continued use of the Service
          after a change becomes effective means the updated Privacy Policy will
          apply going forward.
        </LegalParagraph>
      </>
    ),
  },
];

export function PrivacyPolicyPage() {
  return <LegalDocumentPage title="Privacy Policy" sections={privacySections} />;
}
