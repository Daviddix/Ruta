const abortButton = document.getElementById('abortButton');

let abortController = new AbortController(); 

const form = document.querySelector(".chat-input")
const textarea = document.querySelector("#chat-box")
const chatsContainer = document.querySelector(".chats-container")
const allTestSkillsButtons = document.querySelectorAll(".all-test-skills span")
const welcomeMessage = document.querySelector(".welcome-message")
const testSkillsContainer = document.querySelector(".test-skills")
const sendIcon = document.querySelector(".chat-input button .send")
const stopIcon = document.querySelector(".chat-input button .stop")
const submitBtn = document.querySelector(".chat-input button")
const timelineHeader = document.querySelector(".timeline-top-inner > h1")
const timelineContainer = document.querySelector(".timeline-content-inner");
const timelineOnMobile = document.querySelector(".timeline")
const minimizeTimelineButton = document.querySelector(".timeline-top-inner .down")
const timelineToggleButton = document.querySelector(".views > button.timeline-toggle")
const roadmapToggleButton = document.querySelector(".views > button.roadmap-toggle")
const exportButton = document.querySelector(".export-btn")
const toast = document.querySelector(".toast")
const timelineInnerHeader = document.querySelector(".timeline-top-inner")
const BASEURL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://localhost:3000" 
    : "https://ruta.up.railway.app";

const loginLink = document.getElementById("loginLink");
const userProfile = document.getElementById("userProfile");
const userAvatar = document.getElementById("userAvatar");
const userNameDisplay = document.getElementById("userNameDisplay");
const logoutBtn = document.getElementById("logoutBtn");

