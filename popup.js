// 인증 유효시간(예: 1시간 = 3600000ms)
const AUTH_VALID_DURATION = 3;

// DOM 요소 가져오기
const authSection = document.getElementById("authSection");
const questionSection = document.getElementById("questionSection");
const passwordInput = document.getElementById("passwordInput");
const authBtn = document.getElementById("authBtn");
const bookmarkSection = document.getElementById("bookmarkSection");
const bookmarkList = document.getElementById("bookmarkList");
const addBookmarkBtn = document.getElementById("addBookmarkBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");

/**
 * chrome.storage에서 저장된 비밀번호를 가져오는 함수
 * @param {function(string|null): void} callback - 저장된 비밀번호를 전달하는 콜백 (없으면 null)
 */
function getStoredPassword(callback) {
    chrome.storage.local.get("password", (result) => {
        callback(result.password || null);
    });
}

/**
 * chrome.storage에 비밀번호를 저장하는 함수
 * @param {string} newPassword - 저장할 새 비밀번호
 * @param {function(): void} callback - 저장 완료 후 호출할 콜백 함수
 */
function setStoredPassword(newPassword, callback) {
    chrome.storage.local.set({ password: newPassword }, () => {
        console.log("Password saved:", newPassword);
        if (callback) callback();
    });
}

/**
 * 마지막 로그인 시간 검증 함수 (chrome.storage 사용)
 * @param {function(boolean): void} callback - 인증 유효 여부를 전달하는 콜백 함수
 */
function isAuthValid(callback) {
    chrome.storage.local.get("lastLogin", (result) => {
        const lastLogin = result.lastLogin;
        if (!lastLogin) {
            callback(false);
            return;
        }
        const elapsed = Date.now() - Number(lastLogin);
        callback(elapsed < AUTH_VALID_DURATION);
    });
}

/**
 * 인증 시간 저장 함수 (chrome.storage 사용)
 * @param {number} timestamp - 저장할 타임스탬프 값 (밀리초)
 * @param {function(): void} callback - 저장 완료 후 호출할 콜백 함수
 */
function setLastLogin(timestamp, callback) {
    chrome.storage.local.set({ lastLogin: timestamp }, () => {
        console.log("Last login time saved:", timestamp);
        if (callback) callback();
    });
}

/**
 * 북마크 목록을 로드하여 표시하는 함수 (chrome.storage 사용)
 */
function loadBookmarks() {
    chrome.storage.local.get("bookmarks", (result) => {
        const bookmarks = result.bookmarks || [];
        bookmarkList.innerHTML = "";
        bookmarks.forEach((bookmark, index) => {
            const li = document.createElement("li");
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";

            // 링크 생성
            const link = document.createElement("a");
            link.textContent = `${bookmark.title} - ${bookmark.url}`;
            link.href = bookmark.url;
            link.style.flex = "1";
            link.style.overflow = "hidden";
            link.style.textOverflow = "ellipsis";
            link.style.whiteSpace = "nowrap";
            // 기본 링크 동작 차단 후 chrome.tabs.create로 새 탭 열기
            link.addEventListener("click", (e) => {
                e.preventDefault();
                chrome.tabs.create({ url: bookmark.url, active: false });
            });
            li.appendChild(link);

            // 삭제 버튼 생성
            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "삭제";
            deleteBtn.style.marginLeft = "10px";
            deleteBtn.addEventListener("click", () => {
                deleteBookmark(index);
            });
            li.appendChild(deleteBtn);

            bookmarkList.appendChild(li);
        });
    });
}

/**
 * 현재 탭 정보를 가져와 북마크에 추가하는 함수 (chrome.storage 사용)
 */
function addCurrentPageBookmark() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) return;
        const tab = tabs[0];
        const newBookmark = {
            title: tab.title,
            url: tab.url,
            addedAt: Date.now()
        };

        chrome.storage.local.get("bookmarks", (result) => {
            const bookmarks = result.bookmarks || [];
            bookmarks.push(newBookmark);
            chrome.storage.local.set({ bookmarks: bookmarks }, () => {
                loadBookmarks();
            });
        });
    });
}

/**
 * 지정한 인덱스의 북마크를 삭제하는 함수
 * @param {number} index - 삭제할 북마크의 인덱스
 */
function deleteBookmark(index) {
    chrome.storage.local.get("bookmarks", (result) => {
        let bookmarks = result.bookmarks || [];
        // 지정 인덱스의 북마크 제거
        bookmarks.splice(index, 1);
        // 수정된 북마크 배열 저장
        chrome.storage.local.set({ bookmarks: bookmarks }, () => {
            loadBookmarks();
        });
    });
}

/**
 * 인증 성공 시 처리 함수
 */
function onAuthSuccess() {
    setLastLogin(Date.now(), () => {
        // 인증 영역 숨기고 북마크 영역 표시
        authSection.style.display = "none";
        bookmarkSection.style.display = "block";
        loadBookmarks();
    });
}

/**
 * 비밀번호 변경 함수
 */
function changePassword() {
    getStoredPassword((storedPassword) => {
        const current = prompt("현재 비밀번호를 입력하세요:");
        if (storedPassword && current !== storedPassword) {
            alert("현재 비밀번호가 일치하지 않습니다.");
            return;
        }
        const newPass = prompt("새 비밀번호를 입력하세요:");
        if (!newPass) {
            alert("새 비밀번호를 입력해주세요.");
            return;
        }
        setStoredPassword(newPass, () => {
            alert("비밀번호가 변경되었습니다.");
        });
    });
}

// 이벤트 리스너: 인증 버튼 클릭 시
authBtn.addEventListener("click", () => {
    const input = passwordInput.value;
    getStoredPassword((storedPassword) => {
        if (!storedPassword) {
            // 초기 설정: 비밀번호가 없으면 입력값을 새 비밀번호로 저장
            setStoredPassword(input, () => {
                onAuthSuccess();
            });
        } else if (input === storedPassword) {
            onAuthSuccess();
        } else {
            alert("비밀번호가 일치하지 않습니다.");
        }
    });
});

// 이벤트 리스너: 북마크 추가 버튼 클릭 시
addBookmarkBtn.addEventListener("click", addCurrentPageBookmark);

// 이벤트 리스너: 비밀번호 변경 버튼 클릭 시
if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", changePassword);
}

// 초기 실행: 마지막 로그인 시간 확인하여 유효하면 질문 없이 북마크 영역 표시
document.addEventListener("DOMContentLoaded", () => {
    isAuthValid((valid) => {
        if (valid) {
            onAuthSuccess();
        }
    });
});
