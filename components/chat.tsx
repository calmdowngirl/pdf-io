"use client"

import { deleteFile, getAgentResponse, processPDF } from "@/utils/pdfProcessor"
import { useEffect, useRef, useState, ChangeEvent, SubmitEvent } from "react"

export default function Chat() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([])
  const [input, setInput] = useState("")
  const endRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const userInput = input?.trim()
    if (!userInput || !selectedFile) return

    const userMsg = { role: "user" as const, text: input.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput("")

    const response = await getAgentResponse(
      userInput,
      `${selectedFile.name}##${selectedFile.size}`,
    )

    if (response) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `${response}` },
      ])
    }
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && file.type === "application/pdf") {
      setSelectedFile(file)

      processPDF(file).then((result) => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: result
              ? `processed pdf: ${file.name}, you can now start asking me questions about it!`
              : "i could not process this pdf, please try another one",
          },
        ])
      })
    }
  }

  async function removeFile() {
    if (!selectedFile) return
    await deleteFile(`${selectedFile.name}##${selectedFile.size}`)
    setSelectedFile(null)
    setMessages([])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="w-full max-w-2xl mt-8">
      <div className="border rounded-lg shadow-sm bg-gray-50 dark:bg-zinc-900">
        <div className="p-4 h-136 overflow-y-auto" aria-live="polite">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-gray-500">
              load your pdf and ask me anything about it!
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} mb-3`}
              >
                <div
                  className={`px-4 py-2 rounded-lg max-w-[80%] ${
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        {selectedFile && (
          <div className="px-3 py-2 border-t bg-gray-100 dark:bg-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-zinc-400">
                Selected file:
              </span>
              <span className="text-sm font-medium text-black dark:text-white">
                {selectedFile.name}
              </span>
              <button
                onClick={removeFile}
                className="ml-auto text-sm text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="px-3 py-2 border-t flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`px-3 py-2 rounded 
                bg-gray-300 dark:bg-zinc-700 text-black dark:text-white hover:bg-gray-400 dark:hover:bg-zinc-600
            }`}
            >
              📎
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleSubmit(e as unknown as SubmitEvent<HTMLFormElement>)
                }
              }}
              placeholder={`${selectedFile ? `✓ ${selectedFile.name}` : "upload a pdf to get started"}`}
              className="flex-1 px-3 py-2 rounded border bg-white dark:bg-zinc-800 dark:text-zinc-50"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
