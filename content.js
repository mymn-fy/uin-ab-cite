chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractData") {
        const title = document.querySelector('meta[name="citation_title"]')?.content || 
                      document.querySelector('meta[property="og:title"]')?.content || 
                      document.title;

        const authorElements = document.querySelectorAll('meta[name="citation_author"]');
        let authors = [];
        if (authorElements.length > 0) {
            authors = Array.from(authorElements).map(el => el.content);
        } else {
            // Fallback for sites that don't use multiple meta tags
            const authorString = document.querySelector('meta[name="author"]')?.content;
            if (authorString) {
                // Split by common delimiters like comma or 'and'
                authors = authorString.split(/,| and /i).map(name => name.trim());
            }
        }
        
        const journal = document.querySelector('meta[name="citation_journal_title"]')?.content || 
                        document.querySelector('meta[name="citation_publisher"]')?.content || "";

        const date = document.querySelector('meta[name="citation_date"]')?.content || "";
        const year = date.match(/\d{4}/) ? date.match(/\d{4}/)[0] : "";

        // --- LOGIKA PENGAMBILAN DOI / URL ---
        let doi = "";
        // 1. Cek dari meta tag citation_doi
        doi = document.querySelector('meta[name="citation_doi"]')?.content || "";

        // 2. Jika tidak ada, cari link yang mengandung "doi.org"
        if (!doi) {
            const doiLink = Array.from(document.querySelectorAll('a')).find(a => a.href.includes('doi.org/'));
            if (doiLink) {
                doi = doiLink.href.replace(/.*doi\.org\//, 'https://doi.org/');
            }
        }
        
        // 3. Jika masih tidak ada, cari teks "10." di body
        if (!doi) {
            const doiRegex = /(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i;
            const match = document.body.innerText.match(doiRegex);
            if (match) {
                doi = 'https://doi.org/' + match[0];
            }
        }

        // 4. Jika tetap tidak ada, gunakan URL halaman sebagai fallback
        if (!doi) {
            doi = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
        }
        
        sendResponse({
            title: title,
            author: authors.join('; '), // Join authors into a single string
            year: year,
            journal: journal,
            doi: doi // Kirim DOI atau URL
        });
    }
    return true; // Keep the message channel open for async response
});