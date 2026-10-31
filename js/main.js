
// MindGrid - Main JavaScript

console.log("MindGrid successfully loaded!");
// Check whether the user is logged in
async function checkAuthentication() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data.session) {
        window.location.replace("login.html");
    }
}

checkAuthentication();
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

        try {
            const { error } = await supabaseClient.auth.signOut({
                scope: "local"
            });

            if (error) {
                throw error;
            }

            window.location.replace(
                "https://austinrevans09-cyber.github.io/MindGrid/login.html"
            );

        } catch (error) {
            console.error("Logout error:", error);

            alert("Logout failed: " + error.message);

            logoutButton.disabled = false;
            logoutButton.textContent = "Log out";
        }
    });
}
