import { render, screen } from "@testing-library/react";
import RichText from "@/components/RichText";

describe("RichText", () => {
  it("renders plain text as a paragraph", () => {
    render(<RichText content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders bold text with strong tag", () => {
    render(<RichText content="This is **bold** text" />);
    const strong = screen.getByText("bold");
    expect(strong.tagName).toBe("STRONG");
  });

  it("renders italic text with em tag", () => {
    render(<RichText content="This is *italic* text" />);
    const em = screen.getByText("italic");
    expect(em.tagName).toBe("EM");
  });

  it("renders inline code", () => {
    render(<RichText content="Use `const x = 1` here" />);
    const code = screen.getByText("const x = 1");
    expect(code.tagName).toBe("CODE");
  });

  it("renders headings at correct levels", () => {
    render(<RichText content="# H1\n## H2\n### H3" />);
    const h1 = screen.getByText("H1");
    const h2 = screen.getByText("H2");
    const h3 = screen.getByText("H3");
    expect(h1.tagName).toBe("H1");
    expect(h2.tagName).toBe("H2");
    expect(h3.tagName).toBe("H3");
  });

  it("renders unordered lists", () => {
    render(<RichText content="- Item 1\n- Item 2" />);
    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(2);
    expect(listItems[0]).toHaveTextContent("Item 1");
  });

  it("renders ordered lists", () => {
    render(<RichText content="1. First\n2. Second" />);
    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(2);
  });

  it("renders blockquotes", () => {
    render(<RichText content="> A quoted line" />);
    const blockquote = screen.getByText("A quoted line");
    expect(blockquote.tagName).toBe("BLOCKQUOTE");
  });

  it("renders horizontal rules", () => {
    const { container } = render(<RichText content="Before\n---\nAfter" />);
    const hr = container.querySelector("hr");
    expect(hr).toBeInTheDocument();
  });

  it("renders code blocks", () => {
    render(<RichText content="```\nconst a = 1;\nconst b = 2;\n```" />);
    const code = screen.getByText(/const a = 1;\nconst b = 2/);
    expect(code.tagName).toBe("CODE");
  });

  it("renders links", () => {
    render(<RichText content="Visit [example](https://example.com)" />);
    const link = screen.getByText("example");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("renders images from markdown", () => {
    render(<RichText content="![alt text](https://example.com/img.jpg)" />);
    const img = screen.getByAltText("alt text");
    expect(img.tagName).toBe("IMG");
    expect(img).toHaveAttribute("src", "https://example.com/img.jpg");
  });

  it("escapes HTML tags in text", () => {
    render(<RichText content="<script>alert('xss')</script>" />);
    expect(screen.queryByText("alert")).toBeNull();
    expect(screen.getByText(/&lt;script&gt;/)).toBeInTheDocument();
  });

  it("handles empty content", () => {
    const { container } = render(<RichText content="" />);
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("renders multi-paragraph content", () => {
    render(<RichText content="First paragraph\n\nSecond paragraph" />);
    const elements = screen.getAllByText(/paragraph/);
    expect(elements).toHaveLength(2);
  });
});
