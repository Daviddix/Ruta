// Determine API Base URL dynamically
const BASEURL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://localhost:3000" 
    : "https://ruta.up.railway.app";

const token = localStorage.getItem("token");

// Route guard: Redirect if not authenticated
if (!token) {
    window.location.href = "./login.html";
}

// DOM Elements
const headerAvatar = document.getElementById("headerAvatar");
const accountAvatar = document.getElementById("accountAvatar");
const accountName = document.getElementById("accountName");
const accountEmail = document.getElementById("accountEmail");
const accountDate = document.getElementById("accountDate");
const roadmapsGrid = document.getElementById("roadmapsGrid");
const emptyState = document.getElementById("emptyState");
const logoutBtn = document.getElementById("logoutBtn");
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toastMessage");

// Tab toggles
const tabButtons = document.querySelectorAll(".nav-item[data-tab]");
const tabPanels = document.querySelectorAll(".tab-panel");

// Startup init
document.addEventListener("DOMContentLoaded", () => {
    loadUserProfile();
    loadSavedRoadmaps();
    setupTabNavigation();
    
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }
});

// Load user info
async function loadUserProfile() {
    try {
        const response = await fetch(`${BASEURL}/api/auth/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Session expired or invalid");
        }

        const userData = await response.json();
        
        const initial = userData.name.charAt(0).toUpperCase();
        if (headerAvatar) headerAvatar.textContent = initial;
        if (accountAvatar) accountAvatar.textContent = initial;
        if (accountName) accountName.textContent = userData.name;
        if (accountEmail) accountEmail.textContent = userData.email;
        
        if (accountDate && userData.createdAt) {
            const formattedDate = new Date(userData.createdAt).toLocaleDateString("en-US", {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            accountDate.textContent = formattedDate;
        }

    } catch (err) {
        console.error(err);
        localStorage.removeItem("token");
        window.location.href = "./login.html";
    }
}

// Fetch and render saved roadmaps
async function loadSavedRoadmaps() {
    try {
        const response = await fetch(`${BASEURL}/api/roadmaps`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Failed to load saved roadmaps");
        }

        const roadmaps = await response.json();

        // Clear skeletons
        if (roadmapsGrid) roadmapsGrid.innerHTML = "";

        if (roadmaps.length === 0) {
            if (emptyState) emptyState.classList.remove("hidden");
            return;
        }

        if (emptyState) emptyState.classList.add("hidden");

        roadmaps.forEach(roadmap => {
            const card = document.createElement("article");
            card.classList.add("roadmap-card");

            const timelineLength = roadmap.timeline ? roadmap.timeline.length : 0;
            const daysCountText = timelineLength === 1 ? "1 Day Plan" : `${timelineLength} Days Plan`;
            
            const createdDate = new Date(roadmap.createdAt).toLocaleDateString("en-US", {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            card.innerHTML = `
                <div class="card-top">
                    <span class="badge">${daysCountText}</span>
                    <h3>${roadmap.title}</h3>
                    <div class="card-meta">
                        <span>Created ${createdDate}</span>
                    </div>
                </div>
                <div class="card-bottom">
                    <div class="card-actions">
                        <button class="btn-icon share" data-id="${roadmap._id}" title="Copy shareable link">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                        </button>
                        <button class="btn-icon delete" data-id="${roadmap._id}" title="Delete roadmap">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                    </div>
                    <a href="./index.html?id=${roadmap._id}" class="btn-view">View Timeline</a>
                </div>
            `;

            // Event Listeners for actions
            const shareBtn = card.querySelector(".share");
            const deleteBtn = card.querySelector(".delete");

            shareBtn.addEventListener("click", () => handleShare(roadmap._id));
            deleteBtn.addEventListener("click", () => handleDelete(roadmap._id));

            roadmapsGrid.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        // Fail gracefully
        if (roadmapsGrid) {
            roadmapsGrid.innerHTML = `<p style="font-size: 1.4rem; color: var(--error-color); grid-column: span 3; text-align:center;">Failed to load saved roadmaps. Please try refreshing.</p>`;
        }
    }
}

// Tab navigation setup
function setupTabNavigation() {
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");

            // Deactivate all
            tabButtons.forEach(b => b.classList.remove("active"));
            tabPanels.forEach(p => p.classList.remove("active"));

            // Activate current
            btn.classList.add("active");
            const activePanel = document.getElementById(`tab-${targetTab}`);
            if (activePanel) activePanel.classList.add("active");
        });
    });
}

// Copy share link
function handleShare(id) {
    // Generate index.html absolute link with id parameter
    const baseUrlPath = window.location.origin + window.location.pathname.replace("dashboard.html", "index.html");
    const shareUrl = `${baseUrlPath}?id=${id}`;

    navigator.clipboard.writeText(shareUrl)
        .then(() => {
            showToast("Shareable link copied to clipboard!");
        })
        .catch(err => {
            console.error("Failed to copy link:", err);
            showToast("Failed to copy link. Please copy manually.");
        });
}

// Delete saved roadmap
async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this saved roadmap?")) return;

    try {
        const response = await fetch(`${BASEURL}/api/roadmaps/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Failed to delete roadmap");
        }

        showToast("Roadmap removed successfully.");
        loadSavedRoadmaps(); // Reload grid

    } catch (err) {
        console.error(err);
        showToast("Error deleting roadmap. Please try again.");
    }
}

// Logout handler
function handleLogout() {
    localStorage.removeItem("token");
    window.location.href = "./index.html";
}

// Show feedback toasts
function showToast(message) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = message;
    toast.classList.remove("hidden");
    
    setTimeout(() => {
        toast.classList.add("hidden");
    }, 2500);
}
