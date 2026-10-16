import { describe, expect, it } from "vitest";
import { documentHtml, markdownToHtml } from "./markdown";

describe("markdownToHtml", () => {
  it("renders headings, lists, paragraphs, a rule and a fence, escaping what it must", () => {
    const html = markdownToHtml("## Answer\n\nUse `x < y` & **bold** with *em* and [a link](https://example.com) or https://bare.example.\n\n- one\n- two\n\n1. first\n2) second\n\n---\n\n```\nlet a = <b>;\n```");
    expect(html).toBe(
      '<h2>Answer</h2>\n<p>Use <code>x &lt; y</code> &amp; <strong>bold</strong> with <em>em</em> and <a href="https://example.com">a link</a> or <a href="https://bare.example">https://bare.example</a>.</p>\n<ul><li>one</li><li>two</li></ul>\n<ol><li>first</li><li>second</li></ol>\n<hr>\n<pre><code>let a = &lt;b&gt;;</code></pre>',
    );
  });

  it("joins wrapped lines into one paragraph and starts a new one at a blank line", () => {
    expect(markdownToHtml("a\nb\n\nc")).toBe("<p>a b</p>\n<p>c</p>");
  });

  it("wraps the page with the title as its heading and no external resources", () => {
    const page = documentHtml("Notes <1>", "body");
    expect(page).toContain("<title>Notes &lt;1&gt;</title>");
    expect(page).toContain("<h1>Notes &lt;1&gt;</h1>");
    expect(page).not.toMatch(/src=|href="http[^"]*\.css/);
  });
});
