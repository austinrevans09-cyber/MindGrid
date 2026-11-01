
// ============================================
// MINDGRID - STATISTICS PAGE
// ============================================

let accuracyChart = null;


// ============================================
// LOAD USER STATISTICS
// ============================================

async function loadStatistics() {

    const loadingScreen = document.getElementById("auth-loading");
    const errorMessage = document.getElementById("stats-error");

    try {

        // Check the current login.

        const { data: userData, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError || !userData.user) {
            window.location.replace("login.html");
            return;
        }

        const userId = userData.user.id;


        // Retrieve this user's game sessions.

        const { data: sessions, error: sessionsError } =
            await supabaseClient
                .from("game_sessions")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: true });


        if (sessionsError) {
            throw sessionsError;
        }


        // Remove the loading screen.

        if (loadingScreen) {
            loadingScreen.remove();
        }


        // Display the statistics.

        displayOverview(sessions);
        displayAccuracyChart(sessions);
        displayGameBreakdown(sessions);
        displayRecentSessions(sessions);


    } catch (error) {

        console.error("Could not load statistics:", error);

        if (loadingScreen) {
            loadingScreen.remove();
        }

        errorMessage.textContent =
            "We couldn't load your statistics. " + error.message;

    }

}


// ============================================
// OVERVIEW STATISTICS
// ============================================

function displayOverview(sessions) {

    const totalGames = sessions.length;

    const totalRounds = sessions.reduce(
        (total, session) => total + (session.total_rounds || 0),
        0
    );

    const totalCorrect = sessions.reduce(
        (total, session) => total + (session.correct_answers || 0),
        0
    );

    const overallAccuracy = totalRounds > 0
        ? (totalCorrect / totalRounds) * 100
        : 0;

    const bestStreak = sessions.reduce(
        (best, session) => Math.max(best, session.best_streak || 0),
        0
    );


    document.getElementById("games-played").textContent =
        totalGames;

    document.getElementById("rounds-played").textContent =
        totalRounds;

    document.getElementById("overall-accuracy").textContent =
        totalRounds > 0
            ? overallAccuracy.toFixed(1) + "%"
            : "—";

    document.getElementById("best-streak").textContent =
        bestStreak;

}


// ============================================
// ACCURACY CHART
// ============================================

function displayAccuracyChart(sessions) {

    const canvas = document.getElementById("accuracy-chart");
    const emptyMessage = document.getElementById("chart-empty");

    if (sessions.length === 0) {
        canvas.style.display = "none";
        emptyMessage.style.display = "block";
        return;
    }

    emptyMessage.style.display = "none";
    canvas.style.display = "block";


    // Only show the most recent 20 sessions.

    const recentSessions = sessions.slice(-20);

    const labels = recentSessions.map((session, index) => {

        return "Game " + (index + 1);

    });

    const accuracyValues = recentSessions.map(session => {

        return Number(session.accuracy || 0);

    });


    const context = canvas.getContext("2d");

    if (accuracyChart) {
        accuracyChart.destroy();
    }

    accuracyChart = new Chart(context, {

        type: "line",

        data: {

            labels: labels,

            datasets: [{

                label: "Accuracy",

                data: accuracyValues,

                borderColor: "#a78bfa",

                backgroundColor: "rgba(167, 139, 250, 0.15)",

                borderWidth: 3,

                fill: true,

                tension: 0.35,

                pointRadius: 4,

                pointBackgroundColor: "#a78bfa"

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            scales: {

                y: {

                    min: 0,

                    max: 100,

                    ticks: {
                        color: "#9ca3af",
                        callback: value => value + "%"
                    },

                    grid: {
                        color: "#29364c"
                    }

                },

                x: {

                    ticks: {
                        color: "#9ca3af"
                    },

                    grid: {
                        display: false
                    }

                }

            },

            plugins: {

                legend: {
                    display: false
                }

            }

        }

    });

}


// ============================================
// GAME BREAKDOWN
// ============================================

function displayGameBreakdown(sessions) {

    const container = document.getElementById("game-breakdown");

    if (sessions.length === 0) {

        container.innerHTML =
            '<p class="empty-message">You have not completed any games yet.</p>';

        return;

    }


    // Group sessions by game name.

    const games = {};

    sessions.forEach(session => {

        const name = session.game_name;

        if (!games[name]) {

            games[name] = {
                sessions: 0,
                rounds: 0,
                correct: 0
            };

        }

        games[name].sessions++;
        games[name].rounds += session.total_rounds || 0;
        games[name].correct += session.correct_answers || 0;

    });


    container.innerHTML = "";


    Object.entries(games).forEach(([name, data]) => {

        const accuracy = data.rounds > 0
            ? (data.correct / data.rounds) * 100
            : 0;

        const item = document.createElement("div");
        item.className = "breakdown-item";

        const gameName = document.createElement("div");
        gameName.className = "breakdown-name";
        gameName.textContent = name;

        const detail = document.createElement("div");
        detail.className = "breakdown-detail";

        detail.textContent =
            data.sessions + " sessions · " +
            accuracy.toFixed(1) + "% accuracy";

        const track = document.createElement("div");
        track.className = "progress-track";

        const fill = document.createElement("div");
        fill.className = "progress-fill";

        fill.style.width = accuracy + "%";

        track.appendChild(fill);

        item.appendChild(gameName);
        item.appendChild(detail);
        item.appendChild(track);

        container.appendChild(item);

    });

}


// ============================================
// RECENT SESSIONS
// ============================================

function displayRecentSessions(sessions) {

    const container = document.getElementById("sessions-list");

    if (sessions.length === 0) {

        container.innerHTML = `
            <tr>
                <td colspan="5">No games completed yet.</td>
            </tr>
        `;

        return;

    }


    // Show newest sessions first.

    const recentSessions = [...sessions].reverse().slice(0, 10);

    container.innerHTML = "";


    recentSessions.forEach(session => {

        const row = document.createElement("tr");

        const date = session.created_at
            ? new Date(session.created_at).toLocaleDateString("en-GB")
            : "Unknown";


        const values = [

            session.game_name,

            session.difficulty,

            session.score,

            Number(session.accuracy || 0).toFixed(1) + "%",

            date

        ];


        values.forEach(value => {

            const cell = document.createElement("td");

            cell.textContent = value ?? "—";

            row.appendChild(cell);

        });


        container.appendChild(row);

    });

}


// ============================================
// START
// ============================================

loadStatistics();
