const test = require("node:test");
const assert = require("node:assert/strict");

const Proposal = require("../src/models/Proposal");

const build = (overrides = {}) =>
  new Proposal({
    project: "65b1000000000000000000a1",
    freelancer: "65b1000000000000000000a2",
    coverLetter: "A cover letter.",
    price: 500,
    deliveryTime: 10,
    ...overrides,
  });

test("a new proposal starts unedited", () => {
  assert.equal(build().editCount, 0);
});

test("the first edit is within the ceiling", () => {
  const proposal = build({ editCount: 1 });
  assert.equal(proposal.validateSync()?.errors.editCount, undefined);
});

test("a second edit is refused by the schema", () => {
  // The controller also gates on editCount, so the limit cannot be raised by
  // writing to the field directly.
  const proposal = build({ editCount: 2 });
  assert.ok(proposal.validateSync()?.errors.editCount);
});

test("a negative edit count is refused by the schema", () => {
  const proposal = build({ editCount: -1 });
  assert.ok(proposal.validateSync()?.errors.editCount);
});

test("only the editable fields move on an edit", () => {
  const proposal = build();
  proposal.coverLetter = "A revised cover letter.";
  proposal.price = 750;
  proposal.deliveryTime = 12;
  assert.equal(proposal.validateSync(), undefined);
  assert.equal(proposal.project.toString(), "65b1000000000000000000a1");
  assert.equal(proposal.freelancer.toString(), "65b1000000000000000000a2");
  assert.equal(proposal.status, "PENDING");
});
