import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  UpgradeBadge,
  PlanBadge,
  LockedFeatureCard,
  LockedFeatureOverlay,
  LockedFeaturePage,
  UsageLimitBanner,
} from '@/components/shared/paywall';

describe('Paywall Components', () => {
  describe('UpgradeBadge', () => {
    it('renders Free badge', () => {
      render(<UpgradeBadge plan="free" />);
      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    it('renders Pro badge', () => {
      render(<UpgradeBadge plan="pro" />);
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    it('renders Business badge', () => {
      render(<UpgradeBadge plan="business" />);
      expect(screen.getByText('Business')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<UpgradeBadge plan="pro" className="custom-badge" />);
      const badge = screen.getByText('Pro').closest('[data-slot="badge"]');
      expect(badge).toHaveClass('custom-badge');
    });
  });

  describe('PlanBadge', () => {
    it('renders Free badge with outline variant for free plan', () => {
      render(<PlanBadge plan="free" />);
      const badge = screen.getByText('Free');
      expect(badge).toBeInTheDocument();
    });

    it('renders Pro badge', () => {
      render(<PlanBadge plan="pro" />);
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    it('renders Business badge', () => {
      render(<PlanBadge plan="business" />);
      expect(screen.getByText('Business')).toBeInTheDocument();
    });
  });

  describe('LockedFeatureCard', () => {
    it('renders locked card when feature is not accessible', () => {
      render(
        <LockedFeatureCard
          feature="analyticsConversion"
          plan="free"
        />
      );

      expect(screen.getByText('Conversion analytics')).toBeInTheDocument();
      expect(screen.getByText('See how inquiries convert to quotes and acceptances.')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    it('returns null when feature is accessible', () => {
      const { container } = render(
        <LockedFeatureCard
          feature="analyticsConversion"
          plan="pro"
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders custom title when provided', () => {
      render(
        <LockedFeatureCard
          feature="analyticsConversion"
          plan="free"
          title="Custom Title"
        />
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('renders custom description when provided', () => {
      render(
        <LockedFeatureCard
          feature="analyticsConversion"
          plan="free"
          description="Custom description text"
        />
      );

      expect(screen.getByText('Custom description text')).toBeInTheDocument();
    });

    it('renders with lock icon', () => {
      render(
        <LockedFeatureCard
          feature="knowledgeBase"
          plan="free"
        />
      );

      expect(screen.getByText('Knowledge')).toBeInTheDocument();
    });

    it('renders upgrade button', () => {
      render(
        <LockedFeatureCard
          feature="replySnippets"
          plan="free"
        />
      );

      expect(screen.getByRole('button', { name: /Upgrade to Pro/i })).toBeInTheDocument();
    });
  });

  describe('LockedFeatureOverlay', () => {
    it('renders blurred content and lock overlay when feature is not accessible', () => {
      const { container } = render(
        <LockedFeatureOverlay
          feature="analyticsWorkflow"
          plan="free"
        >
          <div data-testid="content">Hidden Content</div>
        </LockedFeatureOverlay>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByText('Workflow analytics')).toBeInTheDocument();
    });

    it('renders children directly when feature is accessible', () => {
      const { container } = render(
        <LockedFeatureOverlay
          feature="analyticsWorkflow"
          plan="pro"
        >
          <div data-testid="content">Visible Content</div>
        </LockedFeatureOverlay>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="content"]')).toBeInTheDocument();
    });

    it('renders feature title and description', () => {
      render(
        <LockedFeatureOverlay
          feature="members"
          plan="free"
        >
          <div>Team Content</div>
        </LockedFeatureOverlay>
      );

      expect(screen.getByText('Team members')).toBeInTheDocument();
      expect(screen.getByText('Invite team members and assign roles.')).toBeInTheDocument();
    });

    it('renders custom title when provided', () => {
      render(
        <LockedFeatureOverlay
          feature="analyticsConversion"
          plan="free"
          title="Custom Feature Title"
        >
          <div>Content</div>
        </LockedFeatureOverlay>
      );

      expect(screen.getByText('Custom Feature Title')).toBeInTheDocument();
    });
  });

  describe('LockedFeaturePage', () => {
    it('renders locked page when feature is not accessible', () => {
      render(
        <LockedFeaturePage
          feature="knowledgeBase"
          plan="free"
        />
      );

      expect(screen.getByText('Knowledge')).toBeInTheDocument();
      expect(screen.getByText('Manage FAQs and knowledge files for your AI assistant.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Upgrade to Pro/i })).toBeInTheDocument();
    });

    it('returns null when feature is accessible', () => {
      const { container } = render(
        <LockedFeaturePage
          feature="knowledgeBase"
          plan="pro"
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders full page lock with lock icon', () => {
      render(
        <LockedFeaturePage
          feature="members"
          plan="free"
        />
      );

      expect(screen.getByText('Team members')).toBeInTheDocument();
      expect(screen.getByText('Invite team members and assign roles.')).toBeInTheDocument();
    });

    it('renders custom title when provided', () => {
      render(
        <LockedFeaturePage
          feature="analyticsConversion"
          plan="free"
          title="Custom Locked Page"
        />
      );

      expect(screen.getByText('Custom Locked Page')).toBeInTheDocument();
    });

    it('renders custom description when provided', () => {
      render(
        <LockedFeaturePage
          feature="analyticsConversion"
          plan="free"
          description="Custom locked description"
        />
      );

      expect(screen.getByText('Custom locked description')).toBeInTheDocument();
    });
  });

  describe('UsageLimitBanner', () => {
    it('renders usage progress when under limit', () => {
      render(
        <UsageLimitBanner
          label="Inquiries per month"
          current={50}
          limit={100}
          plan="free"
        />
      );

      expect(screen.getByText('Inquiries per month')).toBeInTheDocument();
      expect(screen.getByText('50 / 100')).toBeInTheDocument();
    });

    it('renders warning when at limit', () => {
      render(
        <UsageLimitBanner
          label="Inquiries per month"
          current={100}
          limit={100}
          plan="free"
        />
      );

      expect(screen.getByText(/You've reached this workspace's plan limit/)).toBeInTheDocument();
    });

    it('renders unlimited when no limit', () => {
      render(
        <UsageLimitBanner
          label="Inquiries per month"
          current={500}
          limit={null!}
          plan="pro"
        />
      );

      expect(screen.getByText('Inquiries per month')).toBeInTheDocument();
    });

    it('shows percentage progress', () => {
      render(
        <UsageLimitBanner
          label="Quotes per month"
          current={25}
          limit={50}
          plan="free"
        />
      );

      expect(screen.getByText('25 / 50')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <UsageLimitBanner
          label="Test limit"
          current={10}
          limit={100}
          plan="free"
          className="custom-banner"
        />
      );

      const banner = screen.getByText('Test limit').closest('div');
      expect(banner?.parentElement).toHaveClass('custom-banner');
    });
  });
});