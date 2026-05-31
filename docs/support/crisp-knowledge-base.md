# Requo Support Knowledge Base

## Product Overview

Requo is a workflow management platform for service businesses that handle inbound inquiries and custom quotes. The core workflow is:

1. **Capture inquiries** from potential customers
2. **Qualify and organize** inquiries
3. **Create and send professional quotes**
4. **Track quote status** (viewed, accepted, rejected, expired)
5. **Convert accepted quotes to jobs**
6. **Invoice completed work**
7. **Automate repetitive tasks** through workflow automation

## Target Users

- Service business owners (contractors, consultants, agencies, freelancers)
- Small to medium service businesses
- Businesses that need custom quotes for each project
- Owner-led businesses managing inquiries, quotes, and follow-ups

## Key Features

### Inquiry Management
- Capture inquiries through public forms
- Qualify and categorize incoming requests
- Duplicate detection to prevent redundant work
- Organize inquiries by status and priority
- AI-assisted inquiry qualification

### Quote Creation & Management
- Create professional, branded quotes
- Line items with descriptions, quantities, and pricing
- Optional sections and terms
- Quote templates for common services
- AI-assisted quote generation from inquiry details
- Multiple quote versions and revisions
- Quote expiration dates

### Quote Sharing & Tracking
- Public quote pages with unique URLs
- Email delivery with professional templates
- Real-time view tracking and analytics
- Accept/reject responses from customers
- Quote status: draft, sent, viewed, accepted, rejected, expired, voided

### Jobs & Invoicing
- Convert accepted quotes to jobs automatically
- Track job progress and completion
- Generate invoices from jobs
- Invoice PDF generation and email delivery
- Payment tracking

### Follow-ups & Reminders
- Manual and automated follow-up scheduling
- Reminder notifications for pending quotes
- Follow-up task management
- Customizable follow-up timing

### Workflow Automation
- Event-driven automation rules
- Visual workflow builder for advanced users
- Automation triggers: inquiry received, quote sent, quote viewed, quote accepted, job created, invoice sent, etc.
- Automation actions: create follow-up, send notification, update status, generate draft, etc.
- Business-scoped automation templates
- Enable/disable automations per business

### Multi-Business Support
- Manage multiple businesses from one account
- Business-scoped data and settings
- Separate branding per business
- Business member invitations and permissions

### AI Assistant
- Context-aware AI chat in the dashboard
- Quote generation from inquiry details
- Draft suggestions for emails and responses
- Knowledge file integration for business-specific context
- Multiple AI provider fallback for reliability

### Analytics & Insights
- Quote conversion rates
- Response time tracking
- View and engagement analytics
- Revenue tracking
- Workflow performance metrics

### Notifications
- Real-time dashboard notifications
- Email notifications for key events
- Web push notifications (optional)
- Notification preferences per business

## Plans & Pricing

### Free Plan
- 1 business
- 10 quotes per month
- Basic features
- Email support

### Pro Plan
- 3 businesses
- 100 quotes per month
- Advanced features
- Priority support
- Workflow automation
- AI assistant access

### Business Plan
- Unlimited businesses
- Unlimited quotes
- All features
- Priority support
- Advanced analytics
- Custom branding
- API access (coming soon)

Plans available in monthly and yearly billing (yearly saves 20%).

## Common Questions

### Getting Started

**Q: How do I create my first business?**
A: After signing up, you'll be guided through onboarding to create your first business. Choose a business type template (or start from scratch), set your business name and slug, and configure basic settings.

**Q: What's a business slug?**
A: A slug is the URL-friendly identifier for your business (e.g., `brightside-print-studio`). It's used in your public inquiry form and quote URLs: `requo.app/b/your-slug`

**Q: Can I change my business slug later?**
A: Yes, you can change it in business settings, but existing public links will break. Update any shared links after changing.

### Inquiries

**Q: How do customers submit inquiries?**
A: Share your public inquiry form URL: `requo.app/b/your-business-slug/inquire`. You can also embed this form on your website or link to it from your email signature.

**Q: What happens when an inquiry comes in?**
A: New inquiries appear in your dashboard. You'll receive a notification (if enabled) and can qualify, respond, or convert them to quotes.

**Q: Can I customize the inquiry form?**
A: Yes, in business settings you can customize form fields, add custom questions, and configure required fields.

