(function () {
  "use strict";

  const AUTH_STORAGE_KEY = "user";
  const SLOT_ID = "navAuthSlot";

  let slotEl = null;
  let loginTemplateHTML = null;

  function getUser() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.name) return null;
      return parsed;
    } catch (e) {
      console.warn("[auth.js] Failed to parse user from localStorage:", e);
      return null;
    }
  }

  function clearUser() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  function renderLoggedOut() {
    if (!slotEl || loginTemplateHTML === null) return;
    slotEl.innerHTML = loginTemplateHTML;
  }

  function renderLoggedIn(user) {
    if (!slotEl) return;

    const tpl = document.getElementById("authxLoggedInTemplate");
    if (!tpl) {
      console.warn("[auth.js] #authxLoggedInTemplate not found in the page.");
      return;
    }

    const initial = user.name.trim().charAt(0).toUpperCase();
    const fragment = tpl.content.cloneNode(true);

    const avatarBtn = fragment.querySelector("#authxAvatarBtn");
    const avatarLetter = fragment.querySelector('[data-role="avatar-letter"]');
    const nameEl = fragment.querySelector('[data-role="user-name"]');
    const phoneEl = fragment.querySelector('[data-role="user-phone"]');

    if (avatarBtn) avatarBtn.title = user.name;

    if (user.avatar && avatarLetter) {
      const avatarImg = document.createElement("img");
      avatarImg.className = "authx-avatar-img";
      avatarImg.src = user.avatar;
      avatarImg.alt = user.name;
      avatarLetter.replaceWith(avatarImg);
    } else if (avatarLetter) {
      avatarLetter.textContent = initial;
    }

    if (nameEl) nameEl.textContent = user.name;

    if (phoneEl) {
      if (user.phone) {
        phoneEl.textContent = user.phone;
      } else {
        phoneEl.remove();
      }
    }

    slotEl.innerHTML = "";
    slotEl.appendChild(fragment);

    bindDropdownEvents();
  }

  function bindDropdownEvents() {
    const avatarBtn = document.getElementById("authxAvatarBtn");
    const dropdown = document.getElementById("authxDropdown");
    const logoutBtn = document.getElementById("authxLogoutBtn");
    const userMenu = slotEl.querySelector(".authx-user-menu");

    if (!avatarBtn || !dropdown || !userMenu) return;

    function openMenu() {
      userMenu.classList.add("authx-open");
      avatarBtn.setAttribute("aria-expanded", "true");
      document.addEventListener("click", handleOutsideClick);
      document.addEventListener("keydown", handleEscape);
    }

    function closeMenu() {
      userMenu.classList.remove("authx-open");
      avatarBtn.setAttribute("aria-expanded", "false");
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    }

    function handleOutsideClick(e) {
      if (!userMenu.contains(e.target)) closeMenu();
    }

    function handleEscape(e) {
      if (e.key === "Escape") closeMenu();
    }

    avatarBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = userMenu.classList.contains("authx-open");
      isOpen ? closeMenu() : openMenu();
    });

    if (logoutBtn) {
      logoutBtn.addEventListener("click", function (e) {
        e.preventDefault();
        performLogout();
      });
    }
  }

  function performLogout() {

    clearUser();
    renderLoggedOut();

    document.dispatchEvent(new CustomEvent("gmUserLoggedOut"));
  }

  function render() {
    const user = getUser();
    if (user) {
      renderLoggedIn(user);
    } else {
      renderLoggedOut();
    }
  }

  function init() {
    slotEl = document.getElementById(SLOT_ID);
    if (!slotEl) {
      console.warn(`[auth.js] #${SLOT_ID} not found. Auth UI not initialized.`);
      return;
    }

    if (loginTemplateHTML === null) {
      loginTemplateHTML = slotEl.innerHTML;
    }

    render();
  }

  function refresh() {
    if (!slotEl) {
      init();
      return;
    }
    render();
  }

  document.addEventListener("DOMContentLoaded", init);

  window.AuthUI = {
    refresh: refresh,
    logout: performLogout,
  };
})();