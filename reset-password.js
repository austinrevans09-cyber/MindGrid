
const passwordForm = document.getElementById("password-form");
const authMessage = document.getElementById("auth-message");
const saveButton = document.getElementById("save-button");

async function checkSession() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data.session) {
        authMessage.textContent =
            "Your password link is invalid or has expired. Please request another one.";
        passwordForm.style.display = "none";
    }
}

checkSession();

passwordForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const password = document.getElementById("password").value;
    const confirmation =
        document.getElementById("confirm-password").value;

    if (password !== confirmation) {
        authMessage.textContent = "Your passwords do not match.";
        return;
    }

    if (password.length < 8) {
        authMessage.textContent =
            "Your password must be at least 8 characters.";
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const { error } = await supabaseClient.auth.updateUser({
        password: password
    });

    if (error) {
        authMessage.textContent = error.message;
        saveButton.disabled = false;
        saveButton.textContent = "Set password";
        return;
    }

    authMessage.style.color = "#8be0b0";
    authMessage.textContent =
        "Password successfully created! Redirecting to login...";

    await supabaseClient.auth.signOut();

    setTimeout(function() {
        window.location.href = "login.html";
    }, 2000);
});
