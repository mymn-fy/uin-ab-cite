// Listener untuk menerima perintah dari popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractData") {
        
        // Mengambil data dari meta tag (standar jurnal ilmiah)
        const title = document.querySelector('meta[name="citation_title"]')?.content || 
                      document.querySelector('meta[property="og:title"]')?.content || 
                      document.title;

        const author = document.querySelector('meta[name="citation_author"]')?.content || 
                       "Penulis tidak ditemukan";

        const year = document.querySelector('meta[name="citation_date"]')?.content || 
                     document.querySelector('meta[name="citation_publication_date"]')?.content || 
                     "";
        
        // Ambil 4 digit tahun saja jika formatnya tanggal lengkap
        const yearOnly = year.match(/\d{4}/) ? year.match(/\d{4}/)[0] : "";

        // Kirim data kembali ke popup.js
        sendResponse({
            title: title,
            author: author,
            year: yearOnly
        });
    }
});