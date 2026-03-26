chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractData") {
        const title = document.querySelector('meta[name="citation_title"]')?.content || 
                      document.querySelector('meta[property="og:title"]')?.content || 
                      document.title;

        const author = document.querySelector('meta[name="citation_author"]')?.content || "";
        
        const journal = document.querySelector('meta[name="citation_journal_title"]')?.content || 
                        document.querySelector('meta[name="citation_publisher"]')?.content || "";

        const date = document.querySelector('meta[name="citation_date"]')?.content || "";
        const year = date.match(/\d{4}/) ? date.match(/\d{4}/)[0] : "";

        sendResponse({
            title: title,
            author: author,
            year: year,
            journal: journal
        });
    }
});