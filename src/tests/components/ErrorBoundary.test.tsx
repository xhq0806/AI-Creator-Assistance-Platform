import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary, getStoredErrors } from "@/components/ErrorBoundary";

// Component that throws on render
function BrokenComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test render error");
  }
  return <div>All good</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Normal content")).toBeInTheDocument();
  });

  it("renders error UI when child throws", () => {
    // Suppress console.error for this test
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("页面渲染异常")).toBeInTheDocument();
    expect(screen.getByText("Test render error")).toBeInTheDocument();

    spy.mockRestore();
  });

  it("persists error to localStorage", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const errors = getStoredErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe("Test render error");

    spy.mockRestore();
  });

  it("provides retry and home buttons in error state", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("重试")).toBeInTheDocument();
    expect(screen.getByText("返回首页")).toBeInTheDocument();

    spy.mockRestore();
  });
});
