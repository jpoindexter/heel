import { Button, Heading, Switch, Text, TextArea } from "@radix-ui/themes";
import { client } from "../api/default-client";
import { skillLabel } from "../ui/skill-label";
import { useNotices } from "../ui/notices";
import { NEW_SKILL_TEMPLATE, sizeNote, triggerLine } from "./skills-model";
import { useSkills } from "./useSkills";

/** The skills Heel reads each turn: switch any off, read the bundled ones, add and edit your own (plain instructions, nothing runs). */
export function SkillsSettings({ active }: { active: boolean }) {
  const notices = useNotices();
  const skills = useSkills(client, { active, notify: (message, tone = "info", undo) => notices.show({ message, tone, undo }) });
  const { editing } = skills;
  const note = editing ? sizeNote(editing.text.length) : null;
  return (
    <section aria-labelledby="skills-heading" className="settings-section">
      <Heading as="h2" id="skills-heading" size="2">Skills</Heading>
      <Text as="p" size="1" color="gray">Short instructions Heel reads before answering. They are plain text: nothing here runs. Your own are chosen by the words you give them.</Text>
      {editing ? (
        <div className="field">
          <TextArea size="1" rows={12} value={editing.text} readOnly={!editing.editable} aria-label="Skill file" onChange={(event) => skills.edit(event.target.value)} />
          {note && <Text size="1" color={note.over ? "red" : "gray"}>{note.text} characters{note.over ? ". Too long: shorten it." : ""}</Text>}
          {editing.error && <Text size="2" color="amber" role="alert">{editing.error}</Text>}
          <div className="skill-actions">
            {editing.editable && <Button size="1" radius="full" disabled={note?.over} onClick={() => void skills.save()}>Save</Button>}
            <Button size="1" variant="ghost" color="gray" radius="full" onClick={skills.close}>{editing.editable ? "Cancel" : "Close"}</Button>
          </div>
        </div>
      ) : (
        <>
          <ul className="skill-list">
            {skills.skills.map((skill) => (
              <li key={skill.id} className="skill-row">
                <div className="skill-head">
                  <Text size="2" weight="medium" className="grow">{skill.source === "yours" ? `${skill.name} · yours` : skillLabel(skill.name)}</Text>
                  {skill.locked ? (
                    <Text size="1" color="gray">Always on</Text>
                  ) : (
                    <Switch size="1" checked={skill.enabled} aria-label={`${skillLabel(skill.name)} on`} onCheckedChange={(on) => void skills.toggle(skill, on)} />
                  )}
                </div>
                <Text as="p" size="1" color="gray" className="clamp-2">{skill.description}</Text>
                {!skill.locked && <Text as="p" size="1" color="gray">{triggerLine(skill.triggers)}</Text>}
                <div className="skill-actions">
                  <Button size="1" variant="ghost" color="gray" onClick={() => void skills.open(skill)}>{skill.source === "yours" ? "Edit" : "Read"}</Button>
                  {skill.source === "yours" && <Button size="1" variant="ghost" color="gray" onClick={() => void skills.remove(skill)}>Delete</Button>}
                </div>
              </li>
            ))}
          </ul>
          <Button size="1" variant="soft" radius="full" onClick={() => skills.startNew(NEW_SKILL_TEMPLATE)}>Add a skill</Button>
        </>
      )}
    </section>
  );
}
