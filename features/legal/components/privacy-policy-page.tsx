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
            "Business workspace information such as business name, slug, logo, business profile details, team member email addresses for invites, and configuration settings for inquiry pages or forms.",
            "Operational content you create inside the Service, including inquiries, notes, replies, quotes, quote line items, status changes, pricing entries, FAQs, reply snippets, notifications, and activity records.",
          ]}
        />
        <LegalSubheading>
          B. Information collected through public inquiry forms
        </LegalSubheading>
        <LegalList
          items={[
            "Contact details such as name, email address, phone number, and company name when requested by the form.",
            "Inquiry details such as requested services, project scope, timing, budget, free-form descriptions, and answers to custom fields configured by the business.",
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
            "Knowledge files and related extracted text stored to support business workspace features.",
            "Business logos, profile avatars, and other files you upload to the Service.",
          ]}
        />
        <LegalSubheading>
          E. Automatically collected and derived information
        </LegalSubheading>
        <LegalList
          items={[
            "Session and security information such as IP address, user agent, login activity, and device or browser details associated with account access.",
            "Operational usage information such as page requests, timestamps, business workspace context, notification activity, and records needed to keep the Service working.",
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
          Information submitted through a public inquiry form is made available
          to the receiving business and to authorized users within that business
          workspace so they can review, qualify, and respond to the inquiry.
        </LegalParagraph>
      </>
    ),
  },
  {
    id: "accounts-and-businesses",
    title: "5. User Accounts And Business Workspaces",
    content: (
      <>
        <LegalSectionHeading>
          5. User Accounts And Business Workspaces
        </LegalSectionHeading>
        <LegalParagraph>
          Requo supports account registration, authentication, password reset,
          session management, account deletion, multi-business access, and
          business member invites. Users may belong to more than one business and
          may switch between businesses they are authorized to access.
        </LegalParagraph>
        <LegalParagraph>
          We process account and business workspace information to authenticate
          users, maintain business-scoped access, send invite or password-reset
          emails, show the correct business context, and keep records needed to
          support legitimate product and security operations.
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
          other business workspace content that users or customers provide.
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
            "Provide, maintain, and secure the Service, including account access, business workspaces, public inquiry pages, public quote pages, and related workflows.",
            "Authenticate users, manage sessions, administer business workspace membership and invites, and support business switching for authorized users.",
            "Receive, store, display, route, and deliver inquiries, quotes, notifications, and transactional emails.",
            "Support knowledge features, file handling, internal analytics features, and AI drafting features used by an authorized user.",
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
        <LegalParagraph>
          If an authorized user uses AI-powered features in the Service, certain
          inputs may be processed through OpenRouter and, depending on
          configuration, by the model provider used through OpenRouter to
          generate drafts, summaries, or suggestions.
        </LegalParagraph>
        <LegalParagraph>
          Based on the current Service, those inputs may include inquiry details,
          submitted custom field responses, internal notes, FAQ content, excerpts
          from uploaded knowledge files, and the prompt or drafting request
          entered by an authorized business workspace user.
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
        <LegalSubheading>A. Within a business workspace</LegalSubheading>
        <LegalParagraph>
          Information inside a business workspace may be shared with authorized
          users of that workspace, based on their role and access.
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
            "Resend, for transactional email delivery.",
            "OpenRouter, for AI request routing when AI features are used.",
            "Google or Microsoft, for optional social sign-in when those sign-in methods are enabled.",
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
    id: "children-and-changes",
    title: "14. Children's Privacy And Policy Changes",
    content: (
      <>
        <LegalSectionHeading>
          14. Children&rsquo;s Privacy And Policy Changes
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
