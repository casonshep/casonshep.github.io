// Verifies the reverse-playback design:
// 1. frame 0 (the displayed final state) has every text cell alive
// 2. at frame N (the intro's first visible frame) the letters are consumed
//    by chaos — text regions look statistically like the rest of the board
// 3. chaos reaches every quadrant so no region sits static during the intro
import { recordFrames } from "file:///E:/my_website/src/lib/gameOfLife.ts";
import { buildScene, gridRequirements } from "file:///E:/my_website/src/lib/lifeScene.ts";

const links = [
  { label: "GITHUB", href: "#", description: "" },
  { label: "LINKEDIN", href: "#", description: "" },
  { label: "EMAIL", href: "#", description: "" },
];
const GENERATIONS = 132;

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

console.log("gridRequirements:", JSON.stringify(gridRequirements("CASON", links)));

let failures = 0;
// Dimensions mirror what the component derives for a 1440x900 desktop
// (row arrangement) and a 390x844 phone (stacked arrangement).
for (const [cols, rows, name] of [
  [378, 236, "desktop"],
  [152, 329, "phone"],
]) {
  for (let s = 1; s <= 3; s++) {
    const rand = mulberry32(s * 7919 + cols);
    const scene = buildScene(cols, rows, "CASON", links, rand);
    const frames = recordFrames(scene.seed, cols, rows, GENERATIONS);
    const first = frames[0];
    const last = frames[GENERATIONS];

    // 1. text intact in the final displayed state
    let textCells = 0, textAliveAtStart = 0, textAliveAtEnd = 0;
    for (let i = 0; i < scene.textMask.length; i++) {
      if (scene.textMask[i] !== 2) continue;
      textCells++;
      if (first[i]) textAliveAtStart++;
      if (last[i]) textAliveAtEnd++;
    }

    // 2. text-region survival ratio at the chaos end — near 1.0 would mean
    //    the letters sat untouched and are visible from the intro's start
    const textSurvival = textAliveAtEnd / textCells;

    // 3. density per quadrant at the chaos end
    const qd = [0, 0, 0, 0];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (last[y * cols + x]) {
          qd[(y < rows / 2 ? 0 : 2) + (x < cols / 2 ? 0 : 1)]++;
        }
      }
    }
    const qDensity = qd.map((c) => c / (cols * rows / 4));

    const okText = textAliveAtStart === textCells;
    const okSurvival = textSurvival < 0.7;
    const okQuadrants = qDensity.every((d) => d > 0.03);
    if (!okText || !okSurvival || !okQuadrants) failures++;

    console.log(
      `${name} ${cols}x${rows} seed=${s}: textIntact=${okText}` +
        ` chaosTextSurvival=${textSurvival.toFixed(2)}(<0.7:${okSurvival})` +
        ` quadrantDensity=[${qDensity.map((d) => d.toFixed(2)).join(",")}](>0.03:${okQuadrants})`,
    );
  }
}
if (failures > 0) {
  console.log(`FAILURES: ${failures}`);
  process.exitCode = 1;
} else {
  console.log("ALL OK");
}
