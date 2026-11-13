import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

var START = "/* ZK-CORE:START */";
var END = "/* ZK-CORE:END */";

export function loadCore() {
  var html = fs.readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");
  var a = html.indexOf(START);
  var b = html.indexOf(END);
  if (a < 0 || b < 0) throw new Error("ZK-CORE block not found in index.html");
  var context = vm.createContext({});
  vm.runInContext(html.slice(a + START.length, b), context);
  return context.ZK;
}
