'use strict';

/* ==========================================================================
   BLOK 1: INISIALISASI ELEMEN DOM & KONSTRAIN MEDIA AUDIO
   Fungsi: Mengambil elemen <audio> dan wadah error dari HTML, serta mendefinisikan
   konstrain media untuk hanya meminta akses audio (mikrofon) tanpa video.
   ========================================================================== */
const audio = document.querySelector('audio');
const errorElement = document.querySelector('#errorMsg');

const constraints = window.constraints = {
    audio: true,
    video: false
};

/* ==========================================================================
   BLOK 2: HANDLER KEBERHASILAN STREAM (handleSuccess)
   Fungsi: Dijalankan jika izin mikrofon diberikan. Mengambil track audio,
   menghubungkan aliran stream mikrofon ke elemen <audio>, dan mengaktifkan suara.
   ========================================================================== */
function handleSuccess(stream) {
    const audioTracks = stream.getAudioTracks();
    console.log('Got stream with constraints:', constraints);
    if (audioTracks.length > 0) {
        console.log('Using audio device: ' + audioTracks[0].label);
    }
    
    stream.oninactive = function() {
        console.log('Stream ended');
    };
    
    window.stream = stream; // Menyimpan objek stream ke variabel global browser
    audio.srcObject = stream;
}

/* ==========================================================================
   BLOK 3: HANDLER ERROR (handleError)
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
   BLOK 4: INISIALISASI & EKSEKUSI API GETUSERMEDIA (AUDIO)
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