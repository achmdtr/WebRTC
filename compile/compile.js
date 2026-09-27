'use strict';

/* ==========================================================================
   BLOK 1: DAFTAR 10 POSE GEN Z & STATE APLIKASI
   Fungsi: Menyimpan array 10 pose bawaan dan variabel state kontrol photobooth.
   ========================================================================== */
const poses = [
    "Peace Sign! ✌️",
    "Big Smile! 😁",
    "Main Character Pose! ✨",
    "Cool Face! 😎",
    "Look Left! 👈",
    "Look Right! 👉",
    "Thumbs Up! 👍",
    "Funny Face! 🤪",
    "Model Pose! 💅",
    "Surprised Face! 😳"
];

// State Machine Status
const AppState = {
    IDLE: 'IDLE',
    POSE: 'POSE',
    COUNTDOWN: 'COUNTDOWN',
    FLASH: 'FLASH',
    CAPTURE: 'CAPTURE',
    RESULT: 'RESULT'
};

let currentState = AppState.IDLE;
let photo1Data = null;
let photo2Data = null;
let pose1Text = '';
let pose2Text = '';
let isShooting = false;

/* ==========================================================================
   BLOK 2: INISIALISASI ELEMEN DOM
   Fungsi: Mengambil seluruh referensi elemen UI dari dokumen HTML compile.html.
   ========================================================================== */
// Section & Cards
const cameraSection = document.getElementById('cameraSection');
const resultSection = document.getElementById('resultSection');

// Video & Controls
const video = document.getElementById('webcam');
const filterSelect = document.getElementById('filter');
const takePhotoBtn = document.getElementById('takePhotoBtn');
const statusDot = document.getElementById('statusDot');
const statusLabel = document.getElementById('statusLabel');

// Overlays
const poseOverlay = document.getElementById('poseOverlay');
const poseRound = document.getElementById('poseRound');
const poseText = document.getElementById('poseText');
const countdownOverlay = document.getElementById('countdownOverlay');
const flashOverlay = document.getElementById('flashOverlay');

// Result Screen
const resultImg1 = document.getElementById('resultImg1');
const resultImg2 = document.getElementById('resultImg2');
const tagPhoto1 = document.getElementById('tagPhoto1');
const tagPhoto2 = document.getElementById('tagPhoto2');
const stripDate = document.getElementById('stripDate');
const downloadStripBtn = document.getElementById('downloadStripBtn');
const downloadPhotosBtn = document.getElementById('downloadPhotosBtn');
const retakeBtn = document.getElementById('retakeBtn');

// Hidden Canvas & Error Message
const hiddenCanvas = document.getElementById('hiddenCanvas');
const stripCanvas = document.getElementById('stripCanvas');
const errorElement = document.getElementById('errorMsg');

/* ==========================================================================
   BLOK 3: KONSTRAIN MEDIA & AKSES WEBCAM (WebRTC getUserMedia)
   Fungsi: Meminta akses kamera depan beresolusi 1280x720 secara asynchronous.
   ========================================================================== */
const constraints = {
    audio: false,
    video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
    }
};

function handleSuccess(stream) {
    window.stream = stream;
    video.srcObject = stream;
    updateStatus('Camera active • Ready to shoot', false);
    if (takePhotoBtn) takePhotoBtn.disabled = false;
}

function handleError(error) {
    console.error('navigator.getUserMedia error: ', error);
    updateStatus('Gagal mengakses kamera', false);
    if (errorElement) {
        errorElement.innerHTML = `<p>Gagal mengakses kamera: ${error.name || error.message}. Pastikan izin kamera telah diberikan.</p>`;
    }
    if (takePhotoBtn) takePhotoBtn.disabled = true;
}

function initCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(handleSuccess)
            .catch(handleError);
    } else {
        if (errorElement) {
            errorElement.innerHTML = `<p>Browser Anda tidak mendukung API navigator.mediaDevices.getUserMedia.</p>`;
        }
        if (takePhotoBtn) takePhotoBtn.disabled = true;
    }
}

