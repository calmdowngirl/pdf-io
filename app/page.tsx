"use client"

import Chat from "@/components/chat"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-start py-16 px-6 bg-white dark:bg-black sm:items-start">
        <h1 className="text-2xl font-bold text-black dark:text-white">
          pdf io
        </h1>
        <Chat />
      </main>
    </div>
  )
}
