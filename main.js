import MistralClient from "@mistralai/mistralai";

/********* Handling API key *********/
if (!localStorage.getItem("apiKey")) {
  const apiKey = prompt("Please enter your API key");
  localStorage.setItem("apiKey", apiKey);
}

const keyInput = document.getElementById("apiKey");
keyInput.value = localStorage.getItem("apiKey");

let client = new MistralClient(keyInput.value);

keyInput.onchange = () => {
  localStorage.setItem("apiKey", keyInput.value);
  client = new MistralClient(keyInput.value);
}

/********* Handling settings inputs *********/

const root = document.documentElement; // for css variables
const errorElm = document.getElementById("error"); // for display error messages
const select = document.getElementById("model"); // for model selection
const slideTemp = document.getElementById("slide_temp"); // for temperature slider
const temperature = document.getElementById("temperature"); // for temperature input
const slideTopP = document.getElementById("slide_top_p"); // for top_p slider
const topP = document.getElementById("top_p"); // for top_p input
const slideMaxTok = document.getElementById("slide_max_tok"); // for max tokens slider
const maxTok = document.getElementById("max_tokens"); // for max tokens input

let maxTokens = {};

async function addModels() {
  try {
    const models = await client.listModels();
    const latestGroup = document.getElementById('latest-group');
    const otherGroup = document.getElementById('other-group');

    models.data.forEach(model => {
      const option = document.createElement("option");
      option.value = model.id;
      option.label = model.id; // Customize as needed

      // Define your criteria for categorizing models
      // Example Criteria: Models with 'latest' in their ID
      if (model.id.toLowerCase().includes('latest')) {
        latestGroup.appendChild(option);
      } else {
        otherGroup.appendChild(option);
      }

      // Set max_tokens for each model with max_context_length
      maxTokens[model.id] = model.max_context_length;
    });

    // Select the mistral large latest model by default
    if(model.id = 'mistral-large-latest') {
      select.value = 'mistral-large-latest';
    }

  } catch (error) {
    errorElm.textContent = error;
  }
}

// model selection and max tokens sync
select.onchange = () => {
  initMaxTokens();
  // workaround for lower track color for chrome like browsers
  const ratio = 100 * slideMaxTok.value / slideMaxTok.max;
  root.style.setProperty("--sx-max-tok", ratio + "%");
};

// slider for temperature and input sync
slideTemp.oninput = () => {
  temperature.value = slideTemp.value;
  // workaround for lower track color for chrome like browsers
  const ratio = 100 * slideTemp.value / slideTemp.max;
  root.style.setProperty("--sx-temp", ratio + "%");
}
temperature.onchange = () => {
  const value = temperature.value;
  value < 0 ? temperature.value = 0 : value > 1 ? temperature.value = 1 : temperature.value = value;
  slideTemp.value = temperature.value;
  // workaround for lower track color for chrome like browsers
  const ratio = 100 * slideTemp.value / slideTemp.max;
  root.style.setProperty("--sx-temp", ratio + "%");
}

// slider for top_p and input sync
slideTopP.oninput = () => {
  topP.value = slideTopP.value;
  // workaround for lower track color for chrome like browsers
  const ratio = 100 * slideTopP.value / slideTopP.max;
  root.style.setProperty("--sx-top-p", ratio + "%");
}
topP.onchange = () => {
  const value = topP.value;
  value < 0 ? topP.value = 0 : value > 1 ? topP.value = 1 : topP.value = value;
  slideTopP.value = topP.value;
  // workaround for lower track color for chrome like browsers
  const ratio = 100 * slideTopP.value / slideTopP.max;
  root.style.setProperty("--sx-top-p", ratio + "%");
}

// slider for max tokens and input sync
slideMaxTok.oninput = () => {
  maxTok.value = slideMaxTok.value;
  // workaround for lower track color for chrome like browsers
  const ratio = 100 * slideMaxTok.value / slideMaxTok.max;
  root.style.setProperty("--sx-max-tok", ratio + "%");
}
maxTok.onchange = () => {
  const value = maxTok.value;
  value < 0 ? maxTok.value = 0 : value > slideMaxTok.max ? maxTok.value = slideMaxTok.max : maxTok.value = value;
  slideMaxTok.value = maxTok.value;
  // workaround for lower track color for chrome like browsers
  const ratio = 100 * slideMaxTok.value / slideMaxTok.max;
  root.style.setProperty("--sx-max-tok", ratio + "%");
}

function initMaxTokens() {
  const model = select.value;
  const slide = document.getElementById("slide_max_tok");
  slide.max = maxTokens[model];
}