async function checkAuthStatus() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const response = await fetch(`${BASEURL}/api/auth/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            const userData = await response.json();
            currentUserId = userData._id || userData.id || "";
            if (loginLink) loginLink.style.display = "none";
            if (userProfile) userProfile.classList.remove("hidden");
            if (userNameDisplay) userNameDisplay.textContent = userData.name;
            if (userAvatar) userAvatar.textContent = userData.name.charAt(0).toUpperCase();

            // Prepend Go to Dashboard button in hero container if authenticated
            const heroActions = document.querySelector(".hero-actions");
            if (heroActions && !document.getElementById("dashboardCtaBtn")) {
                const dashBtn = document.createElement("a");
                dashBtn.id = "dashboardCtaBtn";
                dashBtn.href = "./dashboard.html";
                dashBtn.className = "btn-primary";
                dashBtn.textContent = "Go to Dashboard";
                heroActions.insertBefore(dashBtn, heroActions.firstChild);
            }
        } else {
            localStorage.removeItem("token");
        }
    } catch (err) {
        console.error("Auth status verification failed:", err);
    }
}

async function checkQueryParamRoadmap() {
    const urlParams = new URLSearchParams(window.location.search);
    const roadmapId = urlParams.get('id');
    if (!roadmapId) return;

    // Immediately bypass landing page UI
    const landingSection = document.getElementById("landingSection");
    const appWorkspace = document.getElementById("appWorkspace");
    const mainViewport = document.querySelector("main");
    if (landingSection) landingSection.classList.add("hidden");
    if (appWorkspace) appWorkspace.classList.remove("hidden");
    if (mainViewport) mainViewport.classList.add("app-active");

    // Show loading skeleton on timeline
    timelineHeader.innerHTML = `<div class="fake-h1"></div>`;
    timelineContainer.innerHTML = "";
    timelineOnMobile.classList.remove("hidden");
    showTimelineLoader();
    hideWelcomeMessages();

    // Add User welcome bubble in chat
    const userMessage = document.createElement("article");
    userMessage.classList.add("user-message");
    userMessage.innerHTML = `
      <div class="user-bubble">
        <p>Load saved roadmap</p>
      </div>
      <div class="user-icon"></div>
    `;
    chatsContainer.appendChild(userMessage);

    try {
        const response = await fetch(`${BASEURL}/api/roadmaps/${roadmapId}`, {
            method: "GET"
        });

        if (!response.ok) {
            throw new Error("Roadmap not found");
        }

        const roadmapData = await response.json();

        // Update state tracking
        loadedRoadmapId = roadmapData._id || "";
        roadmapOwnerId = roadmapData.userId || "";

        // Toggle Fork Button: show if current user does not own it (or is logged out)
        const headerForkBtn = document.getElementById("headerForkBtn");
        if (headerForkBtn) {
            const hasAuth = !!localStorage.getItem("token");
            const isOwner = hasAuth && currentUserId && (roadmapOwnerId === currentUserId);
            if (!isOwner) {
                headerForkBtn.classList.remove("hidden");
                headerForkBtn.classList.add("show-fork");
                
                // Add fork handler
                headerForkBtn.onclick = () => handleForkRoadmap(loadedRoadmapId);
            } else {
                headerForkBtn.classList.add("hidden");
                headerForkBtn.classList.remove("show-fork");
            }
        }

        // Render timeline
        timelineHeader.innerHTML = roadmapData.title;
        roadmapTitle = roadmapData.title;
        generatedData = roadmapData.timeline;
        exportType = "Timeline";

        createAndRenderTimeline(roadmapData.timeline);
        enableHeaderButtons();

        // Add Ruta loaded bubble in chat
        const rutaMessage = document.createElement("article");
        rutaMessage.classList.add("ruta-message");
        rutaMessage.innerHTML = `
          <img src="./ruta-logo.svg" alt="">
          <div class="ruta-bubble">
            <p>Here is your personalized roadmap for <strong>${roadmapData.title}</strong>. You can navigate between the Timeline View and Roadmap View or export it as a PDF.</p>
            <div class="ruta-status">
              <div class="top">
                <p>${roadmapData.title}</p>
              </div>
              <div class="status">
                <div class="dot done"></div>
                <p>Roadmap Loaded Successfully</p>
              </div>
            </div>
          </div>
        `;
        chatsContainer.appendChild(rutaMessage);
        chatsContainer.scrollTop = chatsContainer.scrollHeight;

    } catch (err) {
        console.error("Failed to load query-param roadmap:", err);
        showTimelineError();
        disableHeaderButtons();
        
        // Add Ruta error bubble in chat
        const rutaMessage = document.createElement("article");
        rutaMessage.classList.add("ruta-message");
        rutaMessage.innerHTML = `
          <img src="./ruta-logo.svg" alt="">
          <div class="ruta-bubble">
            <p class="error">Failed to load the requested roadmap. It may have been deleted or the link is invalid.</p>
          </div>
        `;
        chatsContainer.appendChild(rutaMessage);
        chatsContainer.scrollTop = chatsContainer.scrollHeight;
    }
}

// Call checkAuthStatus on page load
document.addEventListener("DOMContentLoaded", () => {
    checkAuthStatus();
    checkQueryParamRoadmap();
    
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("token");
            window.location.reload();
        });
    }

    // Set up Phase 4 Landing Page Transitions and Handlers
    const playgroundForm = document.getElementById("playgroundForm");
    const playgroundInput = document.getElementById("playgroundInput");
    const landingSection = document.getElementById("landingSection");
    const appWorkspace = document.getElementById("appWorkspace");
    const mainViewport = document.querySelector("main");

    if (playgroundForm) {
        playgroundForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const promptValue = playgroundInput.value.trim();
            if (!promptValue) return;

            // Copy input value to chatbot input
            const chatBox = document.getElementById("chat-box");
            if (chatBox) chatBox.value = promptValue;

            // Trigger smooth transition out
            landingSection.classList.add("transition-out");
            appWorkspace.classList.remove("hidden");
            appWorkspace.classList.add("transition-in");
            if (mainViewport) mainViewport.classList.add("app-active");

            setTimeout(() => {
                landingSection.classList.add("hidden");
                landingSection.classList.remove("transition-out");
                appWorkspace.classList.remove("transition-in");
            }, 500);

            // Execute chatbot prompt generation flow
            updateChatUI(promptValue);
            makeFetchRequest(promptValue);
        });
    }

    // Logo Click-to-Home SPA Transition
    const logoContainer = document.querySelector(".logo-container");
    if (logoContainer) {
        logoContainer.style.cursor = "pointer";
        logoContainer.addEventListener("click", () => {
            if (landingSection && landingSection.classList.contains("hidden")) {
                // Clear URL params without forcing reload
                if (window.location.search) {
                    const cleanUrl = window.location.origin + window.location.pathname;
                    window.history.pushState({}, document.title, cleanUrl);
                }

                // Reset state variables
                loadedRoadmapId = "";
                roadmapOwnerId = "";
                generatedData = [];
                roadmapTitle = "";

                // Reset chat panels
                const chatsContainer = document.querySelector(".chats-container");
                if (chatsContainer) {
                    chatsContainer.innerHTML = `
                        <div class="welcome-message">
                          <h1>What do you want to learn?</h1>
                          <p>Use Ruta to generate a structured roadmap & timeline that will help you master any skill</p>
                        </div>
                    `;
                }
                const welcomeMessage = document.querySelector(".welcome-message");
                const testSkillsContainer = document.querySelector(".test-skills");
                if (welcomeMessage) welcomeMessage.style.display = "block";
                if (testSkillsContainer) testSkillsContainer.style.display = "block";

                // Minimize timeline on mobile view if active
                const timelineOnMobile = document.querySelector(".timeline");
                if (timelineOnMobile) timelineOnMobile.classList.add("hidden");

                // Restore landing view
                appWorkspace.classList.add("hidden");
                if (mainViewport) mainViewport.classList.remove("app-active");
                landingSection.classList.remove("hidden");

                if (playgroundInput) {
                    playgroundInput.value = "";
                    playgroundInput.focus();
                }
            } else {
                // Smooth scroll to top if already on landing
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        });
    }

    // Scroll to Search CTAs
    const ctaGetStarted = document.getElementById("ctaGetStarted");
    if (ctaGetStarted) {
        ctaGetStarted.addEventListener("click", () => {
            if (playgroundInput) {
                playgroundInput.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => playgroundInput.focus(), 600);
            }
        });
    }
});
let loadedRoadmapId = "";
let roadmapOwnerId = "";
let currentUserId = "";
let isGenerating = false
let isLoading = false
let isError = false
let exportType = ""
let roadmapTitle = ""
let generatedData = []
let lastRutaMessageId = ""

let dragSourceIndex = null;
let originalGeneratedData = null;
let hasUnsavedChanges = false;

// Floating Save Bar UI Elements
const floatingSaveBar = document.getElementById("floatingSaveBar");
const resetChangesBtn = document.getElementById("resetChangesBtn");
const saveChangesBtn = document.getElementById("saveChangesBtn");

function showFloatingSaveBar() {
    if (floatingSaveBar) {
        floatingSaveBar.classList.remove("hidden");
    }
}

function hideFloatingSaveBar() {
    if (floatingSaveBar) {
        floatingSaveBar.classList.add("hidden");
    }
}

// Drag & Drop event handlers
function handleDragStart(e) {
    dragSourceIndex = parseInt(this.getAttribute("data-index"));
    this.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragSourceIndex);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = "move";
    return false;
}

function handleDragEnter(e) {
    this.classList.add("drag-over");
}

function handleDragLeave(e) {
    this.classList.remove("drag-over");
}

function handleDrop(e) {
    e.stopPropagation();
    this.classList.remove("drag-over");
    const targetIndex = parseInt(this.getAttribute("data-index"));
    
    if (dragSourceIndex !== null && dragSourceIndex !== targetIndex) {
        if (!hasUnsavedChanges) {
            originalGeneratedData = JSON.parse(JSON.stringify(generatedData));
        }

        const draggedItem = generatedData.splice(dragSourceIndex, 1)[0];
        generatedData.splice(targetIndex, 0, draggedItem);
        
        hasUnsavedChanges = true;
        showFloatingSaveBar();

        if (timelineToggleButton.classList.contains("active")) {
            createAndRenderTimeline(generatedData);
        } else {
            createAndRenderNodes(generatedData);
        }
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove("dragging");
    const cards = timelineContainer.querySelectorAll(".single-timeline-info");
    cards.forEach(card => card.classList.remove("drag-over"));
}

// Visual Editor Actions: Delete & Insert & Inline Edit
function handleDeleteMilestone(index) {
    if (confirm("Are you sure you want to delete this milestone?")) {
        if (!hasUnsavedChanges) {
            originalGeneratedData = JSON.parse(JSON.stringify(generatedData));
        }

        generatedData.splice(index, 1);
        hasUnsavedChanges = true;
        showFloatingSaveBar();

        if (timelineToggleButton.classList.contains("active")) {
            createAndRenderTimeline(generatedData);
        } else {
            createAndRenderNodes(generatedData);
        }
    }
}

function handleInsertMilestone(index) {
    if (!hasUnsavedChanges) {
        originalGeneratedData = JSON.parse(JSON.stringify(generatedData));
    }

    const newMilestone = {
        day: `Day 0${generatedData.length + 1}`,
        date_range: "Custom Duration",
        title: "New Custom Milestone",
        description: "Click the edit button to customize this milestone's contents and add resources.",
        category: "Learn",
        emoji: "📘",
        emojiDominantColor: "#2B61D4",
        emojiDominantDarkerColor: "#1C4091",
        shouldContainResources: false,
        resources: []
    };

    generatedData.splice(index, 0, newMilestone);
    hasUnsavedChanges = true;
    showFloatingSaveBar();

    if (timelineToggleButton.classList.contains("active")) {
        createAndRenderTimeline(generatedData);
        // Automatically enter edit mode on the newly inserted card
        const cards = timelineContainer.querySelectorAll(".single-timeline-info");
        const newCard = cards[index];
        if (newCard) {
            enterEditMode(newCard, index);
        }
    } else {
        createAndRenderNodes(generatedData);
        // Automatically enter edit mode on the newly inserted node
        const nodes = timelineContainer.querySelectorAll(".timeline-node");
        const newNode = nodes[index];
        if (newNode) {
            enterEditMode(newNode, index);
        }
    }
}

function enterEditMode(cardElement, index) {
    const item = generatedData[index];
    
    // Remove draggable temporarily to avoid text-drag interference
    cardElement.removeAttribute("draggable");
    cardElement.classList.add("editing");
    
    // Deep copy of resources locally to prevent modifying the state unless saved
    let localResources = JSON.parse(JSON.stringify(item.resources || []));
    
    cardElement.innerHTML = `
        <form class="card-edit-form" data-index="${index}">
            <div class="edit-input-group">
                <label>Day / Step</label>
                <input type="text" name="day" value="${item.day}" required>
            </div>
            <div class="edit-input-group">
                <label>Date Range / Duration</label>
                <input type="text" name="date_range" value="${item.date_range}" required>
            </div>
            <div class="edit-input-group">
                <label>Milestone Title</label>
                <input type="text" name="title" value="${item.title}" required>
            </div>
            <div class="edit-input-group">
                <label>Description</label>
                <textarea name="description" required>${item.description}</textarea>
            </div>
            
            <!-- Educational Resources Link Manager -->
            <div class="edit-input-group edit-resources-section">
                <label>Educational Resources (YouTube / Blogs)</label>
                <div class="edit-resources-list" id="editResourcesList"></div>
                
                <div class="add-resource-row">
                    <input type="text" id="newResTitle" placeholder="Title (e.g., Guide to UX Writing)">
                    <input type="url" id="newResUrl" placeholder="URL (e.g., https://youtube.com/...)">
                    <select id="newResType">
                        <option value="video">🎥 YouTube Video</option>
                        <option value="article">📰 Article / Blog</option>
                    </select>
                    <button type="button" class="btn-add-resource" id="btnAddResource">Add Link</button>
                </div>
            </div>
            
            <div class="edit-actions">
                <button type="button" class="btn-edit-cancel" data-index="${index}">Cancel</button>
                <button type="submit" class="btn-edit-save">Save</button>
            </div>
        </form>
    `;
    
    // Helper function to render resources list locally inside the form
    function renderLocalResources() {
        const listContainer = cardElement.querySelector("#editResourcesList");
        if (!listContainer) return;
        
        if (localResources.length === 0) {
            listContainer.innerHTML = `<p class="no-resources-msg">No educational links added yet.</p>`;
            return;
        }
        
        listContainer.innerHTML = localResources.map((res, rIdx) => {
            const iconText = res.type === "video" ? "🎥 Video" : "📰 Link";
            return `
                <div class="edit-resource-item">
                    <span class="res-badge ${res.type}">${iconText}</span>
                    <div class="res-details">
                        <span class="res-title">${res.title}</span>
                        <a href="${res.url}" target="_blank" class="res-url">${res.url}</a>
                    </div>
                    <button type="button" class="btn-delete-resource" data-res-index="${rIdx}" title="Remove Resource">&times;</button>
                </div>
            `;
        }).join("");
        
        // Wire up delete resource button events
        listContainer.querySelectorAll(".btn-delete-resource").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const rIdx = parseInt(btn.getAttribute("data-res-index"));
                localResources.splice(rIdx, 1);
                renderLocalResources();
            });
        });
    }
    
    // Initial render
    renderLocalResources();
    
    // Wire up "Add Link" button event
    const newResTitleInput = cardElement.querySelector("#newResTitle");
    const newResUrlInput = cardElement.querySelector("#newResUrl");
    const newResTypeSelect = cardElement.querySelector("#newResType");
    const btnAddResource = cardElement.querySelector("#btnAddResource");
    
    if (btnAddResource) {
        btnAddResource.addEventListener("click", (e) => {
            e.stopPropagation();
            const title = newResTitleInput.value.trim();
            const url = newResUrlInput.value.trim();
            const type = newResTypeSelect.value;
            
            if (!title || !url) {
                alert("Please fill in both the Resource Title and URL.");
                return;
            }
            
            try {
                new URL(url);
            } catch (_) {
                alert("Please enter a valid URL (starting with http:// or https://).");
                return;
            }
            
            localResources.push({ title, url, type });
            newResTitleInput.value = "";
            newResUrlInput.value = "";
            renderLocalResources();
        });
    }
    
    // Wire up cancel button
    cardElement.querySelector(".btn-edit-cancel").addEventListener("click", (e) => {
        e.stopPropagation();
        if (timelineToggleButton.classList.contains("active")) {
            createAndRenderTimeline(generatedData);
        } else {
            createAndRenderNodes(generatedData);
        }
    });

    // Wire up save form
    cardElement.querySelector(".card-edit-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        if (!hasUnsavedChanges) {
            originalGeneratedData = JSON.parse(JSON.stringify(generatedData));
        }

        generatedData[index].day = formData.get("day");
        generatedData[index].date_range = formData.get("date_range");
        generatedData[index].title = formData.get("title");
        generatedData[index].description = formData.get("description");
        
        // Save the updated resource list!
        generatedData[index].resources = localResources;
        generatedData[index].shouldContainResources = localResources.length > 0;

        hasUnsavedChanges = true;
        showFloatingSaveBar();

        if (timelineToggleButton.classList.contains("active")) {
            createAndRenderTimeline(generatedData);
        } else {
            createAndRenderNodes(generatedData);
        }
    });
}

function setupInteractiveEvents() {
    const cards = timelineContainer.querySelectorAll(".single-timeline-info");
    cards.forEach(card => {
        card.addEventListener("dragstart", handleDragStart);
        card.addEventListener("dragover", handleDragOver);
        card.addEventListener("dragenter", handleDragEnter);
        card.addEventListener("dragleave", handleDragLeave);
        card.addEventListener("drop", handleDrop);
        card.addEventListener("dragend", handleDragEnd);

        // Edit button
        const editBtn = card.querySelector(".btn-edit");
        if (editBtn) {
            editBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const idx = parseInt(editBtn.getAttribute("data-index"));
                enterEditMode(card, idx);
            });
        }

        // Delete button
        const deleteBtn = card.querySelector(".btn-delete");
        if (deleteBtn) {
            deleteBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const idx = parseInt(deleteBtn.getAttribute("data-index"));
                handleDeleteMilestone(idx);
            });
        }

        // Double click to edit card
        card.addEventListener("dblclick", (e) => {
            if (e.target.closest("button") || e.target.closest("a") || e.target.closest("form") || e.target.closest(".circle") || e.target.closest(".card-action-panel")) {
                return;
            }
            const idx = parseInt(card.getAttribute("data-index"));
            enterEditMode(card, idx);
        });
    });

    // Insert dividers
    const dividers = timelineContainer.querySelectorAll(".timeline-insert-divider");
    dividers.forEach(divider => {
        const insertBtn = divider.querySelector(".insert-btn");
        if (insertBtn) {
            insertBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const idx = parseInt(divider.getAttribute("data-index"));
                handleInsertMilestone(idx);
            });
        }
    });
}

// Wire up global save and reset buttons
if (resetChangesBtn) {
    resetChangesBtn.addEventListener("click", () => {
        if (originalGeneratedData) {
            generatedData = JSON.parse(JSON.stringify(originalGeneratedData));
            hasUnsavedChanges = false;
            hideFloatingSaveBar();
            
            if (timelineToggleButton.classList.contains("active")) {
                createAndRenderTimeline(generatedData);
            } else {
                createAndRenderNodes(generatedData);
            }
        }
    });
}

if (saveChangesBtn) {
    saveChangesBtn.addEventListener("click", async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please sign up or log in to save your customized roadmap!");
            window.location.href = "./login.html";
            return;
        }

        if (!loadedRoadmapId) {
            try {
                // Save new roadmap via POST /api/roadmaps
                const response = await fetch(`${BASEURL}/api/roadmaps`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title: roadmapTitle,
                        goal: roadmapTitle,
                        timeline: generatedData
                    })
                });

                if (response.ok) {
                    const savedData = await response.json();
                    loadedRoadmapId = savedData._id;
                    hasUnsavedChanges = false;
                    hideFloatingSaveBar();
                    alert("Roadmap saved successfully to your dashboard!");
                } else {
                    const errData = await response.json();
                    alert(`Error saving roadmap: ${errData.msg || 'Server Error'}`);
                }
            } catch (err) {
                console.error("Failed to save changes:", err);
                alert("Error saving roadmap. Please try again.");
            }
            return;
        }

        try {
            // Save updates via PUT /api/roadmaps/:id
            const response = await fetch(`${BASEURL}/api/roadmaps/${loadedRoadmapId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: roadmapTitle,
                    timeline: generatedData
                })
            });

            if (response.ok) {
                hasUnsavedChanges = false;
                hideFloatingSaveBar();
                alert("Changes saved successfully to your dashboard!");
            } else {
                const errData = await response.json();
                alert(`Error saving changes: ${errData.msg || 'Server Error'}`);
            }
        } catch (err) {
            console.error("Failed to save changes:", err);
            alert("Error saving roadmap. Please try again.");
        }
    });
}


