'use strict';

/* ==========================================================================
   BLOK 1: INISIALISASI ELEMEN DOM & CANVAS DEFAULT RESOLUTION
   Fungsi: Mengambil referensi elemen tombol, dropdown filter, video, canvas,
   placeholder, serta elemen error dari dokumen HTML, dan mengatur ukuran awal canvas.
   ========================================================================== */
const snapshotButton = document.querySelector('button#snapshot');
const filterSelect = document.querySelector('select#filter');
const video = window.video = document.querySelector('video');
const canvas = window.canvas = document.querySelector('canvas');
const placeholder = document.querySelector('#placeholder');
const errorElement = document.querySelector('#errorMsg');

// Setup resolusi default untuk canvas
canvas.width = 640;
canvas.height = 480;

/* ==========================================================================
   BLOK 2: EVENT HANDLER TOMBOL SNAPSHOT (PEMOTRETAN FOTO BERFILTER)
   Fungsi: Ketika tombol 'Take Snapshot' diklik, fungsi ini menyalin tayangan
   frame video aktif beserta kelas filter CSS yang dipilih ke elemen canvas 2D.
   ========================================================================== */
snapshotButton.onclick = function() {
    if (video.videoWidth && video.videoHeight) {
        // Sesuaikan dimensi canvas mengikuti resolusi tayangan video asli
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Terapkan nama kelas filter CSS yang sedang aktif ke elemen canvas
        canvas.className = filterSelect.value;
        
        // Gambar frame video saat ini ke dalam canvas 2D
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
   BLOK 3: EVENT HANDLER PERUBAHAN FILTER (FILTER REAL-TIME)
   Fungsi: Mengubah nilai class pada elemen <video> secara otomatis saat pengguna
   memilih opsi filter baru dari menu dropdown (<select>).
   ========================================================================== */
filterSelect.onchange = function() {
    video.className = filterSelect.value;
};

/* ==========================================================================
   BLOK 4: KONSTRAIN MEDIA WEBCAM
   Fungsi: Menentukan spesifikasi aliran video dari kamera (kamera depan,
   resolusi ideal 1280x720, tanpa audio).
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
   BLOK 5: HANDLER KEBERHASILAN (handleSuccess)
   Fungsi: Dijalankan ketika izin kamera diberikan. Menghubungkan aliran stream
   kamera langsung ke elemen <video> di HTML.
   ========================================================================== */
function handleSuccess(stream) {
    window.stream = stream; // Menyimpan objek stream ke variabel global browser
    video.srcObject = stream;
}

/* ==========================================================================
   BLOK 6: HANDLER ERROR (handleError)
   Fungsi: Menangkap kegagalan atau penolakan izin kamera dan mencetak pesan
   peringatan ke elemen HTML #errorMsg.
   ========================================================================== */
function handleError(error) {
    console.error('navigator.getUserMedia error: ', error);
    if (errorElement) {
        errorElement.innerHTML = `<p>Gagal mengakses kamera: ${error.name || error.message}</p>`;
    }
}

/* ==========================================================================
   BLOK 7: INISIALISASI & MEMULAI MEDIA WEBCAM
   Fungsi: Memeriksa dukungan browser terhadap API getUserMedia, lalu meminta
   izin akses kamera secara asynchronous (promise-based).
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