// Event handler pergantian filter CSS secara langsung pada video
filterSelect.onchange = function () {
    video.className = filterSelect.value;
};

/* ==========================================================================
   BLOK 4: HELPER MAPPING FILTER CSS KE CANVAS CONTEXT
   Fungsi: Menghasilkan string filter canvas yang kompatibel dengan kelas CSS.
   ========================================================================== */
function getCanvasFilterStyle(filterClass) {
    switch (filterClass) {
        case 'blur':
            return 'blur(4px)';
        case 'grayscale':
            return 'grayscale(100%)';
        case 'invert':
            return 'invert(100%)';
        case 'sepia':
            return 'sepia(100%)';
        case 'hue-rotate':
            return 'hue-rotate(90deg)';
        case 'brightness':
            return 'brightness(175%)';
        default:
            return 'none';
    }
}

/* ==========================================================================
   BLOK 5: LOGIKA POSE ROULETTE & ANIMASI COUNTDOWN
   Fungsi: Memilih pose random, menampilkan popup pose, serta countdown 3->2->1.
   ========================================================================== */
function getRandomPose(excludePose = '') {
    const availablePoses = poses.filter(p => p !== excludePose);
    const randomIndex = Math.floor(Math.random() * availablePoses.length);
    return availablePoses[randomIndex];
}

function showPoseOverlay(photoIndex, selectedPose) {
    return new Promise((resolve) => {
        currentState = AppState.POSE;
        poseRound.textContent = `Photo ${photoIndex} of 2`;
        poseText.textContent = selectedPose;
        poseOverlay.classList.add('show');
        updateStatus(`Pose #${photoIndex}: ${selectedPose}`, true);

        // Tampilkan pose selama 2 detik sebelum countdown
        setTimeout(() => {
            poseOverlay.classList.remove('show');
            setTimeout(resolve, 300);
        }, 2000);
    });
}

function runCountdown() {
    return new Promise((resolve) => {
        currentState = AppState.COUNTDOWN;
        let count = 3;
        countdownOverlay.textContent = count;
        countdownOverlay.classList.add('animate');
        updateStatus(`Get ready... ${count}`, true);

        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                // Trigger re-animasi CSS
                countdownOverlay.classList.remove('animate');
                void countdownOverlay.offsetWidth; // Force reflow
                countdownOverlay.textContent = count;
                countdownOverlay.classList.add('animate');
                updateStatus(`Get ready... ${count}`, true);
            } else {
                clearInterval(countdownInterval);
                countdownOverlay.classList.remove('animate');
                resolve();
            }
        }, 1000);
    });
}

/* ==========================================================================
   BLOK 6: FLASH EFFECT & SNAPSHOT CAPTURE KE CANVAS (RESOLUSI 100% ASLI)
   Fungsi: Menjalankan efek lampu flash putih dan menyalin frame video ke canvas
   dengan ukuran canvas yang sama persis dengan resolusi video asli tanpa crop.
   ========================================================================== */
function triggerFlash() {
    return new Promise((resolve) => {
        currentState = AppState.FLASH;
        flashOverlay.classList.add('flashing');
        setTimeout(() => {
            flashOverlay.classList.remove('flashing');
            resolve();
        }, 200);
    });
}

