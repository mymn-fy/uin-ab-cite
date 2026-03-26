// --- FUNGSI SMART CASING ---
// Mengubah "JUDUL BESAR SEMUA" menjadi "Judul Besar Semua"
function smartCase(str) {
    if (!str) return "";
    // Jika teks huruf besar semua (caps lock)
    if (str === str.toUpperCase()) {
        return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    }
    return str; // Jika normal, biarkan saja
}

// --- FUNGSI FORMATTER NAMA ---
function formatNameAPA(full) {
    if (!full) return "Anonim";
    let parts = full.trim().split(" ");
    if (parts.length > 1) {
        let last = smartCase(parts.pop());
        let firstInitial = parts[0].charAt(0).toUpperCase();
        return `${last}, ${firstInitial}.`;
    }
    return smartCase(full);
}

function formatNameChiBib(full) {
    if (!full) return "Anonim";
    let parts = full.trim().split(" ");
    if (parts.length > 1) {
        let last = smartCase(parts.pop());
        let first = smartCase(parts.join(" "));
        return `${last}, ${first}`;
    }
    return smartCase(full);
}

// --- LOGIKA UTAMA ---
document.getElementById('btn-extract').addEventListener('click', async () => {
    const statusMsg = document.getElementById('status-msg');
    statusMsg.innerText = "Mencari data...";
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { action: "extractData" }, (response) => {
        if (response) {
            // Apply Smart Case langsung saat data diambil
            document.getElementById('title').value = smartCase(response.title);
            document.getElementById('author').value = smartCase(response.author);
            document.getElementById('journal').value = smartCase(response.journal);
            document.getElementById('year').value = response.year || "";
            statusMsg.innerText = "Data ditemukan & diperbaiki!";
        }
    });
});

document.getElementById('btn-generate').addEventListener('click', () => {
    const title = document.getElementById('title').value.trim();
    const author = document.getElementById('author').value.trim();
    const journal = document.getElementById('journal').value.trim() || "Nama Jurnal Tidak Diketahui";
    const year = document.getElementById('year').value.trim() || "n.d.";

    if (!title || !author) { alert("Isi Judul dan Penulis!"); return; }

    // APA 7: Nama Jurnal & Volume dimiringkan. Judul artikel tidak.
    const apaRef = `${formatNameAPA(author)} (${year}). ${title}. <i>${journal}</i>.`;
    const apaBody = `(${smartCase(author.split(" ").pop())}, ${year})`;

    // Chicago 17: Judul artikel dalam tanda kutip, Nama Jurnal dimiringkan.
    const chiBib = `${formatNameChiBib(author)}. "${title}." <i>${journal}</i> (${year}).`;
    const chiFoot = `${smartCase(author)}, "${title}," <i>${journal}</i> (${year}).`;

    // Gunakan innerHTML agar tag <i> berfungsi
    document.getElementById('apa-ref').innerHTML = apaRef;
    document.getElementById('apa-body').innerHTML = apaBody;
    document.getElementById('chi-bib').innerHTML = chiBib;
    document.getElementById('chi-foot').innerHTML = chiFoot;
    
    document.getElementById('result-section').style.display = 'block';
});

// Logika Copy (Harus bisa copy rich text/HTML miring ke Word)
document.querySelectorAll('.btn-copy').forEach(button => {
    button.addEventListener('click', (e) => {
        const targetId = e.target.getAttribute('data-target');
        const el = document.getElementById(targetId);
        
        // Teknik untuk menyalin formatting (miring) agar terbawa ke Word
        const range = document.createRange();
        range.selectNode(el);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        window.getSelection().removeAllRanges();

        const originalText = e.target.innerText;
        e.target.innerText = "Tersalin (Miring)! ✅";
        setTimeout(() => { e.target.innerText = originalText; }, 2000);
    });
});