//event listeners
allTestSkillsButtons.forEach((button) => {
    button.addEventListener("click", (e)=>{ 
        const buttonText = e.target.innerText
        testSkillsHandler(buttonText)
    })
})

form.addEventListener("submit", (e)=>{
    e.preventDefault()
    if(isGenerating){
        abortController.abort();
        abortController = new AbortController();
    return
    }
    const userMessage = textarea.value.trim()
    if(!userMessage) return
    updateChatUI(userMessage)
    
    if (loadedRoadmapId) {
        makeEditRequest(loadedRoadmapId, userMessage);
    } else {
        makeFetchRequest(userMessage);
    }
    disableHeaderButtons()
})

minimizeTimelineButton.addEventListener("click", ()=>{
    timelineOnMobile.classList.add("hidden")
})

timelineToggleButton.addEventListener("click", (e)=>{
    if(isLoading || isError){
        return
    }
    if(e.currentTarget.classList.contains("active")){
        return
    }
    e.currentTarget.classList.add("active")
    roadmapToggleButton.classList.remove("active")
    timelineContainer.innerHTML = ``
    createAndRenderTimeline(generatedData)
    exportType = "Timeline"
})

roadmapToggleButton.addEventListener("click", (e)=>{
    if(isLoading | isError){
        return
    }
    if(e.currentTarget.classList.contains("active")){
        return
    }
    e.currentTarget.classList.add("active")
    timelineToggleButton.classList.remove("active")
    timelineContainer.innerHTML = ``
    createAndRenderNodes(generatedData)
    exportType = "Roadmap"
})