**Q: How does duplicate detection work?**
A: Requo checks email addresses and inquiry content to flag potential duplicates, helping you avoid redundant work.

### Quotes

**Q: How do I create a quote?**
A: From an inquiry, click "Create Quote" or go to Quotes → New Quote. Add line items, set pricing, configure terms, and save as draft or send immediately.

**Q: Can I use AI to generate quotes?**
A: Yes, the AI assistant can draft quotes based on inquiry details and your business context. Review and edit before sending.

**Q: How do I send a quote?**
A: Click "Send Quote" from the quote detail page. Choose email delivery (sent from your configured email domain) or copy the public quote link to share manually.

**Q: Can customers accept quotes online?**
A: Yes, public quote pages have "Accept" and "Decline" buttons. Customers can add comments when responding.

**Q: What happens when a quote is accepted?**
A: The quote status changes to "accepted" and you can convert it to a job. If you have automation enabled, this can happen automatically.

**Q: Can I edit a quote after sending?**
A: You can create a new version/revision. The original sent quote remains unchanged for customer reference.

**Q: How do quote expirations work?**
A: Set an expiration date when creating a quote. After that date, the quote status changes to "expired" and customers can no longer accept it online.

**Q: Can I void a quote?**
A: Yes, use the "Void Quote" action. Voided quotes cannot be accepted and are marked as canceled.

### Jobs & Invoices

**Q: How do I create a job from an accepted quote?**
A: Click "Convert to Job" on an accepted quote. Job details are pre-filled from the quote.

**Q: Can I invoice before a job is complete?**
A: Yes, you can create invoices at any job stage. Common patterns: deposit invoice upfront, final invoice on completion, or milestone invoicing.

**Q: How do I send an invoice?**
A: From the invoice detail page, click "Send Invoice". A PDF is generated and emailed to the customer.

**Q: Can customers pay invoices online?**
A: Payment processing integration is coming soon. Currently, invoices include your payment instructions.

### Workflow Automation

**Q: What can I automate?**
A: Common automations: auto-create follow-ups when quotes are sent, notify team when quotes are accepted, auto-convert accepted quotes to jobs, send reminders for pending quotes.

**Q: How do I set up automation?**
A: Go to Settings → Automations. Choose from templates or create custom rules. Each rule has a trigger (event) and action (what happens).

**Q: Can I disable automations temporarily?**
A: Yes, toggle any automation on/off without deleting it.

**Q: What's the visual workflow builder?**
A: An advanced drag-and-drop interface for creating multi-step workflows with conditions and branching logic. Available on Pro and Business plans.

### Multi-Business

**Q: How do I add another business?**
A: Click your profile menu → "Businesses" → "Add Business". Each business has separate data, settings, and branding.

**Q: Can I invite team members?**
A: Yes, go to Settings → Members and send invitations. Members can access the business dashboard based on their permissions.

**Q: How do I switch between businesses?**
A: Use the business switcher in the top navigation or press `Cmd/Ctrl + K` and type the business name.

### AI Assistant

**Q: What can the AI assistant help with?**
A: Quote generation, email drafting, inquiry qualification, response suggestions, and answering questions about your business data.

**Q: How does the AI know about my business?**
A: It has access to your inquiries, quotes, jobs, and any knowledge files you upload. It uses this context to provide relevant suggestions.

**Q: Can I upload documents for the AI to reference?**
A: Yes, upload knowledge files (PDFs, docs) in Settings → Knowledge. The AI will reference these when generating quotes and responses.

**Q: Is my data used to train AI models?**
A: No. Your data is only used for your requests and is not shared with AI providers for training.

### Billing & Subscriptions

**Q: How do I upgrade my plan?**
A: Go to Settings → Billing → "Upgrade Plan". Choose your plan and complete checkout.

**Q: Can I change plans anytime?**
A: Yes, upgrade or downgrade anytime. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period.

**Q: What happens if I exceed my plan limits?**
A: You'll be prompted to upgrade. On the Free plan, you can't create more quotes after hitting the limit until the next month or upgrading.

**Q: Do you offer refunds?**
A: Yes, see our refund policy at requo.app/refund-policy. Generally, we offer prorated refunds within 30 days.

