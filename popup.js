// --- SITASIINSTAN PRO v1.2 ---
// PDF.js Worker Configuration (gunakan pdf.worker.js bukan .min.js)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.js';

// --- HELPER FUNCTIONS ---
function sentenceCase(str) {
    if (!str) return "";
    const lower = str.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function smartCase(str) {
    if (!str) return "";
    // Daftar singkatan yang harus tetap HURUF BESAR semua
    const abbreviations = new Set([
        'UIN','IAIN','UGM','UI','ITB','IPB','ITS','UNAIR','UNDIP','UNY','UNS','UNPAD',
        'UNHAS','UNEJ','UB','UM','UPI','UNM','UNSYIAH','USK','UNSOED','UNIKAL',
        'STAIN','STAI','STIT','STIS','STKIP','IKIP','FISIP','FKIP','FMIPA','FK',
        'FH','FE','FT','SD','SMP','SMA','SMK','S1','S2','S3','OJS','DOI','ISBN',
        'ISSN','NIM','NIP','RT','RW','DKI','RI','PNS','ASN','TNI','POLRI'
    ]);
    const conjunctions = new Set([
        'dan', 'atau', 'serta', 'di', 'ke', 'dari', 'yang', 'untuk', 'dengan', 'dalam', 'pada', 'kepada', 'bagi', 'oleh', 'tentang', 'sebagai'
    ]);

    let isFirstWord = true;
    return str.replace(/\S+/g, (word) => {
        // Hapus tanda baca di awal/akhir kata untuk pengecekan
        const cleaned = word.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
        if (abbreviations.has(cleaned.toUpperCase())) {
            isFirstWord = false;
            // Kembalikan dengan tanda baca asli tapi hurufnya all-caps
            return word.replace(cleaned, cleaned.toUpperCase());
        }
        if (!isFirstWord && conjunctions.has(cleaned.toLowerCase())) {
            return word.toLowerCase();
        }
        isFirstWord = false;
        // Title case biasa
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
}

// --- FORMATTER NAMA ---
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
    } else {
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
    } else {
        return `${smartCase(authors[0].split(" ").join(" "))} et al.`;
    }
}

// --- LOGIKA EKSTRAKSI PDF v1.2 (IMPROVED: font-size based detection) ---
async function extractDataFromPDF(url) {
    try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        // Step 1: Coba metadata resmi PDF
        // CATATAN: metadata sering tidak akurat di PDF Indonesia
        // (contoh: Author = merek laptop, Title = nama file)
        // Jadi validasi ketat sebelum dipakai — heuristik lebih dipercaya
        const metadata = await pdf.getMetadata().catch(() => null);
        const rawMetaTitle  = metadata?.info?.Title?.trim()  || "";
        const rawMetaAuthor = metadata?.info?.Author?.trim() || "";

        // Tolak Author jika: terlalu pendek, tidak ada spasi, atau nama merek/device
        const brandPattern = /^(hp|dell|lenovo|asus|acer|toshiba|sony|samsung|microsoft|apple|admin|user|root|owner|unknown|pc|laptop)$/i;
        let metaAuthor = (
            rawMetaAuthor.length >= 5 &&
            rawMetaAuthor.includes(' ') &&
            !brandPattern.test(rawMetaAuthor.trim())
        ) ? rawMetaAuthor : "";

        // Tolak Title jika: terlalu pendek, mengandung path file, atau ekstensi .pdf
        let metaTitle = (
            rawMetaTitle.length >= 10 &&
            !rawMetaTitle.includes('\\') &&
            !rawMetaTitle.toLowerCase().includes('.pdf')
        ) ? rawMetaTitle : "";

        // Step 2: Baca teks halaman pertama beserta info transform (font size)
        const firstPage  = await pdf.getPage(1);
        const textContent = await firstPage.getTextContent();
        const rawItems   = textContent.items.filter(i => i.str.trim().length > 0);

        // Step 3: Kelompokkan item berdasarkan posisi Y → satu baris
        const lineMap = new Map();
        rawItems.forEach(item => {
            const y = Math.round(item.transform[5]); // posisi Y
            if (!lineMap.has(y)) lineMap.set(y, []);
            lineMap.get(y).push(item);
        });

        // Urutkan baris dari atas ke bawah (Y besar = posisi lebih atas di PDF)
        const lines = Array.from(lineMap.entries())
            .sort((a, b) => b[0] - a[0])
            .map(([y, lineItems]) => ({
                y,
                text: lineItems.map(i => i.str).join(' ').trim(),
                fontSize: Math.max(...lineItems.map(i => Math.abs(i.transform[3]) || 10))
            }))
            .filter(line => line.text.length > 0);

        const fullText = lines.map(l => l.text).join(' ');

        // Step 4: DOI
        const doiRegex = /(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i;
        const doiMatch = fullText.match(doiRegex);
        const doi = doiMatch ? "https://doi.org/" + doiMatch[0] : url;

        // Step 5: Tahun
        const yearMatch = fullText.match(/\b(20|19)\d{2}\b/);
        const year = yearMatch ? yearMatch[0] : "";

        // Step 5b: Volume & Nomor
        // Pola: "Vol. 16 No. 2", "Volume 16 Nomor 2", "Vol. 16, No. 2"
        let volume = "", issue = "";
        const volNoRegex = /[Vv]ol(?:ume)?\.?\s*(\d+)[,\s]+[Nn]o(?:mor)?\.?\s*(\d+)/;
        const volOnlyRegex = /[Vv]ol(?:ume)?\.?\s*(\d+)/;
        const noOnlyRegex = /[Nn]o(?:mor)?\.?\s*(\d+)/;
        const volNoMatch = fullText.match(volNoRegex);
        if (volNoMatch) {
            volume = volNoMatch[1];
            issue  = volNoMatch[2];
        } else {
            const volMatch = fullText.match(volOnlyRegex);
            if (volMatch) volume = volMatch[1];
            const noMatch = fullText.match(noOnlyRegex);
            if (noMatch) issue = noMatch[1];
        }

        // Step 6: Judul = baris dengan font size TERBESAR
        const maxFontSize = Math.max(...lines.map(l => l.fontSize));
        const titleLines  = lines.filter(l => l.fontSize >= maxFontSize - 1);
        let title = metaTitle || titleLines.map(l => l.text).join(' ').trim();

        // Step 7: Nama Jurnal
        // Pola: baris kecil di atas judul yang mengandung nama jurnal atau "Vol."
        const journalKeywords = /jurnal|journal|majalah|buletin|bulletin|media|review|proceeding|konferensi/i;
        const skipWords = /issn|doi|email|@|http|diajukan|direvisi|diterima|abstract|abstrak|intisari/i;
        let journal = "";

        for (const line of lines) {
            if (line.fontSize >= maxFontSize) continue; // skip judul
            if (skipWords.test(line.text)) continue;
            if (journalKeywords.test(line.text)) {
                // Bersihkan info volume: "Media Informasi Vol. 32, No. 1, Tahun 2023" → "Media Informasi"
                journal = line.text.replace(/\s+(Vol\.|Volume|No\.|Nomor|Tahun|Issue|Edisi).*/i, '').trim();
                break;
            }
            // Fallback: baris paling atas yang mengandung "Vol." → ambil bagian sebelumnya sebagai nama jurnal
            if (/vol\.|volume/i.test(line.text) && !journal) {
                journal = line.text.replace(/\s+(Vol\.|Volume|No\.|Nomor|Tahun|Issue|Edisi).*/i, '').trim();
                break;
            }
        }

        // Step 8: Penulis
        // Cari baris di bawah judul yang Title Case, tidak mengandung skip words
        let author = metaAuthor;
        if (!author) {
            const titleMinY = Math.min(...titleLines.map(l => l.y)); // posisi Y terbawah judul

            for (const line of lines) {
                if (line.y >= titleMinY) continue; // lewati judul dan area di atasnya
                if (skipWords.test(line.text)) continue;
                if (/universitas|institut|sekolah|program|fakultas|department|college/i.test(line.text)) continue;
                if (line.text.length < 3) continue;

                // Cek Title Case: setiap kata diawali huruf kapital → kemungkinan nama orang
                const words = line.text.split(/\s+/).filter(w => w.length > 1);
                const isTitleCase = words.every(w => /^[A-Z\u00C0-\u024F]/.test(w));

                if (isTitleCase && words.length >= 2 && words.length <= 8) {
                    author = line.text.trim();
                    break;
                }
            }
        }

        return {
            title:    smartCase(title),
            author:   author || "",
            year:     year,
            doi:      doi,
            journal:  journal,
            volume:   volume,
            issue:    issue,
            pageType: 'journal'
        };

    } catch (err) {
        console.error("PDF Error:", err);
        return null;
    }
}

// --- LOGIKA UTAMA ---
let currentPageType = 'journal';

document.addEventListener('DOMContentLoaded', () => {

    const btnExtract = document.getElementById('btn-extract');
    const btnGenerate = document.getElementById('btn-generate');
    const btnDownloadRis = document.getElementById('btn-download-ris');
    const statusMsg = document.getElementById('status-msg');
    const journalField = document.getElementById('journal').parentElement;
    const repositoryFields = document.getElementById('repository-fields');

    if (btnExtract) {
        btnExtract.addEventListener('click', async () => {
            statusMsg.innerText = "Mendeteksi format file...";

            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const url = tab.url.toLowerCase();

            // --- CEK APAKAH INI FILE PDF ---
            if (url.endsWith(".pdf") || url.includes("blob:") || url.startsWith("file:///")) {
                statusMsg.innerText = "Membaca file PDF, harap tunggu...";
                const pdfData = await extractDataFromPDF(tab.url);

                if (pdfData) {
                    currentPageType = 'journal';
                    journalField.style.display = 'block';
                    repositoryFields.style.display = 'none';
                    document.getElementById('vol-no-fields').style.display = 'block';

                    document.getElementById('title').value = pdfData.title;
                    document.getElementById('author').value = pdfData.author;
                    document.getElementById('year').value = pdfData.year;
                    document.getElementById('doi').value = pdfData.doi;
                    document.getElementById('journal').value = pdfData.journal ? smartCase(pdfData.journal) : '';
                    document.getElementById('volume').value = pdfData.volume || '';
                    document.getElementById('issue').value  = pdfData.issue  || '';
                    document.getElementById('pages').value  = '';
                    statusMsg.innerText = "✅ Data PDF berhasil diekstrak! Periksa & koreksi jika perlu.";
                } else {
                    statusMsg.innerText = "❌ Gagal baca PDF. Pastikan 'Allow access to file URLs' aktif di chrome://extensions/";
                }

            } else {
                // --- JIKA BUKAN PDF: Gunakan logika HTML (kode lama) ---
                statusMsg.innerText = "Mendeteksi & Mengekstrak data...";

                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: extractPageData,
                }, (injectionResults) => {
                    if (chrome.runtime.lastError || !injectionResults || injectionResults.length === 0) {
                        statusMsg.innerText = "Gagal mengekstrak data dari halaman ini.";
                        console.error(chrome.runtime.lastError?.message || "No results from injection.");
                        return;
                    }

                    const response = injectionResults[0].result;
                    if (response) {
                        currentPageType = response.pageType || 'journal';

                        if (currentPageType === 'repository') {
                            journalField.style.display = 'none';
                            repositoryFields.style.display = 'block';
                            document.getElementById('vol-no-fields').style.display = 'none';
                            document.getElementById('university').value = response.university ? smartCase(response.university) : '';

                            const docType = response.docType ? response.docType.toLowerCase() : '';
                            const docTypeSelect = document.getElementById('doc-type');
                            if (docType) {
                                if (docType.includes('thesis') || docType.includes('tesis')) {
                                    docTypeSelect.value = 'Tesis';
                                } else if (docType.includes('dissertation') || docType.includes('disertasi')) {
                                    docTypeSelect.value = 'Disertasi';
                                } else if (docType.includes('bachelor') || docType.includes('skripsi')) {
                                    docTypeSelect.value = 'Skripsi';
                                } else if (docType.includes('book')) {
                                    docTypeSelect.value = 'Buku';
                                } else if (docType.includes('conference') || docType.includes('konferensi')) {
                                    docTypeSelect.value = 'Makalah Konferensi';
                                } else if (docType.includes('report') || docType.includes('laporan')) {
                                    docTypeSelect.value = 'Laporan Penelitian';
                                }
                            }
                        } else {
                            journalField.style.display = 'block';
                            repositoryFields.style.display = 'none';
                            document.getElementById('vol-no-fields').style.display = 'block';
                            document.getElementById('journal').value = response.journal ? smartCase(response.journal) : '';
                        }

                        document.getElementById('title').value = response.title ? smartCase(response.title) : '';
                        document.getElementById('author').value = response.author ? response.author.split(';').map(name => smartCase(name.trim())).join('; ') : '';
                        document.getElementById('year').value = response.year || "";
                        document.getElementById('doi').value = response.doi || "";
                        document.getElementById('volume').value = response.volume || "";
                        document.getElementById('issue').value  = response.issue  || "";
                        document.getElementById('pages').value  = "";
                        statusMsg.innerText = `Mode ${currentPageType} aktif. Data terisi!`;
                    } else {
                        statusMsg.innerText = "Tidak ada data metadata yang ditemukan.";
                    }
                });
            }
        });
    }

    if (btnGenerate) {
        btnGenerate.addEventListener('click', () => {
            const title = document.getElementById('title').value.trim();
            const authors = document.getElementById('author').value.split(';').map(name => name.trim()).filter(name => name);
            const journal = document.getElementById('journal').value.trim();
            const university = document.getElementById('university').value.trim();
            const docType = document.getElementById('doc-type').value;
            const year = document.getElementById('year').value.trim() || "t.t.";
            const doi = document.getElementById('doi').value.trim();
            const volume = document.getElementById('volume').value.trim();
            const issue  = document.getElementById('issue').value.trim();
            const pages  = document.getElementById('pages').value.trim();

            if (!title || authors.length === 0) {
                statusMsg.innerText = "Judul dan Penulis wajib diisi.";
                return;
            }
            statusMsg.innerText = "";

            let doiLink = doi ? (doi.startsWith('http') ? doi : `https://doi.org/${doi}`) : "";

            const selectedStyle = document.querySelector('input[name="citation-style"]:checked').value;
            const apaResult = document.getElementById('apa-result');
            const chicagoResult = document.getElementById('chicago-result');

            if (selectedStyle === 'apa') {
                const apaJournalTitle = smartCase(journal);
                const apaUniversity = smartCase(university);

                let apaRef;
                if (currentPageType === 'repository') {
                    const repoTitle = smartCase(title);
                    apaRef = `${formatAuthorsAPA(authors)} (${year}). <i>${repoTitle}</i> [${docType}, ${apaUniversity}]. ${doiLink ? `<a href="${doiLink}" target="_blank">${doiLink}</a>` : ''}`;
                } else {
                    // Format APA jurnal dengan vol/no
                    // Ada vol+no : Judul Artikel. Nama Jurnal, 16(2), 10-20.
                    // Ada vol saja: Judul Artikel. Nama Jurnal, 16, 10-20.
                    // Tidak ada  : Judul Artikel. Nama Jurnal.
                    const journalArticleTitle = sentenceCase(title);
                    const jTitle = apaJournalTitle || "Nama Jurnal Tidak Diketahui";
                    let volIssueStr = "";
                    if (volume && issue) volIssueStr = `, ${volume}(${issue})`;
                    else if (volume)     volIssueStr = `, ${volume}`;
                    
                    let pagesStr = pages ? `, ${pages}` : "";
                    apaRef = `${formatAuthorsAPA(authors)} (${year}). ${journalArticleTitle}. <i>${jTitle}</i>${volIssueStr}${pagesStr}. ${doiLink ? `<a href="${doiLink}" target="_blank">${doiLink}</a>` : ''}`;
                }

                let apaBody;
                if (authors.length === 1) {
                    apaBody = `(${smartCase(authors[0].split(' ').pop())}, ${year})`;
                } else if (authors.length === 2) {
                    apaBody = `(${smartCase(authors[0].split(' ').pop())} & ${smartCase(authors[1].split(' ').pop())}, ${year})`;
                } else {
                    apaBody = `(${smartCase(authors[0].split(' ').pop())} et al., ${year})`;
                }

                document.getElementById('apa-ref').innerHTML = apaRef.trim();
                document.getElementById('apa-body').innerHTML = apaBody;
                apaResult.style.display = 'block';
                chicagoResult.style.display = 'none';

            } else if (selectedStyle === 'chicago') {
                const chiTitle = smartCase(title);
                const chiJournal = smartCase(journal);
                const chiUniversity = smartCase(university);

                let chiBib, chiFoot;
                if (currentPageType === 'repository') {
                    chiBib = `${formatAuthorsChiBib(authors)}. "${chiTitle}." ${docType}, ${chiUniversity}, ${year}. ${doiLink ? `<a href="${doiLink}" target="_blank">${doiLink}</a>.` : ''}`;
                    chiFoot = `${formatAuthorsChiFoot(authors)}, "${chiTitle}" (${docType}, ${chiUniversity}, ${year})${doiLink ? `, <a href="${doiLink}" target="_blank">${doiLink}</a>` : ''}.`;
                } else {
                    // Format Chicago jurnal dengan vol/no/hal
                    const jTitle = chiJournal || "Nama Jurnal Tidak Diketahui";
                    let chiVolIssue = "";
                    if (volume && issue) chiVolIssue = ` ${volume}, no. ${issue}`;
                    else if (volume)     chiVolIssue = ` ${volume}`;
                    
                    let pagesStr = pages ? `: ${pages}` : "";
                    
                    chiBib  = `${formatAuthorsChiBib(authors)}. "${chiTitle}." <i>${jTitle}</i>${chiVolIssue} (${year})${pagesStr}. ${doiLink ? `<a href="${doiLink}" target="_blank">${doiLink}</a>.` : ''}`;
                    chiFoot = `${formatAuthorsChiFoot(authors)}, "${chiTitle}," <i>${jTitle}</i>${chiVolIssue} (${year})${pagesStr}${doiLink ? `, <a href="${doiLink}" target="_blank">${doiLink}</a>` : ''}.`;
                }

                document.getElementById('chi-bib').innerHTML = chiBib.trim();
                document.getElementById('chi-foot').innerHTML = chiFoot.trim();
                apaResult.style.display = 'none';
                chicagoResult.style.display = 'block';
            }

            document.getElementById('result-section').style.display = 'block';
            btnDownloadRis.style.display = 'inline-flex';
        });
    }

    if (btnDownloadRis) {
        btnDownloadRis.addEventListener('click', () => {
            const title = document.getElementById('title').value.trim();
            const authors = document.getElementById('author').value.split(';').map(name => name.trim()).filter(name => name);
            const journal = document.getElementById('journal').value.trim();
            const university = document.getElementById('university').value.trim();
            const docType = document.getElementById('doc-type').value;
            const year = document.getElementById('year').value.trim();
            const doi = document.getElementById('doi').value.trim();
            const volume = document.getElementById('volume').value.trim();
            const issue  = document.getElementById('issue').value.trim();
            const pages  = document.getElementById('pages').value.trim();

            let risContent = "";
            if (currentPageType === 'repository') {
                risContent += `TY  - ${getRisDocType(docType)}\n`;
            } else {
                risContent += "TY  - JOUR\n";
            }
            risContent += `T1  - ${title}\n`;
            authors.forEach(author => {
                risContent += `AU  - ${author}\n`;
            });
            if (currentPageType === 'repository') {
                risContent += `PB  - ${university}\n`;
            } else {
                risContent += `JO  - ${journal}\n`;
                if (volume) risContent += `VL  - ${volume}\n`;
                if (issue)  risContent += `IS  - ${issue}\n`;
                if (pages)  risContent += `SP  - ${pages}\n`;
            }
            risContent += `PY  - ${year}\n`;
            if (doi) {
                risContent += `DO  - ${doi}\n`;
                risContent += `UR  - https://doi.org/${doi}\n`;
            }
            risContent += "ER  - \n";

            const blob = new Blob([risContent], { type: 'application/x-research-info-systems' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
            a.download = `${safeTitle}.ris`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    function getRisDocType(docType) {
        const lowerDocType = docType.toLowerCase();
        if (lowerDocType.includes('tesis') || lowerDocType.includes('thesis')) {
            return 'THES';
        } else if (lowerDocType.includes('disertasi') || lowerDocType.includes('dissertation')) {
            return 'THES';
        } else if (lowerDocType.includes('skripsi') || lowerDocType.includes('bachelor')) {
            return 'THES';
        } else if (lowerDocType.includes('buku') || lowerDocType.includes('book')) {
            return 'BOOK';
        } else if (lowerDocType.includes('laporan') || lowerDocType.includes('report')) {
            return 'RPRT';
        } else if (lowerDocType.includes('konferensi') || lowerDocType.includes('conference')) {
            return 'CONF';
        }
        return 'GEN';
    }

    document.querySelectorAll('.btn-copy').forEach(button => {
        button.addEventListener('click', (e) => {
            const targetId = e.target.getAttribute('data-target');
            const el = document.getElementById(targetId);

            const range = document.createRange();
            range.selectNodeContents(el);
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

    // --- Dark Mode Logic ---
    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');

    const enableDarkMode = () => {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
    };

    const disableDarkMode = () => {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
    };

    if (localStorage.getItem('darkMode') === 'enabled') {
        enableDarkMode();
    }

    iconSun.addEventListener('click', enableDarkMode);
    iconMoon.addEventListener('click', disableDarkMode);
});

// --- SCRAPER WEB (diinjeksi ke tab, tidak punya akses ke scope popup) ---
function extractPageData() {
    const getMetaContent = (name) => document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.content || "";

    // --- 1. LOGIKA KHUSUS SCIENCEDIRECT (ELSEVIER) ---
    // ScienceDirect menyimpan data di window.__PRELOADED_STATE__. 
    // Kita coba ambil langsung dari script tersebut jika ada.
    let authors = [];
    try {
        const scripts = Array.from(document.querySelectorAll('script'));
        const stateScript = scripts.find(s => s.innerText.includes('__PRELOADED_STATE__'));
        if (stateScript) {
            const jsonText = stateScript.innerText.match(/window\.__PRELOADED_STATE__\s*=\s*({.*?});/s);
            if (jsonText && jsonText[1]) {
                const state = JSON.parse(jsonText[1]);
                // Jalur data penulis di ScienceDirect JSON
                const authList = state.article?.authors?.content?.[0]?.['$$'] || [];
                const foundAuthors = authList.filter(item => item['#name'] === 'author');
                
                authors = foundAuthors.map(auth => {
                    const details = auth['$$'];
                    const givenName = details.find(d => d['#name'] === 'given-name')?.['_'] || "";
                    const surname = details.find(d => d['#name'] === 'surname')?.['_'] || "";
                    return `${givenName} ${surname}`.trim();
                }).filter(n => n);
            }
        }
    } catch (e) { console.log("SD JSON Scrape failed, moving to DOM..."); }

    // --- 2. JIKA CARA DI ATAS GAGAL, GUNAKAN DOM SELECTOR (WEB UMUM) ---
    if (authors.length === 0) {
        // Coba Meta Tags standar (Google Scholar / OJS)
        let metaAuths = document.querySelectorAll('meta[name="citation_author"], meta[name="dc.creator"]');
        if (metaAuths.length > 0) {
            authors = Array.from(metaAuths).map(el => el.content);
        } else {
            // Coba selector visual untuk ScienceDirect (Tombol Penulis)
            let sdBtnAuths = document.querySelectorAll('button[data-xocs-content-type="author"] .react-xocs-alternative-link, .author-group .author');
            if (sdBtnAuths.length > 0) {
                authors = Array.from(sdBtnAuths).map(el => el.innerText.replace(/\d+/g, '').trim());
            } else {
                // Coba schema.org standar
                let schemaAuths = document.querySelectorAll('[itemprop="author"]');
                if (schemaAuths.length > 0) {
                    authors = Array.from(schemaAuths).map(el => el.innerText.trim());
                }
            }
        }
    }

    // --- 3. EKSTRAKSI JUDUL (Ditingkatkan) ---
    let title = getMetaContent('citation_title') || 
                getMetaContent('og:title') || 
                document.querySelector('h1.title-text')?.innerText || 
                document.title;
    
    // Bersihkan judul dari sampah nama web
    title = title.replace(/ - ScienceDirect$/i, '')
                 .replace(/ \| ScienceDirect\.com.*/i, '')
                 .replace(/ - IDR [^-]+/i, '')
                 .trim();

    // --- 4. EKSTRAKSI TAHUN ---
    let year = "";
    const dateMeta = getMetaContent('citation_date') || getMetaContent('citation_publication_date');
    if (dateMeta) {
        const match = dateMeta.match(/\d{4}/);
        if (match) year = match[0];
    }
    if (!year) {
        const bodyText = document.body.innerText.substring(0, 3000);
        const match = bodyText.match(/\b(19|20)\d{2}\b/);
        if (match) year = match[0];
    }

    // --- 5. EKSTRAKSI JURNAL & DOI ---
    let journal = getMetaContent('citation_journal_title') || 
                  document.querySelector('.publication-title-link')?.innerText || 
                  getMetaContent('citation_publisher') || "";
    
    let doi = getMetaContent('citation_doi');
    if (!doi) {
        const doiLink = Array.from(document.querySelectorAll('a')).find(a => a.href.includes('doi.org/'));
        doi = doiLink ? doiLink.href : "";
    }

    // --- 6. VOLUME & NOMOR ---
    let volume = getMetaContent('citation_volume') || "";
    let issue  = getMetaContent('citation_issue') || getMetaContent('citation_number') || "";

    // --- 7. IDENTIFIKASI REPOSITORY ---
    const isRepo = window.location.href.includes('repository') || 
                window.location.href.includes('handle') || 
                getMetaContent('DC.type').toLowerCase().includes('thesis');

    return {
        title: title,
        author: authors.join('; '),
        year: year,
        journal: journal,
        volume: volume,
        issue: issue,
        doi: doi,
        pageType: isRepo ? 'repository' : 'journal',
        university: isRepo ? journal : "",
        docType: getMetaContent('DC.type') || ""
    };
}