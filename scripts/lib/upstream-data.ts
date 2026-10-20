import ts from "typescript";
import { canonical } from "./files";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export const isDataPath = (path: string) =>
  /^src\/content\/guides\/[a-z0-9-]+\/[a-z0-9-]+\.json$/i.test(path) ||
  ["src/content/global/pages.ts", "src/content/global/preset.ts"].includes(
    path,
  );

// Evaluate only literal data. Never import or execute upstream TypeScript.
export function readData(path: string, text: string): Json {
  if (path.endsWith(".json")) {
    const data = JSON.parse(text) as Json;
    if (
      !data ||
      Array.isArray(data) ||
      typeof data !== "object" ||
      !data.cards ||
      typeof data.cards !== "object"
    )
      throw new Error(`Invalid guide: ${path}`);
    return data;
  }
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const name = path.endsWith("pages.ts") ? "PAGES_CONFIG" : "PRESET";
  function literal(node: ts.Expression): Json {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    if (ts.isArrayLiteralExpression(node))
      return node.elements.map((v) => literal(v as ts.Expression));
    if (ts.isObjectLiteralExpression(node)) {
      const value: Record<string, Json> = Object.create(null);
      for (const property of node.properties) {
        if (
          !ts.isPropertyAssignment(property) ||
          !property.name ||
          ts.isComputedPropertyName(property.name)
        )
          throw new Error(`Nonliteral upstream property: ${path}`);
        const key =
          ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
            ? property.name.text
            : undefined;
        if (
          !key ||
          ["__proto__", "constructor", "prototype"].includes(key) ||
          key in value
        )
          throw new Error(`Invalid data key: ${path}`);
        value[key] = literal(property.initializer);
      }
      return value;
    }
    throw new Error(`Executable upstream expression rejected: ${path}`);
  }
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations)
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === name &&
        declaration.initializer
      ) {
        const value = literal(declaration.initializer);
        if (name === "PAGES_CONFIG") validatePages(value);
        return value;
      }
  }
  throw new Error(`Missing ${name}: ${path}`);
}

function validatePages(value: Json): void {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    typeof value.slug !== "string" ||
    typeof value.template !== "string" ||
    ![
      "home",
      "not-found",
      "directory",
      "info",
      "guide",
      "guide-group",
    ].includes(value.template)
  )
    throw new Error("Unsupported upstream page schema");
  if (value.pages !== undefined) {
    if (!Array.isArray(value.pages)) throw new Error("Invalid pages");
    value.pages.forEach(validatePages);
  }
  if (value.template === "info" && typeof value.formatCode !== "string")
    throw new Error("Missing formatCode");
  if (value.template === "guide" && typeof value.guide !== "string")
    throw new Error("Missing guide");
  if (value.template === "guide-group" && !Array.isArray(value.guides))
    throw new Error("Missing guides");
}

export function serializeData(path: string, value: Json): string {
  const json = JSON.stringify(value, null, 2);
  if (path.endsWith(".json")) return json + "\n";
  return path.endsWith("pages.ts")
    ? `import type { TPageConfig } from "@/models";\n\nexport const PAGES_CONFIG: TPageConfig = ${json};\n`
    : `export const PRESET: Record<string, { NAME: string; ICON: string; DESCRIPTION: string; TAGS?: string[] }> = ${json};\n`;
}

export function mergeData(
  base: Json | undefined,
  local: Json | undefined,
  remote: Json | undefined,
  path = "root",
): Json | undefined {
  if (canonical(local) === canonical(base)) return remote;
  if (
    canonical(remote) === canonical(base) ||
    canonical(local) === canonical(remote)
  )
    return local;
  const isObject = (v: Json | undefined): v is Record<string, Json> =>
    !!v && typeof v === "object" && !Array.isArray(v);
  if (isObject(base) && isObject(local) && isObject(remote)) {
    const value: Record<string, Json> = Object.create(null);
    for (const key of new Set([
      ...Object.keys(base),
      ...Object.keys(local),
      ...Object.keys(remote),
    ])) {
      const merged = mergeData(
        base[key],
        local[key],
        remote[key],
        `${path}.${key}`,
      );
      if (merged !== undefined) value[key] = merged;
    }
    return value;
  }
  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
    const keyed = (items: Json[]) =>
      items.every((v) => isObject(v) && typeof v.slug === "string") &&
      new Set(items.map((v) => (v as Record<string, Json>).slug)).size ===
        items.length;
    if ([base, local, remote].every(keyed)) {
      const record = (items: Json[]) =>
        Object.fromEntries(
          items.map((v) => [(v as Record<string, Json>).slug as string, v]),
        );
      const merged = mergeData(
        record(base),
        record(local),
        record(remote),
        path,
      ) as Record<string, Json>;
      const order = [
        ...new Set(
          [...remote, ...local].map(
            (v) => (v as Record<string, Json>).slug as string,
          ),
        ),
      ];
      return order
        .filter((key) => merged[key] !== undefined)
        .map((key) => merged[key]);
    }
  }
  throw new Error(`upstream-conflict: ${path}`);
}
