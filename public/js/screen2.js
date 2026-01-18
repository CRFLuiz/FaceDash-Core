const socket = io();

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('capture-btn');
const joinBtn = document.getElementById('join-btn');
const retakeBtn = document.getElementById('retake-btn');
const usernameInput = document.getElementById('username');
const previewContainer = document.getElementById('preview-container');
const previewImg = document.getElementById('preview-img');
const cameraContainer = document.querySelector('.camera-container');

let capturedImage = null;

// Initialize Camera
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        video.srcObject = stream;
    } catch (err) {
        console.error("Error accessing camera: ", err);
        alert("Could not access camera. Please allow camera permissions.");
    }
}

initCamera();

// Capture Logic
captureBtn.addEventListener('click', () => {
    if (!usernameInput.value) {
        alert("Please enter a name first!");
        return;
    }

    const context = canvas.getContext('2d');
    const size = Math.min(video.videoWidth, video.videoHeight);
    
    // Set canvas to square output
    canvas.width = 300;
    canvas.height = 300;

    // Calculate crop to center
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;

    // Draw circular mask
    context.save();
    context.beginPath();
    context.arc(150, 150, 150, 0, Math.PI * 2, true);
    context.closePath();
    context.clip();

    // Draw the image
    // source x, source y, source w, source h, dest x, dest y, dest w, dest h
    context.drawImage(video, startX, startY, size, size, 0, 0, 300, 300);
    context.restore();

    capturedImage = canvas.toDataURL('image/png');
    
    // Show preview
    previewImg.src = capturedImage;
    cameraContainer.style.display = 'none';
    captureBtn.style.display = 'none';
    usernameInput.style.display = 'none';
    previewContainer.style.display = 'flex';
});

retakeBtn.addEventListener('click', () => {
    cameraContainer.style.display = 'block';
    captureBtn.style.display = 'inline-block';
    usernameInput.style.display = 'block';
    previewContainer.style.display = 'none';
    capturedImage = null;
});

joinBtn.addEventListener('click', () => {
    if (capturedImage && usernameInput.value) {
        socket.emit('identify', 'studio');
        socket.emit('register-player', {
            name: usernameInput.value,
            photo: capturedImage
        });
        
        // Hide UI and show waiting message
        document.getElementById('studio-container').innerHTML = `
            <h1>Waiting for Game...</h1>
            <p>Welcome, ${usernameInput.value}!</p>
            <div style="margin-top:20px;">
                <img src="${capturedImage}" style="width:150px; height:150px; border-radius:50%; border:4px solid var(--cyber-cyan); transform: scaleX(-1);">
            </div>
            <p style="margin-top:20px; color: var(--action-pink);">Look at the Arena!</p>
        `;
    }
});
