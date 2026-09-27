'use strict';

/* ==========================================================================
   BLOK 1: INISIALISASI ELEMEN DOM & SETUP UKURAN DEFAULT CANVAS
   Fungsi: Mengambil elemen video, canvas, tombol snapshot, placeholder,
   dan elemen error dari dokumen HTML serta menetapkan ukuran awal canvas.
   ========================================================================== */
const video = document.querySelector('video');
const canvas = window.canvas = document.querySelector('canvas');
const placeholder = document.querySelector('#placeholder');
const button = document.querySelector('#snapshotBtn');
const errorElement = document.querySelector('#errorMsg');

// Set resolusi default untuk canvas
canvas.width = 640;
canvas.height = 480;

/* ==========================================================================
   BLOK 2: EVENT HANDLER TOMBOL SNAPSHOT (PENGAMBILAN GAMBAR)
   Fungsi: Ketika tombol 'Take Snapshot' diklik, fungsi ini mengambil frame
   video yang sedang aktif, menyesuaikan ukuran canvas dengan resolusi video asli,
   lalu menggambar frame tersebut ke canvas serta menyembunyikan placeholder.
   ========================================================================== */
button.onclick = function() {
    if (video.videoWidth && video.videoHeight) {
        // Sesuaikan ukuran canvas dengan ukuran asli tayangan video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Salin tayangan video saat ini ke dalam konteks 2D canvas
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Sembunyikan teks placeholder dan tampilkan elemen canvas
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        canvas.classList.remove('empty');
    } else {
        console.warn('Video stream belum siap untuk dipotret.');
    }
};

/* ==========================================================================
   BLOK 3: KONSTRAIN KAMERA WEBCAM
   Fungsi: Menentukan spesifikasi aliran media yang diminta (kamera depan,
   resolusi ideal 1280x720, dan tanpa audio).
   ========================================================================== */
const constraints = {
    audio: false,
    video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
    }
};

/* ==========================================================================
   BLOK 4: HANDLER SUKSES (handleSuccess)
   Fungsi: Menghubungkan aliran (stream) media dari webcam pengguna secara
   langsung ke elemen <video> di halaman HTML ketika akses diizinkan.
   ========================================================================== */
function handleSuccess(stream) {
    window.stream = stream; // Menyimpan objek stream ke variabel global browser
    video.srcObject = stream;
}

/* ==========================================================================
   BLOK 5: HANDLER ERROR (handleError)
   Fungsi: Menangkap kegagalan/penolakan izin akses kamera dan mencetak pesan
   peringatan ke elemen HTML #errorMsg.
   ========================================================================== */
function handleError(error) {
    console.error('navigator.getUserMedia error: ', error);
    if (errorElement) {
        errorElement.innerHTML = `<p>Gagal mengakses kamera: ${error.name || error.message}</p>`;
    }
}

/* ==========================================================================
   BLOK 6: INISIALISASI & MEMULAI STREAM KAMERA
   Fungsi: Memeriksa kompatibilitas browser terhadap API getUserMedia,
   kemudian meminta akses kamera pengguna secara asynchronous.
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