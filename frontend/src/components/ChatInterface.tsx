import { useState } from 'react';

export default function ChatInterface() {
  const [message, setMessage] = useState('');

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-2xl font-bold text-gray-900">
          HomeBuild AI Assistant
        </h1>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-600">
            Welcome to HomeBuild AI Assistant. Chat interface will be implemented here.
          </p>
        </div>
      </main>
      
      <footer className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask a question about your home building project..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </footer>
    </div>
  );
}

