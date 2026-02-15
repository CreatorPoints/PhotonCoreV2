const chatContainer = document.getElementById("chat");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// Append messages
function appendMessage(content, sender = "user") {
  const msg = document.createElement("div");
  msg.className = "ai-message" + (sender === "user" ? " user-message" : "");
  msg.innerHTML = `
    <div class="ai-avatar">${sender === "user" ? "🧑" : "🤖"}</div>
    <div class="ai-bubble">${content}</div>
  `;
  chatContainer.appendChild(msg);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Ask a question via REST
async function askQuestion(question) {
  appendMessage(question, "user");
  appendMessage("...", "bot"); // Placeholder
  const botMsg = chatContainer.querySelector(".ai-message:last-child .ai-bubble");

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.Key || "<YOUR_KEY_HERE>"}`
      },
      body: JSON.stringify({
        model: "arcee-ai/trinity-large-preview:free",
        messages: [{ role: "user", content: question }]
      })
    });

    const data = await res.json();
    botMsg.textContent = data.choices[0].message.content;

  } catch (err) {
    botMsg.textContent = "Error: " + err.message;
  }
}

// Event listeners
sendBtn.addEventListener("click", () => {
  const question = userInput.value.trim();
  if (!question) return;
  userInput.value = "";
  askQuestion(question);
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});
