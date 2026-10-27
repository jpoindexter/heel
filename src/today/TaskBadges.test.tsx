import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TaskDto } from "../../shared/api";
import type { Method } from "../../shared/method";
import { TaskBadges } from "./TaskBadges";

const task = (id: string, title: string): TaskDto => ({ id, title, status: "todo", nowStep: null, source: "manual", sourceRef: null, position: 0, createdAt: 0, updatedAt: 0, completedAt: null, size: "xl", bucket: null, estimateMin: null, parentId: null });
const tshirt: Method = { timer: "timebox", structure: "none", sizing: "tshirt" };
const noop = () => undefined;

describe("TaskBadges", () => {
  it("names Split it? after its row, so two big tasks are not two identical buttons", () => {
    const html = renderToStaticMarkup(
      <>
        <TaskBadges task={task("t1", "Book the van")} method={tshirt} onPatch={noop} onSplit={noop} />
        <TaskBadges task={task("t2", "Paint the hall")} method={tshirt} onPatch={noop} onSplit={noop} />
      </>,
    );
    expect(html).toContain('aria-label="Split it? Book the van"');
    expect(html).toContain('aria-label="Split it? Paint the hall"');
  });
});
