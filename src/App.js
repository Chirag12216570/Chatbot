import {
  NhostClient,
  NhostProvider,
  useAuthenticated,
  useUserData,
  useUserId,
  useSignInEmailPassword,
  useSignUpEmailPassword,
  useSignOut
} from '@nhost/react';
import { NhostApolloProvider } from '@nhost/react-apollo';
import React, { useState, useRef, useEffect } from 'react';
import Toast from './Toast';
import { gql, useQuery, useMutation } from '@apollo/client';
// GraphQL queries and mutations
const GET_MESSAGES = gql`
  query GetMessages($chat_id: uuid!) {
    messages(where: { chat_id: { _eq: $chat_id } }, order_by: { created_at: asc }) {
      id
      message
      is_bot
      created_at
    }
  }
`;

const SEND_MESSAGE = gql`
  mutation SendMessage($chat_id: uuid!, $content: String!) {
    sendMessage(chat_id: $chat_id, content: $content) {
      reply
    }
  }
`;
const GET_CHATS = gql`
  query GetChats($user_id: uuid!) {
    chats(where: { user_id: { _eq: $user_id } }, order_by: { created_at: desc }) {
      id
      created_at
    }
  }
`;

const CREATE_CHAT = gql`
  mutation CreateChat {
    insert_chats_one(object: {}) {
      id
      created_at
    }
  }
`;

// TODO: Replace with your actual Nhost backend URL
const nhost = new NhostClient({
  subdomain: 'tituqjovnpmvlxxjbtto',
  region: 'ap-south-1',
});




function AuthUI() {
  const isAuthenticated = useAuthenticated();
  const user = useUserData();
  const { signInEmailPassword, isLoading: signingIn, error: signInError } = useSignInEmailPassword();
  const { signUpEmailPassword, isLoading: signingUp, error: signUpError } = useSignUpEmailPassword();
  const { signOut } = useSignOut();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  // Dummy user credentials for guest login
  // Email: guest@demo.com
  // Password: guest123
  const dummyEmail = 'guest@demo.com';
  const dummyPassword = 'guest123';

  useEffect(() => {
    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setToast({ message: 'Email already registered. Please sign in.', type: 'error' });
      } else {
        setToast({ message: signUpError.message, type: 'error' });
      }
    }
    if (signInError) {
      setToast({ message: signInError.message, type: 'error' });
    }
  }, [signUpError, signInError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSignUp) {
      const res = await signUpEmailPassword(email, password);
      if (res && !res.error) {
        setToast({ message: 'Account created! Please check your email for confirmation.', type: 'info' });
        setIsSignUp(false);
      } else if (res && res.error) {
        setToast({ message: res.error.message, type: 'error' });
      }
    } else {
      const res = await signInEmailPassword(email, password);
      if (res && !res.error) {
        setToast({ message: 'Signed in successfully!', type: 'info' });
      } else if (res && res.error) {
        setToast({ message: res.error.message, type: 'error' });
      }
    }
  };

  return (
    <>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
      {isAuthenticated ? (
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p>Welcome, <b>{user?.displayName || user?.email}</b>!</p>
          <button onClick={signOut} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: '#d63031', color: '#fff', border: 'none', fontWeight: 'bold', marginTop: '0.5rem' }}>Logout</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid #dfe6e9' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid #dfe6e9' }}
          />
          <button type="submit" style={{ padding: '0.75rem 1.5rem', borderRadius: 8, background: '#0984e3', color: '#fff', border: 'none', fontWeight: 'bold' }}>
            {isSignUp ? (signingUp ? 'Signing Up...' : 'Sign Up') : (signingIn ? 'Signing In...' : 'Sign In')}
          </button>
          <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#636e72', textDecoration: 'underline', cursor: 'pointer' }}>
            {isSignUp ? 'Already have an account? Sign In' : 'New user? Sign Up'}
          </button>
          {/* Dummy user login for guests. Email: guest@demo.com, Password: guest123 */}
          <button type="button" onClick={async () => {
            setEmail(dummyEmail);
            setPassword(dummyPassword);
            const res = await signInEmailPassword(dummyEmail, dummyPassword);
            if (res && !res.error) {
              setToast({ message: 'Logged in as guest user!', type: 'info' });
            } else if (res && res.error) {
              setToast({ message: res.error.message, type: 'error' });
            }
          }} style={{ marginTop: '0.5rem', background: '#636e72', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontWeight: 'bold' }}>
            Use Guest Login
          </button>
        </form>
      )}
    </>
  );
}


