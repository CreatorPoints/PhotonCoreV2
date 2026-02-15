import { OpenRouter } from "@openrouter/sdk";

const openrouter = new OpenRouter({
  apiKey: process.env.Key
});

async function askQuestion(question) {
  // Stream the response
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
      console.log(content); // live output
    }

    // Reasoning tokens in final chunk
    if (chunk.usage) {
      console.log("\nReasoning tokens:", chunk.usage.reasoningTokens);
    }
  }

  return response;
}

// Example usage
(async () => {
  const answer = await askQuestion("How many r's are in the word 'strawberry'?");
  console.log("\nFinal Answer:", answer);
})();
