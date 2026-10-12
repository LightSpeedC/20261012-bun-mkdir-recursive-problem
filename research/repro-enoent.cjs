// Run in an empty folder: bun repro-enoent.cjs / node repro-enoent.cjs / deno run -A repro-enoent.cjs
const fs = require("node:fs");
fs.mkdirSync("sub", { recursive: true });
const paths = [".", "./", ".\\", "sub/..", "sub/."];
for (const p of paths) {
	try { fs.mkdirSync(p, { recursive: true }); console.log("OK", p); }
	catch (e) { console.log("NG", p, e.code, e.message); }
}
(async () => {
	for (const p of paths) {
		await fs.promises.mkdir(p, { recursive: true }).then(
			() => console.log("OK promises", p),
			(e) => console.log("NG promises", p, e.code),
		);
		await new Promise((r) => fs.mkdir(p, { recursive: true }, (e) => {
			console.log(e ? "NG callback " + p + " " + e.code : "OK callback " + p); r();
		}));
	}
})();
