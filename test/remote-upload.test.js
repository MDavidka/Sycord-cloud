"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const upload = require("../lib/remote-upload");

const id = "ab".repeat(16);

test("keeps upload names inside the chosen directory", () => {
  const planned = upload.planUpload({ filename: "../../etc/passwd", size: 12, directory: "/var/tmp" });
  assert.equal(planned.filename, "passwd");
  assert.equal(planned.destination, "/var/tmp/passwd");
  assert.equal(upload.tempRemotePath("/var/tmp", id), "/var/tmp/.airshell-upload-" + id);
  assert.equal(upload.planUpload({ filename: "notes.txt", size: 0, directory: "." }).destination, "notes.txt");
});

test("rejects path options, control characters, and files over 5 GB", () => {
  assert.throws(() => upload.planUpload({ filename: "ok.txt", size: 1, directory: "-rf" }), /directory/);
  assert.throws(() => upload.planUpload({ filename: "bad\nname", size: 1, directory: "." }), /file name/);
  assert.throws(() => upload.planUpload({ filename: ".", size: 1, directory: "." }), /file name/);
  assert.throws(() => upload.planUpload({ filename: "big.bin", size: upload.UPLOAD_MAX_BYTES + 1, directory: "." }), /5 GB/);
});

test("requires in-order 4 MB chunks and a short final chunk", () => {
  const session = { nextIndex: 0, receivedBytes: 0, size: upload.UPLOAD_CHUNK_BYTES + 10 };
  assert.equal(upload.expectChunk(session, 0, 0, upload.UPLOAD_CHUNK_BYTES).last, false);
  assert.throws(() => upload.expectChunk(session, 1, 0, 10), /in order/);
  session.nextIndex = 1;
  session.receivedBytes = upload.UPLOAD_CHUNK_BYTES;
  assert.equal(upload.expectChunk(session, 1, upload.UPLOAD_CHUNK_BYTES, 10).last, true);
  assert.throws(() => upload.expectChunk(session, 1, upload.UPLOAD_CHUNK_BYTES, 9), /4 MB/);
});

test("quotes remote paths so names cannot break the shell script", () => {
  const planned = upload.planUpload({ filename: "a'b$(rm).txt", size: 3, directory: "/tmp/o'brien" });
  const script = upload.remoteFinishScript(upload.tempRemotePath(planned.directory, id), planned.destination, planned.size);
  assert.match(script, /'\/tmp\/o'\\''brien\/a'\\''b\$\(rm\)\.txt'/);
  assert.match(upload.remotePrepareScript(upload.tempRemotePath(".", id)), /printf OK/);
  assert.match(upload.remoteChunkScript("/tmp/file", 2), /bs=4194304 seek=2/);
});
