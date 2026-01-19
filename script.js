// Data untuk sistem antrian
let callHistory = [];
let audioEnabled = true;

// Elemen DOM
const queueNumberInput = document.getElementById('queue-number');
const operatorSelect = document.getElementById('operator');
const callBtn = document.getElementById('call-btn');
const resetBtn = document.getElementById('reset-btn');
const decreaseBtn = document.getElementById('decrease-number');
const increaseBtn = document.getElementById('increase-number');
const testAudioBtn = document.getElementById('test-audio-btn');
const displayQueueNumber = document.getElementById('display-queue-number');
const displayOperator = document.getElementById('display-operator');
const historyList = document.getElementById('history-list');
const audioStatus = document.getElementById('audio-status');
const callAudio = document.getElementById('call-audio');
const currentDate = document.getElementById('current-date');
const currentTime = document.getElementById('current-time');
const operatorCards = document.querySelectorAll('.operator-card');

// Daftar operator
const operators = [
    { id: 1, name: "Operator 1 - Pendaftaran", location: "Loket 1", status: "available" },
    { id: 2, name: "Operator 2 - Verifikasi Berkas", location: "Loket 2", status: "available" },
    { id: 3, name: "Operator 3 - Tes Akademik", location: "Ruangan 3", status: "available" },
    { id: 4, name: "Operator 4 - Tes Wawancara", location: "Ruangan 4", status: "available" },
    { id: 5, name: "Operator 5 - Tes Kesehatan", location: "Ruangan 5", status: "available" },
    { id: 6, name: "Operator 6 - Pengumuman Hasil", location: "Loket 6", status: "available" },
    { id: 7, name: "Operator 7 - Daftar Ulang", location: "Loket 7", status: "available" },
    { id: 8, name: "Operator 8 - Konsultasi", location: "Ruangan 8", status: "available" }
];

