# Requirements Document

## Introduction

This document specifies the compliance, security hardening, and privacy requirements for Requo arising from a full compliance and security audit. The scope covers Content Security Policy headers, CSRF validation, rate limiter fail-closed behavior, AI prompt injection protection, privacy policy expansion (lawful basis, retention, international transfers, rights, AI disclosures, breach notification), Terms of Service amendments (force majeure, data export, cure period, modification notice, SLA), public trust pages (/security, /subprocessors, vulnerability disclosure, DPA), cookie transparency, data export for portability, and security.txt.

## Glossary

- **Requo**: The quotation/inquiry management SaaS application and its operator
- **CSP**: Content Security Policy; an HTTP response header that restricts the sources from which browsers may load resources
- **CSRF**: Cross-Site Request Forgery; an attack where a malicious site tricks a user's browser into making unwanted requests
- **Rate_Limiter**: The public-action-rate-limit module that throttles unauthenticated actions by fingerprint
- **Prompt_Injection**: An attack where user input manipulates AI system prompts or causes unintended model behavior
- **Privacy_Policy**: The legal document at /privacy describing data collection, use, and rights
- **Terms_of_Service**: The legal document at /terms governing use of Requo
- **Security_Page**: A public page at /security describing Requo's security posture
- **Subprocessors_Page**: A public page at /subprocessors listing third-party data processors
- **DPA**: Data Processing Agreement; a contract between controller and processor governing personal data handling
- **Cookie_Banner**: A dismissible notice on public pages informing visitors about essential cookie usage
- **Data_Export**: A feature allowing business owners to download their data in portable format
- **Security_Txt**: A machine-readable file at /.well-known/security.txt for vulnerability disclosure coordination
- **ZDR**: Zero Data Retention; a policy where the AI provider does not store request or response content

## Requirements

### Requirement 1: Content Security Policy Header

**User Story:** As a security-conscious operator, I want strict CSP headers applied to all responses, so that cross-site scripting and data injection attacks are mitigated.

#### Acceptance Criteria

1. THE Requo application SHALL serve a Content-Security-Policy response header on every HTTP response that returns an HTML document (pages and server-rendered error pages)
2. WHEN the CSP header is served, THE CSP SHALL set default-src to 'self'
3. WHEN the CSP header is served, THE CSP SHALL set script-src to 'self' without 'unsafe-inline' and without 'unsafe-eval'
4. WHEN the CSP header is served, THE CSP SHALL set style-src to 'self' 'unsafe-inline' to support Next.js inline styles
5. WHEN the CSP header is served, THE CSP SHALL set img-src to 'self' data: https:
6. WHEN the CSP header is served, THE CSP SHALL set connect-src to 'self' https: to allow API and analytics connections
7. WHEN the CSP header is served, THE CSP SHALL set frame-ancestors to 'none'
8. WHEN the CSP header is served, THE CSP SHALL set form-action to 'self'
9. WHERE Vercel Analytics is added in the future, THE CSP SHALL include the Vercel Analytics script domain in script-src
10. IF a response is an API route returning JSON or a non-HTML content type, THEN THE Requo application SHALL NOT include the Content-Security-Policy header on that response
11. WHEN the CSP header is served, THE CSP SHALL set object-src to 'none' and base-uri to 'self' to prevent plugin-based injection and base tag hijacking

### Requirement 2: CSRF Protection for Custom API Routes

**User Story:** As a security-conscious operator, I want all state-changing custom API routes to validate request origin, so that cross-site request forgery attacks are blocked.

#### Acceptance Criteria