exportButton.addEventListener("click", exportToPDF)

//--------------------------------------------------------

//UI update
function updateChatUI(input){
    if (input === ""){
      alert("cannot submit empty message")
      return
    } 

    hideWelcomeMessages()

    const userMessage = document.createElement("article");

    userMessage.classList.add("user-message");

    const messagePara = document.createElement("p");

    messagePara.textContent = input;

    userMessage.innerHTML = `
      <div class="user-bubble">
      </div>
      <div class="user-icon"></div>
    `;


    chatsContainer.appendChild(userMessage);

    const userBubble = userMessage.querySelector(".user-bubble")

    userBubble.appendChild(messagePara)

    textarea.value = "";

    chatsContainer.scrollTop = chatsContainer.scrollHeight;

}

function updateRutaUI(headingAndIntroObj){
    const rutaMessage = document.createElement("article");

    rutaMessage.classList.add("ruta-message")

    const d = Date.now()

    rutaMessage.id = d

    lastRutaMessageId = d

    rutaMessage.innerHTML = `
      <img src="./ruta-logo.svg" alt="">

    <div class="ruta-bubble">
    <p>${headingAndIntroObj.intro}</p>

    <div class="ruta-status">
      <div class="top">
        <p>${headingAndIntroObj.title}</p>
      </div>

      <div class="status">
        <div class="dot"></div>
        <p>Generating Timeline & Roadmap</p>
      </div>

      <button class="show-timeline">View Timeline</button>
    </div>

      </div>
    `;

    const showTimelineBtn = rutaMessage.querySelector(".show-timeline")


    showTimelineBtn.addEventListener("click", ()=>{
        timelineOnMobile.classList.remove("hidden")
    })

    chatsContainer.appendChild(rutaMessage);

    chatsContainer.scrollTop = chatsContainer.scrollHeight;
}

