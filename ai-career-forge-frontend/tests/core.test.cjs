const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadPureModule(name) {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "src", "lib", name + ".ts"),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const exports = {};
  vm.runInNewContext(compiled.outputText, { exports });
  return exports;
}
const { demoMatchScore, demoJobs, demoCoverNote } = loadPureModule("demo");
const { hasPreparedDocuments, formatAppliedDate } =
  loadPureModule("applicationState");

test("Demo relevance has no minimum floor and does not claim probability", () => {
  assert.equal(demoMatchScore([], ["Java", "React"]), 0);
  assert.equal(demoMatchScore(["Python"], ["Java", "React"]), 0);
  assert.equal(demoMatchScore(["Java"], ["Java", "React"]), 50);
  assert.equal(
    demoMatchScore(["Java", "React", "Python"], ["Java", "React"]),
    100,
  );
  assert.equal(demoMatchScore(["Java"], []), 0);
});
test("A saved application with documents is prepared; status alone is insufficient", () => {
  const documents = {
    status: "SAVED",
    tailoredResumeS3Url: "https://example.com/resume.pdf",
    coverLetterText: "Reviewed cover letter",
    emailIntroduction: "Reviewed introduction",
    interviewPrepText: "Interview notes",
  };
  assert.equal(hasPreparedDocuments(documents), true);
  assert.equal(hasPreparedDocuments({ status: "APPLIED" }), false);
  assert.equal(
    hasPreparedDocuments({ ...documents, tailoredResumeS3Url: "preparing" }),
    false,
  );
  assert.equal(
    hasPreparedDocuments({ ...documents, emailIntroduction: " " }),
    false,
  );
});
test("Unsubmitted and invalid dates never display the epoch or Invalid Date", () => {
  assert.equal(formatAppliedDate(null), "Not recorded as applied");
  assert.equal(formatAppliedDate(undefined), "Not recorded as applied");
  assert.equal(formatAppliedDate("invalid"), "Application date unavailable");
  assert.match(formatAppliedDate("2026-11-06T00:00:00Z"), /^Applied /);
});
test("The local demo draft uses only selected overlapping skills and labels fictional data", () => {
  const text = demoCoverNote(
    demoJobs[0],
    ["React", "Python"],
    "Frontend developer",
  );
  assert.match(text, /FICTIONAL DEMO/);
  assert.match(text, /overlap with this role are React/);
  assert.doesNotMatch(
    text,
    /Python|Spring Boot|years of experience|increased.*%/,
  );
  assert.match(text, /has not been sent/);
});
