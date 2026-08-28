import assert from "node:assert/strict";
import { encodeTorrentUploadBytes } from "./upload-multipart";

const payload = Buffer.from("d4:infod4:name4:demoe e", "utf8");
const encoded = encodeTorrentUploadBytes(payload, 'ubuntu.iso.torrent');

assert.match(encoded.contentType, /^multipart\/form-data; boundary=----DelugeNova[0-9a-f]+$/);
const boundary = encoded.contentType.split("boundary=")[1];
const body = encoded.body.toString("latin1");
assert.ok(body.includes(`name="file"`));
assert.ok(body.includes(`filename="ubuntu.iso.torrent"`));
assert.ok(body.includes("application/x-bittorrent"));
assert.ok(body.includes(payload.toString("latin1")));
assert.ok(body.startsWith(`--${boundary}\r\n`));
assert.ok(body.endsWith(`\r\n--${boundary}--\r\n`));

const quoted = encodeTorrentUploadBytes(Buffer.from("x"), 'bad"name\n.torrent');
assert.ok(quoted.body.toString("latin1").includes('filename="bad_name_.torrent"'));
assert.ok(!quoted.body.toString("latin1").includes('filename="bad"name'));

console.log("upload-multipart tests passed");
