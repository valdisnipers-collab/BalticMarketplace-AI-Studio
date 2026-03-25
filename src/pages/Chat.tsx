import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Handshake, Search, MoreVertical, Loader2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../components/AuthContext';

interface Conversation {
  id: number;
  other_user_name: string;
  other_user_id: number;
  item: string;
  listing_id: number;
  lastMessage: string;
  time: string;
  unread: number;
}

interface Message {
  id: number;
  text: string;
  content: string;
  sender: 'me' | 'other';
  created_at: string;
  time?: string;
}

export default function Chat() {
  const { token } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialUserId = queryParams.get('userId');
  const initialListingId = queryParams.get('listingId');

  const [message, setMessage] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingOffer, setSendingOffer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    
    const interval = setInterval(() => {
      fetchConversations(true);
    }, 10000); // Poll every 10 seconds
    
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.other_user_id, activeConversation.listing_id);
      
      const interval = setInterval(() => {
        fetchMessages(activeConversation.other_user_id, activeConversation.listing_id, true);
      }, 5000); // Poll every 5 seconds
      
      return () => clearInterval(interval);
    } else if (initialUserId) {
      // If opened from a listing with a specific user
      fetchMessages(parseInt(initialUserId), initialListingId ? parseInt(initialListingId) : undefined);
    }
  }, [activeConversation, initialUserId, initialListingId, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async (isBackground = false) => {
    if (!token) return;
    if (!isBackground) setLoadingConversations(true);
    try {
      const response = await fetch('/api/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
        
        // If we have an initial user, try to find them in conversations
        if (initialUserId && !activeConversation) {
          const existing = data.find((c: Conversation) => c.other_user_id.toString() === initialUserId);
          if (existing) {
            setActiveConversation(existing);
          } else {
            // Create a temporary active conversation for the UI
            setActiveConversation({
              id: 0,
              other_user_id: parseInt(initialUserId),
              other_user_name: 'Lietotājs', // Ideally we'd fetch this
              listing_id: initialListingId ? parseInt(initialListingId) : 0,
              item: 'Sludinājums', // Ideally we'd fetch this
              lastMessage: '',
              time: '',
              unread: 0
            });
          }
        } else if (data.length > 0 && !activeConversation && !isBackground) {
          setActiveConversation(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      if (!isBackground) setLoadingConversations(false);
    }
  };

  const fetchMessages = async (otherUserId: number, listingId?: number, isBackground = false) => {
    if (!token) return;
    if (!isBackground) setLoadingMessages(true);
    try {
      let url = `/api/messages/${otherUserId}`;
      if (listingId) url += `?listingId=${listingId}`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.map((m: any) => ({
          ...m,
          text: m.content,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));
        
        // Update unread count in conversations list
        setConversations(prev => prev.map(c => 
          c.other_user_id === otherUserId ? { ...c, unread: 0 } : c
        ));
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      if (!isBackground) setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeConversation || !token) return;

    setSendingMessage(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: activeConversation.other_user_id,
          listingId: activeConversation.listing_id || null,
          content: message
        })
      });

      if (response.ok) {
        const newMsg = await response.json();
        setMessages(prev => [...prev, {
          ...newMsg,
          text: newMsg.content,
          time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setMessage('');
        fetchConversations(); // Refresh last message in sidebar
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerAmount || !activeConversation?.listing_id || !token) return;

    setSendingOffer(true);
    try {
      const response = await fetch(`/api/listings/${activeConversation.listing_id}/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: Number(offerAmount) })
      });

      if (response.ok) {
        setShowOfferModal(false);
        setOfferAmount('');
        // Refresh messages to show the automated offer message
        fetchMessages(activeConversation.other_user_id, activeConversation.listing_id);
      } else {
        const data = await response.json();
        alert(data.error || 'Kļūda nosūtot piedāvājumu');
      }
    } catch (error) {
      console.error('Error sending offer:', error);
      alert('Kļūda nosūtot piedāvājumu');
    } finally {
      setSendingOffer(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Pievienojieties, lai sūtītu ziņas</h2>
          <p className="text-slate-600 mb-6">Jums ir jābūt reģistrētam lietotājam, lai sazinātos ar citiem.</p>
          <Link to="/login" className="bg-primary-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-primary-700 transition-colors">
            Pieslēgties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col md:flex-row">
      
      {/* Conversations List (Sidebar) */}
      <div className={`w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-4rem)] ${activeConversation && !initialUserId ? 'hidden md:flex' : 'flex'}`}>
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
          {loadingConversations ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p>Jums vēl nav nevienas sarunas.</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div 
                key={conv.id} 
                onClick={() => setActiveConversation(conv)}
                className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${activeConversation?.id === conv.id ? 'bg-primary-50/50' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-slate-900">{conv.other_user_name}</h3>
                  <span className="text-xs text-slate-500">{new Date(conv.time).toLocaleDateString()}</span>
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
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex flex-col h-[calc(100vh-4rem)] ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center">
                <button onClick={() => setActiveConversation(null)} className="md:hidden mr-3 text-slate-500">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="font-bold text-slate-900">{activeConversation.other_user_name}</h2>
                  {activeConversation.item && (
                    <p className="text-xs text-slate-500">Par: <Link to={`/listing/${activeConversation.listing_id}`} className="text-primary-600 hover:underline">{activeConversation.item}</Link></p>
                  )}
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-4">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center items-center h-full text-slate-500">
                  <p>Sāciet sarunu!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      msg.sender === 'me' 
                        ? 'bg-primary-600 text-white rounded-br-sm' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <p className={`text-[10px] mt-1 text-right ${msg.sender === 'me' ? 'text-primary-200' : 'text-slate-400'}`}>
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
              {activeConversation.listing_id > 0 && (
                <div className="mb-3 flex justify-center">
                  <button 
                    onClick={() => setShowOfferModal(true)}
                    className="flex items-center text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 px-4 py-1.5 rounded-full transition-colors"
                  >
                    <Handshake className="w-4 h-4 mr-2" />
                    Piedāvāt savu cenu
                  </button>
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <div className="flex-1 bg-slate-100 rounded-xl border border-transparent focus-within:bg-white focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200 transition-all">
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Rakstīt ziņu..." 
                    className="w-full max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-sm"
                    rows={1}
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!message.trim() || sendingMessage}
                  className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-500">
            <p>Izvēlieties sarunu, lai sāktu saraksti</p>
          </div>
        )}
      </div>

      {/* Offer Modal */}
      <AnimatePresence>
        {showOfferModal && activeConversation && (
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
                <p className="text-sm text-slate-500 mt-1">Sludinājums: {activeConversation.item}</p>
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
                    min="1"
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
                    disabled={sendingOffer}
                    className="flex-1 py-2.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                  >
                    {sendingOffer ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
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
