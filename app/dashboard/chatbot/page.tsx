import AdminChatbot from '@/components/AdminChatbot'

export default function ChatbotPage() {
  return (
    <div className="p-6 lg:p-8 h-full flex flex-col">
      <div className="mb-6">
        <p className="text-xs text-stone-500 uppercase tracking-widest mb-1">Hallinta</p>
        <h1 className="text-2xl font-semibold text-stone-100">AI-avustaja</h1>
        <p className="text-sm text-stone-500 mt-1">
          Muokkaa ruokalistaa kirjoittamalla suomeksi. Esim. &ldquo;Lisää maanantain keitto: Lohikeitto G,L&rdquo;
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <AdminChatbot />
      </div>
    </div>
  )
}
