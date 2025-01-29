
const supabaseUrl = 'https://ttknpqkivcyktqjhoakz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0a25wcWtpdmN5a3RxamhvYWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1ODAxMjcsImV4cCI6MjA1MzE1NjEyN30.gBLwawXaurnS4_AhcMzKfVegb984_31e1m3SLvJ4l7w'
const supaservicerole='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0a25wcWtpdmN5a3RxamhvYWt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzU4MDEyNywiZXhwIjoyMDUzMTU2MTI3fQ.0r7mrEUn4BgxfWEpH62l1j7Pls3R8qHIT_9U5xT673k'
// const supabase = supabase.createClient(supabaseUrl, supabaseKey);
const supabase = window.supabase.createClient(supabaseUrl, supaservicerole);

let channel;
let sessionData;

document.addEventListener('DOMContentLoaded', () => {
 sessionData = JSON.parse(localStorage.getItem('supabaseSession'));
console.log("session",sessionData)
if (sessionData && sessionData.data.session) {
    restoreSession();
} else {
    document.getElementById('sign-in-form').style.display = 'block';
    document.getElementById('sign-up-form').style.display = 'none';
    document.getElementById('main-page').style.display = 'none';
}
});

// signUp 
async function signUp() {
    const email = document.getElementById('email-signup').value;
    const password = document.getElementById('password-signup').value;
    const username = document.getElementById('username').value;

    const { user, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name : username } }
    });

    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('Sign-up successful! Please log in.');
        toggleForms();
    }
}

// signin
async function signIn() {
    const email = document.getElementById('email-signin').value;
    const password = document.getElementById('password-signin').value;

    // Sign in the user with email and password
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    console.log("Sign-in Response Data:", data);

    if (error) {
        alert('Error: ' + error.message);
    } else if (data && data.user) {
        const displayName = data.user.user_metadata.display_name;
        console.log("Signed-in User Display Name:", displayName);
        alert('Sign-in successful! Welcome ' + displayName);

        // Store the session in localStorage for persistence
        const sessionData = await supabase.auth.getSession();
        localStorage.setItem('supabaseSession', JSON.stringify(sessionData));

        // Update the UI
        document.getElementById('sign-in-form').style.display = 'none';
        document.getElementById('sign-up-form').style.display = 'none';
        document.getElementById('main-page').style.display = 'block';

        // Load users and subscribe to messages
        allusers();
        subscribeToMessages();
    }
}

// restoreSession

async function restoreSession() {
    const sessionData = JSON.parse(localStorage.getItem('supabaseSession'));

    if (sessionData && sessionData.data.session) {
        const { data, error } = await supabase.auth.getSession();

        if (data && data.session) {
            const loggedInUser = data.session.user;
            console.log('Restored Session User:', loggedInUser);

            // Update the UI for the logged-in user
            document.getElementById('sign-in-form').style.display = 'none';
            document.getElementById('sign-up-form').style.display = 'none';
            document.getElementById('main-page').style.display = 'block';

            // Load the list of users
            await allusers();

            // Restore the selected user (if any) from localStorage
            const savedSelectedUser = JSON.parse(localStorage.getItem('selectedUser'));
            if (savedSelectedUser) {
                selectedUser = savedSelectedUser;

                // Update the UI for the restored chat
                document.getElementById('users-header').textContent = `Chat with ${selectedUser.name}`;
                document.getElementById('message-container').style.display = 'block';
                document.getElementById('message-input').focus();

                // Fetch and display messages for the restored chat
                await startChat(selectedUser.id, selectedUser.name);
            }

            // Subscribe to new messages
            subscribeToMessages();
        } else if (error) {
            console.error('Error restoring session:', error.message);
        }
    } else {
        console.log('No session found in localStorage.');
    }
}



// Logout 
async function logout() {
    await supabase.auth.signOut();
    document.getElementById('main-page').style.display = 'none';
    document.getElementById('sign-in-form').style.display = 'block';
    document.getElementById('messages').innerHTML = ''; 
    selectedUser = null; 
    localStorage.removeItem('supabaseSession');
}


