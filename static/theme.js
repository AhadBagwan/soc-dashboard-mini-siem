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
    nameNode.textContent = name || "Analyst";
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

function bindGetStartedButtons() {
  const heroBtn = document.getElementById("getStartedHeroBtn");
  const ctaBtn = document.getElementById("getStartedCtaBtn");

  const openModal = () => {
    const { name, dob } = getProfile();
    const setupNameInput = document.getElementById("setupUsername");
    const setupDobInput = document.getElementById("setupDob");
    if (setupNameInput && name) {
      setupNameInput.value = name;
    }
    if (setupDobInput && dob) {
      setupDobInput.value = dob;
    }
    toggleSetupOverlay(true);
  };

  if (heroBtn) {
    heroBtn.addEventListener("click", openModal);
  }
  if (ctaBtn) {
    ctaBtn.addEventListener("click", openModal);
  }
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
    // Redirect to enhanced dashboard after entering profile
    window.location.href = "/dashboard";
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

// Global UI Initialization
applyTheme(getStoredTheme());
renderProfileInfo();
bindThemeToggle();
bindGetStartedButtons();
bindSetupForm();
bindUserMenu();
bindProfileModal();
