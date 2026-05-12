/**
 * DOM stubs needed to run Radix-driven component tests under jsdom.
 *
 * Extracted from `tests/setup.ts` so the unit and component test setup can
 * compose env, DOM stubs, and the fetch guard explicitly. Behavior is
 * identical to the original inline stubs.
 */
export function installDomStubs(): void {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Also mock PointerEvent since it's sometimes needed for Radix UI components
  if (typeof global.PointerEvent === 'undefined') {
    class PointerEvent extends MouseEvent {
      public pointerId: number;
      public pointerType: string;
      public isPrimary: boolean;

      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 0;
        this.pointerType = params.pointerType ?? '';
        this.isPrimary = params.isPrimary ?? false;
      }
    }
    global.PointerEvent = PointerEvent as unknown as typeof global.PointerEvent;
  }

  // Mock window.HTMLElement.prototype.scrollIntoView
  window.HTMLElement.prototype.scrollIntoView = function () {};

  if (typeof window.matchMedia === 'undefined') {
    window.matchMedia = (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: function () {},
      removeListener: function () {},
      addEventListener: function () {},
      removeEventListener: function () {},
      dispatchEvent: () => false,
    });
  }
}