function captureVideoFrame() {
    currentState = AppState.CAPTURE;
    if (!video.videoWidth || !video.videoHeight) {
        throw new Error('Video stream belum siap.');
    }

    // Samakan ukuran canvas capture 100% dengan resolusi video native
    hiddenCanvas.width = video.videoWidth;
    hiddenCanvas.height = video.videoHeight;
    const ctx = hiddenCanvas.getContext('2d');

    const activeFilter = filterSelect.value;
    ctx.save();

    // Terapkan filter CSS ke canvas context
    const canvasFilter = getCanvasFilterStyle(activeFilter);
    if (ctx.filter !== undefined) {
        ctx.filter = canvasFilter;
    }

    // Mirroring penyesuaian (karena video selfie di-mirror scaleX(-1))
    if (activeFilter !== 'flip') {
        ctx.translate(hiddenCanvas.width, 0);
        ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    ctx.restore();

    return hiddenCanvas.toDataURL('image/png');
}

/* ==========================================================================
   BLOK 7: ALUR UTAMA SESI PHOTOBOOTH (DUAL PHOTO SEQUENCE)
   Fungsi: Mengatur alur pemotretan 2 foto berurutan dari awal hingga selesai.
   ========================================================================== */
async function startPhotoboothSession() {
    if (isShooting) return;

    if (!window.stream || !video.videoWidth) {
        alert('Kamera belum aktif. Mohon tunggu atau izinkan akses kamera.');
        return;
    }

    isShooting = true;
    takePhotoBtn.disabled = true;
    filterSelect.disabled = true;

    try {
        // --- SESI FOTO 1 ---
        pose1Text = getRandomPose();
        await showPoseOverlay(1, pose1Text);
        await runCountdown();
        triggerFlash();
        photo1Data = captureVideoFrame();

        // Jeda singkat antar foto (800ms)
        await new Promise(r => setTimeout(r, 800));

        // --- SESI FOTO 2 ---
        pose2Text = getRandomPose(pose1Text);
        await showPoseOverlay(2, pose2Text);
        await runCountdown();
        triggerFlash();
        photo2Data = captureVideoFrame();

        // Tampilkan layar hasil
        showResultScreen();
    } catch (err) {
        console.error('Error saat sesi photobooth:', err);
        updateStatus('Terjadi kesalahan saat memotret', false);
        resetPhotobooth();
    }
}

/* ==========================================================================
   BLOK 8: HASIL SESI & TAMPILAN SCREEN
   Fungsi: Menampilkan gambar pada strip frame dan menyusun tampilan hasil.
   ========================================================================== */
function showResultScreen() {
    currentState = AppState.RESULT;
    isShooting = false;

    // Pasang hasil ke image element
    resultImg1.src = photo1Data;
    resultImg2.src = photo2Data;
    tagPhoto1.textContent = pose1Text.split('!')[0].trim() || 'POSE #1';
    tagPhoto2.textContent = pose2Text.split('!')[0].trim() || 'POSE #2';

    // Format tanggal cantik
    const now = new Date();
    const dateOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    stripDate.textContent = now.toLocaleDateString('id-ID', dateOptions);

    // Switch View
    cameraSection.style.display = 'none';
    resultSection.style.display = 'block';
}

function updateStatus(text, isBusy) {
    if (statusLabel) statusLabel.textContent = text;
    if (statusDot) {
        if (isBusy) {
            statusDot.classList.add('busy');
        } else {
            statusDot.classList.remove('busy');
        }
    }
}

/* ==========================================================================
   BLOK 9: DOWNLOAD HANDLER (STRIP & INDIVIDUAL PHOTOS)
   Fungsi: Mengunduh foto satuan atau merender photostrip dengan aspek rasio presisi.
   ========================================================================== */
// Download Foto Satuan (photo-1 & photo-2)
function downloadIndividualPhotos() {
    if (!photo1Data || !photo2Data) return;

    // Download Foto 1
    const link1 = document.createElement('a');
    link1.href = photo1Data;
    link1.download = 'photobooth-photo-1.png';
    document.body.appendChild(link1);
    link1.click();
    document.body.removeChild(link1);

    // Download Foto 2 dengan jeda agar tidak terblokir browser
    setTimeout(() => {
        const link2 = document.createElement('a');
        link2.href = photo2Data;
        link2.download = 'photobooth-photo-2.png';
        document.body.appendChild(link2);
        link2.click();
        document.body.removeChild(link2);
    }, 400);
}

// Download Photostrip Estetis (Render ke Canvas 2D secara Proporsional Dinamis)
// Helper menggambar rounded rectangle dengan fallback
function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x, y, width, height, radius);
    } else {
        const r = typeof radius === 'number' ? radius : 10;
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
    }
    ctx.closePath();
}