**Q: Can I cancel anytime?**
A: Yes, cancel from Settings → Billing. You'll retain access until the end of your paid period.

### Account & Security

**Q: How do I reset my password?**
A: Click "Forgot Password" on the login page. You'll receive a reset link via email.

**Q: Can I use Google sign-in?**
A: Yes, if enabled by your instance. Click "Continue with Google" on the login page.

**Q: Is my data secure?**
A: Yes. We use industry-standard encryption, secure authentication, and regular security audits. See requo.app/security for details.

**Q: Can I export my data?**
A: Data export is coming soon. Contact support if you need your data urgently.

**Q: How do I delete my account?**
A: Contact support to request account deletion. This is permanent and cannot be undone.

### Technical Issues

**Q: The app is loading slowly**
A: Try refreshing the page. If issues persist, check your internet connection or contact support.

**Q: I'm not receiving email notifications**
A: Check your spam folder and notification settings in Settings → Notifications. Ensure your email address is verified.

**Q: Public quote links aren't working**
A: Verify the quote status is "sent" (not draft or voided) and the link is complete. Contact support if issues persist.

**Q: I can't upload files**
A: Check file size (max 10MB) and format. Supported formats: PDF, DOCX, TXT, images. Clear browser cache if issues persist.

**Q: The AI assistant isn't responding**
A: AI services may be temporarily unavailable. Try again in a few moments. If issues persist, contact support.

## Support Resources

- **Documentation**: docs.requo.app (coming soon)
- **Email Support**: support@requo.app
- **Status Page**: status.requo.app (coming soon)
- **Feature Requests**: Use the feedback widget in the dashboard

## Escalation Guidelines

Escalate to engineering for:
- Data loss or corruption
- Security concerns
- Billing errors
- Critical bugs affecting multiple users
- Integration failures

Escalate to product for:
- Feature requests with strong business cases
- UX issues affecting core workflows
- Plan/pricing questions

## Common Troubleshooting Steps

1. **Refresh the page** - Clears temporary state issues
2. **Clear browser cache** - Resolves stale data problems
3. **Try incognito/private mode** - Isolates extension conflicts
4. **Check browser console** - Look for error messages (F12)
5. **Verify account status** - Ensure subscription is active
6. **Check notification settings** - Confirm preferences are correct
7. **Test in different browser** - Rules out browser-specific issues

## Response Templates

### Inquiry Form Not Working
"I'd be happy to help with your inquiry form. Can you share:
1. Your business slug or inquiry form URL
2. What happens when you try to submit (error message, blank page, etc.)
3. Browser and device you're using

In the meantime, try accessing the form in an incognito/private window to rule out browser extension conflicts."

### Quote Not Sending
"Let's troubleshoot your quote sending issue:
1. Verify the quote status is 'draft' (not already sent)
2. Check that you have a verified email domain configured in Settings → Email
3. Ensure the customer email address is valid
4. Check your email quota hasn't been exceeded

If you're still having trouble, I can check the logs on our end. What's the quote ID or customer name?"

### Upgrade/Billing Question
"I can help with your plan upgrade. Our plans are:
- **Pro**: 3 businesses, 100 quotes/month, automation, AI assistant
- **Business**: Unlimited businesses and quotes, all features

You can upgrade anytime from Settings → Billing. Upgrades take effect immediately and you'll only pay the prorated difference for the current period.

Would you like help choosing the right plan for your needs?"

### Feature Request
"Thanks for the suggestion! I'll pass this to our product team. Can you share a bit more about your use case? Understanding how you'd use this feature helps us prioritize and design it well.

In the meantime, here's a potential workaround: [suggest alternative if available]"

## Product Roadmap (Public)

Coming soon:
- Online payment processing
- Data export
- API access
- Mobile app
- Advanced reporting
- Custom fields
- Email templates
- Calendar integration
- Zapier integration

## Internal Notes

- Database: Supabase PostgreSQL
- Auth: Better Auth (not Supabase Auth)
- Email: Resend (primary), Mailtrap/Brevo (fallback)
- AI: Multi-provider routing (Groq, Cerebras, Gemini, Mistral, etc.)
- Billing: Polar (merchant of record, multi-currency)
- Hosting: Vercel
- Background jobs: Inngest

Business data is strictly scoped - users can only access their own businesses. All mutations validate business membership server-side.
