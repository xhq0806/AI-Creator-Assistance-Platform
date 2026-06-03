import "@testing-library/jest-dom";

// Mock window.matchMedia for Ant Design components
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock getComputedStyle for Ant Design
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
  const style = originalGetComputedStyle(elt, pseudoElt);
  // Return style as-is for tests
  return style;
};

// Suppress console errors in tests for known patterns
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const msg = String(args[0] || "");
  if (
    msg.includes("ReactDOMTestUtils.act") ||
    msg.includes("not wrapped in act")
  ) {
    return;
  }
  originalError.call(console, ...args);
};
