import { cpSync, copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backend = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(backend, "..", "dist");
for (const directory of ["api", "admin"]) {
  const target = path.join(dist, directory);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(path.join(backend, directory), target, { recursive: true });
}
copyFileSync(path.join(backend, "bootstrap.php"), path.join(dist, "bootstrap.php"));
writeFileSync(
  path.join(dist, ".htaccess"),
  '<Files "bootstrap.php">\n  Require all denied\n</Files>\n',
);
console.log("PHP API and admin pages copied into dist/ for PHP-capable hosting.");
