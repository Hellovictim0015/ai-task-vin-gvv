'use client'

import { useState } from 'react'
import { Sparkles, Send, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { BASE_URL } from '@/lib/api';
export default function DailyTodoButton() {

    const [loading, setLoading] = useState(false)
    const [todoData, setTodoData] = useState(null)
    const [showModal, setShowModal] = useState(false)

    async function generateTodo(sendWhatsapp = false) {

        setLoading(true)

        try {

            const token = localStorage.getItem('token')

            const res = await fetch(
                `${BASE_URL}/daily-todo/generate?send_whatsapp=${sendWhatsapp}`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            const data = await res.json()

            console.log(data)

            setTodoData(data)
            setShowModal(true)

            if (sendWhatsapp) {
                toast.success('WhatsApp par bhi send ho gaya!')
            }

        } catch (error) {

            console.log(error)

            toast.error('Error generating to-do list')

        } finally {

            setLoading(false)

        }
    }

    return (
        <>
            {/* BUTTON */}

            <button
                onClick={() => generateTodo(false)}
                disabled={loading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700
                text-white px-4 py-2.5 rounded-xl font-medium text-sm
                transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
            >

                <Sparkles size={16} />

                {loading ? 'Generating...' : 'Generate My Day'}

            </button>

            {/* MODAL */}

            {showModal && todoData && (

                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm
                flex items-center justify-center z-50 p-4">

                    <div className="bg-white rounded-2xl w-full max-w-2xl
                    max-h-[85vh] flex flex-col shadow-2xl">

                        {/* HEADER */}

                        <div className="flex items-center justify-between p-6 border-b">

                            <div className="flex items-center gap-3">

                                <div className="w-10 h-10 bg-indigo-100 rounded-xl
                                flex items-center justify-center">

                                    <Sparkles
                                        size={20}
                                        className="text-indigo-600"
                                    />

                                </div>

                                <div>

                                    <h2 className="font-bold text-gray-900 text-lg">
                                        AI Daily To-Do
                                    </h2>

                                    <p className="text-xs text-gray-500">

                                        {new Date().toLocaleDateString(
                                            'en-IN',
                                            {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            }
                                        )}

                                    </p>

                                </div>

                            </div>

                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-1"
                            >

                                <X size={20} />

                            </button>

                        </div>

                        {/* STATS */}

                        <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50 border-b">

                            {[
                                {
                                    label: 'Overdue',
                                    value: todoData?.overdue_tasks_count || 0,
                                    color: 'text-red-600'
                                },
                                {
                                    label: "Today's",
                                    value: todoData?.todays_tasks_count || 0,
                                    color: 'text-blue-600'
                                },
                                {
                                    label: 'Meetings',
                                    value: todoData?.meetings_today || 0,
                                    color: 'text-purple-600'
                                },
                                {
                                    label: 'Decisions',
                                    value: todoData?.pending_decisions || 0,
                                    color: 'text-orange-600'
                                }
                            ].map((s) => (

                                <div
                                    key={s.label}
                                    className="text-center bg-white rounded-xl
                                    p-3 border border-gray-100"
                                >

                                    <div className={`text-2xl font-bold ${s.color}`}>
                                        {s.value}
                                    </div>

                                    <div className="text-xs text-gray-500 mt-1">
                                        {s.label}
                                    </div>

                                </div>

                            ))}

                        </div>

                        {/* AI SUMMARY */}

                        <div className="flex-1 overflow-y-auto p-6">

                            <pre className="whitespace-pre-wrap font-sans text-sm
                            text-gray-700 leading-relaxed">

                                {todoData?.ai_summary || 'No summary available'}

                            </pre>

                        </div>

                        {/* FOOTER */}

                        <div className="flex gap-3 p-4 border-t bg-gray-50">

                            <button
                                onClick={() => generateTodo(false)}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2
                                border border-gray-200 bg-white hover:bg-gray-50
                                text-gray-700 py-2.5 rounded-xl text-sm font-medium"
                            >

                                <Sparkles size={15} />

                                Regenerate

                            </button>

                            <button
                                onClick={() => generateTodo(true)}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2
                                bg-green-600 hover:bg-green-700 text-white
                                py-2.5 rounded-xl text-sm font-medium"
                            >

                                <Send size={15} />

                                Send on WhatsApp

                            </button>

                        </div>

                    </div>

                </div>

            )}
        </>
    )
}