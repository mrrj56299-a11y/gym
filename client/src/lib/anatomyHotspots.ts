export type Hotspot = { slug: string; part: string; cx: number; cy: number; rx: number; ry: number };

export const ANATOMY_IMAGE_SIZE = { width: 1408, height: 768 };

const FRONT_AXIS = 365;
const BACK_AXIS = 1055;

function pair(slug: string, part: string, cx: number, cy: number, rx: number, ry: number, axis: number): Hotspot[] {
  return [
    { slug, part, cx, cy, rx, ry },
    { slug, part, cx: axis * 2 - cx, cy, rx, ry },
  ];
}

function single(slug: string, part: string, cx: number, cy: number, rx: number, ry: number): Hotspot[] {
  return [{ slug, part, cx, cy, rx, ry }];
}

export const HOTSPOTS: Record<"front" | "back", Hotspot[]> = {
  front: [
    ...pair("chest", "chest-upper", 340, 190, 32, 12, FRONT_AXIS),
    ...pair("chest", "chest-mid", 340, 212, 34, 13, FRONT_AXIS),
    ...pair("chest", "chest-lower", 345, 235, 28, 10, FRONT_AXIS),
    ...pair("shoulders", "front-delts", 288, 182, 15, 18, FRONT_AXIS),
    ...pair("shoulders", "side-delts", 268, 192, 10, 20, FRONT_AXIS),
    ...pair("biceps", "biceps-long", 283, 240, 12, 30, FRONT_AXIS),
    ...pair("forearms", "forearm-flexors", 248, 320, 14, 42, FRONT_AXIS),
    ...single("abs", "abs-rectus", 365, 268, 22, 50),
    ...pair("abs", "abs-obliques", 324, 272, 14, 40, FRONT_AXIS),
    ...pair("quadriceps", "quads-vastus-lateralis", 307, 470, 14, 60, FRONT_AXIS),
    ...pair("quadriceps", "quads-rectus-femoris", 330, 460, 16, 60, FRONT_AXIS),
    ...pair("quadriceps", "quads-vastus-medialis", 350, 510, 12, 24, FRONT_AXIS),
    ...pair("adductors", "adductors-middle", 355, 455, 9, 45, FRONT_AXIS),
  ],
  back: [
    ...pair("shoulders", "rear-delts", 972, 185, 16, 20, BACK_AXIS),
    ...single("back", "back-traps", 1055, 180, 50, 20),
    ...single("back", "back-upper", 1055, 228, 26, 20),
    ...single("back", "back-mid", 1055, 265, 24, 18),
    ...single("back", "back-lower", 1055, 312, 22, 24),
    ...pair("back", "back-lats", 1005, 258, 24, 55, BACK_AXIS),
    ...pair("triceps", "triceps-long", 950, 245, 14, 40, BACK_AXIS),
    ...pair("forearms", "forearm-extensors", 925, 325, 16, 42, BACK_AXIS),
    ...pair("glutes", "glute-medius", 985, 352, 20, 22, BACK_AXIS),
    ...pair("glutes", "glute-maximus", 1027, 398, 28, 36, BACK_AXIS),
    ...pair("hamstrings", "hamstrings-biceps-femoris", 997, 488, 15, 58, BACK_AXIS),
    ...pair("hamstrings", "hamstrings-semitendinosus", 1027, 488, 10, 55, BACK_AXIS),
    ...pair("calves", "calves-gastrocnemius", 1010, 590, 22, 32, BACK_AXIS),
    ...pair("calves", "calves-soleus", 1010, 640, 18, 26, BACK_AXIS),
  ],
};