// get all users 
async function allusers() {
    try {
        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData || !sessionData.session || !sessionData.session.user) {
            console.error('No session or logged-in user found.');
            return;
        }

        const loggedInEmail = sessionData.session.user.email;

        const { data: { users }, error } = await supabase.auth.admin.listUsers();

        if (error) {
            console.error('Error fetching users:', error.message);
        } else {
            const filteredUsers = users.filter(
                (user) => user.email !== loggedInEmail
            );
            console.log('Filtered Users:', filteredUsers);

            const userListElement = document.getElementById('user-list');
            userListElement.innerHTML = '';

            filteredUsers.forEach((user) => {
                const userItem = document.createElement('li');
                const userButton = document.createElement('button');
                userButton.classList.add('user-button');
                userButton.textContent = user.user_metadata.display_name;
                userButton.onclick = function () {
                    startChat(user.id, user.user_metadata.display_name);
                };
                userItem.appendChild(userButton);
                userListElement.appendChild(userItem);
            });
        }
    } catch (err) {
        console.error('Unexpected error:', err.message);
    }
}

// Display message in chat UI

function subscribeToMessages() {
    supabase.auth.getSession().then(({ data: sessionData }) => {
        const loggedInUser = sessionData?.session?.user;

        if (!loggedInUser) {
            console.error('No logged-in user found for subscription.');
            return;
        }

        channel = supabase
            .channel('chat_channel')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    const newMessage = payload.new;

                    // Check if the message involves the logged-in user
                    if (
                        newMessage.receiver_id === loggedInUser.id ||
                        newMessage.sender_id === loggedInUser.id
                    ) {
                        // Display the message in the UI if the chat is active with the involved user
                        if (
                            selectedUser &&
                            (newMessage.receiver_id === selectedUser.id ||
                                newMessage.sender_id === selectedUser.id)
                        ) {
                            displayMessage(
                                newMessage.content,
                                newMessage.sender_name,
                                newMessage.created_at
                            );
                        }
                    }
                }
            )
            .subscribe((status) => console.log('Subscription status:', status));
    });
}


function displayMessage(messageContent, senderName, created_at) {
    const messages = document.getElementById('messages');
    const messageBubble = document.createElement('div');
    messageBubble.style.padding = '10px';
    messageBubble.style.margin = '5px 0';
    messageBubble.style.backgroundColor = '#e1ffe7';
    messageBubble.style.borderRadius = '5px';
    messageBubble.style.alignSelf = senderName === 'You' ? 'flex-end' : 'flex-start';
    
    // Message text
    const messageText = document.createElement('span');
    messageText.textContent = `${senderName}: ${messageContent} `;
    
    // Timestamp
    const timeStamp = document.createElement('span');
    timeStamp.textContent = new Date(created_at).toLocaleTimeString();
    timeStamp.style.fontSize = '0.8em';
    timeStamp.style.color = 'gray';
    timeStamp.style.marginLeft = '5px';
    
    messageBubble.appendChild(messageText);
    messageBubble.appendChild(timeStamp);
    messages.appendChild(messageBubble);
    messages.scrollTop = messages.scrollHeight;
}

let selectedUser = null;


async function startChat(receiverId, receiverName) {
    selectedUser = { id: receiverId, name: receiverName };
    localStorage.setItem('selectedUser', JSON.stringify(selectedUser));

    document.getElementById('message-container').style.display = 'block';
    document.getElementById('message-input').focus();
    document.getElementById('chat-title').textContent = receiverName;

    // Clear existing messages
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '';

    // Fetch chat messages from the database
    try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData || !sessionData.session || !sessionData.session.user) {
            console.error('No session or logged-in user found.');
            return;
        }
        
        const loggedInUserId = sessionData.session.user.id;
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(
                `and(sender_id.eq.${receiverId},receiver_id.eq.${loggedInUserId}),and(sender_id.eq.${loggedInUserId},receiver_id.eq.${receiverId})`
            )
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error.message);
            return;
        }

        // Display messages
        data.forEach((message) => {
            displayMessage(message.content, message.sender_name, message.created_at);
        });
    } catch (err) {
        console.error('Unexpected error fetching messages:', err.message);
    }
}


async function sendMessage() {
    const input = document.getElementById('message-input');

    if (!input.value.trim()) {
        console.error('Message input is empty.');
        return;
    }

    const { data: user, error } = await supabase.auth.getUser();
    // console.log(data , "data123");
    console.log(user , "user123")

    if (error || !user) {
        console.error('Error fetching user:', error || 'No user found.');
        return;
    }

    if (!selectedUser) {
        console.error('No user selected for the chat.');
        return;
    }

    const senderName = user.user.user_metadata.display_name;
   

    try {
        const { error } = await supabase.from('messages').insert([
            {
                content: input.value.trim(),
                receiver_id: selectedUser.id,
                sender_id: user.user.id,
                sender_name: senderName,
            },
        ]);

        if (error) {
            console.error('Error sending message:', error.message);
        } else {
            input.value = ''; // Clear input after sending
        }
    } catch (err) {
        console.error('Unexpected error sending message:', err.message);
    }
}