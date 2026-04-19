import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuoteStatusBadge } from '@/features/quotes/components/quote-status-badge';

describe('QuoteStatusBadge', () => {
  it('renders a draft badge', () => {
    render(<QuoteStatusBadge status="draft" />);
    const badge = screen.getByText('Draft');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.inline-flex')).toHaveClass('text-indigo-700'); // Check a known class from utils
  });

  it('renders a sent badge', () => {
    render(<QuoteStatusBadge status="sent" />);
    const badge = screen.getByText('Sent');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.inline-flex')).toHaveClass('text-cyan-700');
  });

  it('renders an accepted badge', () => {
    render(<QuoteStatusBadge status="accepted" />);
    const badge = screen.getByText('Accepted');
    expect(badge).toBeInTheDocument();
  });

  it('renders a rejected badge', () => {
    render(<QuoteStatusBadge status="rejected" />);
    const badge = screen.getByText('Rejected');
    expect(badge).toBeInTheDocument();
  });

  it('renders a voided badge', () => {
    render(<QuoteStatusBadge status="voided" />);
    const badge = screen.getByText('Voided');
    expect(badge).toBeInTheDocument();
  });

  it('allows custom className injection', () => {
    render(<QuoteStatusBadge status="draft" className="my-custom-class" />);
    const badge = screen.getByText('Draft');
    expect(badge.closest('.inline-flex')).toHaveClass('my-custom-class');
  });
});
