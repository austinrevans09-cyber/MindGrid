
// MindGrid - Main JavaScript

console.log("MindGrid successfully loaded!");

// We will add the following here later:
// - Supabase connection
// - User authentication
// - Dashboard functionality
// - Game statistics
// - Navigation controls
const logoutButton = document.getElementById("logout-button");

if (logoutButton) {
    logoutButton.addEventListener("click", async function() {
        logoutButton.disabled = true;
        logoutButton.textContent = "Logging out...";

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            alert("Unable to log out: " + error.message);
            logoutButton.disabled = false;
            logoutButton.textContent = "Log out";
            return;
        }

        window.location.href = "login.html";
    });
}
