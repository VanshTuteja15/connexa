import { useState, useRef, useEffect, FormEvent } from 'react';
import { post } from '../api/client';
import { Send, X, Bot, User, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import axios from 'axios';
import { AIChatPanelProps, UIChatMessage, AIChatResponse } from '../types';

const SUGGESTED_QUESTIONS: string[] = [
  'Show open cases',
  'Summarize this week',
  'Find high priority cases',
  'How many cases are in progress?',
];

function LoadingDots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

interface DataTableProps {
  data: Record<string, unknown>[];
}

function DataTable({ data }: DataTableProps) {
  if (!data || data.length === 0) return null;

  const keys = Object.keys(data[0]).filter(
    (k) => !['organization_id', 'password_hash', 'data'].includes(k)
  ).slice(0, 6);

  return (
    <div className="mt-2 overflow-x-auto rounded border border-slate-200">
      <table className="w-full text-xs">
        <thead className="bg-slate-50">
          <tr>
            {keys.map((key) => (
              <th key={key} className="border-b border-slate-200 px-2 py-1 text-left font-medium text-slate-600">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              {keys.map((key) => (
                <td key={key} className="border-b border-slate-100 px-2 py-1 text-slate-700">
                  {typeof row[key] === 'object'
                    ? JSON.stringify(row[key])
                    : String(row[key] ?? '').substring(0, 50)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 10 && (
        <p className="px-2 py-1 text-xs text-slate-400">+{data.length - 10} more rows</p>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: UIChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={clsx('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={clsx(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-accent text-white' : 'bg-slate-200 text-slate-600'
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div className={clsx('max-w-[85%]', isUser ? 'text-right' : 'text-left')}>
        <div
          className={clsx(
            'inline-block rounded-2xl px-3 py-2 text-sm',
            isUser
              ? 'bg-accent text-white rounded-br-md'
              : 'bg-slate-100 text-slate-800 rounded-bl-md'
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          {message.data && message.data.length > 0 && <DataTable data={message.data} />}
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.sources.slice(0, 3).map((s) => (
              <span
                key={s.id}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500"
              >
                {s.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<UIChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi! I can help you search, summarize, and analyze your cases. What would you like to know?',
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: UIChatMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = updatedMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await post<AIChatResponse>('/ai/chat', {
        message: trimmed,
        conversationHistory: conversationHistory.slice(0, -1),
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.answer,
          sources: response.sources,
          data: response.data,
        },
      ]);
    } catch (err) {
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      if (axios.isAxiosError(err)) {
        errorMessage = (err.response?.data as { error?: string })?.error || errorMessage;
      }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: errorMessage },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    void sendMessage(input);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-14 z-30 flex h-[calc(100vh-3.5rem)] w-full flex-col border-l border-slate-200 bg-white sm:w-[400px]">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="font-semibold text-slate-900">AI Assistant</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-slate-100 px-4 py-2">
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => void sendMessage(q)}
              disabled={loading}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Bot className="h-4 w-4" />
            <LoadingDots />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your cases..."
            disabled={loading}
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary !px-3"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
