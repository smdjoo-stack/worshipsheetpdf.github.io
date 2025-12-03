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

새로운 악보를 추가하려면 터미널에서 다음을 실행해야 합니다:
1. `python3 crawl_tistory.py`
2. `python3 fix_urls_and_convert.py`
3. 업데이트된 `songs_data.js`를 GitHub에 다시 업로드하세요.