// Inisialisasi aplikasi
function initApp() {
    // Set tanggal dan waktu
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Set nilai awal tampilan
    updateDisplay();
    
    // Event listeners
    callBtn.addEventListener('click', callQueue);
    resetBtn.addEventListener('click', resetQueue);
    decreaseBtn.addEventListener('click', () => changeQueueNumber(-1));
    increaseBtn.addEventListener('click', () => changeQueueNumber(1));
    testAudioBtn.addEventListener('click', testAudio);
    queueNumberInput.addEventListener('change', updateDisplay);
    operatorSelect.addEventListener('change', updateDisplay);
    
    // Event listener untuk klik operator card
    operatorCards.forEach(card => {
        card.addEventListener('click', () => {
            const operatorId = card.getAttribute('data-operator');
            operatorSelect.value = operatorId;
            updateDisplay();
            
            // Highlight operator card yang dipilih
            operatorCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });
    
    // Update operator card yang aktif berdasarkan select
    operatorSelect.addEventListener('change', () => {
        operatorCards.forEach(card => {
            card.classList.remove('active');
            if (card.getAttribute('data-operator') === operatorSelect.value) {
                card.classList.add('active');
            }
        });
    });
    
    // Inisialisasi dengan operator 1 aktif
    document.querySelector('.operator-card[data-operator="1"]').classList.add('active');
    
    // Cek apakah browser mendukung Web Speech API
    if (!('speechSynthesis' in window)) {
        alert("Browser Anda tidak mendukung fitur suara. Suara panggilan antrian mungkin tidak berfungsi.");
        audioEnabled = false;
        updateAudioStatus();
    }
}

// Update tanggal dan waktu
function updateDateTime() {
    const now = new Date();
    
    // Format tanggal: Senin, 1 Januari 2024
    const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('id-ID', optionsDate);
    currentDate.textContent = formattedDate;
    
    // Format waktu: HH:MM:SS
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    currentTime.textContent = `${hours}:${minutes}:${seconds}`;
}

// Update tampilan antrian
function updateDisplay() {
    const queueNumber = queueNumberInput.value.padStart(3, '0');
    const operatorId = operatorSelect.value;
    const selectedOperator = operators.find(op => op.id == operatorId);
    
    displayQueueNumber.textContent = queueNumber;
    displayOperator.textContent = selectedOperator.name;
}

// Panggil antrian
function callQueue() {
    const queueNumber = queueNumberInput.value.padStart(3, '0');
    const operatorId = operatorSelect.value;
    const selectedOperator = operators.find(op => op.id == operatorId);
    
    // Update tampilan
    updateDisplay();
    
    // Tambahkan ke riwayat
    const callTime = new Date();
    const timeString = callTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    const historyItem = {
        number: queueNumber,
        operator: selectedOperator.name,
        time: timeString,
        timestamp: callTime
    };
    
    callHistory.unshift(historyItem); // Tambahkan di awal array
    updateHistoryDisplay();
    
    // Panggil suara
    playCallAudio(queueNumber, selectedOperator.name);
    
    // Update status operator menjadi sibuk sementara
    updateOperatorStatus(operatorId, 'busy');
    
    // Set timeout untuk mengembalikan status operator ke tersedia
    setTimeout(() => {
        updateOperatorStatus(operatorId, 'available');
    }, 30000); // 30 detik
    
    // Auto increment nomor antrian
    queueNumberInput.value = parseInt(queueNumberInput.value) + 1;
    updateDisplay();
}

// Update status operator
function updateOperatorStatus(operatorId, status) {
    // Update data operator
    const operatorIndex = operators.findIndex(op => op.id == operatorId);
    if (operatorIndex !== -1) {
        operators[operatorIndex].status = status;
    }
    
    // Update tampilan operator card
    const operatorCard = document.querySelector(`.operator-card[data-operator="${operatorId}"]`);
    if (operatorCard) {
        const statusElement = operatorCard.querySelector('.operator-status');
        if (status === 'busy') {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Sibuk';
            statusElement.classList.remove('status-available');
            statusElement.classList.add('status-busy');
        } else {
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Tersedia';
            statusElement.classList.remove('status-busy');
            statusElement.classList.add('status-available');
        }
    }
}

// Putar suara panggilan antrian
function playCallAudio(queueNumber, operatorName) {
    if (!audioEnabled) return;
    
    // Gunakan Web Speech API untuk sintesis suara
    const speech = new SpeechSynthesisUtterance();
    speech.text = `Nomor antrian ${queueNumber.split('').join(' ')}. Silakan menuju ${operatorName}`;
    speech.lang = 'id-ID';
    speech.rate = 0.9;
    speech.pitch = 1;
    speech.volume = 1;
    
    // Gunakan suara wanita jika tersedia
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(voice => 
        voice.lang === 'id-ID' || voice.lang.startsWith('id') ||
        (voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('perempuan'))
    );
    
    if (femaleVoice) {
        speech.voice = femaleVoice;
    }
    
    window.speechSynthesis.speak(speech);
}

// Update tampilan riwayat
function updateHistoryDisplay() {
    if (callHistory.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <p>Belum ada riwayat pemanggilan</p>
            </div>
        `;
        return;
    }
    
    let historyHTML = '';
    callHistory.forEach(item => {
        historyHTML += `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-number">${item.number}</div>
                    <div class="history-details">
                        <h5>${item.operator}</h5>
                        <p>Dipanggil pada ${item.time}</p>
                    </div>
                </div>
                <div class="history-time">${item.time}</div>
            </div>
        `;
    });
    
    historyList.innerHTML = historyHTML;
}

// Reset antrian
function resetQueue() {
    if (confirm("Apakah Anda yakin ingin mereset antrian? Riwayat pemanggilan akan dihapus.")) {
        queueNumberInput.value = 1;
        callHistory = [];
        updateDisplay();
        updateHistoryDisplay();
        
        // Reset semua operator ke status tersedia
        operators.forEach(op => op.status = 'available');
        operatorCards.forEach(card => {
            const statusElement = card.querySelector('.operator-status');
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Tersedia';
            statusElement.classList.remove('status-busy');
            statusElement.classList.add('status-available');
        });
        
        alert("Antrian telah direset.");
    }
}

// Ubah nomor antrian
function changeQueueNumber(change) {
    let currentNumber = parseInt(queueNumberInput.value);
    let newNumber = currentNumber + change;
    
    // Batasi antara 1 dan 999
    if (newNumber < 1) newNumber = 1;
    if (newNumber > 999) newNumber = 999;
    
    queueNumberInput.value = newNumber;
    updateDisplay();
}

// Tes suara
function testAudio() {
    if (!audioEnabled) {
        alert("Sistem suara tidak aktif. Pastikan browser Anda mendukung Web Speech API.");
        return;
    }
    
    const speech = new SpeechSynthesisUtterance();
    speech.text = "Ini adalah uji suara untuk sistem antrian SPMB SMA Negeri 1 Magetan.";
    speech.lang = 'id-ID';
    speech.rate = 0.9;
    speech.pitch = 1;
    speech.volume = 1;
    
    // Gunakan suara wanita jika tersedia
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(voice => 
        voice.lang === 'id-ID' || voice.lang.startsWith('id') ||
        (voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('perempuan'))
    );
    
    if (femaleVoice) {
        speech.voice = femaleVoice;
    }
    
    window.speechSynthesis.speak(speech);
    alert("Sedang memutar suara uji coba...");
}

// Update status audio
function updateAudioStatus() {
    if (audioEnabled) {
        audioStatus.innerHTML = '<i class="fas fa-volume-up"></i> Aktif';
        audioStatus.classList.remove('status-inactive');
        audioStatus.classList.add('status-active');
    } else {
        audioStatus.innerHTML = '<i class="fas fa-volume-mute"></i> Nonaktif';
        audioStatus.classList.remove('status-active');
        audioStatus.classList.add('status-inactive');
    }
}

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', initApp);

// Pastikan daftar suara tersedia untuk Web Speech API
if ('speechSynthesis' in window) {
    // Chrome memerlukan event ini untuk memuat suara
    speechSynthesis.addEventListener('voiceschanged', () => {
        console.log("Suara tersedia untuk Web Speech API");
    });
}