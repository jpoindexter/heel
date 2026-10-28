# A prompt-fragment feature is done on one real turn, read against its own rules

Two v1 cards (weekly review, autism layer) were behaviours, not code: a SKILL.md chosen by a signal,
plus one data section in the prompt. Unit tests can only show the signal fires and the section is
shaped. The feature itself is what the model does with the fragment.

What proved each one: a scratch script that seeds a throwaway store, calls `runTurn` with the real
signed-in CLI provider, and prints the reply. Then the reply is read line by line against the skill's
numbered rules (four labelled lines? "probably" on the implied part? at most three reps? nothing
written? ends with the question the rule asks for?). One turn, 14–46 s, is enough to see whether the
fragment steers the model or gets ignored.

Rule: for a prompt-fragment feature, the Done line is "one real turn satisfies every numbered rule",
and the test that matters is the printed reply, not the green suite. Keep the scratch script in the
scratchpad (`.mts`, absolute imports); it is not a repo test.
