const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/ai/generate-article", async (req, res) => {
  const { prompt, topic, focusKeyword } = req.body;

  const fullPrompt = prompt
    .replace("[Write Topic Here]", topic || "General News")
    .replace("[Write Focus Keyphrase]", focusKeyword || topic || "News");

  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "mistral",
      prompt: fullPrompt,
      stream: false
    });

    res.json({ response: response.data.response });
  } catch (error) {
    console.error("AI Generation Error:", error.message);
    res.status(500).json({ error: "Failed to generate AI content" });
  }
});

module.exports = router;
