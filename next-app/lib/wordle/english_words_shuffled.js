import ENGLISH_WORDS from './english_words';

// Extra common 5-letter words (uppercase)
const EXTRA_ENGLISH = [
  "ABIDE","ADULT","AGLOW","AMBER","ANNEX","AROMA","ATLAS","AUDIO",
  "BASIL","BEVEL","BRISK","BROIL","CANOE","CHILI","CHORE","CIVIL",
  "CLASP","CLEAT","CLOVE","CORNY","CROSS","CUPID","CURRY","DOZEN",
  "EPOCH","EPOXY","FABLE","FAINT","FANCY","FERRY","FILMY","FORAY",
  "FRANK","FROST","GRAZE","GROUT","HASTE","HAUNT","HONEY","HUMAN",
  "ICING","IMAGE","JELLY","JOKER","JUICE","KARMA","KAYAK","LAPSE",
  "LEASH","LEMUR","LIMBO","LIVID","LOFTY","LUMEN","MAGMA","MAPLE",
  "MERCY","MIRTH","MOVER","NAIVE","NOBLE","NURSE","OASIS","OCTAL",
  "OPERA","PAINT","PANIC","PEARL","PENCE","PILOT","PIVOT","PLUSH",
  "PRISM","QUAIL","QUIRK","RANCH","RALLY","RAPID","REEDS","REMIX",
  "REPEL","RHINO","RIVAL","ROAST","SABLE","SALTY","SAVOR","SCALP",
  "SCENE","SKEIN","SLOSH","SMASH","SMIRK","SONIC","SPECK","SPICE",
  "SPORE","STUMP","SWOOP","TANGO","TAPED","TIDAL","TIMES","TOWER",
  "TRACE","TRAIN","TREND","TRICK","TRITE","UNITE","VAPID","VOGUE",
  "VOICE","WAGER","WALTZ","WELSH","WHISK","WHOLE","WIDEN","WISER",
  "YOKEL","YUMMY"
];

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// create pool, dedupe (keep first occurrence), then shuffle
const pool = ENGLISH_WORDS.concat(EXTRA_ENGLISH);
const deduped = Array.from(new Set(pool));
const SHUFFLED = shuffleArray(deduped);

export default SHUFFLED;
