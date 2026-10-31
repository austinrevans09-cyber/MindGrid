
const loginForm = document.getElementById("login-form");
const authMessage = document.getElementById("auth-message");
const loginButton = document.getElementById("login-button");

async function checkExistingLogin() {
    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
        window.location.href = "index.html";
    }
}

checkExistingLogin();

loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    authMessage.textContent = "";
    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

    if (error) {
        authMessage.textContent = error.message;
        loginButton.disabled = false;
        loginButton.textContent = "Sign in";
        return;
    }

    window.location.href = "index.html";
});

document.getElementById("forgot-password")
    .addEventListener("click", async function() {

        const email = document.getElementById("email").value;

        if (!email) {
            authMessage.textContent =
                "Enter your email address first.";
            return;
        }

        const { error } =
            await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin +
                    window.location.pathname.replace(
                        "login.html",
                        "reset-password.html"
                    )
            });

        if (error) {
            authMessage.textContent = error.message;
        } else {
            authMessage.style.color = "#8be0b0";
            authMessage.textContent =
                "If the account exists, a password reset email will be sent.";
        }
    });
