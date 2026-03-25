import React, { useState } from 'react';
import { Send, ArrowLeft, Handshake, Search, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function Chat() {
  const [message, setMessage] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');

  // Mock data for conversations
  const conversations = [
    { id: 1, name: 'Jānis Bērziņš', item: 'BMW 320d', lastMessage: 'Vai cena ir runājama?', time: '10:30', unread: 2 },
    { id: 2, name: 'Anna K.', item: 'iPhone 13 Pro', lastMessage: 'Paldies, es padomāšu.', time: 'Vakar', unread: 0 },
    { id: 3, name: 'Pēteris', item: 'Ziemas riepas', lastMessage: 'Kur var apskatīt?', time: 'Pirmd.', unread: 0 },
  ];

  // Mock data for messages
  const messages = [
    { id: 1, text: 'Sveiki! Vai auto vēl ir pieejams?', sender: 'other', time: '10:15' },
    { id: 2, text: 'Sveiki! Jā, vēl ir pieejams.', sender: 'me', time: '10:20' },
    { id: 3, text: 'Vai cena ir runājama?', sender: 'other', time: '10:30' },
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      // In a real app, send to backend
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  const handleSendOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (offerAmount) {
      console.log('Sending offer:', offerAmount);
      setShowOfferModal(false);
      setOfferAmount('');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col md:flex-row">
      
      {/* Conversations List (Sidebar) */}
      <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-4rem)]">
        <div className="p-4 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-900 mb-4">Ziņojumi</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Meklēt sarunas..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent rounded-lg focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all text-sm"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div key={conv.id} className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${conv.id === 1 ? 'bg-primary-50/50' : ''}`}>
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-slate-900">{conv.name}</h3>
                <span className="text-xs text-slate-500">{conv.time}</span>
              </div>
              <p className="text-xs text-primary-600 font-medium mb-1">{conv.item}</p>
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-600 truncate pr-4">{conv.lastMessage}</p>
                {conv.unread > 0 && (
                  <span className="bg-primary-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {conv.unread}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] hidden md:flex">
        {/* Chat Header */}
        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/search" className="md:hidden mr-3 text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h2 className="font-bold text-slate-900">Jānis Bērziņš</h2>
              <p className="text-xs text-slate-500">Par: <Link to="#" className="text-primary-600 hover:underline">BMW 320d</Link></p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                msg.sender === 'me' 
                  ? 'bg-primary-600 text-white rounded-br-sm' 
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
              }`}>
                <p className="text-sm">{msg.text}</p>
                <p className={`text-[10px] mt-1 text-right ${msg.sender === 'me' ? 'text-primary-200' : 'text-slate-400'}`}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="mb-3 flex justify-center">
            <button 
              onClick={() => setShowOfferModal(true)}
              className="flex items-center text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 px-4 py-1.5 rounded-full transition-colors"
            >
              <Handshake className="w-4 h-4 mr-2" />
              Piedāvāt savu cenu
            </button>
          </div>
          
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <div className="flex-1 bg-slate-100 rounded-xl border border-transparent focus-within:bg-white focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200 transition-all">
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Rakstīt ziņu..." 
                className="w-full max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-sm"
                rows={1}
              />
            </div>
            <button 
              type="submit"
              disabled={!message.trim()}
              className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Offer Modal */}
      <AnimatePresence>
        {showOfferModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-900">Piedāvāt cenu</h3>
                <p className="text-sm text-slate-500 mt-1">Sludinājums: BMW 320d (Prasītā cena: € 5,500)</p>
              </div>
              <form onSubmit={handleSendOffer} className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Jūsu piedāvājums (€)</label>
                  <input 
                    type="number" 
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder="Piem., 5000"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowOfferModal(false)}
                    className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Atcelt
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                  >
                    Nosūtīt piedāvājumu
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