function updateRutaUIWithError(errorMessage){
    const rutaMessage = document.createElement("article");
    rutaMessage.classList.add("ruta-message")

    rutaMessage.innerHTML = `
      <img src="./ruta-logo.svg" alt="">

    <div class="ruta-bubble">
    <p class="error">${errorMessage}</p>

      </div>
    `;

    chatsContainer.appendChild(rutaMessage);

    chatsContainer.scrollTop = chatsContainer.scrollHeight;
}

function showStopButton(){
    sendIcon.style.display = "none"
    stopIcon.style.display = "initial"
}

function hideStopButton(){
    stopIcon.style.display = "none"
    sendIcon.style.display = "initial"
}

function showTimelineLoader(){
        timelineContainer.innerHTML = ""; // Clear existing content
        const timelineLoaderElement = document.createElement("div")
        timelineLoaderElement.classList.add("timeline-loader")
        timelineLoaderElement.innerHTML = `
        <div class="spinner"></div>
        <p>Loading Timeline...</p>
        `
        timelineContainer.appendChild(timelineLoaderElement)
}

function showTimelineError(){
        timelineContainer.innerHTML = ""; // Clear existing content
        const timelineErrorElement = document.createElement("div")
        timelineErrorElement.classList.add("timeline-error")
        timelineErrorElement.innerHTML = `
        <h2>Timeline Error</h2>
        <p>Oops , Seems like an error while we tried to fetch your timeline. Please try again</p>
        <button class="error-retry-btn">Retry</button>
        `
        timelineContainer.appendChild(timelineErrorElement)
        timelineHeader.innerHTML = `Timeline Generation Error`
        const timelineErrorButton = timelineErrorElement.querySelector(".error-retry-btn")
        const messageToRetry = document.querySelectorAll(".user-bubble p")
        const lastMessageToRetry = messageToRetry[messageToRetry.length - 1]
        timelineErrorButton.addEventListener("click", ()=>{
            refetch(lastMessageToRetry.textContent)
        })
        isLoading = false
        isError = true
}

function checkAndRenderGuestBanner() {
    const hasToken = !!localStorage.getItem("token");
    if (!hasToken) {
        const bannerExists = document.getElementById("guestWarningBanner");
        if (!bannerExists) {
            const banner = document.createElement("div");
            banner.id = "guestWarningBanner";
            banner.className = "guest-warning-banner";
            banner.innerHTML = `
                <span>✨ You are previewing as a guest. <strong><a href="./signup.html">Sign Up</a></strong> or <strong><a href="./login.html">Log In</a></strong> to save this roadmap!</span>
                <button class="close-banner-btn" onclick="document.getElementById('guestWarningBanner').remove()">&times;</button>
            `;
            if (timelineContainer) {
                timelineContainer.insertBefore(banner, timelineContainer.firstChild);
            }
        }
    }
}

function createAndRenderTimeline(timelineArray = []) {
    timelineContainer.innerHTML = ""; // Clear existing content
    timelineArray.forEach((item, index) => {
        // Render insert divider before card (if index > 0)
        if (index > 0) {
            const divider = document.createElement("div");
            divider.className = "timeline-insert-divider";
            divider.setAttribute("data-index", index);
            divider.innerHTML = `<button class="insert-btn" title="Add Milestone Here">+</button>`;
            timelineContainer.appendChild(divider);
        }

        const timelineItem = document.createElement("article");
        timelineItem.classList.add("single-timeline-info");
        timelineItem.setAttribute("draggable", "true");
        timelineItem.setAttribute("data-index", index);

        // Build resources HTML separately
        let resourcesHTML = "";
        if (item.resources && item.resources.length > 0) {
            resourcesHTML += `<h3>RESOURCES</h3>`;
            resourcesHTML += item.resources
                .map(resource => {
                    const icon =
                        resource.type === "video"
                            ? "./yt-icon.svg"
                            : "./internet-icon.svg";
                    return `
                        <div class="single-resource">
                            <img src="${icon}" alt="icon"> 
                            <a target="_blank" href="${resource.url}">${resource.title}</a>
                        </div>
                    `;
                })
                .join("");
        }

        // Full HTML for the timeline item
        timelineItem.innerHTML = `
            <div class="card-action-panel">
                <button class="card-btn btn-edit" title="Edit Milestone" data-index="${index}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button class="card-btn btn-delete" title="Delete Milestone" data-index="${index}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>
            <div style="background-color:${item.emojiDominantColor || '#2B61D4'}; border:1px solid ${item.emojiDominantDarkerColor || '#1C4091'};" class="circle">${item.emoji || '📘'}</div>
            <article>
                <header>
                    <p class="date">${item.day} - <span>${item.date_range}</span></p>
                    <h1>${item.title}</h1>
                </header>
                <hr>
                <p class="intro">${item.description}</p>
                <hr>
                ${resourcesHTML}
            </article>
        `;

        timelineContainer.appendChild(timelineItem);
    });

    setupInteractiveEvents();
    checkAndRenderGuestBanner();
}
  
function hideWelcomeMessages(){
    welcomeMessage.style.display = "none"
    testSkillsContainer.style.display = "none"
}

function createAndRenderNodes(timelineArray=[]){
    timelineContainer.innerHTML = "";
    timelineArray.forEach((milestone, index) => {
      const node = document.createElement("div");
      node.classList.add("timeline-node");
      node.id = `node-${index}`;
      node.innerHTML = `
            <div class="card-action-panel">
                <button class="card-btn btn-edit" title="Edit Milestone" data-index="${index}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button class="card-btn btn-delete" title="Delete Milestone" data-index="${index}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>
            <div class="top">
                  <h1>${milestone.day}</h1>
                </div>
    
                <p>${milestone.title}</p>
      `;

      // Wire up node actions
      const editBtn = node.querySelector(".btn-edit");
      if (editBtn) {
          editBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              enterEditMode(node, index);
          });
      }

      const deleteBtn = node.querySelector(".btn-delete");
      if (deleteBtn) {
          deleteBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              handleDeleteMilestone(index);
          });
      }

      // Double click to edit node
      node.addEventListener("dblclick", (e) => {
          if (e.target.closest("button") || e.target.closest("form") || e.target.closest(".card-action-panel")) {
              return;
          }
          enterEditMode(node, index);
      });

      timelineContainer.appendChild(node);
    });
    checkAndRenderGuestBanner();
}

