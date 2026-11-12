import { feedbackReceiver } from "./receiver";
import { latestUpdate } from "./updates";
const app = feedbackReceiver();
app.get("/updates/latest.json", c => latestUpdate(c.env));
export default app;
