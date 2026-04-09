import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Handshake, Search, MoreVertical, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../components/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { io, Socket } from 'socket.io-client';

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
  image_url?: string;
  sender: 'me' | 'other';
  sender_id?: number;
  receiver_id?: number;
  created_at: string;
  time?: string;
  offer_id?: number;
  offer_amount?: number;
  offer_status?: 'pending' | 'accepted' | 'rejected';
  is_phishing_warning?: boolean;
  system_warning?: string;
}

export default function Chat() {
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
  const [updatingOffer, setUpdatingOffer] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (user) {
      socketRef.current = io();
      socketRef.current.emit('join', user.id);

      socketRef.current.on('new_message', (newMessage: Message) => {
        // Check if the message belongs to the active conversation
        if (activeConversation && 
            (newMessage.sender === 'other' && newMessage.sender_id === activeConversation.other_user_id) ||
            (newMessage.sender === 'me' && newMessage.receiver_id === activeConversation.other_user_id)) {
          
          setMessages(prev => [...prev, {
            ...newMessage,
            text: newMessage.content,
            time: new Date(newMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
        
        // Always refresh conversations to update last message and unread count
        fetchConversations(true);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [user, activeConversation]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!token) return;
      
      if (initialUserId && !activeConversation) {
        try {
          // Fetch user info
          const userRes = await fetch(`/api/users/${initialUserId}`);
          let userName = 'Lietotājs';
          if (userRes.ok) {
            const userData = await userRes.json();
            userName = userData.name;
          }

          // Fetch listing info if available
          let listingTitle = 'Sludinājums';
          if (initialListingId) {
            const listingRes = await fetch(`/api/listings/${initialListingId}`);
            if (listingRes.ok) {
              const listingData = await listingRes.json();
              listingTitle = listingData.title;
            }
          }

          setActiveConversation({
            id: 0,
            other_user_id: parseInt(initialUserId),
            other_user_name: userName,
            listing_id: initialListingId ? parseInt(initialListingId) : 0,
            item: listingTitle,
            lastMessage: '',
            time: '',
            unread: 0
          });
        } catch (error) {
          console.error('Error fetching initial chat data:', error);
        }
      }
    };

    fetchInitialData();
  }, [initialUserId, initialListingId, token]);

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedImage) || !activeConversation || !token) return;

    setSendingMessage(true);
    try {
      let imageUrl = null;

      if (selectedImage) {
        const formData = new FormData();
        formData.append('image', selectedImage);
        
        const uploadRes = await fetch('/api/upload/chat-image', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.imageUrl;
        } else {
          console.error('Failed to upload image');
          alert('Neizdevās augšupielādēt attēlu');
          setSendingMessage(false);
          return;
        }
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: activeConversation.other_user_id,
          listingId: activeConversation.listing_id || null,
          content: message,
          image_url: imageUrl
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
        removeSelectedImage();
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
      // If we are the seller, we need to provide the buyerId (which is the other_user_id)
      // We'll check this by comparing the listing's user_id with our own ID (from token/auth)
      // But for simplicity, we can just send the other_user_id as buyerId if we are the seller.
      // The backend will handle the logic.
      
      const response = await fetch(`/api/listings/${activeConversation.listing_id}/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          amount: Number(offerAmount),
          buyerId: activeConversation.other_user_id // This will be used if the sender is the seller
        })
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

  const handleUpdateOfferStatus = async (offerId: number, status: 'accepted' | 'rejected') => {
    if (!token) return;

    setUpdatingOffer(offerId);
    try {
      const response = await fetch(`/api/offers/${offerId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        // Refresh messages to show updated status
        if (activeConversation) {
          fetchMessages(activeConversation.other_user_id, activeConversation.listing_id);
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Kļūda atjauninot piedāvājuma statusu');
      }
    } catch (error) {
      console.error('Error updating offer status:', error);
      alert('Kļūda atjauninot piedāvājuma statusu');
    } finally {
      setUpdatingOffer(null);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Pievienojieties, lai sūtītu ziņas</h2>
          <p className="text-slate-600 mb-6">Jums ir jābūt reģistrētam lietotājam, lai sazinātos ar citiem.</p>
          <Button size="lg" onClick={() => navigate('/login')}>
            Pieslēgties
          </Button>
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
            <Input 
              type="text" 
              placeholder="Meklēt sarunas..." 
              className="pl-9"
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
                <Button variant="ghost" size="icon" onClick={() => setActiveConversation(null)} className="md:hidden mr-3 text-slate-500">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="font-bold text-slate-900">{activeConversation.other_user_name}</h2>
                  {activeConversation.item && (
                    <p className="text-xs text-slate-500">Par: <Link to={`/listing/${activeConversation.listing_id}`} className="text-primary-600 hover:underline">{activeConversation.item}</Link></p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                <MoreVertical className="w-5 h-5" />
              </Button>
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
                      {msg.image_url && (
                        <img 
                          src={msg.image_url} 
                          alt="Pievienotais attēls" 
                          className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(msg.image_url, '_blank')}
                        />
                      )}
                      
                      {msg.offer_id ? (
                        <div className={`p-4 rounded-xl mb-2 border ${
                          msg.sender === 'me' 
                            ? 'bg-white/10 border-white/20' 
                            : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-full ${
                              msg.sender === 'me' ? 'bg-white/20' : 'bg-primary-100'
                            }`}>
                              <Handshake className={`w-5 h-5 ${
                                msg.sender === 'me' ? 'text-white' : 'text-primary-600'
                              }`} />
                            </div>
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider opacity-70">Cenas piedāvājums</div>
                              <div className="text-xl font-bold">€{msg.offer_amount?.toLocaleString()}</div>
                            </div>
                          </div>

                          {msg.offer_status === 'pending' ? (
                            msg.sender === 'other' ? (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white border-none"
                                  onClick={() => handleUpdateOfferStatus(msg.offer_id!, 'accepted')}
                                  disabled={updatingOffer === msg.offer_id}
                                >
                                  {updatingOffer === msg.offer_id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pieņemt'}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="flex-1 bg-white text-slate-700 hover:bg-slate-50"
                                  onClick={() => handleUpdateOfferStatus(msg.offer_id!, 'rejected')}
                                  disabled={updatingOffer === msg.offer_id}
                                >
                                  Noraidīt
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="flex-1 text-primary-600 hover:bg-primary-50"
                                  onClick={() => setShowOfferModal(true)}
                                >
                                  Pretpiedāvājums
                                </Button>
                              </div>
                            ) : (
                              <div className="text-xs font-bold py-1.5 px-3 rounded-full bg-white/20 text-center uppercase tracking-widest">
                                Gaida atbildi
                              </div>
                            )
                          ) : (
                            <div className={`text-xs font-bold py-1.5 px-3 rounded-full text-center uppercase tracking-widest ${
                              msg.offer_status === 'accepted' 
                                ? 'bg-emerald-500/20 text-emerald-100' 
                                : 'bg-red-500/20 text-red-100'
                            }`}>
                              {msg.offer_status === 'accepted' ? 'Pieņemts' : 'Noraidīts'}
                            </div>
                          )}
                        </div>
                      ) : (
                        msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      )}

                      {msg.is_phishing_warning && msg.system_warning && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                          <span className="font-bold text-red-800 uppercase tracking-wider text-[9px] block mb-1">Drošības brīdinājums</span>
                          {msg.system_warning}
                        </div>
                      )}

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
            <div className="p-4 bg-white border-t border-slate-200 flex flex-col">
              {activeConversation.listing_id > 0 && (
                <div className="mb-3 flex justify-center">
                  <Button 
                    onClick={() => setShowOfferModal(true)}
                    variant="secondary"
                    size="sm"
                    className="rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100"
                  >
                    <Handshake className="w-4 h-4 mr-2" />
                    Piedāvāt savu cenu
                  </Button>
                </div>
              )}
              
              {imagePreview && (
                <div className="mb-3 relative inline-block self-start">
                  <img src={imagePreview} alt="Preview" className="h-24 rounded-lg object-cover border border-slate-200" />
                  <button 
                    onClick={removeSelectedImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                />
                <Button 
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-primary-600 flex-shrink-0 mb-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-5 h-5" />
                </Button>
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
                <Button 
                  type="submit"
                  disabled={(!message.trim() && !selectedImage) || sendingMessage}
                  size="icon"
                  className="rounded-xl flex-shrink-0 mb-1"
                >
                  {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
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
                  <Input 
                    type="number" 
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder="Piem., 5000"
                    required
                    min="1"
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setShowOfferModal(false)}
                    className="flex-1"
                  >
                    Atcelt
                  </Button>
                  <Button 
                    type="submit"
                    disabled={sendingOffer}
                    className="flex-1"
                  >
                    {sendingOffer ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Nosūtīt piedāvājumu
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
