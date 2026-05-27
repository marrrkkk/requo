# Paywall & Feature Gating Audit

## Current Paywall Components

### 1. **LockedAction** (Button/Action Gating)
**Purpose**: Wraps interactive elements (buttons, links) that require a higher plan
**Behavior**:
- Shows disabled button with 50% opacity
- Tooltip on hover: "🔒 Requires [Plan] plan"
- Click opens popover with feature description + Upgrade button
- Touch-friendly (min 44px touch target)

**Current Usage**:
- ✅ Inquiry page customization buttons
- ✅ AI assistant intake mode toggle
- ✅ Invite team member button
- ✅ Create follow-up button
- ✅ Multiple inquiry form features

### 2. **PremiumContentBlur** (Content Block Gating)
**Purpose**: Gates entire content sections that contain premium data
**Behavior**:
- When locked: Shows upgrade card with lock icon, feature description, plan badge
- When unlocked: Renders children normally
- **CRITICAL**: Premium content NOT rendered in DOM when locked (security)

**Current Usage**:
- ✅ Analytics conversion charts
- ✅ Analytics workflow panels
- ✅ Analytics business section
- ✅ Analytics pro section

### 3. **FeaturePreviewPaywall** (Page-Level Gating)
**Purpose**: Gates entire pages/features with optional preview/demo content
**Behavior**:
- With preview: Shows demo content + "Demo data" badge + banner upgrade prompt
- Without preview: Shows empty-state upgrade prompt
- Never uses blur overlay

**Current Usage**:
- ✅ Workflow builder page
- ✅ Advanced analytics views

### 4. **UpgradePrompt** (Inline Upgrade CTA)
**Purpose**: Flexible upgrade messaging component
**Variants**:
- `inline`: CTA + description in flex row
- `card`: Wrapped in Card component
- `banner`: Full-width horizontal strip
- `empty-state`: Centered vertical with icon
- `modal`: Inside Dialog overlay

### 5. **UsageLimitBanner** (Quota Display)
**Purpose**: Shows usage progress bars with current/limit counts
**Behavior**: Progress bar + at-limit messaging

---

## All Gated Features (from entitlements.ts)

### Free Plan Features (Always Available)
- ✅ attachments
- ✅ customerHistory
- ✅ followUps
- ✅ aiAssistant
- ✅ automations
- ✅ knowledgeBase
- ✅ quoteLibrary

### Pro Plan Features (Requires Pro or Business)
- 🔒 analyticsConversion - "Performance analytics"
- 🔒 analyticsWorkflow - "Operations analytics"
- 🔒 multipleForms - "Multiple inquiry forms"
- 🔒 inquiryPageCustomization - "Inquiry page customization"
- 🔒 emailTemplates - "Email templates"
- 🔒 exports - "Data exports"
- 🔒 removeWatermark - "Remove Requo watermark"
- 🔒 autoFollowUps - "Auto follow-ups"
- 🔒 workflowBuilder - "Visual workflow builder"

### Business Plan Features (Requires Business)
- 🔒 members - "Team members"

---

## Current Paywall Locations

### Pages with Full Paywall
1. **Analytics Dashboard** (`/analytics`)
   - Uses `PremiumContentBlur` for conversion charts
   - Uses `PremiumContentBlur` for workflow panels
   - Uses `PremiumContentBlur` for business section

2. **Workflow Builder** (`/automations/[id]/builder`)
   - Uses `FeaturePreviewPaywall` for entire builder interface

### Buttons/Actions with LockedAction
1. **Follow-ups page** - Create follow-up button
2. **Members page** - Invite member button
3. **Inquiry forms settings** - Multiple form features
4. **Inquiry page customization** - Layout/content/cards editing
5. **AI intake mode** - Smart intake toggle

### Settings Pages (Potential Gating Needed)
- ❓ Email templates settings
- ❓ Multiple forms management
- ❓ Export buttons (currently in command menu)
- ❓ Watermark removal settings
- ❓ Auto follow-up settings

