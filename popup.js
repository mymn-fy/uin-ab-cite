function sentenceCase(str) {
    if (!str) return "";
    const lower = str.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function smartCase(str) {
    if (!str) return "";

    // Apply title case to the whole string.
    let titleCased = str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

    // Fix acronyms in parentheses by uppercasing them.
    titleCased = titleCased.replace(/\(([^)]+)\)/g, (match, content) => {
        return `(${content.toUpperCase()})`;
    });

    return titleCased;
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
let currentPageType = 'journal'; // Global variable to store page type

document.addEventListener('DOMContentLoaded', () => {

    const btnExtract = document.getElementById('btn-extract');
    const btnGenerate = document.getElementById('btn-generate');
    const statusMsg = document.getElementById('status-msg');
    const journalField = document.getElementById('journal').parentElement;
    const repositoryFields = document.getElementById('repository-fields');

    if (btnExtract) {
        btnExtract.addEventListener('click', () => {
            statusMsg.innerText = "Mendeteksi & Mengekstrak data...";
            
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];

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
                            document.getElementById('university').value = response.university ? smartCase(response.university) : '';

                            // Auto-select document type
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
                            document.getElementById('journal').value = response.journal ? smartCase(response.journal) : '';
                        }
                        
                        document.getElementById('title').value = response.title ? smartCase(response.title) : '';
                        document.getElementById('author').value = response.author ? response.author.split(';').map(name => smartCase(name.trim())).join('; ') : '';
                        document.getElementById('year').value = response.year || "";
                        document.getElementById('doi').value = response.doi || "";
                        statusMsg.innerText = `Mode ${currentPageType} aktif. Data terisi!`;
                    } else {
                        statusMsg.innerText = "Tidak ada data metadata yang ditemukan.";
                    }
                });
            });
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
                    // Per user request, repository titles are Title Cased for APA
                    const repoTitle = smartCase(title); 
                    apaRef = `${formatAuthorsAPA(authors)} (${year}). <i>${repoTitle}</i> [${docType}, ${apaUniversity}]. ${doiLink ? `<a href="${doiLink}" target="_blank">${doiLink}</a>` : ''}`;
                } else {
                    // Journal articles follow standard APA sentence case
                    const journalArticleTitle = sentenceCase(title);
                    apaRef = `${formatAuthorsAPA(authors)} (${year}). ${journalArticleTitle}. <i>${apaJournalTitle || "Nama Jurnal Tidak Diketahui"}</i>. ${doiLink ? `<a href="${doiLink}" target="_blank">${doiLink}</a>` : ''}`;
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
                    chiFoot = `${formatAuthorsChiFoot(authors)}, "${chiTitle}" (${docType}, ${chiUniversity}, ${year}), ${doiLink ? `akses pada ${doiLink}` : ''}.`;
                } else {
                    chiBib = `${formatAuthorsChiBib(authors)}. "${chiTitle}." <i>${chiJournal || "Nama Jurnal Tidak Diketahui"}</i>, ${year}. ${doiLink ? `<a href="${doiLink}" target="_blank">${doiLink}</a>.` : ''}`;
                    chiFoot = `${formatAuthorsChiFoot(authors)}, "${chiTitle}," <i>${chiJournal || "Nama Jurnal Tidak Diketahui"}</i> (${year}), ${doiLink ? `akses pada ${doiLink}` : ''}.`;
                }

                document.getElementById('chi-bib').innerHTML = chiBib.trim();
                document.getElementById('chi-foot').innerHTML = chiFoot.trim();
                apaResult.style.display = 'none';
                chicagoResult.style.display = 'block';
            }

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

    // Check for saved preference on load
    if (localStorage.getItem('darkMode') === 'enabled') {
        enableDarkMode();
    }

    // Add click listeners to icons
    iconSun.addEventListener('click', enableDarkMode);
    iconMoon.addEventListener('click', disableDarkMode);
});

// This function is injected into the page to extract data.
// It does not have access to the popup's scope.
function extractPageData() {
    const getMetaContent = (name) => document.querySelector(`meta[name="${name}"]`)?.content || "";

    // Author extraction
    let authors = [];
    let authorElements = document.querySelectorAll('meta[name="citation_author"]');
    if (authorElements.length > 0) {
        authors = Array.from(authorElements).map(el => el.content);
    } else {
        authorElements = document.querySelectorAll('meta[name="eprints.creators_name"]');
        if (authorElements.length > 0) {
            authors = Array.from(authorElements).map(el => el.content);
        } else {
            const authorString = getMetaContent('author');
            if (authorString) {
                authors = authorString.split(/,| and /i).map(name => name.trim());
            }
        }
    }

    // Year extraction
    const date = getMetaContent('citation_date') || getMetaContent('eprints.date');
    const yearMatch = date.match(/\d{4}/);
    const year = yearMatch ? yearMatch[0] : "";

    // University extraction
    let university = getMetaContent('citation_technical_report_institution') || getMetaContent('citation_publisher') || getMetaContent('eprints.publisher');

    // Title extraction and cleaning
    let title = getMetaContent('citation_title') || getMetaContent('og:title') || document.title;
    
    // New logic: find pattern in title, clean it, and possibly set university
    const titleRegex = / - (IDR )?(.+?)( Repository)?$/i;
    const titleMatch = title.match(titleRegex);

    if (titleMatch) {
        const universityFromName = titleMatch[2].trim();
        if (!university) {
            university = universityFromName;
        }
        // Clean the title by removing the matched part
        title = title.replace(titleRegex, '').trim();
    }

    const journal = getMetaContent('citation_journal_title') || getMetaContent('citation_publisher');
    
    let doi = getMetaContent('citation_doi');
    if (!doi) {
        const doiLink = Array.from(document.querySelectorAll('a')).find(a => a.href.includes('doi.org/'));
        if (doiLink) {
            doi = doiLink.href;
        }
    }
     if (!doi) {
        const doiRegex = /(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i;
        const match = document.body.innerText.match(doiRegex);
        if (match) {
            doi = 'https://doi.org/' + match[0];
        }
    }
    if (!doi) {
        doi = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
    }

    // Page Type and Doc Type detection
    let pageType = 'journal';
    const docTypeString = getMetaContent('DC.type') || getMetaContent('eprints.type') || getMetaContent('bepress_document_type');
    const titleText = document.title.toLowerCase();
    const urlText = window.location.href.toLowerCase();
    const repoKeywords = ['thesis', 'disertasi', 'skripsi', 'repository', 'archive', 'eprints', 'idr'];
    if (repoKeywords.some(keyword => docTypeString.includes(keyword) || titleText.includes(keyword) || urlText.includes(keyword))) {
        pageType = 'repository';
    }
    if (!journal && university) {
        pageType = 'repository';
    }

    return {
        title: title,
        author: authors.join('; '),
        year: year,
        journal: journal,
        doi: doi,
        pageType: pageType,
        university: university,
        docType: docTypeString
    };
}