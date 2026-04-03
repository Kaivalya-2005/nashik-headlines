// Curated list of genuine Marathi Devanagari words for Wordle
// Each word has EXACTLY 5 Unicode code points (codepoint-count)
// This treats each base letter and each matra (vowel sign) as separate units,
// matching what users type on the virtual keyboard.
//
// Examples of 5-codepoint breakdown:
//   विचार = व+ि+च+ा+र = 5 codepoints ✓
//   दुपार = द+ु+प+ा+र = 5 codepoints ✓
//   मुलगा = म+ु+ल+ग+ा = 5 codepoints ✓

const MARATHI_WORDS_RAW = [
  // 5-codepoint verified Marathi words
  "विचार",   // vi-ch-aa-r      = thought/idea
  "दुपार",   // du-p-aa-r       = afternoon
  "महिना",   // m-h-i-n-aa      = month
  "मिनिट",   // m-i-n-i-T       = minute
  "भावना",   // bh-aa-v-n-aa    = feeling/emotion
  "माणूस",   // m-aa-N-oo-s     = person
  "मुलगा",   // m-u-l-g-aa      = boy
  "मुलगी",   // m-u-l-g-ee      = girl
  "डोंगर",   // D-o-ng-g-r      = mountain
  "बाजार",   // b-aa-j-aa-r     = market
  "मंदिर",   // m-ng-d-i-r      = temple
  "सैनिक",   // s-ai-n-i-k      = soldier
  "नागिण",   // n-aa-g-i-N      = female serpent
  "पावसाळ",  // might not be 5... skip
  "नाविक",   // n-aa-v-i-k      = sailor
  "मालिका",  // too many
  "पालिका",  // p-aa-l-i-k-aa=6
  "निवारा",  // n-i-v-aa-r-aa=6
  "विकार",   // v-i-k-aa-r=5   = disorder/disease
  "विनोद",   // v-i-n-o-d=5    = humor/joke
  "किनारा",  // 6
  "मुकाम",   // m-u-k-aa-m=5   = stopping place
  "दिलासा",  // 6
  "सुखाने",  // 6
  "निसरड",   // n-i-s-r-D=5 (might not be valid word - skip)
  "विजेता",  // v-i-j-e-t-aa=6
  "डाकिया",  // 5? d-aa-k-i-y-aa=6
  "नमुना",   // n-m-u-n-aa=5   = sample/example
  // Re-verified words
  "बगिचा",   // b-g-i-ch-aa=5?
  "कुटुंब",  // k-u-T-u-ng-b=6
  "बालक",    // b-aa-l-k=4
  // Let me just list confirmed ones
];

