// ALL_SONGS is loaded from songs_data.js

const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const setlistContainer = document.getElementById('setlist');
const generatePdfBtn = document.getElementById('generatePdfBtn');
const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImage');
const span = document.getElementsByClassName("close")[0];

let setlist = [];

// Initialize
function init() {
    renderSearchResults(ALL_SONGS.slice(0, 50)); // Show first 50 initially

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = ALL_SONGS.filter(song =>
            song.title.toLowerCase().includes(query)
        );
        renderSearchResults(filtered.slice(0, 50)); // Limit to 50 for performance
    });

    generatePdfBtn.addEventListener('click', generatePDF);

    // Modal close
    span.onclick = function () {
        modal.style.display = "none";
    }
}

function renderSearchResults(songs) {
    searchResults.innerHTML = '';
    songs.forEach(song => {
        const div = document.createElement('div');
        div.className = 'song-item';
        div.innerHTML = `
            <img src="${song.image_url}" class="song-thumbnail" loading="lazy" alt="thumbnail">
            <div class="song-info">
                <div class="song-title">${song.title}</div>
                <div class="song-id">ID: ${song.id}</div>
            </div>
            <button class="add-btn">추가</button>
        `;

        // Image preview
        div.querySelector('.song-thumbnail').addEventListener('click', (e) => {
            e.stopPropagation();
            openModal(song.image_url);
        });

        // Add to setlist
        div.querySelector('.add-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            addToSetlist(song);
        });

        searchResults.appendChild(div);
    });
}

function addToSetlist(song) {
    // Check if already exists (optional, maybe they want duplicates?)
    // Let's allow duplicates for now, or maybe warn.
    setlist.push(song);
    renderSetlist();
}

function removeFromSetlist(index) {
    setlist.splice(index, 1);
    renderSetlist();
}

function renderSetlist() {
    setlistContainer.innerHTML = '';

    if (setlist.length === 0) {
        setlistContainer.innerHTML = '<p class="empty-message">곡을 선택하여 이곳에 추가하세요.</p>';
        generatePdfBtn.disabled = true;
        return;
    }

    generatePdfBtn.disabled = false;

    setlist.forEach((song, index) => {
        const div = document.createElement('div');
        div.className = 'song-item';
        div.innerHTML = `
            <img src="${song.image_url}" class="song-thumbnail" alt="thumbnail">
            <div class="song-info">
                <div class="song-title">${song.title}</div>
            </div>
            <button class="remove-btn">삭제</button>
        `;

        div.querySelector('.remove-btn').addEventListener('click', () => {
            removeFromSetlist(index);
        });

        setlistContainer.appendChild(div);
    });
}

function openModal(src) {
    modal.style.display = "block";
    modalImg.src = src;
}

// PDF Generation / Print
async function generatePDF() {
    if (setlist.length === 0) return;

    // Option 1: Try jsPDF first (if it works)
    // But since we know CORS is tricky on GitHub Pages, let's offer a robust "Print" mode.
    // Actually, let's just use the Print mode as the primary method for reliability.

    const printArea = document.getElementById('print-area');
    printArea.innerHTML = ''; // Clear previous

    generatePdfBtn.textContent = "준비 중...";
    generatePdfBtn.disabled = true;

    // Create image elements for printing
    const loadPromises = setlist.map(song => {
        return new Promise((resolve, reject) => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'print-page';

            // Optional title
            // const titleDiv = document.createElement('div');
            // titleDiv.className = 'print-title';
            // titleDiv.textContent = song.title;
            // pageDiv.appendChild(titleDiv);

            const img = document.createElement('img');
            img.crossOrigin = "anonymous"; // Try anonymous first

            // Use direct URL for printing (browser handles it better than fetch)
            // But we might still need the proxy if hotlinking is blocked.
            // Let's try the direct URL first.
            img.src = song.image_url;

            img.onload = () => resolve();
            img.onerror = () => {
                // If direct load fails, try wsrv.nl
                console.log(`Image load failed for ${song.title}, trying proxy...`);
                img.src = `https://wsrv.nl/?url=${encodeURIComponent(song.image_url)}&output=jpg`;
                // Reset handlers to avoid infinite loop
                img.onload = () => resolve();
                img.onerror = () => {
                    console.error(`Failed to load image for ${song.title}`);
                    resolve(); // Resolve anyway to continue printing
                };
            };

            pageDiv.appendChild(img);
            printArea.appendChild(pageDiv);
        });
    });

    try {
        await Promise.all(loadPromises);

        // Give a small delay for rendering
        setTimeout(() => {
            window.print();
            generatePdfBtn.textContent = "PDF 다운로드 (인쇄)";
            generatePdfBtn.disabled = false;
        }, 500);

    } catch (e) {
        console.error("Print preparation failed", e);
        alert("인쇄 준비 중 오류가 발생했습니다.");
        generatePdfBtn.textContent = "PDF 다운로드 (인쇄)";
        generatePdfBtn.disabled = false;
    }
}

// Legacy fetch function (kept for reference or future use)
async function fetchImage(url) {
    // 1. Try direct fetch with no-referrer (bypasses some hotlink protections)
    try {
        const response = await fetch(url, {
            mode: 'cors',
            referrerPolicy: 'no-referrer'
        });
        if (response.ok) {
            const blob = await response.blob();
            return blobToDataURL(blob);
        }
    } catch (e) {
        console.log("Direct fetch failed, trying wsrv.nl proxy...", e);
    }

    // 2. Try wsrv.nl (Public CORS Proxy / Image Cache)
    // This is useful for GitHub Pages where local proxy isn't available.
    try {
        // wsrv.nl requires the URL to be encoded, especially if it has query params
        const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
            const blob = await response.blob();
            return blobToDataURL(blob);
        }
    } catch (e) {
        console.log("wsrv.nl fetch failed, trying local proxy...", e);
    }

    // 3. Try corsproxy.io (Another Public Proxy)
    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
            const blob = await response.blob();
            return blobToDataURL(blob);
        }
    } catch (e) {
        console.log("corsproxy.io fetch failed, trying local proxy...", e);
    }

    // 4. Try local proxy (if running via server.py)
    try {
        const proxyUrl = `/proxy?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Proxy fetch failed');
        const blob = await response.blob();
        return blobToDataURL(blob);
    } catch (e) {
        console.error("All fetch methods failed", e);
        throw new Error(`이미지를 불러올 수 없습니다. (URL: ${url.substring(0, 30)}...)`);
    }
}

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

init();
