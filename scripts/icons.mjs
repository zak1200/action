import { readdir, readFile, writeFile } from "node:fs/promises";
const names = (await readdir("assets/icons"))
  .filter((name) => name.endsWith(".svg"))
  .sort();
const symbols = await Promise.all(
  names.map(async (name) => {
    const svg = await readFile(`assets/icons/${name}`, "utf8");
    return `<symbol id="${name.slice(0, -4)}" viewBox="0 0 24 24">${svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>")).trim()}</symbol>`;
  }),
);
await writeFile(
  "assets/icons.svg",
  `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join("")}</svg>`,
);
