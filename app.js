
// ===== Elements =====
const searchForm = document.getElementById("searchForm");
const usernameInput = document.getElementById("usernameInput");
const introBox = document.getElementById("intro");
const statusBox = document.getElementById("status");
const profileBox = document.getElementById("profile");
const statsBox = document.getElementById("stats");
const controlsBox = document.getElementById("controls");
const reposBox = document.getElementById("repos");
const repoSearch = document.getElementById("repoSearch");
const langFilter = document.getElementById("langFilter");
const sortSelect = document.getElementById("sortSelect");

// Saari repos yahan store hongi
let allRepos = [];

// Language ke rang (dot ke liye)
const langColors = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    Java: "#b07219",
    HTML: "#e34c26",
    CSS: "#563d7c",
    C: "#555555",
    "C++": "#f34b7d",
    "C#": "#178600",
    Go: "#00ADD8",
    Rust: "#dea584",
    PHP: "#4F5D95",
    Ruby: "#701516",
    Shell: "#89e051",
    Dart: "#00B4AB",
    Kotlin: "#A97BFF",
    Swift: "#F05138"
};

// ===== Form submit =====
searchForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const username = usernameInput.value.trim();

    if (username === "") {
        showStatus("Please Enter Your GitHUb Username!", "error");
        return;
    }

    loadUser(username);
});

// Filter aur sort ke events
repoSearch.addEventListener("input", renderRepos);
langFilter.addEventListener("change", renderRepos);
sortSelect.addEventListener("change", renderRepos);

// ===== Main function =====
async function loadUser(username) {
    // Purana data saaf karein
    introBox.classList.add("hidden");
    profileBox.innerHTML = "";
    statsBox.innerHTML = "";
    reposBox.innerHTML = "";
    controlsBox.classList.add("hidden");
    showStatus("Loading data...", "info");

    try {
        // 1. User profile
        const userResponse = await fetch("https://api.github.com/users/" + username);

        if (userResponse.status === 404) {
            throw new Error("This username was not found on GitHub.");
        }
        if (!userResponse.ok) {
            throw new Error("Could not get data from GitHub. Please try again later (rate limit may have been reached).");
        }

        const user = await userResponse.json();

        // 2. Saari repos
        allRepos = await getAllRepos(username);

        // 3. Screen par dikhayein
        hideStatus();
        showProfile(user);
        showStats(user, allRepos);
        fillLanguageFilter(allRepos);
        controlsBox.classList.remove("hidden");
        renderRepos();

    } catch (error) {
        showStatus(error.message, "error");
    }
}

// GitHub ek baar mein sirf 100 repos deta hai, isliye pages mein le kar aate hain
async function getAllRepos(username) {
    let page = 1;
    let repos = [];

    while (true) {
        const url = "https://api.github.com/users/" + username + "/repos?per_page=100&page=" + page;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Repositories load nahi ho sakin.");
        }

        const data = await response.json();
        repos = repos.concat(data);

        if (data.length < 100) {
            break;
        }
        page++;
    }

    return repos;
}

// ===== Profile =====
function showProfile(user) {
    const joined = formatDate(user.created_at);

    profileBox.innerHTML = `
        <div class="profile">
          <img src="${escapeHtml(user.avatar_url)}" alt="avatar">
          <div class="profile-info">
            <h2>${escapeHtml(user.name || user.login)}</h2>
            <a class="login" href="${escapeHtml(user.html_url)}" target="_blank">@${escapeHtml(user.login)}</a>
            <p class="bio">${escapeHtml(user.bio || "No bio available")}</p>
            <div class="meta">
              <span>${escapeHtml(user.location || "Location nahi")}</span>
              <span>${escapeHtml(user.company || "Company nahi")}</span>
              <span>Joined: ${joined}</span>
              <span>${user.followers} followers</span>
              <span>${user.following} following</span>
            </div>
          </div>
        </div>
      `;
}

// ===== Stats =====
function showStats(user, repos) {
    let totalStars = 0;
    let totalForks = 0;
    let originalRepos = 0;

    repos.forEach(function (repo) {
        totalStars += repo.stargazers_count;
        totalForks += repo.forks_count;
        if (!repo.fork) {
            originalRepos++;
        }
    });

    statsBox.innerHTML = `
        ${makeStatCard(user.public_repos, "Public Repos")}
        ${makeStatCard(originalRepos, "Original Repos")}
        ${makeStatCard(totalStars, "Total Stars")}
        ${makeStatCard(totalForks, "Total Forks")}
      `;
}

