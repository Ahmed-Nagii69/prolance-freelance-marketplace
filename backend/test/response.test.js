const test = require("node:test");
const assert = require("node:assert/strict");

const sendResponse = require("../src/utils/response");

const createFakeResponse = () => {
  const res = {
    statusCode: 0,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

test("sendResponse builds a success envelope", () => {
  const res = createFakeResponse();
  const result = sendResponse(res, 200, "OK", { foo: 1 });
  assert.equal(result, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    message: "OK",
    data: { foo: 1 },
  });
});

test("sendResponse attaches an error code when provided", () => {
  const res = createFakeResponse();
  sendResponse(res, 400, "Bad input", null, { code: "VALIDATION_ERROR" });
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.deepEqual(res.body.error, { code: "VALIDATION_ERROR" });
});

test("sendResponse omits error on success responses", () => {
  const res = createFakeResponse();
  sendResponse(res, 200, "OK", null);
  assert.equal("error" in res.body, false);
});