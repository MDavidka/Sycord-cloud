"use strict";

const UPLOAD_CHUNK_BYTES = 4 * 1024 * 1024;
const UPLOAD_MAX_BYTES = 5 * 1024 * 1024 * 1024;
const UPLOAD_TTL_MS = 6 * 60 * 60 * 1000;

function fail(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function safeRemoteDirectory(value) {
  const dir = typeof value === "string" && value.trim() ? value.trim() : ".";
  if (dir.length > 1024 || dir.includes("\0") || dir.startsWith("-")) throw fail("Invalid upload directory.", 400);
  return dir;
}

function safeUploadFilename(value) {
  const base = String(value || "").replace(/\\/g, "/").split("/").pop() || "";
  if (!base || base === "." || base === ".." || base.length > 180 || /[\x00-\x1F\x7F]/.test(base)) {
    throw fail("Choose a file name of 1–180 characters without a path.", 400);
  }
  return base;
}

function joinRemotePath(directory, filename) {
  if (directory === "." || directory === "") return filename;
  if (directory === "/") return "/" + filename;
  return directory.replace(/\/+$/, "") + "/" + filename;
}

function tempRemotePath(directory, uploadId) {
  if (!/^[a-f0-9]{32}$/.test(uploadId || "")) throw fail("Invalid upload.", 400);
  return joinRemotePath(directory, ".airshell-upload-" + uploadId);
}

function planUpload({ filename, size, directory }) {
  const dir = safeRemoteDirectory(directory);
  const name = safeUploadFilename(filename);
  const bytes = Number(size);
  if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > UPLOAD_MAX_BYTES) throw fail("File must be between 0 bytes and 5 GB.", 400);
  return { directory: dir, filename: name, size: bytes, destination: joinRemotePath(dir, name) };
}

function expectChunk(session, index, offset, length) {
  if (!Number.isInteger(index) || index < 0 || index !== session.nextIndex) throw fail("Upload chunks must be sent in order. Retry this file.", 409);
  if (!Number.isInteger(offset) || offset !== session.receivedBytes) throw fail("Upload offset does not match the bytes already received.", 409);
  const remaining = session.size - session.receivedBytes;
  if (!Number.isInteger(length) || length < 0 || length > remaining || length > UPLOAD_CHUNK_BYTES) throw fail("Upload chunk size is invalid.", 400);
  if (length !== remaining && length !== UPLOAD_CHUNK_BYTES) throw fail("Upload chunk must fill 4 MB until the final piece.", 400);
  if (session.size === 0 || length === 0) throw fail("This upload has no remaining bytes.", 400);
  return { last: length === remaining };
}

function remoteExistsScript(destPath) {
  return "if [ -e " + shellQuote(destPath) + " ]; then printf EXISTS; else printf FREE; fi";
}

function remotePrepareScript(tempPath) {
  return [
    "set -eu",
    "tmp=" + shellQuote(tempPath),
    "mkdir -p -- \"$(dirname -- \"$tmp\")\"",
    "rm -f -- \"$tmp\"",
    ": > \"$tmp\"",
    "printf OK"
  ].join("\n");
}

function remoteChunkScript(tempPath, index) {
  if (!Number.isInteger(index) || index < 0 || index > 2000000) throw fail("Invalid chunk.", 400);
  return [
    "set -eu",
    "tmp=" + shellQuote(tempPath),
    "dd of=\"$tmp\" bs=" + UPLOAD_CHUNK_BYTES + " seek=" + index + " conv=notrunc 2>/dev/null",
    "wc -c < \"$tmp\" | tr -d '[:space:]'"
  ].join("\n");
}

function remoteFinishScript(tempPath, destPath, size) {
  return [
    "set -eu",
    "tmp=" + shellQuote(tempPath),
    "dest=" + shellQuote(destPath),
    "test -f \"$tmp\"",
    "actual=$(wc -c < \"$tmp\" | tr -d '[:space:]')",
    "[ \"$actual\" = " + shellQuote(String(size)) + " ]",
    "mv -f -- \"$tmp\" \"$dest\"",
    "printf OK"
  ].join("\n");
}

function remoteAbortScript(tempPath) {
  return "rm -f -- " + shellQuote(tempPath) + "\nprintf OK";
}

module.exports = {
  UPLOAD_CHUNK_BYTES,
  UPLOAD_MAX_BYTES,
  UPLOAD_TTL_MS,
  shellQuote,
  planUpload,
  expectChunk,
  tempRemotePath,
  joinRemotePath,
  remoteExistsScript,
  remotePrepareScript,
  remoteChunkScript,
  remoteFinishScript,
  remoteAbortScript
};
