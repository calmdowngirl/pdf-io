"use server"
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { Document } from "@langchain/core/documents"
import { OpenAIEmbeddings } from "@langchain/openai"
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory"
import { getAgent } from "./agent"

let store: MemoryVectorStore | null = null
let fileKey: string | null = null

async function loadPDF(filePathOrBlob: string | Blob) {
  const loader = new PDFLoader(filePathOrBlob)
  const docs = await loader.load()
  console.log(docs.length)
  return docs
}

async function splitDocs(docs: Document<Record<string, any>>[]) {
  if (!docs?.length) return null
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 30,
  })
  const splitDocs = await splitter.splitDocuments(docs)
  console.log(splitDocs.length)
  return splitDocs
}

async function getStore() {
  if (store) return store
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-large",
    apiKey: process.env.OPENAI_API_KEY,
  })
  store = new MemoryVectorStore(embeddings)
  return store
}

export async function processPDF(filePathOrBlob: string | Blob | File) {
  const k = `${(filePathOrBlob as File).name}${(filePathOrBlob as File).size}`
  if (fileKey && fileKey === k) {
    return true
  }

  fileKey = k
  store = await getStore()
  const docs = await splitDocs(await loadPDF(filePathOrBlob))
  if (!docs?.length) {
    fileKey = null
    store.memoryVectors = []
    return false
  }

  store.memoryVectors = []
  await store.addDocuments(docs!)

  return true
}

export async function getAgentResponse(userInput: string) {
  if (!store) {
    console.log("store is null")
    return
  }
  let agent = await getAgent(store)
  let chainInputs = { messages: [{ role: "user", content: userInput }] }
  let response: string = ""

  for await (const step of await agent.stream(chainInputs, {
    streamMode: "values",
  })) {
    const lastMessage = step.messages[step.messages.length - 1]
    response += lastMessage.content.replace(userInput, "").trim()
  }
  return response
}
