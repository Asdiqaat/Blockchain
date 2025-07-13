// Simulated User and Backend Storage (Replace with ICP & II SDK later)
let loggedInUser = "SOLANA Wallet"; // Force signed-in user as SOLANA Wallet
const userUploads = {}; // { userPrincipal: [{hash, timestamp}] }
const STORAGE_KEY_UPLOADS = 'userUploads';
// No need to store loggedInUser since fixed

// ---------- Persistence Helpers ----------
function saveUploadsToStorage() {
  localStorage.setItem(STORAGE_KEY_UPLOADS, JSON.stringify(userUploads));
}

function loadUploadsFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY_UPLOADS);
  if (stored) {
    const parsed = JSON.parse(stored);
    for (const user in parsed) {
      userUploads[user] = parsed[user];
    }
  }
}

// ---------- Hash Utility ----------
async function calculateSHA256(file) {
  if (typeof file === 'string') {
    const encoder = new TextEncoder();
    const data = encoder.encode(file);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return bufferToHex(hashBuffer);
  } else {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    return bufferToHex(hashBuffer);
  }
}

function bufferToHex(buffer) {
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Login ----------
// Disable login action, just update UI to show fixed user
async function loginUser() {
  alert(`Already signed in as ${loggedInUser}`);
  updateLoginButtons();
}

function updateLoginButtons() {
  const btns = document.querySelectorAll('#loginBtn, .sign-in-btn');
  btns.forEach(btn => {
    if (loggedInUser) {
      btn.textContent = `Signed in:\nSOLANA Wallet`;
      btn.disabled = true;
      btn.style.whiteSpace = "pre-line"; // allow line break
    } else {
      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  });
}

// ---------- Upload Logic ----------
async function storeHashOnCanister(hash) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!userUploads[loggedInUser]) userUploads[loggedInUser] = [];

      // Check for duplicates
      const duplicate = userUploads[loggedInUser].some(upload => upload.hash === hash);
      if (duplicate) {
        reject(new Error("This file has already been uploaded."));
        return;
      }

      const timestamp = new Date().toISOString();
      userUploads[loggedInUser].push({ hash, timestamp });
      saveUploadsToStorage();
      resolve({ proofId: userUploads[loggedInUser].length, timestamp });
    }, 700);
  });
}

async function handleUploadForm(e) {
  e.preventDefault();
  // Removed sign-in check to allow upload without sign-in

  const fileInput = document.getElementById('fileInput');
  const hashInput = document.getElementById('hashInput');
  const statusElem = document.getElementById('uploadStatus');

  let hash;

  if (fileInput && fileInput.files.length > 0) {
    statusElem.textContent = "Calculating hash...";
    hash = await calculateSHA256(fileInput.files[0]);
  } else if (hashInput && hashInput.value.trim() !== '') {
    hash = hashInput.value.trim().toLowerCase();
  } else {
    statusElem.textContent = "Please upload a file or enter a hash.";
    return;
  }

  statusElem.textContent = `Hash calculated: ${hash}`;
  statusElem.textContent = "Uploading and timestamping...";

  try {
    const result = await storeHashOnCanister(hash);
    statusElem.innerHTML = `✅ Uploaded! Proof ID: #${result.proofId}<br/>⏱️ Timestamp: ${result.timestamp}`;

    // Clear inputs
    if (fileInput) fileInput.value = '';
    if (hashInput) hashInput.value = '';

    // Refresh uploads list to show new upload
    loadUploadedFiles();
  } catch (err) {
    statusElem.textContent = `❌ Error: ${err.message}`;
  }
}

// ---------- Verification ----------
async function verifyHashOnCanister(hash) {
  return new Promise(resolve => {
    setTimeout(() => {
      for (const user in userUploads) {
        const found = userUploads[user].find(u => u.hash === hash);
        if (found) {
          resolve(found.timestamp);
          return;
        }
      }
      resolve(null);
    }, 700);
  });
}

async function handleVerifyForm(e) {
  e.preventDefault();
  // Removed sign-in check to allow verify without sign-in

  const fileInput = document.getElementById('fileInputVerify');
  const hashInput = document.getElementById('hashInputVerify');
  const resultElem = document.getElementById('verifyResult');

  let hash;

  if (fileInput && fileInput.files.length > 0) {
    resultElem.textContent = "Calculating hash...";
    hash = await calculateSHA256(fileInput.files[0]);
  } else if (hashInput && hashInput.value.trim() !== '') {
    hash = hashInput.value.trim().toLowerCase();
  } else {
    resultElem.textContent = "Please upload a file or enter a hash.";
    return;
  }

  resultElem.textContent = `Hash calculated: ${hash}`;
  resultElem.textContent = "Verifying on blockchain...";
  const timestamp = await verifyHashOnCanister(hash);

  if (timestamp) {
    resultElem.innerHTML = `✅ Document verified!<br/>⏱️ Timestamp: ${timestamp}`;
  } else {
    resultElem.textContent = "❌ Document not found on blockchain.";
  }
}

// ---------- Display Uploads ----------
async function fetchUserUploads() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(userUploads[loggedInUser] || []);
    }, 400);
  });
}

async function loadUploadedFiles() {
  const listElem = document.getElementById('uploadedFilesList');
  if (!listElem) return;

  // Removed sign-in check to always show uploads for SOLANA Wallet user
  const uploads = await fetchUserUploads();

  if (uploads.length === 0) {
    listElem.innerHTML = "<li>No uploaded documents found.</li>";
    return;
  }

  const listHTML = uploads.map((upload, i) =>
    `<li><strong>Proof #${i + 1}</strong><br/>🔐 Hash: ${upload.hash}<br/>⏱️ Timestamp: ${upload.timestamp}</li>`
  ).join('');

  listElem.innerHTML = listHTML;
}

// ---------- Init ----------
window.addEventListener('load', () => {
  // No need to restoreLogin anymore, as user is fixed
  loadUploadsFromStorage();

  const loginBtn = document.getElementById('loginBtn') || document.querySelector('.sign-in-btn');
  if (loginBtn) loginBtn.addEventListener('click', loginUser);

  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) uploadForm.addEventListener('submit', handleUploadForm);

  const verifyForm = document.getElementById('verifyForm');
  if (verifyForm) verifyForm.addEventListener('submit', handleVerifyForm);

  const uploadsList = document.getElementById('uploadedFilesList');
  if (uploadsList) loadUploadedFiles();

  updateLoginButtons();
});
