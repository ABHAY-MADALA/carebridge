/*
  The no-diagnosis guard. CareBridge may describe movement away from a baseline
  and nothing more, so this has to hold in both directions: block real
  diagnostic language, and do NOT block our own disclaimers about not
  diagnosing.

  Run with: npx tsx scripts/verify-guards.ts
*/
import { containsDiagnosticLanguage, summaryIsSafe } from "../lib/ai/guards";

const CASES: [string, boolean][] = [
  // --- must be allowed -----------------------------------------------------
  ["It is not a diagnosis.", false],
  ["This information is not a diagnosis.", false],
  ["CareBridge does not diagnose conditions or give medical advice.", false],
  ["Your pain and fatigue have increased compared with your previous pattern.", false],
  ["Several health measurements have changed together.", false],
  ["Sleep went from 7h 20m to 5h 10m a night.", false],
  ["Five of my measurements moved away from my usual pattern at the same time.", false],
  ["I have had abdominal pain, and it has been getting worse.", false],
  ["The comparison uses the same luteal phase of my previous cycles.", false],

  // --- must be blocked -----------------------------------------------------
  ["You have an infection.", true],
  ["You may have appendicitis.", true],
  ["This is consistent with endometriosis.", true],
  ["Your PMOS is worsening.", true],
  ["This is probably caused by a cyst.", true],
  ["Your symptoms are due to an inflammation.", true],
  ["You should see a doctor urgently.", true],
  ["I recommend taking ibuprofen.", true],
  ["This is a serious situation.", true],
  ["These changes are diagnostic of anemia.", true],
];

let failures = 0;

console.log("\n--- Diagnostic language guard ---");
for (const [text, expected] of CASES) {
  const got = containsDiagnosticLanguage(text);
  const ok = got === expected;
  if (!ok) failures++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${expected ? "blocks" : "allows"}: "${text}"${
      ok ? "" : `  <- got blocked=${got}`
    }`,
  );
}

console.log("\n--- Whole-summary check ---");
{
  const safe = [
    { heading: "My main concern", body: "I have had abdominal pain and fatigue." },
    { heading: "What has changed", body: "Pain went from 4 to 7 out of 10." },
  ];
  const unsafe = [
    { heading: "My main concern", body: "I have had abdominal pain." },
    { heading: "What this means", body: "This is consistent with an ovarian cyst." },
  ];
  const a = summaryIsSafe(safe);
  const b = summaryIsSafe(unsafe);
  console.log(`  ${a ? "PASS" : "FAIL"}  a clean summary passes`);
  console.log(`  ${!b ? "PASS" : "FAIL"}  one bad section rejects the whole summary`);
  if (!a) failures++;
  if (b) failures++;
}

console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
