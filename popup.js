function smartCase(str) {
    if (!str) return "";
    // Check if the string is in all caps and not a short acronym
    if (str === str.toUpperCase() && str.length > 3) {
        // Convert to lowercase and capitalize the first letter of each word
        return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    }
    // Otherwise, return the original string
    return str;
}

function formatAuthorsAPA(authors) {
    if (authors.length === 0) return "Anonim";
    
    const formattedNames = authors.map(full => {
        let parts = full.trim().split(" ");
        if (parts.length > 1) {
            let last = smartCase(parts.pop());
            let firstInitial = parts[0].charAt(0).toUpperCase();
            return `${last}, ${firstInitial}.`;
        }
        return smartCase(full);
    });

    if (formattedNames.length === 1) {
        return formattedNames[0];
    } else if (formattedNames.length === 2) {
        return formattedNames.join(' & ');
    } else if (formattedNames.length > 2 && formattedNames.length <= 20) {
        return `${formattedNames.slice(0, -1).join(', ')}, & ${formattedNames.slice(-1)}`;
    } else { // More than 20 authors
        return `${formattedNames.slice(0, 19).join(', ')}, ..., ${formattedNames.slice(-1)}`;
    }
}

function formatAuthorsChiBib(authors) {
    if (authors.length === 0) return "Anonim";

    const formattedNames = authors.map((full, index) => {
        let parts = full.trim().split(" ");
        if (parts.length > 1) {
            let last = smartCase(parts.pop());
            let first = smartCase(parts.join(" "));
            // Invert only the first author's name
            return (index === 0) ? `${last}, ${first}` : `${first} ${last}`;
        }
        return smartCase(full);
    });

    if (formattedNames.length === 1) {
        return formattedNames[0];
    } else {
        return `${formattedNames.slice(0, -1).join(', ')}, and ${formattedNames.slice(-1)}`;
    }
}

function formatAuthorsChiFoot(authors) {
    if (authors.length === 0) return "Anonim";
    const formattedNames = authors.map(full => smartCase(full));

    if (formattedNames.length === 1) {
        return formattedNames[0];
    } else if (formattedNames.length <= 3) {
        return `${formattedNames.slice(0, -1).join(', ')} and ${formattedNames.slice(-1)}`;
    } else { // 4 or more authors
        return `${smartCase(authors[0].split(" ").join(" "))} et al.`;
    }
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
                    // The author response is now a semicolon-separated string
                    document.getElementById('author').value = response.author.split(';').map(name => smartCase(name.trim())).join('; '); 
                    document.getElementById('journal').value = smartCase(response.journal);
                    document.getElementById('year').value = response.year || "";
                    document.getElementById('doi').value = response.doi || "";
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
            // Split the author input by semicolon to get an array of authors
            const authors = document.getElementById('author').value.split(';').map(name => name.trim()).filter(name => name);
            const journal = document.getElementById('journal').value.trim() || "Nama Jurnal Tidak Diketahui";
            const year = document.getElementById('year').value.trim() || "t.t.";
            const doi = document.getElementById('doi').value.trim();

            if (!title || authors.length === 0) {
                statusMsg.innerText = "Judul dan Penulis wajib diisi.";
                return;
            }
            statusMsg.innerText = "";

            let doiLink = "";
            if (doi) {
                if (doi.startsWith('http')) {
                    doiLink = doi;
                } else {
                    doiLink = `https://doi.org/${doi}`;
                }
            }

            // --- APA 7 ---
            const apaRef = `${formatAuthorsAPA(authors)} (${year}). ${title}. <i>${journal}</i>. ${doiLink ? `<a href="${doiLink}" target="_blank">${doiLink}</a>` : ''}`;
            
            let apaBody = "";
            if (authors.length === 1) {
                apaBody = `(${smartCase(authors[0].split(' ').pop())}, ${year})`;
            } else if (authors.length === 2) {
                apaBody = `(${smartCase(authors[0].split(' ').pop())} & ${smartCase(authors[1].split(' ').pop())}, ${year})`;
            } else { // 3 or more
                apaBody = `(${smartCase(authors[0].split(' ').pop())} et al., ${year})`;
            }

            // --- Chicago 17 ---
            const chiBib = `${formatAuthorsChiBib(authors)}. "${title}." <i>${journal}</i>, ${year}. ${doiLink ? `<a href="${doiLink}" target="_blank">${doiLink}</a>.` : ''}`;
            const chiFoot = `${formatAuthorsChiFoot(authors)}, "${title}," <i>${journal}</i> (${year}), ${doiLink ? `akses pada ${doiLink}`: ''}.`;

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