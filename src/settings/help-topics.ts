import { FEEDBACK_TO } from "../../shared/feedback";

export type HelpTopic = { id: string; title: string; steps: readonly string[] };

/**
 * Settings › Help: one short topic per thing a person wants to do, in the words the app uses on its buttons.
 * When a label changes in the app, change it here too; `help-topics.test.ts` keeps the topics well-formed.
 */
export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: "start",
    title: "Open Heel and find your way",
    steps: [
      "Click Greg to open the panel. Command Shift H opens or closes it from any app (change the shortcut in Settings › Startup).",
      "Right-click Greg for his menu: Open Heel, Settings…, Take a walk, Play, Take a nap, Quiet mode, Hide Greg, Quit Heel.",
      "The menu-bar icon has Show / hide panel, Show Greg, Settings… and Quit Heel. Settings is also Command comma.",
      "Escape closes one thing at a time: a list, a layer, then the panel.",
    ],
  },
  {
    id: "brain",
    title: "Choose the AI Heel uses",
    steps: [
      "Open Settings › Brain and pick from the AI list. Claude or Codex signed in on this Mac show as ready.",
      "For an API key (Anthropic, OpenAI, Mistral) choose it in the list; the key fields open. The key stays in your Keychain.",
      "Press Test connection to check it. Check again re-reads what is installed.",
      "What you type goes to the AI you chose. Local (Ollama) keeps it on this Mac.",
    ],
  },
  {
    id: "tasks",
    title: "Add, finish and park tasks",
    steps: [
      "Type in “What's on your mind?”. Command Enter adds it as a task with no AI; Enter asks Heel.",
      "Command N brings you back to that box from anywhere in the panel.",
      "Tick a task's circle to finish it; Undo appears for a few seconds.",
      "The + button holds Plan my next step, I'm stuck, Check my email, Chat with Heel, Add as task (no AI) and Park for later.",
    ],
  },
  {
    id: "focus",
    title: "Run a focus time-box",
    steps: [
      "On the task marked Now, press the clock: Start a time-box on this.",
      "Greg stays quiet while it runs. When it ends, Heel asks: Done, Keep going, or Park something and go back.",
      "Done ticks the task. Park saves what pulled you away to Parked.",
    ],
  },
  {
    id: "applications",
    title: "Apply for a job",
    steps: [
      "Open Job applications on Today, or ask Heel to apply with the exact job URL. Chrome, Brave or Edge must be installed.",
      "Supply facts, choose your CV and correct the answers. PDF reading and scan OCR are built in; check recognized text. Complete sign-in or verification in the browser, then refresh.",
      "Choose the site's Next or Submit control and mark final submission when appropriate. Review its request and press Allow once; Deny and cancel stops waiting requests.",
      "When standard fields are unavailable, Fill uses a screenshot. Help with an unfamiliar page can handle custom controls. Site requests still wait for Allow once.",
      "A site confirmation becomes the receipt. For an unfamiliar message, copy its acceptance quote and affirm it. Uncertain results are never retried automatically.",
    ],
  },
  {
    id: "email",
    title: "Read your email with Heel",
    steps: [
      "Press + › Check my email. Heel reads your inbox through Mail on this Mac and lists what needs you.",
      "Add task turns a mail into a task. A reply is drafted for you to read; it leaves only when you press Send.",
      "Heel never sends, deletes or moves mail on its own.",
    ],
  },
  {
    id: "find",
    title: "Find anything",
    steps: ["Press Command K (or the magnifier) to search your tasks, parked ideas, finished tasks, saved notes and what you said to Heel."],
  },
  {
    id: "feedback",
    title: "Report a bug or suggest an idea",
    steps: [
      "Open Settings › About › Send feedback. Pick Something broke or An idea, write one line and a few sentences.",
      `Press Send report. Heel keeps the report and notifies ${FEEDBACK_TO}. A reference confirms receipt; no mail app is needed.`,
      "Debug and the crash screen can send diagnostic facts. Raw errors and file paths stay local.",
    ],
  },
  {
    id: "data",
    title: "Your data",
    steps: [
      "Everything stays on this Mac. Settings › Privacy & data backs it up to the Desktop or wipes it.",
      "Logs never contain your tasks, messages or mail; read them under Settings › About › Debug.",
    ],
  },
  {
    id: "trouble",
    title: "When something is off",
    steps: [
      "“Helper not reached”: press Restart helper in Settings › About, or Restart Heel's helper in the menu-bar icon.",
      "Still not starting: Heel needs Node 22 or newer. Install it with brew install node, then quit and reopen Heel.",
      "Greg is gone: menu-bar icon › Show Greg.",
      "The AI says it isn't ready: Settings › Brain › Check again, then Test connection.",
    ],
  },
];
