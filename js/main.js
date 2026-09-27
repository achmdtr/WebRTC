'use strict';

/* ==========================================================================
   BLOK 1: INISIALISASI ELEMEN DOM & KONSTRAIN MEDIA
   Fungsi: Mengambil elemen video/errorMsg dari HTML dan mendefinisikan
   pengaturan kamera (resolusi ideal 1280x720, kamera depan, tanpa suara).
   ========================================================================== */
const errorElement = document.querySelector('#errorMsg');
const video = document.querySelector('video');

const constraints = window.constraints = {
    audio: false,
    video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
    }
};

/* ==========================================================================
   BLOK 2: HANDLER KEBERHASILAN (handleSuccess)
   Fungsi: Dijalankan jika pengguna memberikan izin akses kamera. Aliran
   (stream) dari kamera langsung dihubungkan ke elemen <video> untuk ditayangkan.
   ========================================================================== */
function handleSuccess(stream) {
    const videoTracks = stream.getVideoTracks();
    console.log('Mendapatkan stream dengan konstrain:', constraints);
    if (videoTracks.length > 0) {
        console.log('Menggunakan perangkat video: ' + videoTracks[0].label);
    }
    
    stream.oninactive = function() {
        console.log('Stream tidak aktif');
    };
    
    window.stream = stream; // Menyimpan objek stream ke jendela global browser
    video.srcObject = stream;

    const cameraStatus = document.querySelector('#cameraStatus');
    if (cameraStatus) {
        cameraStatus.innerText = 'Kamera berhasil diakses';
    }
}

/* ==========================================================================
   BLOK 3: HANDLER KESALAHAN/ERROR (handleError)
   Fungsi: Menangkap dan menganalisis berbagai jenis kegagalan (seperti izin
   ditolak, resolusi tidak cocok, atau kamera tidak terdeteksi).
   ========================================================================== */
function handleError(error) {
    console.error('Error webcam:', error);
    if (error.name === 'ConstraintNotSatisfiedError') {
        errorMsg(`Resolusi video yang diminta tidak didukung oleh perangkat Anda.`);
    } else if (error.name === 'PermissionDeniedError' || error.name === 'NotAllowedError') {
        errorMsg(`Izin akses kamera ditolak. Harap izinkan akses kamera di browser Anda agar demo ini dapat berjalan.`);
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMsg(`Perangkat kamera tidak ditemukan pada perangkat Anda.`);
    } else {
        errorMsg(`Terjadi kesalahan getUserMedia: ${error.name} (${error.message || ''})`);
    }
}

/* ==========================================================================
   BLOK 4: FUNGSI PENCETAK PESAN ERROR KE HTML (errorMsg)
   Fungsi: Menampilkan pesan kesalahan secara visual ke dalam kontainer
   #errorMsg pada antarmuka halaman HTML.
   ========================================================================== */
function errorMsg(msg, error) {
    if (errorElement) {
        errorElement.innerHTML += `<p>${msg}</p>`;
    }
    if (typeof error !== 'undefined') {
        console.error(error);
    }
}

/* ==========================================================================
   BLOK 5: INISIALISASI & EKSEKUSI API GETUSERMEDIA
   Fungsi: Memeriksa apakah browser mendukung API WebRTC getUserMedia, lalu
   meminta izin akses kamera dan menjalankan fungsi sukses / error secara asynchronous.
   ========================================================================== */
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia(constraints)
        .then(handleSuccess)
        .catch(handleError);
} else {
    errorMsg('Browser Anda tidak mendukung API navigator.mediaDevices.getUserMedia.');
}