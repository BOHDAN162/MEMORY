// eslint-disable-next-line @typescript-eslint/no-var-requires
const assert: typeof import("node:assert/strict") = require("node:assert/strict");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { RERANK_BATCH_SCHEMA, parseModelJson }: typeof import("./rerank") = require("./rerank");

const tests = [
  () => {
    const content =
      '[{"id":"1","score":0.9,"is_ad":false,"is_offtopic":false,"reason":"matches interest"}]';
    const parsed = parseModelJson(content);
    const validated = RERANK_BATCH_SCHEMA.parse(parsed);

    assert.equal(validated.length, 1);
    assert.equal(validated[0].id, "1");
    assert.equal(validated[0].score, 0.9);
  },
  () => {
    const content = "```json\n[{\"id\":\"42\",\"score\":0.5}]\n```";
    const parsed = parseModelJson(content);
    const validated = RERANK_BATCH_SCHEMA.parse(parsed);

    assert.equal(validated[0].id, "42");
  },
  () => {
    const content = '{"items":[{"id":"2","score":1,"is_ad":false}]}';
    const parsed = parseModelJson(content);

    assert.throws(() => RERANK_BATCH_SCHEMA.parse(parsed));
  },
];

for (const run of tests) {
  run();
}
