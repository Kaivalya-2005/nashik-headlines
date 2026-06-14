const kw = "संपन्न ऊर्जा";
const text = "संपन्न ऊर्जा हे उद्दिष्ट";
console.log("With \\b matches:", text.match(new RegExp("\\b" + kw + "\\b", "gi")));
console.log("With (?:^|\\s) matches:", text.match(new RegExp("(?:^|\\s|\\W)" + kw + "(?:\\s|\\W|$)", "gi")));
