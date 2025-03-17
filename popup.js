// 상수 설정: 예를 들어 비밀번호는 "1234"로 설정 (실제 구현시 더 안전하게 처리)
// 인증 유효시간(예: 1시간 = 3600000ms)
const CORRECT_PASSWORD = "1234";
const AUTH_VALID_DURATION = 3;

// DOM 요소 가져오기
const authSection = document.getElementById("authSection");
const questionSection = document.getElementById("questionSection");
const passwordInput = document.getElementById("passwordInput");
const authBtn = document.getElementById("authBtn");
const bookmarkSection = document.getElementById("bookmarkSection");
const bookmarkList = document.getElementById("bookmarkList");
const addBookmarkBtn = document.getElementById("addBookmarkBtn");

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
    bookmarks.forEach((bookmark) => {
      const li = document.createElement("li");
      li.textContent = `${bookmark.title} - ${bookmark.url}`;
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

// 이벤트 리스너: 인증 버튼 클릭 시
authBtn.addEventListener("click", () => {
  const input = passwordInput.value;
  if (input === CORRECT_PASSWORD) {
    onAuthSuccess();
  } else {
    alert("비밀번호가 일치하지 않습니다.");
  }
});

// 이벤트 리스너: 북마크 추가 버튼 클릭 시
addBookmarkBtn.addEventListener("click", addCurrentPageBookmark);

// 초기 실행: 마지막 로그인 시간 확인하여 유효하면 질문 없이 북마크 영역 표시
document.addEventListener("DOMContentLoaded", () => {
  isAuthValid((valid) => {
    if (valid) {
      onAuthSuccess();
    }
  });
});
