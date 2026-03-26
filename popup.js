// --- FUNGSI SMART CASING ---
function smartCase(str) {
    if (!str) return "";
    if (str === str.toUpperCase()) {
        return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    }
    return str;
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
document.addEventListener('DOMContentLoaded', () => {

    const btnExtract = document.getElementById('btn-extract');
    const btnGenerate = document.getElementById('btn-generate');
    const statusMsg = document.getElementById('status-msg');

    if (btnExtract) {
        btnExtract.addEventListener('click', async () => {
            statusMsg.innerText = "Mengekstrak data dari halaman...";
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            chrome.tabs.sendMessage(tab.id, { action: "extractData" }, (response) => {
                if (chrome.runtime.lastError) {
                    statusMsg.innerText = "Gagal terhubung ke halaman. Coba refresh.";
                    console.error(chrome.runtime.lastError.message);
                    return;
                }
                
                if (response) {
                    document.getElementById('title').value = smartCase(response.title);
                    document.getElementById('author').value = smartCase(response.author);
                    document.getElementById('journal').value = smartCase(response.journal);
                    document.getElementById('year').value = response.year || "";
                    document.getElementById('doi').value = response.doi || ""; // Populate DOI field
                    statusMsg.innerText = "Data berhasil diekstrak!";
                } else {
                    statusMsg.innerText = "Tidak ada data yang dapat ditemukan di halaman ini.";
                }
            });
        });
    }

    if (btnGenerate) {
        btnGenerate.addEventListener('click', () => {
            const title = document.getElementById('title').value.trim();
            const author = document.getElementById('author').value.trim();
            const journal = document.getElementById('journal').value.trim() || "Nama Jurnal Tidak Diketahui";
            const year = document.getElementById('year').value.trim() || "t.t."; // (t.t. -> tanpa tahun)
            const doi = document.getElementById('doi').value.trim();

            if (!title || !author) {
                statusMsg.innerText = "Judul dan Penulis wajib diisi.";
                return;
            }
            statusMsg.innerText = ""; // Clear status on success

            let doiLink = "";
            if (doi) {
                // Cek jika sudah merupakan URL lengkap
                if (doi.startsWith('http')) {
                    doiLink = doi;
                } else {
                // Jika hanya DOI (misal: 10.xxxx/...), tambahkan prefix
                    doiLink = `https://doi.org/${doi}`;
                }
            }

            const apaRef = `${formatNameAPA(author)} (${year}). ${title}. <i>${journal}</i>. ${doiLink ? `<a href="${doiLink}" target="_blank">${doiLink}</a>` : ''}`;
            const apaBody = `(${smartCase(author.split(" ").pop())}, ${year})`;

            const chiBib = `${formatNameChiBib(author)}. "${title}." <i>${journal}</i>, ${year}. ${doiLink ? `<a href="${doiLink}" target="_blank">${doiLink}</a>.` : ''}`;
            const chiFoot = `${smartCase(author)}, "${title}," <i>${journal}</i> (${year}), ${doiLink ? `akses pada ${doiLink}`: ''}.`;

            document.getElementById('apa-ref').innerHTML = apaRef;
            document.getElementById('apa-body').innerHTML = apaBody;
            document.getElementById('chi-bib').innerHTML = chiBib;
            document.getElementById('chi-foot').innerHTML = chiFoot;

            document.getElementById('result-section').style.display = 'block';
        });
    }

    document.querySelectorAll('.btn-copy').forEach(button => {
        button.addEventListener('click', (e) => {
            const targetId = e.target.getAttribute('data-target');
            const el = document.getElementById(targetId);

            const range = document.createRange();
            range.selectNode(el);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            
            try {
                document.execCommand('copy');
                const originalText = e.target.innerHTML;
                e.target.innerHTML = `Tersalin! <svg width="14" viewBox="0 0 24 24" style="vertical-align: middle;" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                e.target.style.color = 'var(--success-color)';
                
                setTimeout(() => {
                    e.target.innerHTML = 'Salin Teks';
                    e.target.style.color = 'var(--primary-color)';
                }, 2000);

            } catch (err) {
                console.error('Gagal menyalin teks: ', err);
            }

            window.getSelection().removeAllRanges();
        });
    });
});