import { useEffect, useRef, type KeyboardEvent } from "react";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Button, Text, TextField } from "@radix-ui/themes";
import type { SearchHitDto } from "../../shared/api";
import "./search.css";
import { groupHits, hint } from "./search-model";
import type { useSearch } from "./useSearch";

type Props = {
  search: ReturnType<typeof useSearch>;
  /** The layer is on top: the box takes the keyboard. */
  active: boolean;
  onPick: (hit: SearchHitDto) => void;
  onAsk: (query: string) => void;
};

function Hit({ hit, active, onPick, onHover }: { hit: SearchHitDto; active: boolean; onPick: () => void; onHover: () => void }) {
  return (
    <li>
      <button type="button" className="search-hit" data-active={active || undefined} onClick={onPick} onPointerEnter={onHover}>
        <Text size="2" as="span" className="task-text clamp-2">{hit.text}</Text>
        {hit.detail && <Text size="1" color="gray" as="span" className="task-text clamp-1">{hit.detail}</Text>}
      </button>
    </li>
  );
}

/** A search that failed: what went wrong, and the same query again. Shown instead of "nothing holds", which it is not. */
function SearchError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="search-hint row" role="alert">
      <Text size="2" color="amber">{message}</Text>
      <Button size="1" variant="soft" radius="full" onClick={onRetry}>Try again</Button>
    </div>
  );
}

/** One box over everything: results as you type, grouped; ↑ ↓ and Enter need no mouse; Esc goes back; the query can go to Heel as a question. */
export function SearchLayer({ search, active, onPick, onAsk }: Props) {
  const { state, setQuery, move, setActive, refresh } = search;
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (active) box.current?.focus();
  }, [active]);
  const groups = groupHits(state.hits);
  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      const hit = state.hits[state.active];
      if (hit) onPick(hit);
      else if (state.query.trim()) onAsk(state.query.trim());
    }
  };
  return (
    <div className="search">
      <TextField.Root ref={box} size="2" value={state.query} placeholder="Find anything" aria-label="Find anything" onChange={(event) => setQuery(event.target.value)} onKeyDown={onKey}>
        <TextField.Slot>
          <MagnifyingGlassIcon aria-hidden="true" />
        </TextField.Slot>
      </TextField.Root>
      {state.error && <SearchError message={state.error} onRetry={refresh} />}
      {groups.length === 0 && !state.searching && !state.error && <Text size="2" color="gray" role="status" className="search-hint">{hint(state.query)}</Text>}
      <div className="search-results">
        {groups.map((group) => (
          <section key={group.kind} className="search-group" aria-label={group.label}>
            <Text size="1" weight="medium" color="gray" className="section-label">{group.label}</Text>
            <ul className="rows">
              {group.hits.map((hit) => {
                const index = state.hits.indexOf(hit);
                return <Hit key={`${hit.kind}-${hit.id}`} hit={hit} active={index === state.active} onPick={() => onPick(hit)} onHover={() => setActive(index)} />;
              })}
            </ul>
          </section>
        ))}
      </div>
      {state.query.trim().length > 0 && (
        <Button size="1" variant="soft" radius="full" className="search-ask" onClick={() => onAsk(state.query.trim())}>
          Ask Heel about “{state.query.trim()}”
        </Button>
      )}
    </div>
  );
}