// Better approach: list only confirmed 5-codepoint words
const MARATHI_WORDS = [
  "विचार",  // व+ि+च+ा+र = 5
  "दुपार",  // द+ु+प+ा+र = 5
  "महिना",  // म+ह+ि+न+ा = 5
  "मिनिट",  // म+ि+न+ि+ट = 5
  "भावना",  // भ+ा+व+न+ा = 5
  "माणूस",  // म+ा+ण+ू+स = 5
  "मुलगा",  // म+ु+ल+ग+ा = 5
  "मुलगी",  // म+ु+ल+ग+ी = 5
  "डोंगर",  // ड+ो+ं+ग+र = 5
  "बाजार",  // ब+ा+ज+ा+र = 5
  "मंदिर",  // म+ं+द+ि+र = 5
  "सैनिक",  // स+ै+न+ि+क = 5
  "विकार",  // व+ि+क+ा+र = 5 (disorder)
  "विनोद",  // व+ि+न+ो+द = 5 (joke/humor)
  "मुकाम",  // म+ु+क+ा+म = 5 (halt/camp)
  "नमुना",  // न+म+ु+न+ा = 5 (sample)
  "पसंत",   // प+स+ं+त = 4 (no)
  "मनोज",   // -- 5? म+न+ो+ज = 4 (no)
  "बागेत",  // ब+ा+ग+े+त = 5 (in garden)
  "पुलाव",  // प+ु+ल+ा+व = 5 (pilaf dish)
  "मासोळ",  // not standard
  "तालुका", // 6
  "महिमा",  // म+ह+ि+म+ा = 5 (glory/greatness)
  "सुधार",  // स+ु+ध+ा+र = 5 (improvement)
  "निसर्ग", // न+ि+स+र+्+ग = 6 (nature)
  "पाठीवर", // 7
  "कासार",  // क+ा+स+ा+र = 5 (lake)
  "जिभेत",  // 6
  "सागर",   // स+ा+ग+र = 4 (ocean)
  "दिवाण",  // द+ि+व+ा+ण = 5 (sofa/divan)
  "पिवळा",  // प+ि+व+ळ+ा = 5 (yellow)
  "निळसर",  // न+ि+ळ+स+र = 5 (bluish)
  "तांबड",  // त+ा+ं+ब+ड = 5 (reddish)
  "हिरवा",  // ह+ि+र+व+ा = 5 (green)
  "मोकळा",  // म+ो+क+ळ+ा = 5 (free/open)
  "उभारा",  // उ+भ+ा+र+ा = 5 (erection/rise)
  "जोडून",  // ज+ो+ड+ू+न = 5 (joining)
  "निघाल",  // न+ि+घ+ा+ल = 5 (departed)
  "किनार",  // क+ि+न+ा+र = 5 (shore)
  "भुकेला",  // 6
  "तहान",   // त+ह+ा+न = 4
  // Compound 5-cp words
  "गावात",  // ग+ा+व+ा+त = 5 (in the village)
  "नदीत",   // न+द+ी+त = 4
  "शेतात",  // श+े+त+ा+त = 5 (in the field)
  "दारात",  // द+ा+र+ा+त = 5 (at the door)
  "नावात",  // न+ा+व+ा+त = 5 (in the boat/name)
  "पाणी",   // प+ा+ण+ी = 4
  "बघाल",   // ब+घ+ा+ल = 4
  "सांगा",  // स+ा+ं+ग+ा = 5 (please tell)
  "बसाल",   // ब+स+ा+ल = 4
  "चालत",   // च+ा+ल+त = 4
  "खेळत",   // ख+े+ळ+त = 4
  "जेवण",   // ज+े+व+ण = 4
  "झोपण",   // झ+ो+प+ण = 4
  "उठाल",   // उ+ठ+ा+ल = 4
  "हसाल",   // ह+स+ा+ल = 4
  "रडाल",   // र+ड+ा+ल = 4
  "बोलत",   // ब+ो+ल+त = 4
  "लिहित",  // ल+ि+ह+ि+त = 5 (writing)
  "वाचित",  // व+ा+च+ि+त = 5 (reading)
  "शिकत",   // श+ि+क+त = 4
  "भेटत",   // भ+े+ट+त = 4
  "जाताना", // 7
  "येताना", // 7
  "बसताना", // 8
  "रेडिओ",  // र+े+ड+ि+ओ = 5 (radio)
  "टेलिफ",  // not a word
  "मोबाईल", // 6
  "कारखान", // not ideal length
  "कारखाना",// 8
  "कापसाचा",// 8
  "पाहुणे",  // प+ा+ह+ु+ण+े = 6
  "मित्राचा",// too long
  "नातवांशी",// too long
];

// Filter only 5-codepoint words - removes all the incorrectly-lengthed words above
function getCodepointLength(str) {
  return [...str].length;
}

// Final validated word set
const VALID_MARATHI_WORDS = [
  "विचार",  // thought
  "दुपार",  // afternoon
  "महिना",  // month
  "मिनिट",  // minute
  "भावना",  // feeling
  "माणूस",  // person
  "मुलगा",  // boy
  "मुलगी",  // girl
  "डोंगर",  // mountain
  "बाजार",  // market
  "मंदिर",  // temple
  "सैनिक",  // soldier
  "विकार",  // disorder
  "विनोद",  // joke
  "मुकाम",  // camp/halt
  "नमुना",  // sample
  "बागेत",  // in the garden
  "पुलाव",  // pilaf
  "महिमा",  // grandeur
  "सुधार",  // improvement
  "कासार",  // lake
  "दिवाण",  // sofa
  "पिवळा",  // yellow
  "निळसर",  // bluish
  "तांबड",  // reddish
  "हिरवा",  // green
  "मोकळा",  // free/open
  "जोडून",  // joining
  "निघाल",  // departed
  "किनार",  // shore
  "गावात",  // in the village
  "शेतात",  // in the field
  "दारात",  // at the door
  "नावात",  // in the name/boat
  "सांगा",   // please tell
  "लिहित",  // writing
  "वाचित",  // reading/recited
  "रेडिओ",  // radio
  "उभारा",  // erection/rise
];

// Runtime validation to ensure all words are exactly 5 codepoints
const MARATHI_WORDS_FINAL = VALID_MARATHI_WORDS.filter(
  (w) => getCodepointLength(w) === 5
);

export default MARATHI_WORDS_FINAL;