//-------------------------------------------


function testSkillsHandler(text){
    hideWelcomeMessages()
    updateChatUI(text)
    makeFetchRequest(text)
}

async function makeFetchRequest(userRequest){
    timelineHeader.innerHTML = `<div class="fake-h1"></div>`
    timelineContainer.innerHTML = ""; // Clear existing content
    isGenerating = true
    isLoading = true
    showStopButton()
    let lastRutaMessage;
    showTimelineLoader()
    try{
        const introObj =  await getHeadingAndIntroText(userRequest)
        
        if (!introObj || !introObj.title || !introObj.intro) {
            throw new Error("Invalid intro object received");
        }
        
        updateRutaUI(introObj)

        lastRutaMessage = document.getElementById(lastRutaMessageId)

           timelineHeader.innerHTML = introObj.title

           roadmapTitle = introObj.title

           const fetchPayload = {
            todaysDate : new Date(),
            titleOfRoadmap : introObj.title,
            userRequest
           }

           const headers = {
               "Content-Type" : "application/json"
           };
           const token = localStorage.getItem("token");
           if (token) {
               headers["Authorization"] = `Bearer ${token}`;
           }

           const response = await fetch(`${BASEURL}/generate`, {
               body : JSON.stringify(fetchPayload),
               signal: abortController.signal,
               method : "POST",
               headers
           })

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const responseInJson = await response.json()

            // Update state tracking
            loadedRoadmapId = responseInJson._id || "";
            roadmapOwnerId = responseInJson.userId || "";

            const headerForkBtn = document.getElementById("headerForkBtn");
            if (headerForkBtn) headerForkBtn.classList.add("hidden");

            createAndRenderTimeline(responseInJson.timeline)

            enableHeaderButtons()

            lastRutaMessage.querySelector(".ruta-status .status p").innerText = "Finished Generating Timeline & Roadmap"

            const dot = lastRutaMessage.querySelector(".status .dot")

            dot.classList.add("done")
            
            generatedData = responseInJson.timeline

            lastRutaMessageId=""
            
        }
        catch(error){
            console.log(error)
            showTimelineError()
            disableHeaderButtons()
            lastRutaMessage.querySelector(".ruta-status .status p").innerText = "Error Generating Timeline & Roadmap"

            const dot = lastRutaMessage.querySelector(".status .dot")

            dot.classList.add("error")
            isError = true
            if (error.name === 'AbortError') {
                console.log('Fetch aborted');
            } else {
                console.error('Error fetching data:', error);
            }
        }
        finally{
            hideStopButton()
            isGenerating = false
            isLoading=false
        }
}

async function makeEditRequest(id, editInstruction) {
    timelineHeader.innerHTML = `<div class="fake-h1"></div>`
    timelineContainer.innerHTML = ""; // Clear existing content
    isGenerating = true
    isLoading = true
    showStopButton()
    let lastRutaMessage;
    showTimelineLoader()
    
    // Add adjusting bubble inside chat
    updateRutaUI({
        title: roadmapTitle,
        intro: "Adjusting your timeline with AI... Hang tight!"
    });
    lastRutaMessage = document.getElementById(lastRutaMessageId);

    try {
        const payload = { editInstruction };
        const headers = {
            "Content-Type" : "application/json"
        };
        const token = localStorage.getItem("token");
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`${BASEURL}/api/roadmaps/${id}/edit`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal: abortController.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const updatedRoadmap = await response.json();

        // Update state tracking
        loadedRoadmapId = updatedRoadmap._id;
        roadmapOwnerId = updatedRoadmap.userId;
        generatedData = updatedRoadmap.timeline;
        roadmapTitle = updatedRoadmap.title;

        // Toggle fork button status
        const headerForkBtn = document.getElementById("headerForkBtn");
        if (headerForkBtn) {
            const hasAuth = !!localStorage.getItem("token");
            const isOwner = hasAuth && currentUserId && (roadmapOwnerId === currentUserId);
            if (!isOwner) {
                headerForkBtn.classList.remove("hidden");
                headerForkBtn.classList.add("show-fork");
                headerForkBtn.onclick = () => handleForkRoadmap(loadedRoadmapId);
            } else {
                headerForkBtn.classList.add("hidden");
                headerForkBtn.classList.remove("show-fork");
            }
        }

        // Render refreshed timeline
        createAndRenderTimeline(updatedRoadmap.timeline);
        enableHeaderButtons();

        // Update chat bubble status
        lastRutaMessage.querySelector(".ruta-status .status p").innerText = "Refined Timeline Successfully";
        const dot = lastRutaMessage.querySelector(".status .dot");
        dot.classList.add("done");
        
        lastRutaMessageId = "";

    } catch (error) {
        console.error(error);
        showTimelineError();
        disableHeaderButtons();
        
        lastRutaMessage.querySelector(".ruta-status .status p").innerText = "Error Refining Timeline";
        const dot = lastRutaMessage.querySelector(".status .dot");
        dot.classList.add("error");
        
        isError = true;
    } finally {
        hideStopButton();
        isGenerating = false;
        isLoading = false;
    }
}

async function handleForkRoadmap(id) {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please log in or create an account to fork and customize roadmaps!");
        window.location.href = "./login.html";
        return;
    }

    try {
        const response = await fetch(`${BASEURL}/api/roadmaps/${id}/fork`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fork roadmap");
        }

        alert("Roadmap successfully forked! Redirecting to your dashboard...");
        window.location.href = "./dashboard.html";
    } catch (err) {
        console.error(err);
        alert("Error forking roadmap. Please try again.");
    }
}

