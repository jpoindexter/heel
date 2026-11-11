import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { CANVAS_FORM } from "./canvas-fixture";

export async function applicationFixture() {
  const received: { path: string; fields: Record<string, string>; files: { name: string; text: string }[] }[] = [];
  const form = (action: string, fields: string, button = "Submit application") => `<!doctype html><html><head><title>Researcher application</title></head><body><h1>Principal Researcher</h1><form action="${action}" method="post" enctype="multipart/form-data">${fields}<button>${button}</button></form></body></html>`;
  const server = createServer(async (req, res) => {
    res.setHeader("content-type", "text/html; charset=utf-8");
    const path = req.url ?? "/";
    if (req.method === "GET") {
      if (path.startsWith("/canvas")) return void res.end(CANVAS_FORM);
      if (path === "/long") return void res.end('<!doctype html><title>Long application</title><body>' + Array.from({ length: 80 }, (_, index) => `<p>Application section ${index}: more questions below</p>`).join('') + '</body>');
      if (path === "/preexisting") return void res.end(form("/old-confirmation", "") + "<p>Application received.</p>");
      if (path === "/password") return void res.end('<!doctype html><title>Sign in</title><body><label>Password<input type="password"></label></body>');
      if (path === "/job") return void res.end(form("/step", '<label>Full name<input name="name" required></label><label>Email<input name="email" type="email" required></label><label>Location<select name="location"><option value="">Choose</option><option value="ES">Spain</option></select></label>', "Next"));
      if (path === "/french") return void res.end(form("/french-confirm", '<label>Full name<input name="name" required></label>'));
      if (path === "/uncertain") return void res.end(form("/unknown", '<label>Full name<input name="name" required></label>'));
      if (path === "/upload-job") return void res.end(form("/submit", '<label>CV<input name="cv" type="file" onchange="const f=new FormData();f.append(\'cv\',this.files[0]);fetch(\'/upload\',{method:\'POST\',body:f}).then(()=>document.querySelector(\'#upload-status\').textContent=\'CV uploaded\')"></label><p id="upload-status"></p>'));
      if (path === "/shadow") return void res.end('<!doctype html><title>Shadow form</title><body><div id="host"></div><script>document.querySelector("#host").attachShadow({mode:"open"}).innerHTML=\'<label>Full name<input name="name"></label>\'</script>');
      if (path === "/embedded") return void res.end('<!doctype html><title>Embedded application</title><body><iframe src="/shadow" title="Application form"></iframe></body>');
      if (path === "/widgets") return void res.end('<!doctype html><title>Custom controls</title><body><div role="combobox" aria-label="Location" tabindex="0" onclick="document.querySelector(\'#options\').hidden=false">Choose</div><div id="options" role="listbox" hidden><div role="option" onclick="document.querySelector(\'[role=combobox]\').textContent=this.textContent;this.parentNode.hidden=true">Spain</div></div><label>Skills<select multiple><option value="research">Research</option><option value="design">Design</option></select></label></body>');
      return void res.end("<!doctype html><title>Verification</title><body>Sign in to continue</body>");
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const contentType = req.headers["content-type"] ?? "application/octet-stream";
    const data = await new Response(Uint8Array.from(Buffer.concat(chunks)), { headers: { "content-type": contentType } }).formData();
    const fields: Record<string, string> = {}, files: { name: string; text: string }[] = [];
    for (const [name, value] of data.entries()) {
      if (typeof value === "string") fields[name] = value;
      else files.push({ name: value.name, text: await value.text() });
    }
    received.push({ path, fields, files });
    if (path === "/step") return void res.end(form("/submit", `<input type="hidden" name="name" value="${fields.name?.replace(/[&<>"']/g, "")}"><label>Cover letter<textarea name="cover" required></textarea></label><label>CV<input name="cv" type="file" required></label><label>I confirm the supplied answers are accurate<input type="checkbox" name="accurate" required></label>`));
    if (path === "/old-confirmation") return void res.end("<!doctype html><title>Status</title><body><p>Application received.</p></body>");
    if (path === "/french-confirm") return void res.end("<!doctype html><title>Résultat</title><body><p>Votre candidature a été reçue.</p></body>");
    if (path === "/unknown") return void res.end("<!doctype html><title>Still processing</title><body>We are still processing your request.</body>");
    if (path === "/upload") { res.setHeader("content-type", "application/json"); return void res.end('{"ok":true}'); }
    res.end("<!doctype html><title>Application confirmation</title><body><h1>Application received. Reference HEEL-TEST-001.</h1></body>");
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { url, received, close: () => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }) };
}
