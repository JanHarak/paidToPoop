import { readFileSync } from "node:fs";
import vm from "node:vm";

const HTML_PATH = new URL("../index.html", import.meta.url);

export function loadBlock(id) {
  const html = readFileSync(HTML_PATH, "utf8");
  const re = new RegExp('<script id="' + id + '">([\\s\\S]*?)</script>');
  const m = re.exec(html);
  if (!m) throw new Error("Script block not found: " + id);
  const context = vm.createContext({ window: {} });
  vm.runInContext(m[1], context);
  return context.window;
}
