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

// PDF Generation using jsPDF
async function generatePDF() {
    if (setlist.length === 0) return;

    generatePdfBtn.textContent = "이미지 다운로드 중...";
    generatePdfBtn.disabled = true;

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        for (let i = 0; i < setlist.length; i++) {
            const song = setlist[i];

            // Update button text to show progress
            generatePdfBtn.textContent = `생성 중... (${i + 1}/${setlist.length})`;

            try {
                // Fetch image data
                const imgData = await fetchImage(song.image_url);

                // Get image properties to calculate aspect ratio
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = doc.internal.pageSize.getWidth();
                const pdfHeight = doc.internal.pageSize.getHeight();

                // Calculate dimensions to fit page while maintaining aspect ratio
                const imgRatio = imgProps.width / imgProps.height;
                const pageRatio = pdfWidth / pdfHeight;

                let w, h;
                if (imgRatio > pageRatio) {
                    // Image is wider than page (relative to aspect ratios)
                    w = pdfWidth;
                    h = w / imgRatio;
                } else {
                    // Image is taller than page
                    h = pdfHeight;
                    w = h * imgRatio;
                }

                // Center the image
                const x = (pdfWidth - w) / 2;
                const y = (pdfHeight - h) / 2;

                // Add new page if not the first one
                if (i > 0) {
                    doc.addPage();
                }

                doc.addImage(imgData, 'JPEG', x, y, w, h);

            } catch (err) {
                console.error(`Error processing ${song.title}:`, err);
                // Continue to next song even if one fails
            }
        }

        generatePdfBtn.textContent = "PDF 저장 중...";

        // Get current date in YYYY-MM-DD format (Local Time)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        doc.save(`worship_songs_${dateStr}.pdf`);

    } catch (e) {
        console.error("PDF generation failed", e);
        alert("PDF 생성 중 오류가 발생했습니다: " + e.message);
    } finally {
        generatePdfBtn.textContent = "PDF 다운로드";
        generatePdfBtn.disabled = false;
    }
}

// Robust fetch function with proxies
async function fetchImage(url) {
    // 1. Try direct fetch (if CORS allows)
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
            const blob = await response.blob();
            return blobToDataURL(blob);
        }
    } catch (e) {
        // console.log("Direct fetch failed, trying proxies...");
    }

    // 2. Try wsrv.nl (Public CORS Proxy / Image Cache) - Best for Tistory
    try {
        // wsrv.nl is very reliable for images
        const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
            const blob = await response.blob();
            return blobToDataURL(blob);
        }
    } catch (e) {
        console.log("wsrv.nl fetch failed", e);
    }

    // 3. Try corsproxy.io
    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
            const blob = await response.blob();
            return blobToDataURL(blob);
        }
    } catch (e) {
        console.log("corsproxy.io fetch failed", e);
    }

    throw new Error(`이미지를 불러올 수 없습니다: ${url}`);
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