function getSettings() {
  const settings = {};
  settings.model = select.value;
  settings.temperature = temperature.value;
  settings.top_p = topP.value;
  settings.max_tokens = maxTok.value;
  settings.safe_prompt = document.getElementById("safe_prompt").checked;
  settings.random_seed = document.getElementById("random_seed").checked;
  return settings;
}


/********* Handling messages *********/

const addMessage = document.querySelector(".addMessage")
const thread = document.querySelector(".thread");

document.getElementById("send").onclick = async () => {
  const messages = getMessages();
  const settings = getSettings();
  settings.messages = messages;
  // console.log(settings);

  const textAreaElem = insertMessage("assistant");
  textAreaElem.blur();
  errorElm.textContent = "";

  try {
    const chatStreamResponse = await client.chatStream(settings);
    let response = "";
    for await (const chunk of chatStreamResponse) {
      if (chunk.choices[0].delta.content !== undefined) {
        response += chunk.choices[0].delta.content;
        textAreaElem.textContent = response;
        textAreaAutoHeight({target: textAreaElem});
      }
    }
  }
  catch (error) {
    errorElm.textContent = error;
  }
}

addMessage.onclick = () => insertMessage();

function insertMessage(role = getNextRole()) {
  const {messageElem, textAreaElem} = getMessageNode(role);
  thread.insertBefore(messageElem, addMessage);
  textAreaElem.focus();
  // scroll thread to bottom on element insertion
  thread.scrollTo(0, thread.scrollHeight);
  return textAreaElem;
}

// textarea auto height
let initHeight = 0;
function textAreaAutoHeight(event) {
  const textArea = event.target;
  if (initHeight === 0) {
    initHeight = textArea.scrollHeight;
  }

  if (textArea.scrollHeight > initHeight) {
    textArea.style.paddingBottom = '15px';
  } else {
    textArea.style.paddingBottom = '0px';
  }

  textArea.style.height = 'auto';
  textArea.style.height = textArea.scrollHeight + 'px';

  // scroll thread to bottom on textarea resize
  thread.scrollTo(0, thread.scrollHeight);
}

function getMessages() {
  const messagesElem = document.querySelectorAll(".message");
  const messages = [];
  for (const messageElem of messagesElem) {
    const role = messageElem.querySelector(".role span").textContent;
    const content = messageElem.querySelector("textarea").value;
    messages.push({role, content});
  }
  return messages;
}

function getNextRole() {
  const messagesElem = document.querySelectorAll(".message");
  const lastMessageElem = messagesElem[messagesElem.length - 1];
  const lastMessageRole = lastMessageElem.querySelector(".role span").textContent;
  return lastMessageRole === "user" ? "assistant" : "user";
}

function removeMessage(event) {
  const messageElem = event.target.closest(".message");
  messageElem.remove();
}

function toggleUser(event) {
  const roleSpan = event.target;
  const role =  roleSpan.textContent;
  const isFirstMessage = roleSpan.closest(".message").previousElementSibling === null;

  if (role === "user") {
    roleSpan.textContent = isFirstMessage ? "system" : "assistant";
  } else {
    roleSpan.textContent = "user";
  }
}
  
// create message node
function getMessageNode(role) {
  const messageElem = document.createElement("div");
  messageElem.classList.add("message");

  const roleElem = document.createElement("div");
  roleElem.classList.add("role");
  const roleSpan = document.createElement("span");
  roleSpan.textContent = role;
  roleSpan.onclick = toggleUser;
  roleElem.appendChild(roleSpan);

  const textAreaElem = document.createElement("textarea");
  textAreaElem.classList.add("text");
  textAreaElem.name = "message";
  textAreaElem.rows = 1;
  textAreaElem.placeholder = "Enter your prompt here...";
  textAreaElem.oninput = textAreaAutoHeight;
  textAreaElem.spellcheck = false;

  const removeElem = document.createElement("div");
  removeElem.classList.add("removeMessage");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("icon", "hidden");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttributeNS("http://www.w3.org/1999/xlink", "href", "/icons.svg#minus-circle");
  svg.appendChild(use);
  removeElem.appendChild(svg);
  removeElem.onclick = removeMessage;

  messageElem.appendChild(roleElem);
  messageElem.appendChild(textAreaElem);
  messageElem.appendChild(removeElem);

  return {messageElem, textAreaElem};
}

/************** Main, initialize with default values **************/

insertMessage("user");
await addModels();
initMaxTokens();
