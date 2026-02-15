import OpenRouter from "https://cdn.openrouter.ai/openrouter.js";

// Initialize OpenRouter client
const openRouterClient = new OpenRouter({
  apiKey: "YOUR_API_KEY_HERE", // <-- Replace with your OpenRouter key
});

// DOM references
const chatArea = document.getElementById("chat-area");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const chatHistory = document.getElementById("chat-history");

// Add a message to UI
function addMessage(message, sender = "ai") {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("ai-message", sender === "user" ? "user-message" : "ai-bot-message");
  
  const avatar = document.createElement("div");
  avatar.classList.add("ai-avatar");
  avatar.textContent = sender === "user" ? "U" : "AI";
  
  const bubble = document.createElement("div");
  bubble.classList.add("ai-bubble");
  bubble.textContent = message;

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(bubble);
  chatArea.appendChild(msgDiv);
  chatArea.scrollTop = chatArea.scrollHeight;

  // Add to sidebar chat history
  if(sender === "user"){
    const historyItem = document.createElement("div");
    historyItem.classList.add("chat-history-item");
    historyItem.textContent = message;
    chatHistory.appendChild(historyItem);
  }
}

// Send user message to OpenRouter using Trinity Large Preview
async function sendMessageToAI(message) {
  try {
    const response = await openRouterClient.chat({
      model: "arcee-ai/trinity-large-preview:free",
      messages: [{ role: "user", content: message }],
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.error("OpenRouter error:", err);
    return "Oops, something went wrong!";
  }
}

// Event listener
sendBtn.addEventListener("click", async () => {
  const message = userInput.value.trim();
  if (!message) return;
  addMessage(message, "user");
  userInput.value = "";

  const aiReply = await sendMessageToAI(message);
  addMessage(aiReply, "ai");
});

// Optional: Enter key to send
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});
