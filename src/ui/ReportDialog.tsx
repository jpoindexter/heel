import type { ReactNode } from "react";
import { Button, Dialog, Flex } from "@radix-ui/themes";

export function ReportDialog({ title, trigger, children, open, onOpenChange }: { title: string; trigger?: string; children: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    {trigger && <Dialog.Trigger><Button size="1" variant="soft">{trigger}</Button></Dialog.Trigger>}
    <Dialog.Content size="1" maxWidth="100%" maxHeight="100%" aria-describedby={undefined}>
      <Flex justify="between" align="center" gap="2" mb="3">
        <Dialog.Title mb="0" size="3">{title}</Dialog.Title>
        <Dialog.Close><Button size="1" variant="ghost" aria-label="Close report">Close</Button></Dialog.Close>
      </Flex>
      {children}
    </Dialog.Content>
  </Dialog.Root>;
}
