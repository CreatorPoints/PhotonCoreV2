import { OpenRouter } from "@openrouter/sdk";

// Initialize OpenRouter with API key from environment
const openRouter = new OpenRouter({
  apiKey: process.env.Key, // Make sure .env has Key=<your_key>
});

// Select DOM elements
const inputField = document.querySelector("#user-input");
const sendBtn = document.querySelector("#send-btn");
const chatContainer = document.querySelector("#chat-container");

// Function to append messages to chat
function appendMessage(text, sender = "user") {
  const messageEl = document.createElement("div");
  messageEl.className = `chat-message ${sender}-message`;
  messageEl.textContent = text;
  chatContainer.appendChild(messageEl);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Ask Trinity and get response
async function askTrinity(question) {
  appendMessage(question, "user"); // Show user message

  try {
    const completion = await openRouter.chat.send({
      model: "arcee-ai/trinity-large-preview:free",
      messages: [
        { role: "user", content: question }
      ],
      stream: true, // set true if you want streaming
    });

    const answer = completion.choices[0].message.content;
    appendMessage(answer, "bot"); // Show Trinity response
  } catch (err) {
    console.error("Error:", err);
    appendMessage("Oops! Something went wrong.", "bot");
  }
}

// Event listeners
sendBtn.addEventListener("click", () => {
  const question = inputField.value.trim();
  if (!question) return;
  inputField.value = "";
  askTrinity(question);
});

inputField.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});
