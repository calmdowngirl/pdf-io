"use server"
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { Document } from "@langchain/core/documents"
import { OpenAIEmbeddings } from "@langchain/openai"
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory"
import { getAgent } from "./agent"

let fileMap = new Map<string, Document<Record<string, any>>[] | null>()
let store: MemoryVectorStore

async function loadPDF(filePathOrBlob: string | Blob) {
  const loader = new PDFLoader(filePathOrBlob)
  const docs = await loader.load()
  console.log(docs.length)
  return docs
}

async function splitDocs(docs: Document<Record<string, any>>[]) {
  if (!docs?.length) return null
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 50,
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

async function processPDF(
  filePathOrBlob: string | Blob | File,
): Promise<boolean> {
  if (!store) await getStore()

  const k = `${(filePathOrBlob as File).name}##${(filePathOrBlob as File).size}`
  if (fileMap.has(k)) {
    return true
  }

  const docs = await splitDocs(await loadPDF(filePathOrBlob))
  if (!docs?.length) {
    fileMap.delete(k)
    return false
  }

  fileMap.set(k, docs)

  if (!isFileInStore(k)) await store.addDocuments(docs)
  return true
}

async function getAgentResponse(userInput: string, fileKey: string) {
  if (!store) {
    console.log("store is null")
    return
  }

  if (!userInput || !fileKey) return

  const docs = fileMap.get(fileKey)
  if (!docs || !docs.length) return
  if (!isFileInStore(fileKey)) await store.addDocuments(docs)

  let agent = await getAgent(store, filterDocs(docs[0].metadata))
  let chainInputs = { messages: [{ role: "user", content: userInput }] }
  let response: string = ""

  for await (const step of await agent.stream(chainInputs, {
    streamMode: "values",
  })) {
    const lastMessage = step.messages[step.messages.length - 1]
    response += lastMessage.content
  }
  return response.replace(userInput, "").trim()
}

function isFileInStore(fileKey: string) {
  const docs = fileMap.get(fileKey)
  const mv = store.memoryVectors
  if (!mv?.length || !docs?.length) return false
  return !!mv.find((elem) => elem.content === docs[0].pageContent)
}

async function deleteFile(fileKey: string) {
  const docs = fileMap.get(fileKey)
  if (!docs?.length) return false

  const title = docs[0].metadata?.pdf?.info?.Title
  const author = docs[0].metadata?.pdf?.info?.Author

  if (store) {
    const mv = store?.memoryVectors
    store.memoryVectors = mv.filter(
      (elem) =>
        elem.metadata?.pdf?.info?.Title !== title &&
        elem.metadata?.pdf?.info?.Author !== author,
    )
  }
}

function filterDocs(metadata: Record<string, any>) {
  return (doc: Document<Record<string, any>>) =>
    doc.metadata?.pdf?.info?.Title === metadata?.pdf?.info?.Title &&
    doc.metadata?.pdf?.info?.Author === metadata?.pdf?.info?.Author
}

export { processPDF, getAgentResponse, deleteFile }
