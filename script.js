import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Use environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// -------------------------------
// DOM Elements
// -------------------------------
const authSection = document.getElementById("authSection");
const protectedContent = document.getElementById("protectedContent");
const authChoice = document.getElementById("authChoice");
const authButton = document.getElementById("authButton");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const authMessage = document.getElementById("authMessage");
const logoutButton = document.getElementById("logoutButton");
const welcomeMessage = document.getElementById("welcomeMessage");

const fileUpload = document.getElementById('fileUpload');
const userQuestionInput = document.getElementById('userQuestion');
const askButton = document.getElementById('askButton');
const userQueryDiv = document.getElementById('userQuery');
const aiResponseDiv = document.getElementById('aiResponse');
const summarizeButton = document.getElementById('summarizeButton');
const webUrlInput = document.getElementById('webUrl');

// -------------------------------
// Authentication
// -------------------------------
authButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  authMessage.innerHTML = "";

  if (!email || !password) {
    authMessage.innerHTML = "Email and password required.";
    return;
  }

  if (authChoice.value === "register") {
    // Register
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) authMessage.innerHTML = error.message;
    else authMessage.innerHTML = "Registered! Please verify your email.";
  } else {
    // Login
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) authMessage.innerHTML = error.message;
    else {
      authMessage.innerHTML = `Logged in as ${data.user.email}`;
      authSection.style.display = "none";
      protectedContent.style.display = "block";
      logoutButton.style.display = "inline-block"; // Make logout button visible
      welcomeMessage.innerHTML = `Welcome, ${data.user.email}!`; // Display welcome message
    }
  }
});

// Logout
logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
  protectedContent.style.display = "none";
  authSection.style.display = "block";
  authMessage.innerHTML = "Logged out.";
  welcomeMessage.innerHTML = ""; // Clear welcome message on logout
});

// -------------------------------
// Web URL Summarization
// -------------------------------
summarizeButton.addEventListener('click', async () => {
  const url = webUrlInput.value.trim();
  if (!url) { alert('Please enter a URL.'); return; }

  userQueryDiv.innerHTML = `<strong>You asked to summarize:</strong> ${url}`;
  aiResponseDiv.innerHTML = '<strong>AI is summarizing the webpage...</strong>';

  try {
    const response = await fetch('http://127.0.0.1:5000/api/summarize_url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error);
    }

    const data = await response.json();
    aiResponseDiv.innerHTML = `<strong>AI summarized:</strong><br>` + marked.parse(data.summary);
  } catch (error) {
    aiResponseDiv.innerHTML = `<strong style="color: red;">Error:</strong> ${error.message}`;
  }
});

// -------------------------------
// Document QA
// -------------------------------
askButton.addEventListener('click', async () => {
  const userQuestion = userQuestionInput.value.trim();
  const file = fileUpload.files[0];

  if (!userQuestion) { alert('Please ask a question.'); return; }

  let documentContent = null;
  if (file) {
    try { documentContent = await readFileContent(file); }
    catch (error) { alert(`Error reading file: ${error.message}`); return; }
  }

  userQueryDiv.innerHTML = `<strong>You asked:</strong> ${userQuestion}`;
  aiResponseDiv.innerHTML = '<strong>AI is thinking...</strong>';

  try {
    const localApiResponse = await callLocalAPI(userQuestion, documentContent);
    aiResponseDiv.innerHTML = `<strong>AI answered:</strong><br>` + marked.parse(localApiResponse);
  } catch (error) {
    aiResponseDiv.innerHTML = `<strong style="color: red;">Error:</strong> ${error.message}`;
  }
});

// -------------------------------
// Helper Functions
// -------------------------------
async function readFileContent(file) {
  const filename = file.name.toLowerCase();
  if (filename.endsWith('.txt')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  } else if (filename.endsWith('.pdf')) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async (event) => {
        try {
          const pdf = await pdfjsLib.getDocument({ data: event.target.result }).promise;
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + '\n';
          }
          resolve(text);
        } catch (error) { reject(error); }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  } else if (filename.endsWith('.docx')) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async (event) => {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: event.target.result });
          resolve(result.value);
        } catch (error) { reject(error); }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  } else { throw new Error('Unsupported file type. Please upload txt, pdf, or docx.'); }
}

async function callLocalAPI(userQuestion, documentContent) {
  const response = await fetch('http://127.0.0.1:5000/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userQuestion, documentContent })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error);
  }
  const data = await response.json();
  return data.answer;
}