---

## Missing/Inconsistent Gating

### 1. **Command Menu Export Actions**
**Current**: Shows "Pro" badge but allows click (shows toast)
**Should**: Use disabled state with tooltip

### 2. **Members Navigation Item**
**Current**: Always visible in sidebar (just added)
**Should**: Either gate the page content or show upgrade prompt on page

### 3. **Email Templates Settings**
**Status**: Unknown if gated
**Should**: Gate template editing UI

### 4. **Multiple Forms**
**Current**: Some gating in forms manager
**Should**: Audit for consistency

### 5. **Watermark Removal**
**Status**: Unknown where this is controlled
**Should**: Find and gate

### 6. **Auto Follow-ups**
**Status**: Unknown if gated
**Should**: Gate auto-send features

---

## Proposed Unified System

### For Buttons/Actions
```tsx
<LockedAction 
  feature="members" 
  plan={plan}
  upgradeAction={upgradeProps}
>
  <Button>Invite Member</Button>
</LockedAction>
```
**Behavior**:
- Disabled button with 50% opacity
- Tooltip: "Requires [Plan] plan"
- Click opens upgrade popover

### For Page Blocks
```tsx
<PremiumContentBlur
  feature="analyticsConversion"
  plan={plan}
  upgradeAction={upgradeProps}
>
  {/* Premium content */}
</PremiumContentBlur>
```
**Behavior**:
- Shows upgrade card with:
  - Lock icon
  - Feature name + plan badge
  - Description
  - "Upgrade Plan" button

### For Full Pages
```tsx
<FeaturePreviewPaywall
  feature="workflowBuilder"
  plan={plan}
  upgradeAction={upgradeProps}
  previewContent={<DemoBuilder />} // optional
>
  {/* Real content */}
</FeaturePreviewPaywall>
```
**Behavior**:
- With preview: Demo + "Demo data" badge + banner
- Without preview: Empty state with upgrade prompt

---

## Recommendations

### 1. **Standardize Button Gating**
- ✅ Already using `LockedAction` consistently
- ❌ Command menu exports need migration

### 2. **Audit All Settings Pages**
Check each settings page for proper gating:
- [ ] Email templates
- [ ] Multiple forms
- [ ] Watermark settings
- [ ] Auto follow-up settings
- [ ] Knowledge base (if limits apply)
- [ ] Pricing library (if limits apply)

### 3. **Members Page Strategy**
Options:
- A) Gate entire page with `FeaturePreviewPaywall`
- B) Show page but gate invite button (current)
- C) Show page with upgrade banner at top

### 4. **Command Menu Consistency**
Replace toast-based gating with:
```tsx
<LockedAction feature="exports" plan={plan}>
  <CommandItem>Download quotes (CSV)</CommandItem>
</LockedAction>
```

### 5. **Navigation Item Badges**
Consider adding plan badges to sidebar items:
```tsx
<SidebarMenuItem>
  Members
  {!hasAccess && <PlanBadge plan="business" />}
</SidebarMenuItem>
```

---

## Feature Gating Checklist

### High Priority
- [ ] Command menu export actions
- [ ] Members page content
- [ ] Email templates settings
- [ ] Auto follow-up settings
- [ ] Watermark removal settings

### Medium Priority
- [ ] Multiple forms UI consistency
- [ ] Knowledge base limits
- [ ] Pricing library limits
- [ ] Attachment size limits

### Low Priority
- [ ] Navigation item badges
- [ ] Empty state improvements
- [ ] Upgrade flow optimization

---

## Design Tokens

Current paywall UI uses:
- Border: `border-border/70`
- Background: `bg-card/50` or `bg-muted/40`
- Radius: `rounded-xl`
- Lock icon: `text-muted-foreground`
- Plan badges: `variant="secondary"`
- Disabled opacity: `opacity-50`
- Touch targets: `min-h-11 min-w-11` (44px)

