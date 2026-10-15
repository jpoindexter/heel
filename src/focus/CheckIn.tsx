import { useId, useState } from "react";
import { Button, Card, Text, TextField } from "@radix-ui/themes";
import type { FocusDto } from "../../shared/api";
import { extensionMin } from "../../shared/focus";
import { checkInQuestion, type CheckInChoice } from "./focus-model";

type Props = { session: FocusDto; busy: boolean; onAnswer: (choice: CheckInChoice, parkedIdea?: string) => void };

/** The box is up. The question quotes the goal verbatim; every answer is fine, and "park it" saves the distraction instead of losing it. */
export function CheckIn({ session, busy, onAnswer }: Props) {
  const ideaId = useId();
  const [parking, setParking] = useState(false);
  const [idea, setIdea] = useState("");

  return (
    <Card size="2" variant="surface" role="region" aria-live="polite" aria-label="Time-box check-in" className="check-in">
      <Text size="3" weight="medium">{checkInQuestion(session.goal)}</Text>
      {parking ? (
        <form
          className="focus-form"
          onSubmit={(event) => {
            event.preventDefault();
            onAnswer("park_and_return", idea);
          }}
        >
          <Text as="label" size="2" htmlFor={ideaId}>What pulled you away? It goes to Parked.</Text>
          <TextField.Root id={ideaId} size="2" maxLength={1000} value={idea} autoFocus onChange={(event) => setIdea(event.target.value)} />
          <div className="focus-actions">
            <Button type="submit" size="2" highContrast disabled={busy}>Park it and go back</Button>
            <Button type="button" size="2" variant="soft" color="gray" onClick={() => setParking(false)}>Back</Button>
          </div>
        </form>
      ) : (
        <div className="focus-actions">
          <Button size="2" highContrast disabled={busy} onClick={() => onAnswer("done")}>Done</Button>
          <Button size="2" variant="soft" disabled={busy} onClick={() => onAnswer("keep_going")}>Keep going, +{extensionMin(session)} min</Button>
          <Button size="2" variant="soft" color="gray" disabled={busy} onClick={() => setParking(true)}>Park something and go back</Button>
        </div>
      )}
    </Card>
  );
}
