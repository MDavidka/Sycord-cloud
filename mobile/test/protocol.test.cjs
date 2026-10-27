const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/protocol.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const sandbox = { exports: {}, require, Error, JSON };
vm.runInNewContext(js, sandbox);
const { EventParser, requestMessages } = sandbox.exports;
const msg = (role, content, state = 'complete') => ({ id: `${role}-${content}`, role, content, state });

test('SSE parser handles split frames, status, tokens, approval, and completion', () => {
  const output = [];
  const parser = new EventParser(packet => output.push(packet));
  parser.push('data: {"status":"Thinking"}\r');
  parser.push('\n\r\ndata: {"token":"Hello"}\n\ndata: {"approval":{"id":"approval-1","summary":"Restart service"}}\n\ndata: {"done":true}\n\n');
  assert.deepEqual(output.map(x => x.status || x.token || x.approval?.id || x.done), ['Thinking', 'Hello', 'approval-1', true]);
});

test('SSE parser flushes a final frame without a blank-line terminator', () => {
  const output = [];
  const parser = new EventParser(packet => output.push(packet));
  parser.push('data: {"token":"last"}', true);
  assert.equal(output[0].token, 'last');
});

test('chat requests include only complete recent messages, capped at the server window', () => {
  const input = Array.from({length: 16}, (_, i) => msg(i % 2 ? 'assistant' : 'user', `message ${i}`));
  input.push(msg('assistant', 'failed text', 'failed'), msg('assistant', 'partial', 'pending'), msg('user', 'latest question'));
  const result = requestMessages(input);
  assert.equal(result.length, 12);
  assert.equal(result.at(-1).role, 'user');
  assert.equal(result[0].content, 'message 5');
});

test('assistant context is bounded without changing the displayed message', () => {
  const result = requestMessages([msg('user', 'question'), msg('assistant', 'x'.repeat(9000)), msg('user', 'follow up')]);
  assert.equal(result[1].content.length, 3000);
  assert.equal(result[2].content, 'follow up');
});

test('user messages beyond the backend contract are rejected', () => {
  assert.throws(() => requestMessages([msg('user', 'x'.repeat(3001))]), /3,000-character limit/);
});

test('requests without a latest user question are rejected', () => {
  assert.throws(() => requestMessages([msg('assistant', 'answer')]), /question is required/);
});