async function refetch(userRequest){
    timelineHeader.innerHTML = `<div class="fake-h1"></div>`
    timelineContainer.innerHTML = ""; // Clear existing content
    isGenerating = true
    isLoading = true
    showStopButton()
    let lastRutaMessage;
    showTimelineLoader()
    try{
        const introObj =  await getHeadingAndIntroTextRetry(userRequest)
        
        if (!introObj || !introObj.title || !introObj.intro) {
            throw new Error("Invalid intro object received");
        }

        lastRutaMessage = document.getElementById(lastRutaMessageId)

        lastRutaMessage.querySelector(".ruta-status .status p").innerText = "Regenerating Timeline & Roadmap"

           timelineHeader.innerHTML = introObj.title

           roadmapTitle = introObj.title

           const fetchPayload = {
            todaysDate : new Date(),
            titleOfRoadmap : introObj.title,
            userRequest
           }

           const refetchHeaders = {
               "Content-Type" : "application/json"
           };
           const refetchToken = localStorage.getItem("token");
           if (refetchToken) {
               refetchHeaders["Authorization"] = `Bearer ${refetchToken}`;
           }

           const response = await fetch(`${BASEURL}/generate`, {
               body : JSON.stringify(fetchPayload),
               signal: abortController.signal,
               method : "POST",
               headers: refetchHeaders
           })

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const responseInJson = await response.json()

            createAndRenderTimeline(responseInJson.timeline)

            enableHeaderButtons()

            lastRutaMessage.querySelector(".ruta-status .status p").innerText = "Finished Generating Timeline & Roadmap"

            const dot = lastRutaMessage.querySelector(".status .dot")

            dot.classList.remove("error")
            dot.classList.add("done")
            
            generatedData = responseInJson.timeline
            
        }
        catch(error){
            console.log(error)
            showTimelineError()
            disableHeaderButtons()
            lastRutaMessage.querySelector(".ruta-status .status p").innerText = "Error Generating Timeline & Roadmap"

            const dot = lastRutaMessage.querySelector(".status .dot")

            dot.classList.remove("done")
            dot.classList.add("error")
            isError = true
            if (error.name === 'AbortError') {
                console.log('Fetch aborted');
            } else {
                console.error('Error fetching data:', error);
            }
        }
        finally{
            hideStopButton()
            isGenerating = false
            isLoading=false
            lastRutaMessageId=""
        }
}

async function getHeadingAndIntroText(userRequest){
    try{
        const introHeaders = {
            "Content-Type" : "application/json"
        };
        const introToken = localStorage.getItem("token");
        if (introToken) {
            introHeaders["Authorization"] = `Bearer ${introToken}`;
        }
        const response = await fetch(`${BASEURL}/get-intro-text`, {
            body : JSON.stringify({userRequest}),
            method : "POST",
            headers : introHeaders
        })

        if(!response.ok) {
            throw new Error("Seems like an error occurred while trying to generate your timeline. Please try again")
        }

        const responseInJson = await response.json()

        return responseInJson
    }
    catch(err){
        updateRutaUIWithError(err.message)
    }
}

async function getHeadingAndIntroTextRetry(userRequest){
    try{
        const retryHeaders = {
            "Content-Type" : "application/json"
        };
        const retryToken = localStorage.getItem("token");
        if (retryToken) {
            retryHeaders["Authorization"] = `Bearer ${retryToken}`;
        }
        const response = await fetch(`${BASEURL}/get-intro-text`, {
            body : JSON.stringify({userRequest}),
            method : "POST",
            headers : retryHeaders
        })

        if(!response.ok) {
            throw new Error("Seems like an error occurred while trying to generate your timeline. Please try again")
        }

        const responseInJson = await response.json()

        return responseInJson
    }
    catch(err){
        console.log(err)
    }
}

function exportToPDF() {
    toast.classList.remove("hidden")

    const element = document.getElementById("timeline-content");
  
    const opt = {
      margin:       0.5,
      filename:     `${roadmapTitle} - ${exportType}`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 }, // high-res
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
  
    html2pdf().set(opt).from(element).save();

    setTimeout(()=>{
        toast.classList.add("hidden")
    }, 1000)


}

function disableHeaderButtons(){
    timelineInnerHeader.classList.add("disabled")
}

function enableHeaderButtons(){
    timelineInnerHeader.classList.remove("disabled")
}

// =========================================================================
// STUDY SCHEDULER & CALENDAR SYNC ENGINE (Phase 5)
// =========================================================================

// State Tracking for calculated calendar dates
let calculatedDates = [];

// DOM Elements for Calendar Modal
const calendarModal = document.getElementById("calendarModal");
const syncCalBtn = document.getElementById("syncCalBtn");
const closeCalendarModalBtn = document.getElementById("closeCalendarModalBtn");
const calStartDate = document.getElementById("calStartDate");
const calStudyTime = document.getElementById("calStudyTime");
const calPacing = document.getElementById("calPacing");
const calDuration = document.getElementById("calDuration");
const btnCalcSchedule = document.getElementById("btnCalcSchedule");
const btnApplySchedule = document.getElementById("btnApplySchedule");
const btnDownloadIcal = document.getElementById("btnDownloadIcal");
const schedulePreviewBox = document.getElementById("schedulePreviewBox");
const schedulePreviewList = document.getElementById("schedulePreviewList");

// Set default start date to today's date (format YYYY-MM-DD)
if (calStartDate) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    calStartDate.value = `${yyyy}-${mm}-${dd}`;
}

// Modal open/close triggers
if (syncCalBtn) {
    syncCalBtn.addEventListener("click", () => {
        if (!generatedData || generatedData.length === 0) {
            alert("Please generate or load a roadmap first before scheduling!");
            return;
        }
        calendarModal.classList.remove("hidden");
    });
}

function closeCalendarModal() {
    if (calendarModal) {
        calendarModal.classList.add("hidden");
        // Reset preview state
        schedulePreviewBox.classList.add("hidden");
        schedulePreviewList.innerHTML = "";
        btnApplySchedule.disabled = true;
        btnDownloadIcal.disabled = true;
        calculatedDates = [];
    }
}

if (closeCalendarModalBtn) {
    closeCalendarModalBtn.addEventListener("click", closeCalendarModal);
}

if (calendarModal) {
    calendarModal.addEventListener("click", (e) => {
        if (e.target === calendarModal) {
            closeCalendarModal();
        }
    });
}

