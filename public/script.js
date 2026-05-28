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
            if (loginLink) loginLink.style.display = "none";
            if (userProfile) userProfile.classList.remove("hidden");
            if (userNameDisplay) userNameDisplay.textContent = userData.name;
            if (userAvatar) userAvatar.textContent = userData.name.charAt(0).toUpperCase();
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
});
let isGenerating = false
let isLoading = false
let isError = false
let exportType = ""
let roadmapTitle = ""
let generatedData = []
let lastRutaMessageId = ""


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
    makeFetchRequest(userMessage)
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

function createAndRenderTimeline(timelineArray = []) {
    timelineContainer.innerHTML = ""; // Clear existing content
    timelineArray.forEach(item => {
        const timelineItem = document.createElement("article");
        timelineItem.classList.add("single-timeline-info");

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
            <div style="background-color:${item.emojiDominantColor}; border:1px solid ${item.emojiDominantDarkerColor};" class="circle">${item.emoji}</div>
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
}
  
function hideWelcomeMessages(){
    welcomeMessage.style.display = "none"
    testSkillsContainer.style.display = "none"
}

function createAndRenderNodes(timelineArray=[]){
    timelineArray.forEach((milestone, index) => {
  const node = document.createElement("div");
  node.classList.add("timeline-node");
  node.id = `node-${index}`;
  node.innerHTML = `
        <div class="top">
              <h1>${milestone.day}</h1>
            </div>

            <p>${milestone.title}</p>
  `;
  timelineContainer.appendChild(node);
});
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