// Download Photostrip Estetis (Render ke Canvas 2D 100% Identik dengan Preview Card)
function downloadPhotoStrip() {
    if (!photo1Data || !photo2Data) return;

    const img1 = new Image();
    const img2 = new Image();

    img1.onload = () => {
        img2.onload = () => {
            renderAndSaveStrip(img1, img2);
        };
        img2.src = photo2Data;
    };
    img1.src = photo1Data;
}

function renderAndSaveStrip(img1, img2) {
    const cardWidth = 640;
    const cardPadding = 32;
    const photoWidth = cardWidth - (cardPadding * 2);

    // Hitung aspek rasio asli dari foto
    const nativeAspectRatio = (img1.naturalHeight && img1.naturalWidth)
        ? (img1.naturalHeight / img1.naturalWidth)
        : (9 / 16);
    
    const photoHeight = Math.round(photoWidth * nativeAspectRatio);
    const headerHeight = 110;
    const footerHeight = 85;
    const photoGap = 24;
    const cardRadius = 24;
    const frameRadius = 14;

    const cardHeight = headerHeight + (photoHeight * 2) + photoGap + footerHeight;

    // Tambahkan sedikit margin luar agar border bulat dan bayangan strip terlihat sempurna
    const canvasMargin = 20;
    const totalCanvasWidth = cardWidth + (canvasMargin * 2);
    const totalCanvasHeight = cardHeight + (canvasMargin * 2);

    stripCanvas.width = totalCanvasWidth;
    stripCanvas.height = totalCanvasHeight;
    const ctx = stripCanvas.getContext('2d');

    // 1. Bersihkan background transparan
    ctx.clearRect(0, 0, totalCanvasWidth, totalCanvasHeight);

    const cardX = canvasMargin;
    const cardY = canvasMargin;

    // 2. Gambar Kartu Utama Strip dengan Sudut Membulat (Rounded Card)
    ctx.save();
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
    ctx.clip(); // Batasi seluruh isi kartu di dalam area rounded

    // Background Gradient Kartu (Persis CSS .photostrip-card)
    const bgGradient = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardHeight);
    bgGradient.addColorStop(0, '#052319');
    bgGradient.addColorStop(0.5, '#083325');
    bgGradient.addColorStop(1, '#052319');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(cardX, cardY, cardWidth, cardHeight);

    // Ornamen Garis Atas Gradient Ungu-Emas (Persis CSS .photostrip-card::before)
    const topBarGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY);
    topBarGradient.addColorStop(0, '#8b3a77');
    topBarGradient.addColorStop(0.5, '#dfb15b');
    topBarGradient.addColorStop(1, '#8b3a77');
    ctx.fillStyle = topBarGradient;
    ctx.fillRect(cardX, cardY, cardWidth, 8);

    // 3. Header Teks
    ctx.textAlign = 'center';
    ctx.fillStyle = '#dfb15b';
    ctx.font = 'bold 24px "Poppins", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('✦ PHOTOBOOTH MEMORIES ✦', cardX + (cardWidth / 2), cardY + 52);

    ctx.fillStyle = '#a3c4b8';
    ctx.font = '14px "Poppins", sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('WebRTC Interactive Session', cardX + (cardWidth / 2), cardY + 78);

    // Garis Pemisah Putus-putus Header
    ctx.strokeStyle = 'rgba(223, 177, 91, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(cardX + cardPadding, cardY + 98);
    ctx.lineTo(cardX + cardWidth - cardPadding, cardY + 98);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Render Frame Foto 1 (Dengan Rounded Frame & Tag)
    const yPhoto1 = cardY + headerHeight + 6;
    const xPhoto1 = cardX + cardPadding;
    drawPhotoFrame(ctx, img1, xPhoto1, yPhoto1, photoWidth, photoHeight, frameRadius, tagPhoto1.textContent || 'POSE #1');

    // 5. Render Frame Foto 2 (Dengan Rounded Frame & Tag)
    const yPhoto2 = yPhoto1 + photoHeight + photoGap;
    const xPhoto2 = cardX + cardPadding;
    drawPhotoFrame(ctx, img2, xPhoto2, yPhoto2, photoWidth, photoHeight, frameRadius, tagPhoto2.textContent || 'POSE #2');

    // 6. Footer Strip
    const yFooter = yPhoto2 + photoHeight + 22;
    ctx.strokeStyle = 'rgba(223, 177, 91, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(cardX + cardPadding, yFooter);
    ctx.lineTo(cardX + cardWidth - cardPadding, yFooter);
    ctx.stroke();
    ctx.setLineDash([]);

    const now = new Date();
    const dateText = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    ctx.textAlign = 'left';
    ctx.fillStyle = '#a3c4b8';
    ctx.font = '14px "Poppins", sans-serif';
    ctx.fillText('Sweet Memories', cardX + cardPadding + 6, yFooter + 34);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#dfb15b';
    ctx.font = 'bold 14px "Poppins", sans-serif';
    ctx.fillText(dateText, cardX + cardWidth - cardPadding - 6, yFooter + 34);

    ctx.restore(); // Restore dari clipping kartu

    // 7. Gambar Border Emas Kartu Utama (Persis 3px solid #dfb15b)
    ctx.save();
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
    ctx.strokeStyle = '#dfb15b';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // 8. Trigger Download File PNG
    const stripDataURL = stripCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = stripDataURL;
    link.download = 'photobooth-strip.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Fungsi menggambar frame foto dengan sudut membulat dan pill tag badge persis seperti CSS preview
