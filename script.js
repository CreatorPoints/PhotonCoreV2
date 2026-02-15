import { OpenRouter } from "@openrouter/sdk";

// Use a Node backend or serverless function to safely get the key in the browser
const openrouter = new OpenRouter({
  apiKey: process.env.Key // This works in Node or serverless environment
});

const chatContainer = document.getElementById("chat");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// Function to append messages to chat
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

// Main function to ask a question
async function askQuestion(question) {
  appendMessage(question, "user");
  appendMessage("...", "bot"); // Placeholder for bot response
  const botMsg = chatContainer.querySelector(".ai-message:last-child .ai-bubble");

  try {
    const stream = await openrouter.chat.send({
      model: "arcee-ai/trinity-large-preview:free",
      messages: [{ role: "user", content: question }],
      stream: true
    });

    let response = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        response += content;
        botMsg.textContent = response;
      }
    }

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