// Smart Pacing Date Calculator Engine
function calculateStudyDates(startDateVal, pacingVal, milestonesCount) {
    const dates = [];
    let current = new Date(startDateVal + "T00:00:00"); // Ensure local timezone parsing

    for (let i = 0; i < milestonesCount; i++) {
        // Adjust date depending on pacing rules
        if (pacingVal === "weekdays") {
            // If Saturday, move to Monday
            if (current.getDay() === 6) current.setDate(current.getDate() + 2);
            // If Sunday, move to Monday
            else if (current.getDay() === 0) current.setDate(current.getDate() + 1);
        } else if (pacingVal === "weekends") {
            // If weekday (Mon-Fri), move to upcoming Saturday
            const day = current.getDay();
            if (day >= 1 && day <= 5) {
                current.setDate(current.getDate() + (6 - day));
            }
        } else if (pacingVal === "alternating") {
            // Alternating Mon, Wed, Fri
            const day = current.getDay();
            if (day === 0) { // Sunday -> Mon
                current.setDate(current.getDate() + 1);
            } else if (day === 2) { // Tuesday -> Wed
                current.setDate(current.getDate() + 1);
            } else if (day === 4) { // Thursday -> Fri
                current.setDate(current.getDate() + 1);
            } else if (day === 6) { // Saturday -> Mon
                current.setDate(current.getDate() + 2);
            }
        }

        // Add the cloned calculated date to the list
        dates.push(new Date(current));

        // Advance current pointer for next iteration
        if (pacingVal === "weekends") {
            // In weekends mode: if Saturday, next is Sunday. If Sunday, next is Saturday.
            if (current.getDay() === 6) {
                current.setDate(current.getDate() + 1);
            } else {
                current.setDate(current.getDate() + 6); // Sunday -> Saturday
            }
        } else if (pacingVal === "alternating") {
            // Alternate pointer step
            const day = current.getDay();
            if (day === 1) current.setDate(current.getDate() + 2); // Mon -> Wed
            else if (day === 3) current.setDate(current.getDate() + 2); // Wed -> Fri
            else if (day === 5) current.setDate(current.getDate() + 3); // Fri -> Mon
        } else {
            // Consecutive Days (daily) or Weekdays (next pointer day)
            current.setDate(current.getDate() + 1);
        }
    }

    return dates;
}

// Format date nicely (e.g. "Monday, Jun 1st, 2026")
function formatCalendarDate(dateObj) {
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    return dateObj.toLocaleDateString('en-US', options);
}

// Calculate Schedule and Render Pacing Preview
if (btnCalcSchedule) {
    btnCalcSchedule.addEventListener("click", () => {
        const startDateVal = calStartDate.value;
        const pacingVal = calPacing.value;
        
        if (!startDateVal) {
            alert("Please pick a valid start date.");
            return;
        }

        calculatedDates = calculateStudyDates(startDateVal, pacingVal, generatedData.length);
        
        // Render Preview list inside modal card
        schedulePreviewList.innerHTML = generatedData.map((milestone, idx) => {
            const dateStr = formatCalendarDate(calculatedDates[idx]);
            return `
                <div class="preview-item">
                    <span class="p-day">${milestone.day}</span>
                    <span class="p-title">${milestone.title}</span>
                    <span class="p-date">${dateStr}</span>
                </div>
            `;
        }).join("");

        // Show preview container and enable actions
        schedulePreviewBox.classList.remove("hidden");
        btnApplySchedule.disabled = false;
        btnDownloadIcal.disabled = false;
    });
}

// Universal ICS (iCalendar) Exporter
if (btnDownloadIcal) {
    btnDownloadIcal.addEventListener("click", () => {
        if (calculatedDates.length === 0) return;

        const timeVal = calStudyTime.value || "09:00";
        const durationMins = parseInt(calDuration.value) || 60;
        
        // Helper to format ISO dates YYYYMMDDTHHMMSS
        function formatICSDateTime(dateObj, timeStr, offsetMins = 0) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            
            const [hours, minutes] = timeStr.split(':').map(Number);
            const eventDate = new Date(year, dateObj.getMonth(), dateObj.getDate(), hours, minutes);
            
            if (offsetMins !== 0) {
                eventDate.setMinutes(eventDate.getMinutes() + offsetMins);
            }
            
            const y = eventDate.getFullYear();
            const m = String(eventDate.getMonth() + 1).padStart(2, '0');
            const d = String(eventDate.getDate()).padStart(2, '0');
            const hh = String(eventDate.getHours()).padStart(2, '0');
            const mm = String(eventDate.getMinutes()).padStart(2, '0');
            
            return `${y}${m}${d}T${hh}${mm}00`;
        }

        let icsContent = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Ruta AI//Study Scheduler//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH"
        ];

        generatedData.forEach((milestone, idx) => {
            const dateObj = calculatedDates[idx];
            const dtStart = formatICSDateTime(dateObj, timeVal);
            const dtEnd = formatICSDateTime(dateObj, timeVal, durationMins);
            const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
            
            // Collect resources links
            let resourcesStr = "";
            if (milestone.resources && milestone.resources.length > 0) {
                resourcesStr = "\\n\\nCurated Resources:\\n" + milestone.resources.map(res => `- ${res.title}: ${res.url}`).join("\\n");
            }

            const cleanDescription = (milestone.description + resourcesStr).replace(/,/g, "\\,").replace(/\n/g, "\\n");
            const cleanSummary = `[Ruta AI] ${milestone.day}: ${milestone.title}`.replace(/,/g, "\\,");

            icsContent = icsContent.concat([
                "BEGIN:VEVENT",
                `UID:milestone_${idx}_${Date.now()}@ruta.ai`,
                `DTSTAMP:${stamp}`,
                `DTSTART:${dtStart}`,
                `DTEND:${dtEnd}`,
                `SUMMARY:${cleanSummary}`,
                `DESCRIPTION:${cleanDescription}`,
                "END:VEVENT"
            ]);
        });

        icsContent.push("END:VCALENDAR");

        const icsString = icsContent.join("\r\n");
        const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.download = `${roadmapTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_schedule.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
}

// Apply Calculated Schedule to Roadmap Local State
if (btnApplySchedule) {
    btnApplySchedule.addEventListener("click", () => {
        if (calculatedDates.length === 0) return;

        if (!hasUnsavedChanges) {
            originalGeneratedData = JSON.parse(JSON.stringify(generatedData));
        }

        generatedData.forEach((milestone, idx) => {
            const formattedDate = formatCalendarDate(calculatedDates[idx]);
            generatedData[idx].date_range = formattedDate;
        });

        hasUnsavedChanges = true;
        showFloatingSaveBar();

        if (timelineToggleButton.classList.contains("active")) {
            createAndRenderTimeline(generatedData);
        } else {
            createAndRenderNodes(generatedData);
        }

        // Close modal and alert success
        closeCalendarModal();
        alert("Smart schedule successfully applied to your active roadmap timeline!");
    });
}