1. WHEN a state-changing request (POST, PUT, PATCH, DELETE) arrives at an app/api/* route, THE API_Route SHALL validate that the Origin or Referer header matches the application's configured origin
2. IF the Origin header is missing or does not match the application origin on a state-changing request, THEN THE API_Route SHALL respond with HTTP 403 and reject the request
3. THE Requo application SHALL implement origin validation as shared middleware or utility that custom API routes invoke
4. WHILE Next.js Server Actions are used, THE Requo application SHALL rely on the built-in Origin header check provided by Next.js for those actions
5. THE CSRF origin validation SHALL exempt routes that authenticate requests through alternative mechanisms, specifically: /api/auth/* (Better Auth handles its own security), /api/billing/polar/webhook (authenticates via HMAC signature verification), /api/public/* (public-facing endpoints with their own rate limiting), /api/cron/* (authenticated via Vercel cron secret), /.well-known/* (discovery and OAuth endpoints), and /api/push/* (push subscription endpoints accessed from service workers)
6. IF new external-facing API routes are added in the future, THEN THE CSRF exemption list SHALL be updated to include them to prevent breaking cross-origin integrations

### Requirement 3: Rate Limiter Fail-Closed Behavior

**User Story:** As a security-conscious operator, I want the rate limiter to deny requests when the database is unreachable, so that attackers cannot bypass rate limits during outages.

#### Acceptance Criteria

1. IF the Rate_Limiter encounters a database connection failure, timeout, or query error during the rate check, THEN THE Rate_Limiter SHALL return false (deny the action)
2. IF the Rate_Limiter encounters any unhandled exception during the rate check, THEN THE Rate_Limiter SHALL return false (deny the action) rather than allowing the request to proceed
3. WHEN the Rate_Limiter denies an action due to a database error or unhandled exception, THE Rate_Limiter SHALL log an entry containing the error type, the action being rate-limited, and a timestamp
4. IF the database becomes reachable again after an outage, THEN THE Rate_Limiter SHALL resume normal rate-check behavior without requiring a manual restart

### Requirement 4: AI Prompt Injection Protection

**User Story:** As a security-conscious operator, I want user inputs to AI features sanitized and outputs filtered, so that prompt injection attacks are detected and system prompt leakage is prevented.

#### Acceptance Criteria

1. WHEN user input is submitted to the public inquiry chat or any AI feature, THE AI_Input_Sanitizer SHALL scan the input for known prompt injection patterns before passing it to the AI provider
2. IF a prompt injection pattern is detected in user input, THEN THE AI_Input_Sanitizer SHALL strip or neutralize the injection attempt and log the event with the pattern matched, user identifier (if available), and timestamp
3. WHEN an AI provider returns a response, THE AI_Output_Filter SHALL scan the output for system prompt content, internal instruction leakage, or sensitive configuration details
4. IF system prompt leakage is detected in AI output, THEN THE AI_Output_Filter SHALL redact the leaked content before presenting the response to the user and log the incident
5. THE AI_Input_Sanitizer SHALL detect patterns including but not limited to: "ignore previous instructions", "ignore all prior", "system prompt", "you are now", "act as", role-switching attempts, delimiter injection (triple backticks, XML-style tags used to escape context), and encoded variants of these patterns
6. THE AI_Input_Sanitizer SHALL operate as a pure function that returns the sanitized input or a rejection indicator without making network calls, completing within 5 milliseconds per input
7. IF the AI_Input_Sanitizer rejects an input entirely (high-confidence injection attempt), THEN THE calling feature SHALL return a safe fallback response to the user without invoking the AI provider

### Requirement 5: Privacy Policy — Lawful Basis for Processing

**User Story:** As a data subject, I want to understand the lawful basis for each processing activity, so that I can assess whether my data is handled lawfully under GDPR.

#### Acceptance Criteria

1. THE Privacy_Policy SHALL include a Lawful Basis for Processing section with a table mapping each processing activity to its GDPR Article 6 basis
2. THE Privacy_Policy SHALL list the following processing activities and their lawful bases: account creation (contract performance), inquiry form processing (legitimate interest), AI-assisted drafting (legitimate interest), conversational AI intake (legitimate interest with notice), transactional email (contract performance), internal analytics (legitimate interest), billing and subscription (contract performance), security logging and rate limiting (legitimate interest)

### Requirement 6: Privacy Policy — Data Retention Schedule

**User Story:** As a data subject, I want to know how long each category of my data is retained, so that I can understand the lifecycle of my personal information.

#### Acceptance Criteria

1. THE Privacy_Policy SHALL include a Data Retention Schedule section specifying retention periods for each data category
2. THE Privacy_Policy SHALL specify: account data retained for duration of account plus 30 days after deletion, business content retained for duration of business plus 90 days, AI token logs retained for 90 days, billing records retained for 7 years, session and security logs retained for 90 days, webhook events retained for 1 year, public action rate limit events retained for 30 days, analytics events retained for duration of business

### Requirement 7: Privacy Policy — International Data Transfers

**User Story:** As a data subject, I want to know which countries my data may be transferred to and which providers are involved, so that I can assess cross-border data risks.

#### Acceptance Criteria

1. THE Privacy_Policy SHALL include an International Data Transfers section listing each third-party provider, its data location, and its role
2. THE Privacy_Policy SHALL disclose: Vercel (United States, hosting), Supabase (Singapore, database and storage), Resend (United States, email), Groq (United States, AI inference), Cerebras (United States, AI inference), Google/Gemini (United States, AI inference and OAuth), OpenRouter (United States, AI routing), Mistral (EU/France, AI inference), Cloudflare (global edge, AI inference), NVIDIA (United States, AI inference), Polar (United States, payment processing)
3. THE Privacy_Policy SHALL state that Standard Contractual Clauses are used as the transfer mechanism where applicable

### Requirement 8: Privacy Policy — Data Subject Rights

**User Story:** As a data subject, I want to know my specific privacy rights based on my jurisdiction, so that I can exercise them when needed.

#### Acceptance Criteria

1. THE Privacy_Policy SHALL include a Your Rights section with jurisdiction-specific subsections for EU/EEA/UK (GDPR), California (CCPA/CPRA), and Philippines (Data Privacy Act)
2. THE Privacy_Policy SHALL list GDPR rights: access, rectification, erasure, restriction, portability, objection, and rights related to automated decision-making
3. THE Privacy_Policy SHALL list CCPA/CPRA rights: right to know, right to delete, right to opt-out of sale or sharing, and right to non-discrimination
4. THE Privacy_Policy SHALL list Philippines DPA rights: access, correction, erasure, data portability, object to processing, right to be informed, and right to damages
5. THE Privacy_Policy SHALL provide the contact method (privacy@requo.app) and response timeframe (30 days, extendable per regulation) for exercising rights

### Requirement 9: Privacy Policy — AI Provider Data Practices

**User Story:** As a data subject, I want to understand how each AI provider handles my data, so that I can assess whether AI processing poses a risk to my privacy.

#### Acceptance Criteria

1. THE Privacy_Policy SHALL include an AI Provider Data Practices section disclosing the data handling practices of each AI provider used
2. THE Privacy_Policy SHALL state for each provider whether it uses customer data for training, its default data retention policy, and whether Zero Data Retention is available
3. THE Privacy_Policy SHALL explicitly state that none of the AI providers use Requo customer data to train their models when accessed through the API

### Requirement 10: Privacy Policy — Automated Decision-Making Disclosure

**User Story:** As a data subject, I want to know whether automated decisions are made about me and what safeguards exist, so that I can exercise my rights regarding automated processing.

#### Acceptance Criteria

1. THE Privacy_Policy SHALL include an Automated Decision-Making section
2. THE Privacy_Policy SHALL state that AI features assist with drafting and suggestions only, that no automated decisions with legal or significant effects are made, and that all AI outputs require human review before use

### Requirement 11: Privacy Policy — Breach Notification

**User Story:** As a data subject, I want to be notified promptly if my personal data is breached, so that I can take protective action.

#### Acceptance Criteria

1. THE Privacy_Policy SHALL include a Breach Notification section
2. THE Privacy_Policy SHALL commit to notifying affected users within 72 hours of confirming a personal data breach via email to affected account holders
3. THE Privacy_Policy SHALL state that public disclosure will occur if required by law

### Requirement 12: Privacy Policy — Do Not Track and Global Privacy Control

**User Story:** As a privacy-conscious user, I want to know how Requo responds to Do Not Track and Global Privacy Control signals, so that I can make informed choices about using the service.

#### Acceptance Criteria

1. THE Privacy_Policy SHALL include a Do Not Track / Global Privacy Control section
2. THE Privacy_Policy SHALL state that Requo does not track users across third-party websites, does not sell or share personal information, and honors Global Privacy Control signals where applicable

### Requirement 13: Terms of Service — Force Majeure

**User Story:** As a service operator, I want a force majeure clause in the Terms of Service, so that Requo is not held liable for service interruptions caused by events beyond reasonable control.

#### Acceptance Criteria

1. THE Terms_of_Service SHALL include a Force Majeure section stating that neither party is liable for failure to perform obligations caused by events beyond reasonable control
2. THE Terms_of_Service SHALL define force majeure events to include natural disasters, pandemics, government actions, war, terrorism, infrastructure failures, and third-party service outages

### Requirement 14: Terms of Service — Data Export Commitment

**User Story:** As a business owner, I want a guaranteed window to export my data after account termination, so that I do not lose access to my business information.

#### Acceptance Criteria

1. THE Terms_of_Service SHALL commit to providing a 30-day window after account termination during which the user may export their data
2. THE Terms_of_Service SHALL specify that data export includes inquiries, quotes, contacts, and files associated with the user's businesses

### Requirement 15: Terms of Service — Cure Period

**User Story:** As a user, I want written notice and time to fix non-security violations before my account is suspended, so that I am treated fairly.

#### Acceptance Criteria

1. THE Terms_of_Service SHALL require 14 days written notice for non-security violations before account suspension
2. THE Terms_of_Service SHALL allow the user to cure the violation within the notice period to avoid suspension
3. IF the violation poses an immediate security risk, THEN THE Terms_of_Service SHALL permit immediate suspension without a cure period

### Requirement 16: Terms of Service — Modification Notice

**User Story:** As a user, I want advance notice of material changes to the Terms of Service, so that I can review changes before they take effect.

#### Acceptance Criteria

1. WHEN a material change is made to the Terms_of_Service, THE Requo application SHALL provide 30 days advance notice to affected users
2. THE Requo application SHALL deliver modification notices via email and in-app notification

### Requirement 17: Terms of Service — SLA Reference

**User Story:** As a paying customer, I want a service level commitment, so that I have a clear expectation of uptime.

#### Acceptance Criteria

1. THE Terms_of_Service SHALL state a target monthly uptime of 99.9%
2. THE Terms_of_Service SHALL reference a public status page where service availability can be monitored

### Requirement 18: Public Security Page

**User Story:** As a prospective customer or enterprise buyer, I want a public security page describing Requo's security posture, so that I can evaluate trust and compliance before adopting the platform.

#### Acceptance Criteria

1. THE Requo application SHALL serve a public page at /security describing its security posture
2. THE Security_Page SHALL cover: encryption (TLS 1.3 in transit, AES-256 at rest via Supabase), authentication methods (email verification, OAuth, magic links, MFA roadmap), access control (role-based, business-scoped isolation), infrastructure (Vercel hosting, Supabase Singapore), compliance alignment (Data Privacy Act of the Philippines, GDPR-aligned practices), security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options), and responsible disclosure contact
3. THE Security_Page SHALL link to the vulnerability disclosure policy

### Requirement 19: Subprocessors Page

**User Story:** As a data protection officer or enterprise buyer, I want a list of all subprocessors with their purpose and data locations, so that I can assess third-party data risk.

#### Acceptance Criteria

1. THE Requo application SHALL serve a public page at /subprocessors listing all subprocessors
2. THE Subprocessors_Page SHALL display for each subprocessor: company name, purpose, data location, and a link to their privacy policy or DPA
3. THE Subprocessors_Page SHALL include: Groq, Cerebras, Google (Gemini), OpenRouter, Mistral, Cloudflare, NVIDIA, Polar, Resend, Supabase, and Vercel

### Requirement 20: Vulnerability Disclosure Policy

**User Story:** As a security researcher, I want a clear vulnerability disclosure policy, so that I can report security issues safely and know what to expect.

#### Acceptance Criteria

1. THE Requo application SHALL publish a vulnerability disclosure policy accessible from /security or linked from Security_Txt
2. THE vulnerability disclosure policy SHALL include: security@requo.app contact, scope of eligible targets, safe harbor language protecting good-faith reporters, and a response timeframe of 5 business days for acknowledgment

### Requirement 21: Security.txt File

**User Story:** As a security researcher, I want a machine-readable security.txt at the standard well-known path, so that automated tools and researchers can find Requo's security contact.

#### Acceptance Criteria

1. THE Requo application SHALL serve a response at /.well-known/security.txt conforming to RFC 9116
2. THE Security_Txt SHALL contain: Contact (security@requo.app), Expires (a date no more than 1 year in the future), Preferred-Languages (en), and Policy (link to the vulnerability disclosure policy)

### Requirement 22: DPA Template Availability

**User Story:** As an enterprise customer or DPO, I want access to a Data Processing Agreement, so that I can formalize data processing terms with Requo.

#### Acceptance Criteria

1. THE Requo application SHALL make a DPA available on request via email or published at /legal/dpa
2. THE DPA SHALL include: Standard Contractual Clauses (Module 2: Controller-to-Processor), a technical and organizational measures annex, a subprocessor list reference, and designation of Requo as Processor for business customer data

### Requirement 23: Cookie Consent Banner for Public Pages

**User Story:** As a visitor from the EU, I want to be informed about cookie usage on public pages, so that Requo complies with the ePrivacy Directive transparency requirement.

#### Acceptance Criteria

1. WHEN a visitor accesses a public-facing page (inquiry form or quote page), THE Requo application SHALL display a dismissible cookie notice
2. THE Cookie_Banner SHALL state: "We use essential cookies for security and session management. See our Privacy Policy."
3. THE Cookie_Banner SHALL link to the Privacy Policy
4. WHEN the visitor dismisses the Cookie_Banner, THE Requo application SHALL not display the banner again for that browser session or for a reasonable duration

### Requirement 24: Data Export Feature

**User Story:** As a business owner, I want to export all my business data in a portable format, so that I can exercise my data portability rights under GDPR Article 20.

#### Acceptance Criteria

1. THE Requo application SHALL provide a data export feature accessible from Account or Business settings
2. WHEN a business owner initiates a data export, THE Data_Export feature SHALL generate a downloadable archive containing inquiries, quotes, contacts, and files associated with the business within 60 seconds for exports up to 500 MB
3. IF the data export generation fails or times out, THEN THE Data_Export feature SHALL display an error message indicating the failure reason and allow the business owner to retry the export without data loss
4. WHEN a business owner selects a data export format, THE Data_Export feature SHALL generate structured data in either JSON or CSV format as chosen by the business owner
5. THE Data_Export feature SHALL include uploaded files in their original format within the export archive
6. IF the export archive exceeds 2 GB in total size, THEN THE Data_Export feature SHALL split the archive into multiple downloadable parts of no more than 2 GB each
7. WHEN the data export archive is ready, THE Data_Export feature SHALL make the download link available for at least 72 hours before expiration

### Requirement 25: Mistral Data Training Disclosure

**User Story:** As a privacy-conscious user, I want clarity on whether Mistral uses my data for training, so that I can make informed decisions about using AI features.

#### Acceptance Criteria

1. THE Privacy_Policy SHALL disclose that Mistral is included in the AI provider fallback chain
2. THE Privacy_Policy SHALL state that Mistral API (La Plateforme) data is not used for model training per Mistral's documentation
3. THE Privacy_Policy SHALL distinguish between Mistral's API service (no training on data) and Mistral's consumer chat product (which may use data for training)