function drawPhotoFrame(ctx, img, x, y, width, height, radius, tagText) {
    ctx.save();

    // Gambar Background Frame Hitam
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Clip foto di dalam sudut rounded frame
    ctx.save();
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.clip();
    ctx.drawImage(img, x, y, width, height);
    ctx.restore();

    // Border Frame Foto (Persis 2px solid rgba(223, 177, 91, 0.45))
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.strokeStyle = 'rgba(223, 177, 91, 0.45)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Gambar Pill Tag Badge (Persis CSS .strip-frame .frame-tag)
    if (tagText) {
        ctx.font = 'bold 13px "Poppins", sans-serif';
        const formattedTag = tagText.toUpperCase();
        const textWidth = ctx.measureText(formattedTag).width;
        const tagPaddingX = 14;
        const tagH = 26;
        const tagW = textWidth + (tagPaddingX * 2);
        const tagRadius = 12;
        const tagX = x + width - tagW - 12;
        const tagY = y + height - tagH - 12;

        // Background Pill
        drawRoundedRect(ctx, tagX, tagY, tagW, tagH, tagRadius);
        ctx.fillStyle = 'rgba(5, 38, 27, 0.90)';
        ctx.fill();

        // Border Pill
        ctx.strokeStyle = '#dfb15b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Teks Pill
        ctx.fillStyle = '#dfb15b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(formattedTag, tagX + (tagW / 2), tagY + (tagH / 2) + 1);
    }

    ctx.restore();
}

/* ==========================================================================
   BLOK 10: RETAKE & RESET PHOTOBOOTH
   Fungsi: Mengembalikan state aplikasi ke awal tanpa perlu reload / request stream.
   ========================================================================== */
function resetPhotobooth() {
    photo1Data = null;
    photo2Data = null;
    pose1Text = '';
    pose2Text = '';
    isShooting = false;
    currentState = AppState.IDLE;

    // Reset UI
    resultImg1.src = '';
    resultImg2.src = '';
    resultSection.style.display = 'none';
    cameraSection.style.display = 'block';

    takePhotoBtn.disabled = false;
    filterSelect.disabled = false;
    updateStatus('Ready to shoot', false);
}

/* ==========================================================================
   BLOK 11: EVENT LISTENERS BINDING
   ========================================================================== */
takePhotoBtn.addEventListener('click', startPhotoboothSession);
downloadStripBtn.addEventListener('click', downloadPhotoStrip);
downloadPhotosBtn.addEventListener('click', downloadIndividualPhotos);
retakeBtn.addEventListener('click', resetPhotobooth);

// Inisialisasi awal saat dokumen siap
window.addEventListener('DOMContentLoaded', initCamera);
