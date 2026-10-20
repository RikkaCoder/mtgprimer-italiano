import { execFile } from "node:child_process";
import { promisify, parseArgs } from "node:util";
import { readFile, unlink, appendFile } from "node:fs/promises";
import {
  isDataPath,
  mergeData,
  readData,
  serializeData,
} from "./lib/upstream-data";
import { readJson, writeChanged, canonical } from "./lib/files";
import { fetchChecked } from "./lib/http";

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean" },
    offline: { type: "boolean" },
    target: { type: "string" },
  },
});
const git = async (...args: string[]) =>
  (await promisify(execFile)("git", args, { maxBuffer: 32 * 1024 * 1024 }))
    .stdout;
const checkpointFile = "scripts/state/upstream.json";
const reportDir = ".scryfall-cache/reports";
const repository = "GarrettGardner/mtgprimer";
try {
  const checkpoint = await readJson<{ repository: string; revision: string }>(
    checkpointFile,
  );
  if (
    !checkpoint ||
    checkpoint.repository !== repository ||
    !/^[a-f0-9]{40}$/.test(checkpoint.revision)
  )
    throw new Error("Invalid upstream checkpoint");
  let target = values.target;
  if (!target) {
    if (values.offline) throw new Error("--offline requires --target SHA");
    const repo = (await (
      await fetchChecked(`https://api.github.com/repos/${repository}`)
    ).json()) as { default_branch: string };
    const commit = (await (
      await fetchChecked(
        `https://api.github.com/repos/${repository}/commits/${encodeURIComponent(repo.default_branch)}`,
      )
    ).json()) as { sha: string };
    target = commit.sha;
  }
  if (!target || !/^[a-f0-9]{40}$/.test(target))
    throw new Error("Invalid upstream SHA");
  for (const revision of new Set([checkpoint.revision, target])) {
    try {
      await git("cat-file", "-e", `${revision}^{commit}`);
    } catch {
      if (values.offline)
        throw new Error(`Missing local upstream object: ${revision}`);
      // Fetch objects only; never checkout, execute or merge upstream code.
      await git(
        "fetch",
        "--no-tags",
        "--depth=1",
        `https://github.com/${repository}.git`,
        revision,
      );
    }
  }
  const paths = async (revision: string) =>
    (await git("ls-tree", "-r", "--name-only", revision))
      .trim()
      .split("\n")
      .filter(isDataPath);
  const basePaths = new Set(await paths(checkpoint.revision));
  const remotePaths = new Set(await paths(target));
  const changes: { path: string; text?: string }[] = [];
  const conflicts: string[] = [];
  const changedPaths = (
    await git("diff", "--name-only", checkpoint.revision, target)
  )
    .trim()
    .split("\n")
    .filter(isDataPath);
  for (const path of changedPaths) {
    try {
      const baseText = basePaths.has(path)
        ? await git("show", `${checkpoint.revision}:${path}`)
        : undefined;
      const remoteText = remotePaths.has(path)
        ? await git("show", `${target}:${path}`)
        : undefined;
      if (baseText === remoteText) continue;
      const localText = await readFile(path, "utf8").catch(
        (error: NodeJS.ErrnoException) => {
          if (error.code === "ENOENT") return undefined;
          throw error;
        },
      );
      const base =
        baseText === undefined ? undefined : readData(path, baseText);
      const remote =
        remoteText === undefined ? undefined : readData(path, remoteText);
      const local =
        localText === undefined ? undefined : readData(path, localText);
      const merged = mergeData(base, local, remote, path);
      if (canonical(merged) !== canonical(local))
        changes.push({
          path,
          text: merged === undefined ? undefined : serializeData(path, merged),
        });
    } catch (error) {
      conflicts.push(error instanceof Error ? error.message : String(error));
    }
  }
  const markdown = `# Dati upstream\n\nBase: ${checkpoint.revision}\n\nTarget: ${target}\n\nFile aggiornati: ${changes.length}; conflitti: ${conflicts.length}.\n\n${conflicts.join("\n")}\n`;
  await writeChanged(
    `${reportDir}/upstream.json`,
    JSON.stringify(
      {
        repository,
        base: checkpoint.revision,
        target,
        changes: changes.map((c) => c.path),
        conflicts,
      },
      null,
      2,
    ) + "\n",
  );
  await writeChanged(`${reportDir}/upstream.md`, markdown);
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
  if (conflicts.length)
    throw new Error("Upstream conflicts; no files applied. See upstream.json");
  if (!values["dry-run"]) {
    for (const change of changes) {
      if (change.text === undefined) await unlink(change.path);
      else await writeChanged(change.path, change.text);
    }
    await writeChanged(
      checkpointFile,
      JSON.stringify({ repository, revision: target }, null, 2) + "\n",
    );
  }
  console.log(markdown);
} catch (error) {
  await writeChanged(
    `${reportDir}/upstream-error.json`,
    JSON.stringify(
      {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  throw error;
}
