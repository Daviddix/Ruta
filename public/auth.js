// Determine API Base URL dynamically
const BASEURL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://localhost:3000" 
    : "https://ruta.up.railway.app";

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const errorBanner = document.getElementById('errorBanner');
const submitBtn = document.getElementById('submitBtn');
const btnSpinner = document.getElementById('btnSpinner');
const btnText = document.getElementById('btnText');

// Show error helper
function showError(message) {
    if (!errorBanner) return;
    errorBanner.innerText = message;
    errorBanner.style.display = 'flex';
}

// Hide error helper
function hideError() {
    if (!errorBanner) return;
    errorBanner.style.display = 'none';
}

// Toggle loading state
function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    if (isLoading) {
        if (btnSpinner) btnSpinner.style.display = 'block';
        if (btnText) btnText.style.opacity = '0.5';
    } else {
        if (btnSpinner) btnSpinner.style.display = 'none';
        if (btnText) btnText.style.opacity = '1';
    }
}

// Handle Login Form Submission
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();
        setLoading(true);

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${BASEURL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || 'Failed to authenticate');
            }

            // Save token
            localStorage.setItem('token', data.token);
            
            // Redirect back to main dashboard
            window.location.href = './index.html';
        } catch (err) {
            console.error(err);
            showError(err.message);
        } finally {
            setLoading(false);
        }
    });
}

// Handle Signup Form Submission
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();
        setLoading(true);

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${BASEURL}/api/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || 'Registration failed');
            }

            // Save token
            localStorage.setItem('token', data.token);

            // Redirect back to main dashboard
            window.location.href = './index.html';
        } catch (err) {
            console.error(err);
            showError(err.message);
        } finally {
            setLoading(false);
        }
    });
}
