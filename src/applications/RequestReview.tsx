import { Button, Text } from "@radix-ui/themes";
import type { PendingRequest } from "../../shared/applications";

// Vanta's structured subject/sections and Allow once/Deny pattern, using Heel's controls.
export function RequestReview({ request, busy, onApprove, onDeny }: { request: PendingRequest; busy: boolean; onApprove: () => void; onDeny: () => void }) {
  return <section className="application-request" aria-label="Outgoing application request">
    <Text as="p" weight="bold" size="2">Review before sending</Text>
    <Text as="p" size="1">Destination: {request.method} {request.url}</Text>
    <label>Exact request content<textarea readOnly rows={6} value={request.body} /></label>
    <Text as="p" size="1" color="gray">Allow once sends this request to the site. It may upload a file, save a step or submit the application.</Text>
    <div className="row">
      <Button disabled={busy} onClick={onApprove}>Allow once</Button>
      <Button disabled={busy} variant="soft" color="gray" onClick={onDeny}>Deny and cancel</Button>
    </div>
  </section>;
}
