// Every read and write of an uploaded file goes through here, so moving to
// object storage means reimplementing this module and nothing else.
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const UPLOAD_DIR = resolve(apiRoot, process.env.UPLOAD_DIR ?? "./uploads");
export const PUBLIC_PREFIX = "/uploads";

await mkdir(UPLOAD_DIR, { recursive: true });

export async function save(buffer: Buffer, extension: string): Promise<string> {
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(join(UPLOAD_DIR, filename), buffer);
  return `${PUBLIC_PREFIX}/${filename}`;
}

// Best effort: a stranded file wastes a few kilobytes, a failed request loses
// the user's work.
export async function remove(publicPath: string | null): Promise<void> {
  const filename = toFilename(publicPath);
  if (!filename) return;

  try {
    await unlink(join(UPLOAD_DIR, filename));
  } catch (error) {
    if (!isMissingFile(error)) {
      console.error(`Could not remove upload ${filename}:`, toMessage(error));
    }
  }
}

const isMissingFile = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// Guards against a tampered row pointing outside the upload directory.
function toFilename(publicPath: string | null): string | null {
  if (typeof publicPath !== "string" || !publicPath.startsWith(`${PUBLIC_PREFIX}/`)) return null;
  const filename = publicPath.slice(PUBLIC_PREFIX.length + 1);
  return /^[\w.-]+$/.test(filename) && !filename.includes("..") ? filename : null;
}
