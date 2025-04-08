// openai_api.js
async function callGPT(prompt) {
    // Call your own backend endpoint instead of OpenAI directly.
    const response = await fetch("/api/call-gpt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
  
    const data = await response.json();
    console.log("Server API Response:", data);
  
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error("Malformed API response");
    }
  
    return data.choices[0].message.content.trim();
  }
  