const fs = require("fs");
const { loadLocaleAndAdd } = require("./content/redirect");
const { pairs } = loadLocaleAndAdd("en-US", []);

const tree = {};
for (const [from, to] of pairs) {
  let cursor = tree;
  for (const segment of from.split("/").slice(1)) {
    cursor = cursor[segment] || (cursor[segment] = {});
  }
  cursor["_"] = to;
}

function commonPathOf(a, b) {
  const length = Math.min(a.length, b.length);
  const path = [];
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) {
      break;
    }
    path.push(a[i]);
  }
  return path;
}

function relativePathOf(sourcePath, targetPath) {
  // Example: /en-US/docs/ARIA => /en-US/docs/Web/Accessibility/ARIA

  // en-US, docs
  const common = commonPathOf(sourcePath, targetPath);

  // ARIA
  const sourcePathRest = sourcePath.slice(common.length);

  // Web, Accessibility, ARIA
  const targetPathRest = targetPath.slice(common.length);

  // .., Web, Accessibility, ARIA
  return [...sourcePathRest.map(() => ".."), ...targetPathRest];
}

function optimizeTree(
  map,
  { parentSourcePath = [], parentTargetPath = [] } = {}
) {
  // en-US, docs, ARIA
  const sourcePath = parentSourcePath;

  // en-US, docs, Web, Accessibility, ARIA
  const targetPath =
    typeof map["_"] === "string"
      ? map["_"].split("/").slice(1)
      : parentTargetPath;

  const path = relativePathOf(sourcePath, targetPath);

  return Object.keys(map)
    .sort()
    .reduce((result, key) => {
      let value = map[key];

      if (key === "_") {
        value = path.join("/");
      } else {
        value = optimizeTree(value, {
          parentSourcePath: [...sourcePath, key],
          parentTargetPath: [...targetPath, key],
        });
      }

      return {
        ...result,
        [key]: value,
      };
    }, {});
}

const optimizedTree = optimizeTree(tree);

fs.writeFileSync("./redirects.json", JSON.stringify(tree));
fs.writeFileSync("./redirects-optimized.json", JSON.stringify(optimizedTree));
