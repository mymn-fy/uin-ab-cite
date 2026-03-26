// Fungsi: Membalik Nama Penulis (Budi Santoso -> Santoso, B.)
function formatAuthorName(authorStr) {
    if (!authorStr) return "Anonim";
    let names = authorStr.trim().split(" ");
    if (names.length > 1) {
        let lastName = names[names.length - 1];
        let firstNameInitial = names[0].charAt(0);
        return `${lastName}, ${firstNameInitial}.`;
    }
    return authorStr;
}

// 1. Tombol Ambil Data dari Halaman
document.getElementById('btn-extract').addEventListener('click', async () => {
    const statusMsg = document.getElementById('status-msg');
    statusMsg.innerText = "Mencari data...";

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { action: "extractData" }, (response) => {
        if (response) {
            document.getElementById('title').value = response.title || "";
            document.getElementById('author').value = response.author || "";
            document.getElementById('year').value = response.year || "";
            statusMsg.innerText = "Data ditemukan!";
        } else {
            statusMsg.innerText = "Data tidak ditemukan, isi manual ya.";
        }
    });
});

// 2. Tombol Buat Format Sitasi
document.getElementById('btn-generate').addEventListener('click', () => {
    const title = document.getElementById('title').value;
    const author = document.getElementById('author').value;
    const year = document.getElementById('year').value || "n.d.";

    if (!title || !author) {
        alert("Isi Judul dan Penulis dulu!");
        return;
    }

    // Format APA
    const fAuthor = formatAuthorName(author);
    const apa = `${fAuthor} (${year}). ${title}.`;

    // Format Chicago
    const chicago = `${author}. "${title}." ${year}.`;

    // Tampilkan
    document.getElementById('apa-result').innerText = apa;
    document.getElementById('chicago-result').innerText = chicago;
    document.getElementById('result-section').style.display = 'block';
});

// 3. Logika Tombol Copy
document.querySelectorAll('.btn-copy').forEach(button => {
    button.addEventListener('click', (e) => {
        const targetId = e.target.getAttribute('data-target');
        const text = document.getElementById(targetId).innerText;
        
        navigator.clipboard.writeText(text).then(() => {
            const originalText = e.target.innerText;
            e.target.innerText = "Tersalin! ✅";
            setTimeout(() => { e.target.innerText = originalText; }, 2000);
        });
    });
});

// --- FUNGSI DOWNLOAD FILE ---
function downloadFile(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// 1. Logika Download BibTeX
document.getElementById('btn-bibtex').addEventListener('click', () => {
    const title = document.getElementById('title').value;
    const author = document.getElementById('author').value;
    const year = document.getElementById('year').value || "2024";
    
    // Format BibTeX sederhana
    const bibtexData = `@article{cite_item,
  author = {${author}},
  title = {${title}},
  year = {${year}},
  journal = {Diambil via SitasiInstan}
}`;

    downloadFile("sitasi.bib", bibtexData);
});

// 2. Logika Download RIS
document.getElementById('btn-ris').addEventListener('click', () => {
    const title = document.getElementById('title').value;
    const author = document.getElementById('author').value;
    const year = document.getElementById('year').value || "2024";

    // Format RIS standar (TY = Type, AU = Author, TI = Title, PY = Publication Year)
    const risData = `TY  - JOUR
AU  - ${author}
TI  - ${title}
PY  - ${year}
ER  - `;

    downloadFile("sitasi.ris", risData);
});