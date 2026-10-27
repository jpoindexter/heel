import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NoticeSettings } from "./NoticeSettings";

describe("NoticeSettings", () => {
  it("shows the switch as its owner says, so the group row and the switch can never disagree", () => {
    expect(renderToStaticMarkup(<NoticeSettings on={false} onChange={() => undefined} />)).toContain('aria-checked="false"');
    expect(renderToStaticMarkup(<NoticeSettings on onChange={() => undefined} />)).toContain('aria-checked="true"');
  });
});
