import { describe, it, expect } from 'vitest';
import {
  planFeatures,
  type PlanFeature,
  hasFeatureAccess,
  getRequiredPlan,
  planFeatureLabels,
  planFeatureDescriptions,
} from '@/lib/plans/entitlements';

describe('lib/plans/entitlements', () => {
  describe('planFeatures', () => {
    it('contains all defined features', () => {
      expect(planFeatures).toContain('analyticsConversion');
      expect(planFeatures).toContain('analyticsWorkflow');
      expect(planFeatures).toContain('multipleForms');
      expect(planFeatures).toContain('inquiryPageCustomization');
      expect(planFeatures).toContain('attachments');
      expect(planFeatures).toContain('replySnippets');
      expect(planFeatures).toContain('quoteLibrary');
      expect(planFeatures).toContain('knowledgeBase');
      expect(planFeatures).toContain('aiAssistant');
      expect(planFeatures).toContain('members');
      expect(planFeatures).toContain('exports');
      expect(planFeatures).toContain('branding');
      expect(planFeatures).toContain('multiBusiness');
    });

    it('has expected count of features', () => {
      expect(planFeatures.length).toBe(13);
    });
  });

  describe('hasFeatureAccess', () => {
    describe('free plan', () => {
      it('has no access to any feature', () => {
        planFeatures.forEach((feature) => {
          expect(hasFeatureAccess('free', feature)).toBe(false);
        });
      });
    });

    describe('pro plan', () => {
      it('has access to most features but not members', () => {
        planFeatures.forEach((feature) => {
          if (feature === 'members') {
            expect(hasFeatureAccess('pro', 'members')).toBe(false);
          } else {
            expect(hasFeatureAccess('pro', feature)).toBe(true);
          }
        });
      });
    });

    describe('business plan', () => {
      it('has access to all features including members', () => {
        planFeatures.forEach((feature) => {
          expect(hasFeatureAccess('business', feature)).toBe(true);
        });
      });
    });
  });

  describe('getRequiredPlan', () => {
    it('analyticsConversion requires pro', () => {
      expect(getRequiredPlan('analyticsConversion')).toBe('pro');
    });

    it('analyticsWorkflow requires pro', () => {
      expect(getRequiredPlan('analyticsWorkflow')).toBe('pro');
    });

    it('multipleForms requires pro', () => {
      expect(getRequiredPlan('multipleForms')).toBe('pro');
    });

    it('inquiryPageCustomization requires pro', () => {
      expect(getRequiredPlan('inquiryPageCustomization')).toBe('pro');
    });

    it('attachments requires pro', () => {
      expect(getRequiredPlan('attachments')).toBe('pro');
    });

    it('replySnippets requires pro', () => {
      expect(getRequiredPlan('replySnippets')).toBe('pro');
    });

    it('quoteLibrary requires pro', () => {
      expect(getRequiredPlan('quoteLibrary')).toBe('pro');
    });

    it('knowledgeBase requires pro', () => {
      expect(getRequiredPlan('knowledgeBase')).toBe('pro');
    });

    it('aiAssistant requires pro', () => {
      expect(getRequiredPlan('aiAssistant')).toBe('pro');
    });

    it('members requires business', () => {
      expect(getRequiredPlan('members')).toBe('business');
    });

    it('exports requires pro', () => {
      expect(getRequiredPlan('exports')).toBe('pro');
    });

    it('branding requires pro', () => {
      expect(getRequiredPlan('branding')).toBe('pro');
    });

    it('multiBusiness requires pro', () => {
      expect(getRequiredPlan('multiBusiness')).toBe('pro');
    });
  });

  describe('planFeatureLabels', () => {
    it('has labels for all features', () => {
      planFeatures.forEach((feature) => {
        expect(planFeatureLabels[feature]).toBeDefined();
        expect(typeof planFeatureLabels[feature]).toBe('string');
        expect(planFeatureLabels[feature].length).toBeGreaterThan(0);
      });
    });

    it('analyticsConversion has correct label', () => {
      expect(planFeatureLabels.analyticsConversion).toBe('Conversion analytics');
    });

    it('knowledgeBase has correct label', () => {
      expect(planFeatureLabels.knowledgeBase).toBe('Knowledge');
    });

    it('multiBusiness has correct label', () => {
      expect(planFeatureLabels.multiBusiness).toBe('Multiple businesses');
    });
  });

  describe('planFeatureDescriptions', () => {
    it('has descriptions for all features', () => {
      planFeatures.forEach((feature) => {
        expect(planFeatureDescriptions[feature]).toBeDefined();
        expect(typeof planFeatureDescriptions[feature]).toBe('string');
        expect(planFeatureDescriptions[feature].length).toBeGreaterThan(0);
      });
    });

    it('analyticsConversion has descriptive text', () => {
      expect(planFeatureDescriptions.analyticsConversion).toContain('inquiries');
      expect(planFeatureDescriptions.analyticsConversion).toContain('quotes');
    });

    it('members describes team functionality', () => {
      expect(planFeatureDescriptions.members).toContain('team');
    });

    it('knowledgeBase describes AI assistant', () => {
      expect(planFeatureDescriptions.knowledgeBase).toContain('AI');
    });
  });
});