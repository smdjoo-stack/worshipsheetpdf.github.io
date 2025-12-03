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
    if (typeof ALL_SONGS === 'undefined') {
        alert("데이터를 불러오지 못했습니다. 페이지를 새로고침하거나 songs_data.js 파일이 제대로 업로드되었는지 확인해주세요.");
        return;
    }

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

function getProxiedUrl(url) {
    // Naver Blog and Tistory images often block hotlinking on GitHub Pages
    // We use wsrv.nl as a caching proxy to bypass this.
    if (url.includes('pstatic.net') || url.includes('blog.naver.com') ||
        url.includes('daumcdn.net') || url.includes('kakaocdn.net')) {
        // Add &bg=white to ensure transparent PNGs don't turn black when converted to JPG
        return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg&bg=white`;
    }
    return url;
}

function renderSearchResults(songs) {
    searchResults.innerHTML = '';
    songs.forEach(song => {
        const div = document.createElement('div');
        div.className = 'song-item';

        // Use proxied URL for display
        const displayUrl = getProxiedUrl(song.image_url);

        div.innerHTML = `
            <img src="${displayUrl}" 
                 class="song-thumbnail" 
                 loading="lazy" 
                 referrerpolicy="no-referrer"
                 alt="thumbnail">
            <div class="song-info">
                <div class="song-title">${song.title}</div>
                <div class="song-id">ID: ${song.id}</div>
            </div>
            <button class="add-btn">추가</button>
        `;

        // Image preview
        div.querySelector('.song-thumbnail').addEventListener('click', (e) => {
            e.stopPropagation();
            openModal(song.image_url); // Pass original URL, openModal will proxy it
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

        const displayUrl = getProxiedUrl(song.image_url);

        div.innerHTML = `
            <img src="${displayUrl}" 
                 class="song-thumbnail" 
                 referrerpolicy="no-referrer"
                 alt="thumbnail">
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
    // Always proxy for modal to ensure it loads
    modalImg.src = getProxiedUrl(src);
}

// PDF Generation using jsPDF
async function generatePDF() {
    if (setlist.length === 0) return;

    generatePdfBtn.textContent = "이미지 다운로드 중...";
    generatePdfBtn.disabled = true;

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // 1. Fetch all images in parallel (Faster & avoids timeout)
        const imagePromises = setlist.map(async (song) => {
            try {
                const data = await fetchImage(song.image_url);
                return { song, data, error: null };
            } catch (err) {
                console.error(`Failed to load ${song.title}`, err);
                return { song, data: null, error: err };
            }
        });

        const results = await Promise.all(imagePromises);

        // 2. Add images to PDF
        generatePdfBtn.textContent = "PDF 생성 중...";

        let pageIndex = 0;

        for (const item of results) {
            if (item.error || !item.data) continue;

            // Add new page if not the first successful image
            if (pageIndex > 0) {
                doc.addPage();
            }

            const imgData = item.data;
            const imgProps = doc.getImageProperties(imgData);
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = doc.internal.pageSize.getHeight();

            const imgRatio = imgProps.width / imgProps.height;
            const pageRatio = pdfWidth / pdfHeight;

            let w, h;
            if (imgRatio > pageRatio) {
                w = pdfWidth;
                h = w / imgRatio;
            } else {
                h = pdfHeight;
                w = h * imgRatio;
            }

            const x = (pdfWidth - w) / 2;
            const y = (pdfHeight - h) / 2;

            doc.addImage(imgData, 'JPEG', x, y, w, h);
            pageIndex++;
        }

        if (pageIndex === 0) {
            throw new Error("이미지를 불러올 수 없어 PDF를 생성하지 못했습니다.");
        }

        generatePdfBtn.textContent = "PDF 저장 중...";

        // Get current date in YYYY-MM-DD format
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Auto print (attempts to open print dialog when opened in compatible viewers)
        doc.autoPrint();

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
            return convertBlobToJpeg(blob);
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
            return convertBlobToJpeg(blob);
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
            return convertBlobToJpeg(blob);
        }
    } catch (e) {
        console.log("corsproxy.io fetch failed", e);
    }

    throw new Error(`이미지를 불러올 수 없습니다: ${url}`);
}

// Convert any image blob to JPEG Data URL using Canvas
// This prevents "UNKNOWN" type errors in jsPDF (e.g. from WebP images)
function convertBlobToJpeg(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            // White background for transparent images (like PNGs)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.drawImage(img, 0, 0);

            // Convert to JPEG
            try {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                URL.revokeObjectURL(url);
                resolve(dataUrl);
            } catch (e) {
                URL.revokeObjectURL(url);
                reject(e);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("이미지 변환 중 오류가 발생했습니다."));
        };

        img.src = url;
    });
}

init();