function ChatUI({ chat_id }) {
  const { data, loading, error, refetch } = useQuery(GET_MESSAGES, {
    variables: { chat_id },
    skip: !chat_id,
    fetchPolicy: 'network-only',
  });
  const [sendMessage] = useMutation(SEND_MESSAGE);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const res = await sendMessage({ variables: { chat_id, content: input } });
    if (res.data?.sendMessage?.reply) {
      // Optionally, you can display the reply or trigger a refetch
      refetch();
    }
    setInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '60vh', maxHeight: 500 }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: '#fafafa', borderRadius: 8, border: '1px solid #dfe6e9', marginBottom: '1rem' }}>
        {loading && <p style={{ color: '#636e72', textAlign: 'center' }}>Loading messages...</p>}
        {error && <p style={{ color: 'red', textAlign: 'center' }}>Error loading messages.</p>}
        {data && data.messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.is_bot ? 'flex-start' : 'flex-end', marginBottom: 12 }}>
            <div style={{
              maxWidth: '80%',
              background: msg.is_bot ? '#dfe6e9' : '#0984e3',
              color: msg.is_bot ? '#2d3436' : '#fff',
              padding: '0.75rem 1rem',
              borderRadius: 16,
              borderBottomRightRadius: msg.is_bot ? 16 : 4,
              borderBottomLeftRadius: msg.is_bot ? 4 : 16,
              fontSize: '1rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              wordBreak: 'break-word',
            }}>
              {msg.is_bot
                ? <span dangerouslySetInnerHTML={{ __html: msg.message }} />
                : msg.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ flex: 1, padding: '0.75rem', borderRadius: 8, border: '1px solid #dfe6e9', fontSize: '1rem' }}
        />
        <button type="submit" style={{ padding: '0.75rem 1.5rem', borderRadius: 8, background: '#0984e3', color: '#fff', border: 'none', fontWeight: 'bold' }}>Send</button>
      </form>
    </div>
  );
}

function ChatList({ user_id, onSelectChat, selectedChatId }) {
  const { data, loading, error } = useQuery(GET_CHATS, {
    variables: { user_id },
    skip: !user_id,
    fetchPolicy: 'network-only',
  });
  const [createChat, { loading: creating }] = useMutation(CREATE_CHAT);

  const handleNewChat = async () => {
    try {
      const res = await createChat();
      if (res.data?.insert_chats_one?.id) {
        onSelectChat(res.data.insert_chats_one.id);
      } else {
        alert('Failed to create chat. Please try again.');
      }
    } catch (err) {
      alert('Error creating chat: ' + (err.message || err));
    }
  }

  // Hide chat list for guest user
  const isGuest = user_id === undefined || user_id === null || user_id === 'guest';
  // If using Nhost, you may want to check user email instead
  // For this example, we check user email from useUserData
  const userData = window.nhost?.auth?.getUser() || {};
  const isGuestEmail = userData.email === 'guest@demo.com';

  if (isGuestEmail) {
    return (
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Guest Mode</span>
          <button onClick={handleNewChat} disabled={creating} style={{ padding: '0.25rem 0.75rem', borderRadius: 8, background: '#00b894', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '0.95rem' }}>+ New Chat</button>
        </div>
        <p style={{ color: '#d63031', textAlign: 'center', fontWeight: 'bold', marginBottom: '0.5rem' }}>Sign up to view and save your previous chats!</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Your Chats</span>
        <button onClick={handleNewChat} disabled={creating} style={{ padding: '0.25rem 0.75rem', borderRadius: 8, background: '#00b894', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '0.95rem' }}>+ New Chat</button>
      </div>
      {loading && <p style={{ color: '#636e72', textAlign: 'center' }}>Loading chats...</p>}
      {error && <p style={{ color: 'red', textAlign: 'center' }}>Error loading chats.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data && data.chats.map((chat, idx) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            style={{
              padding: '0.5rem',
              borderRadius: 8,
              border: chat.id === selectedChatId ? '2px solid #0984e3' : '1px solid #dfe6e9',
              background: chat.id === selectedChatId ? '#dfe6e9' : '#fff',
              color: '#2d3436',
              fontWeight: chat.id === selectedChatId ? 'bold' : 'normal',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            Chat {idx + 1}
          </button>
        ))}
      </div>
    </div>
  );
}



function App() {
  const [selectedChatId, setSelectedChatId] = useState(null);
  return (
    <NhostProvider nhost={nhost}>
      <NhostApolloProvider nhost={nhost}>
        <MainApp selectedChatId={selectedChatId} setSelectedChatId={setSelectedChatId} />
      </NhostApolloProvider>
    </NhostProvider>
  );
}

function MainApp({ selectedChatId, setSelectedChatId }) {
  const isAuthenticated = useAuthenticated();
  const userId = useUserId();
  // Get user email for guest check
  const userData = window.nhost?.auth?.getUser() || {};
  const isGuestEmail = userData.email === 'guest@demo.com';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f6fa' }}>
      <header style={{ padding: '1rem', background: '#2d3436', color: '#fff', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>Chatbot Application</h1>
      </header>
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 600, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '2rem', margin: '1rem', display: 'flex', flexDirection: 'column' }}>
          <AuthUI />
          {isAuthenticated && userId && (
            isGuestEmail ? (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                  <button onClick={() => setSelectedChatId(null)} style={{ padding: '0.5rem 1.5rem', borderRadius: 8, background: '#00b894', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '1rem' }}>+ New Chat</button>
                </div>
                <p style={{ color: '#d63031', textAlign: 'center', fontWeight: 'bold', marginBottom: '0.5rem' }}>Sign up or log in to view and save your previous chats!</p>
              </div>
            ) : (
              <>
                <ChatList user_id={userId} onSelectChat={setSelectedChatId} selectedChatId={selectedChatId} />
                {selectedChatId && <ChatUI chat_id={selectedChatId} user_id={userId} />}
              </>
            )
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
