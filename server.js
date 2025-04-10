// server.js
const express = require("express");
const fetch = require("node-fetch"); // For Node versions <18. For Node 18+ you can use built-in fetch.
const path = require("path");
require("dotenv").config(); // Loads .env file

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("Please set the OPENAI_API_KEY environment variable in .env");
  process.exit(1);
}

app.use(express.json());
// Serve static files from the public folder
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/call-gpt", async (req, res) => {
  const { prompt, model = "gpt-4", temperature = 0 } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  try {
    console.log(`Calling OpenAI API with model: ${model}, temperature: ${temperature}`);
    
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model, // Use the requested model
        messages: [{ role: "user", content: prompt }],
        temperature: temperature
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API Error:", errorText);
      return res.status(openaiResponse.status).json({ error: errorText });
    }

    const data = await openaiResponse.json();
    res.json(data);
  } catch (err) {
    console.error("Error calling OpenAI API:", err);
    res.status(500).json({ error: err.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});