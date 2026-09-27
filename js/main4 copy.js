'use strict';

/* ==========================================================================
   BLOK 1: INISIALISASI ELEMEN DOM & KONSTRAIN MEDIA AUDIO
   Fungsi: Mengambil elemen <audio>, wadah error, serta elemen <canvas> visualizer.
   Mendefinisikan konstrain media untuk hanya meminta akses audio (mikrofon).
   ========================================================================== */
const audio = document.querySelector('audio');
const errorElement = document.querySelector('#errorMsg');
const canvas = document.querySelector('#visualizer');
const canvasCtx = canvas ? canvas.getContext('2d') : null;

const constraints = window.constraints = {
    audio: true,
    video: false
};

// Variabel global untuk Web Audio API
let audioCtx = null;
let analyser = null;
let microphoneSource = null;
let animationFrameId = null;

/* ==========================================================================
   BLOK 2: PROSES AUDIO VISUALIZER (Web Audio API)
   Fungsi: Menggunakan AudioContext dan AnalyserNode untuk memproses frekuensi
   suara mikrofon secara real-time dan menggambarkannya di Canvas.
   ========================================================================== */
function initAudioVisualizer(stream) {
    if (!canvasCtx) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    microphoneSource = audioCtx.createMediaStreamSource(stream);

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    microphoneSource.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        animationFrameId = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        canvasCtx.fillStyle = 'rgba(5, 38, 27, 0.4)';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * canvas.height;

            const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, '#0a3a2a');
            gradient.addColorStop(0.5, '#8b3a77');
            gradient.addColorStop(1, '#dfb15b');

            canvasCtx.fillStyle = gradient;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

            x += barWidth + 1;
        }
    }

    draw();
}

/* ==========================================================================
   BLOK 3: HANDLER KEBERHASILAN STREAM (handleSuccess)
   Fungsi: Dijalankan jika izin mikrofon diberikan. Menghubungkan stream ke
   elemen <audio>, menampilkan status "Mikrofon aktif", dan menjalankan visualizer.
   ========================================================================== */
function handleSuccess(stream) {
    const audioTracks = stream.getAudioTracks();
    console.log('Got stream with constraints:', constraints);
    if (audioTracks.length > 0) {
        console.log('Using audio device: ' + audioTracks[0].label);
    }

    stream.oninactive = function () {
        console.log('Stream ended');
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };

    window.stream = stream; // Menyimpan objek stream ke variabel global browser
    audio.srcObject = stream;

    // Menampilkan status mikrofon berhasil aktif sesuai instruksi PDF
    const audioStatus = document.querySelector('#audioStatus');
    if (audioStatus) {
        audioStatus.innerText = 'Mikrofon aktif';
    }

    // Mengaktifkan visualisasi Audio Visualizer real-time
    initAudioVisualizer(stream);
}

/* ==========================================================================
   BLOK 4: HANDLER ERROR (handleError)
   Fungsi: Menangkap kesalahan atau penolakan izin mikrofon dan mencetak pesan
   informatif ke elemen HTML #errorMsg.
   ========================================================================== */
function handleError(error) {
    console.error('navigator.getUserMedia error: ', error);
    if (errorElement) {
        errorElement.innerHTML = `<p>Gagal mengakses mikrofon: ${error.name || error.message}</p>`;
    }
}

/* ==========================================================================
   BLOK 5: INISIALISASI & EKSEKUSI API GETUSERMEDIA (AUDIO)
   Fungsi: Memeriksa dukungan browser terhadap API getUserMedia, lalu meminta
   akses mikrofon perangkat pengguna secara asynchronous.
   ========================================================================== */
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia(constraints)
        .then(handleSuccess)
        .catch(handleError);
} else {
    if (errorElement) {
        errorElement.innerHTML = `<p>Browser Anda tidak mendukung API navigator.mediaDevices.getUserMedia.</p>`;
    }
}