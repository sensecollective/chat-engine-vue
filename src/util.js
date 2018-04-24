import typingIndicator from 'chat-engine-typing-indicator';
import {EventBus} from './event-bus.js';

/**
 * Get a new UUID.
 * @return {string} A 4 character UUID for PubNub and to give to friends.
 */
function fourCharUUID() {
  const maxLength = 4;
  const possible = 'abcdef0123456789';
  let text = '';

  for (let i = 0; i < maxLength; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

/**
 * Make an HTTP POST request with an ES6 Promise.
 *
 * @param {String} url URL of the resource that is being requested.
 * @param {Object} options JSON Object with HTTP request options, "header"
 *     Object of possible headers to set, and a body Object of a POST body.
 *
 * @return {Promise} A parsed JSON Object response or String response.
 */
function post(url, options) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', url);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

    for (let header in options.headers) {
      if ({}.hasOwnProperty.call(options.headers, header)) {
        xhr.setRequestHeader(header, options.headers[header]);
      }
    }

    xhr.onload = function() {
      if (xhr.status === 200) {
        let response;

        try {
          response = JSON.parse(xhr.response);
        } catch (e) {
          response = xhr.response;
        }

        resolve(response);
      } else if (xhr.status !== 200) {
        reject(xhr.statusText);
      }
    };

    xhr.send(JSON.stringify(options.body));
  });
}

/**
 * Adds the ChatEngine Typing indicator plugin and initializes the events
 *     that update the UI via the Vue Event Bus.
 *
 * @param {Object} chat Chat object to add the typing indicator to.
 */
function _addTypingIndicator(chat) {
  chat.plugin(typingIndicator({
    timeout: 2000, // MS after final keyup when stopTyping fires
  }));

  chat.on('$typingIndicator.startTyping', (event) => {
    const chat = event.chat;
    const me = event.sender.name === 'Me' ? true : false;

    // Only fire the UI changing event if the sender is not Me.
    if (!me) {
      // Handler in Chat Log Component (components/ChatLog.vue)
      EventBus.$emit('typing-start', chat.key);
    }
  });

  chat.on('$typingIndicator.stopTyping', (event) => {
    const chat = event.chat;
    const me = event.sender.name === 'Me' ? true : false;

    // Only fire the UI changing event if the sender is not Me.
    if (!me) {
      // Handler in Chat Log Component (components/ChatLog.vue)
      EventBus.$emit('typing-stop', chat.key);
    }
  });
}

/**
 * Makes a new private ChatEngine chat and adds it to the global Vuex store.
 *
 * @param {Object} store Global Vuex store object.
 * @param {Object} chatEngine ChatEngine Client Object.
 * @param {String} friend Friend settings like avatar, chatKey, name.
 * @param {Boolean} private_ True will make the Chat a private Chat.
 *
 * @return {Object} Chat object that was initialized and added to the store.
 */
function newChatEngineChat(store, chatEngine, friend, private_) {
  // Make a new 1:1 private chat (true param means private).
  const newChat = new chatEngine.Chat(friend.chatKey, private_);

  // Add the key to the Chat object for Vue UI use
  newChat.key = friend.chatKey;

  // Add the Typing Indicator ChatEngine plugin to this private 1:1 chat.
  _addTypingIndicator(newChat);

  // If there is no name, make one with the UUID
  if (!friend.name) {
    friend.name = `Friend: ${friend.uuid}`;
  }

  // Add this friend to the client's friend list
  store.commit('setFriends', {
    friends: [friend],
  });

  // Add this chat to the global state
  store.commit('newChat', {
    chat: newChat,
  });

  return newChat;
}

export default {
  fourCharUUID,
  post,
  newChatEngineChat,
};
