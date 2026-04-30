const USER_NAME_KEY = "soc_user_name";
const USER_DOB_KEY = "soc_user_dob";
const THEME_KEY = "soc_theme";

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}

function applyTheme(theme) {
  document.body.classList.toggle("light-theme", theme === "light");
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.textContent = theme === "light" ? "☀️" : "🌙";
  }
}

function saveProfile(name, dob) {
  localStorage.setItem(USER_NAME_KEY, name);
  if (dob) {
    localStorage.setItem(USER_DOB_KEY, dob);
  } else {
    localStorage.removeItem(USER_DOB_KEY);
  }
}

function getProfile() {
  return {
    name: localStorage.getItem(USER_NAME_KEY) || "",
    dob: localStorage.getItem(USER_DOB_KEY) || "",
  };
}

function renderProfileInfo() {
  const { name, dob } = getProfile();
  const nameNode = document.getElementById("userNameDisplay");
  const dobNode = document.getElementById("userDobDisplay");

  if (nameNode) {
    nameNode.textContent = name || "User";
  }
  if (dobNode) {
    dobNode.textContent = dob || "Not set";
  }
}

function bindThemeToggle() {
  const themeToggle = document.getElementById("themeToggle");
  if (!themeToggle) {
    return;
  }

  themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("light-theme") ? "dark" : "light";
    localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
  });
}

function toggleSetupOverlay(show) {
  const overlay = document.getElementById("setupOverlay");
  if (!overlay) {
    return;
  }
  overlay.classList.toggle("hidden", !show);
  document.body.classList.toggle("modal-open", show);
}

function bindSetupForm() {
  const setupForm = document.getElementById("setupForm");
  if (!setupForm) {
    return;
  }

  setupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = document.getElementById("setupUsername")?.value.trim();
    const dob = document.getElementById("setupDob")?.value || "";
    if (!username) {
      return;
    }
    saveProfile(username, dob);
    renderProfileInfo();
    toggleSetupOverlay(false);
    window.location.href = "/";
  });
}

function ensureFirstTimeSetup() {
  const requiresSetup = document.body.dataset.requiresSetup === "true";
  if (!requiresSetup) {
    return;
  }
  const { name } = getProfile();
  if (!name) {
    toggleSetupOverlay(true);
  }
}

function bindLoginForm() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) {
    return;
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = document.getElementById("username")?.value.trim();
    const dob = document.getElementById("dob")?.value || "";
    if (!username) {
      return;
    }
    saveProfile(username, dob);
    window.location.href = "/";
  });
}

function toggleDropdown(show) {
  const dropdown = document.getElementById("userDropdown");
  if (!dropdown) {
    return;
  }
  dropdown.classList.toggle("hidden", !show);
}

function bindUserMenu() {
  const menuButton = document.getElementById("userMenuButton");
  if (!menuButton) {
    return;
  }

  menuButton.addEventListener("click", () => {
    const dropdown = document.getElementById("userDropdown");
    toggleDropdown(dropdown?.classList.contains("hidden"));
  });

  document.addEventListener("click", (event) => {
    const userMenu = document.querySelector(".user-menu");
    if (userMenu && !userMenu.contains(event.target)) {
      toggleDropdown(false);
    }
  });
}

function toggleProfileModal(show) {
  const overlay = document.getElementById("profileOverlay");
  if (!overlay) {
    return;
  }
  overlay.classList.toggle("hidden", !show);
  document.body.classList.toggle("modal-open", show);
}

function bindProfileModal() {
  const editButton = document.getElementById("editProfileBtn");
  const profileForm = document.getElementById("profileForm");
  const cancelButton = document.getElementById("cancelProfileBtn");

  if (editButton) {
    editButton.addEventListener("click", () => {
      const { name, dob } = getProfile();
      const profileName = document.getElementById("profileUsername");
      const profileDob = document.getElementById("profileDob");
      if (profileName) {
        profileName.value = name;
      }
      if (profileDob) {
        profileDob.value = dob;
      }
      toggleDropdown(false);
      toggleProfileModal(true);
    });
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", () => toggleProfileModal(false));
  }

  if (profileForm) {
    profileForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = document.getElementById("profileUsername")?.value.trim();
      const dob = document.getElementById("profileDob")?.value || "";
      if (!name) {
        return;
      }
      saveProfile(name, dob);
      renderProfileInfo();
      toggleProfileModal(false);
    });
  }
}

// Initialize theme and user profile UI for every page.
applyTheme(getStoredTheme());
renderProfileInfo();
bindThemeToggle();
bindSetupForm();
ensureFirstTimeSetup();
bindLoginForm();
bindUserMenu();
bindProfileModal();