function makeStatCard(number, label) {
    return `
        <div class="stat-card">
          <div class="number">${number}</div>
          <div class="label">${label}</div>
        </div>
      `;
}

// ===== Language filter =====
function fillLanguageFilter(repos) {
    const languages = new Set();

    repos.forEach(function (repo) {
        if (repo.language) {
            languages.add(repo.language);
        }
    });

    langFilter.innerHTML = '<option value="">All languages</option>';

    Array.from(languages).sort().forEach(function (lang) {
        const option = document.createElement("option");
        option.value = lang;
        option.textContent = lang;
        langFilter.appendChild(option);
    });

    langFilter.value = "";
    repoSearch.value = "";
    sortSelect.value = "updated";
}

// ===== Repos filter, sort aur show =====
function renderRepos() {
    const searchText = repoSearch.value.toLowerCase();
    const selectedLang = langFilter.value;
    const sortBy = sortSelect.value;

    // 1. Filter
    let filtered = allRepos.filter(function (repo) {
        const name = repo.name.toLowerCase();
        const desc = (repo.description || "").toLowerCase();

        const matchesSearch = name.includes(searchText) || desc.includes(searchText);
        const matchesLang = selectedLang === "" || repo.language === selectedLang;

        return matchesSearch && matchesLang;
    });

    // 2. Sort
    filtered.sort(function (a, b) {
        if (sortBy === "stars") return b.stargazers_count - a.stargazers_count;
        if (sortBy === "forks") return b.forks_count - a.forks_count;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "created") return new Date(b.created_at) - new Date(a.created_at);
        return new Date(b.updated_at) - new Date(a.updated_at);
    });

    // 3. Cards
    if (filtered.length === 0) {
        reposBox.innerHTML = '<p class="status info" style="grid-column: 1/-1">Koi repo nahi mili.</p>';
        return;
    }

    reposBox.innerHTML = filtered.map(makeRepoCard).join("");
}

// Ek repo ka card
function makeRepoCard(repo) {
    let badges = "";

    if (repo.language) {
        const color = langColors[repo.language] || "#94a3b8";
        badges += `<span class="badge"><span class="lang-dot" style="background:${color}"></span>${escapeHtml(repo.language)}</span>`;
    }
    if (repo.fork) {
        badges += `<span class="badge fork">Fork</span>`;
    }
    if (repo.archived) {
        badges += `<span class="badge archived">Archived</span>`;
    }
    if (repo.license) {
        badges += `<span class="badge">${escapeHtml(repo.license.spdx_id || repo.license.name)}</span>`;
    }

    let topics = "";
    if (repo.topics && repo.topics.length > 0) {
        topics = repo.topics.map(function (topic) {
            return `<span class="badge topic">#${escapeHtml(topic)}</span>`;
        }).join("");
    }

    return `
        <div class="repo-card">
          <h3><a href="${escapeHtml(repo.html_url)}" target="_blank">${escapeHtml(repo.name)}</a></h3>
          <p class="desc">${escapeHtml(repo.description || "Description nahi hai")}</p>
          <div class="badges">${badges}</div>
          ${topics ? `<div class="badges">${topics}</div>` : ""}
          <div class="repo-stats">
            <span>Stars <strong>${repo.stargazers_count}</strong></span>
            <span>Forks <strong>${repo.forks_count}</strong></span>
            <span>Watchers <strong>${repo.watchers_count}</strong></span>
            <span>Issues <strong>${repo.open_issues_count}</strong></span>
          </div>
          <div class="repo-dates">
            Created: ${formatDate(repo.created_at)} &nbsp;|&nbsp; Updated: ${formatDate(repo.updated_at)}
          </div>
        </div>
      `;
}

// ===== Helper functions =====
function showStatus(message, type) {
    statusBox.textContent = message;
    statusBox.className = "status " + type;
}

function hideStatus() {
    statusBox.className = "status hidden";
    statusBox.textContent = "";
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

// Security ke liye: HTML tags ko text mein badalta hai
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
