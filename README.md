# Worship Sheet Manager

## 실행 방법 (로컬)

**`WorshipApp`** 아이콘을 더블 클릭하세요.
(터미널을 열 필요가 없습니다)

- 자동으로 서버가 실행되고 브라우저가 열립니다.
- 악보를 검색하고 PDF를 다운로드하세요.

---

## GitHub 배포 (온라인 공유)

이 앱은 **GitHub Pages**에 올려서 팀원들과 링크로 공유할 수 있습니다.

### 배포 방법
1. GitHub에 새 저장소(Repository)를 만듭니다.
2. 다음 파일들을 업로드합니다:
   - `index.html`
   - `style.css`
   - `script.js`
   - `songs_data.js`
3. 저장소 설정(Settings) -> **Pages** 메뉴에서 배포를 활성화합니다.
4. 생성된 링크를 팀원들에게 공유하세요.

### PDF 생성 방식 변경 (중요)
보안 문제(CORS)로 인해 PDF 파일 직접 생성 대신 **'인쇄(Print to PDF)'** 방식으로 변경했습니다.
- [PDF 다운로드] 버튼을 누르면 인쇄 화면이 뜹니다.
- 여기서 **'PDF로 저장'**을 선택하시면 됩니다.
- 이 방식은 보안 차단 없이 100% 확실하게 작동합니다.

---

## 데이터 업데이트

티스토리(music-in.tistory.com) 악보 링크는 **매달 말일에 만료**됩니다.
GitHub Actions(`.github/workflows/refresh-tistory.yml`)가 매일 00:05(한국 시간)에 확인하고,
매달 1일에 자동으로 링크를 새로 받아 `songs_data.js`를 커밋합니다 (새 글도 함께 추가됩니다).

바로 갱신하고 싶을 때:
- GitHub 저장소 → **Actions** → *Refresh Tistory links* → **Run workflow** (force 체크), 또는
- 내 컴퓨터에서 `python3 crawl_tistory.py` 실행 후 `songs_data.js`를 업로드 (추가 설치 필요 없음, 약 5분)

네이버·찬송가 항목은 이 스크립트가 건드리지 않습니다.
