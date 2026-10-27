import { useCallback, useEffect, useState } from "react";
import { SkillResultSchema, SkillTextSchema, SkillsListSchema, UnsplitResultSchema, type SkillInfoDto } from "../../shared/api";
import type { Client } from "../api/client";
import { undoThen } from "../ui/undo-said";

type Notify = (message: string, tone?: "info" | "error", undo?: () => void) => void;
export type Editing = { id: string | null; text: string; editable: boolean; error: string | null } | null;

const path = (id: string) => `/skills/${encodeURIComponent(id)}`;

/** The skills manager's state (N3): the list, one open editor, and every write with its sentence and Undo. */
export function useSkills(client: Client, { active, notify }: { active: boolean; notify: Notify }) {
  const [skills, setSkills] = useState<SkillInfoDto[]>([]);
  const [editing, setEditing] = useState<Editing>(null);

  const load = useCallback(async () => {
    const result = await client.get("/skills", SkillsListSchema);
    if (result.ok) setSkills(result.data.skills);
  }, [client]);
  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const toggle = useCallback(
    async (skill: SkillInfoDto, enabled: boolean) => {
      const result = await client.post(`${path(skill.id)}/enabled`, SkillResultSchema, { enabled });
      if (!result.ok) return notify(result.error.message, "error");
      await load();
    },
    [client, load, notify],
  );

  const open = useCallback(
    async (skill: SkillInfoDto) => {
      const result = await client.get(path(skill.id), SkillTextSchema);
      if (!result.ok) return notify(result.error.message, "error");
      setEditing({ id: skill.id, text: result.data.text, editable: result.data.editable, error: null });
    },
    [client, notify],
  );

  const startNew = useCallback((template: string) => setEditing({ id: null, text: template, editable: true, error: null }), []);
  const edit = useCallback((text: string) => setEditing((e) => (e ? { ...e, text, error: null } : e)), []);
  const close = useCallback(() => setEditing(null), []);

  const { save, remove } = useSkillWrites({ client, editing, setEditing, load, notify });

  return { skills, editing, toggle, open, startNew, edit, close, save, remove };
}

type Writes = { client: Client; editing: Editing; setEditing: (next: Editing) => void; load: () => Promise<void>; notify: Notify };

/** Saving the open editor, and deleting a skill with its Undo. */
function useSkillWrites({ client, editing, setEditing, load, notify }: Writes) {
  const save = useCallback(async () => {
    if (!editing || !editing.editable) return;
    const result = editing.id === null ? await client.post("/skills", SkillResultSchema, { text: editing.text }) : await client.put(path(editing.id), SkillResultSchema, { text: editing.text });
    if (!result.ok) return setEditing({ ...editing, error: result.error.message });
    setEditing(null);
    await load();
    notify(editing.id === null ? `Added the skill “${result.data.skill.name}”` : `Saved “${result.data.skill.name}”`);
  }, [client, editing, setEditing, load, notify]);

  const remove = useCallback(
    async (skill: SkillInfoDto) => {
      const result = await client.post(`${path(skill.id)}/delete`, UnsplitResultSchema.partial(), {});
      if (!result.ok) return notify(result.error.message, "error");
      setEditing(null);
      await load();
      notify(`Deleted “${skill.name}”`, "info", undoThen(() => client.post(`${path(skill.id)}/restore`, SkillResultSchema, {}), load, (message) => notify(message, "error")));
    },
    [client, setEditing, load, notify],
  );

  return { save, remove };
}
