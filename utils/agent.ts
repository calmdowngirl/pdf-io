"use server"

import { createAgent, dynamicSystemPromptMiddleware } from "langchain"
import { SystemMessage } from "@langchain/core/messages"
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory"
import { ChatOpenAI } from "@langchain/openai"
import { Document } from "@langchain/core/documents"

const model = new ChatOpenAI({
  model: "gpt-4.1",
  apiKey: process.env.OPENAI_API_KEY,
})

export async function getAgent(
  store: MemoryVectorStore,
  filter?: ((doc: Document<Record<string, any>>) => boolean) | undefined,
) {
  return createAgent({
    model,
    tools: [],
    middleware: [
      dynamicSystemPromptMiddleware(async (state) => {
        const lastQuery =
          state.messages[state.messages.length - 1].content.toString()

        const retrievedDocs = await store.similaritySearch(
          lastQuery,
          10,
          filter,
        )

        const docsContent = retrievedDocs
          .map((doc) => doc.pageContent)
          .join("\n\n")

        const systemMessage = new SystemMessage(
          `You are a specialist only gives answer when the topic is within the context:\n\n${docsContent}`,
        )
        return systemMessage
      }),
    ],
  })
}
