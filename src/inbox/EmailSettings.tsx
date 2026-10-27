import { useId, useState, type FormEvent } from "react";
import { Button, Callout, Heading, Text, TextField } from "@radix-ui/themes";
import type { Client } from "../api/client";
import { ConnectStatus } from "./InboxPanel";
import { useInboxConnection } from "./useInbox";

type Props = { client: Client; active: boolean };

/** Gmail, read-only. The Google client ID and secret go to the Keychain through the helper; Heel never shows them again. */
export function EmailSettings({ client, active }: Props) {
  const { status, error, saveClient, connect, disconnect, waiting } = useInboxConnection(client, active);
  const idField = useId();
  const secretField = useId();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void saveClient(clientId, clientSecret).then(() => setClientSecret(""));
  };

  return (
    <section aria-labelledby="email-heading" className="settings-section">
      <Heading as="h3" id="email-heading" size="2">Email (Gmail, read-only)</Heading>
      <Text as="p" size="1" color="gray">
        Heel reads your recent unread mail and picks up to three that need you. It can't send, delete or change anything.
      </Text>
      {status?.connected ? (
        <>
          <Text as="p" size="2">Connected as {status.account}.</Text>
          <Button type="button" variant="soft" color="gray" onClick={() => void disconnect()}>Disconnect</Button>
          <Text as="p" size="1" color="gray">Disconnecting signs Heel out of Google. To connect again you'll sign in to Google again; your client ID and secret stay in the Keychain.</Text>
        </>
      ) : (
        <form className="settings-section" onSubmit={submit}>
          <div className="field">
            <Text as="label" size="2" weight="medium" htmlFor={idField}>Google client ID</Text>
            <TextField.Root id={idField} value={clientId} autoComplete="off" onChange={(event) => setClientId(event.target.value)} />
          </div>
          <div className="field">
            <Text as="label" size="2" weight="medium" htmlFor={secretField}>Google client secret</Text>
            <TextField.Root id={secretField} type="password" value={clientSecret} autoComplete="off" onChange={(event) => setClientSecret(event.target.value)} />
          </div>
          <Text as="p" size="1" color="gray">
            Create a free "Desktop app" OAuth client in Google Cloud with the Gmail API turned on. Both values are stored in your Mac's Keychain.
          </Text>
          <Button type="submit" variant="soft" disabled={!clientId.trim() || !clientSecret.trim()}>Save</Button>
          {status?.configured && <Button type="button" onClick={() => void connect()}>Connect Gmail</Button>}
          <ConnectStatus waiting={waiting} />
        </form>
      )}
      {(error || status?.problem) && (
        <Callout.Root color="amber" role="alert" size="1" highContrast>
          <Callout.Text>{error ?? status?.problem}</Callout.Text>
        </Callout.Root>
      )}
    </section>
  );
}
