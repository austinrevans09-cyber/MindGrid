
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

        // Identify the logged-in user.

        const { data: userData, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError || !userData.user) {
            window.location.replace("login.html");
            return;
        }

        const userId = userData.user.id;


        // Retrieve this user's sessions.

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


        // Display all statistics.

        displayOverview(sessions);
        displayPersonalBests(sessions);
        displayAccuracyChart(sessions);
        displayDifficultyBreakdown(sessions);
        displayGameBreakdown(sessions);
        displayReactionBreakdown(sessions);
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


    // Calculate weighted average reaction time.

    const validSessions = sessions.filter(session =>
        session.average_response_ms != null &&
        session.average_response_ms > 0 &&
        session.total_rounds > 0
    );

    const reactionRounds = validSessions.reduce(
        (total, session) => total + session.total_rounds,
        0
    );

    const totalResponseTime = validSessions.reduce(
        (total, session) =>
            total + (session.average_response_ms * session.total_rounds),
        0
    );

    const averageReaction = reactionRounds > 0
        ? totalResponseTime / reactionRounds
        : null;


    document.getElementById("games-played").textContent =
        totalGames;

    document.getElementById("rounds-played").textContent =
        totalRounds;

    document.getElementById("overall-accuracy").textContent =
        totalRounds > 0
            ? overallAccuracy.toFixed(1) + "%"
            : "—";

    document.getElementById("average-reaction").textContent =
        averageReaction !== null
            ? formatReactionTime(averageReaction)
            : "—";

}


// ============================================
// PERSONAL BESTS
// ============================================

function displayPersonalBests(sessions) {

    if (sessions.length === 0) {

        document.getElementById("highest-score").textContent = "—";
        document.getElementById("best-accuracy").textContent = "—";
        document.getElementById("best-streak").textContent = "0";
        document.getElementById("fastest-reaction").textContent = "—";

        return;

    }


    // Highest score.

    const highestScore = Math.max(
        ...sessions.map(session => Number(session.score) || 0)
    );


    // Best accuracy in a single session.

    const bestAccuracy = Math.max(
        ...sessions.map(session => Number(session.accuracy) || 0)
    );


    // Longest correct-answer streak.

    const bestStreak = Math.max(
        ...sessions.map(session => Number(session.best_streak) || 0)
    );


    // Fastest average response time in a session.

    const validReactionTimes = sessions
        .filter(session =>
            session.average_response_ms != null &&
            session.average_response_ms > 0
        )
        .map(session => Number(session.average_response_ms));

    const fastestReaction = validReactionTimes.length > 0
        ? Math.min(...validReactionTimes)
        : null;


    document.getElementById("highest-score").textContent =
        highestScore;

    document.getElementById("best-accuracy").textContent =
        bestAccuracy.toFixed(1) + "%";

    document.getElementById("best-streak").textContent =
        bestStreak;

    document.getElementById("fastest-reaction").textContent =
        fastestReaction !== null
            ? formatReactionTime(fastestReaction)
            : "—";

}


// ============================================
// REACTION TIME FORMATTING
// ============================================

function formatReactionTime(milliseconds) {

    if (milliseconds < 1000) {
        return Math.round(milliseconds) + " ms";
    }

    return (milliseconds / 1000).toFixed(2) + " s";

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


    // Show the most recent 20 sessions.

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
// DIFFICULTY BREAKDOWN
// ============================================

function displayDifficultyBreakdown(sessions) {

    const container =
        document.getElementById("difficulty-breakdown");

    const difficulties = ["Easy", "Normal", "Hard"];

    const grouped = {};

    difficulties.forEach(difficulty => {

        grouped[difficulty] = {
            sessions: 0,
            rounds: 0,
            correct: 0
        };

    });


    // Group sessions by difficulty.

    sessions.forEach(session => {

        const difficulty = String(session.difficulty || "")
            .trim()
            .toLowerCase();

        const matchingDifficulty = difficulties.find(item =>
            item.toLowerCase() === difficulty
        );

        if (!matchingDifficulty) {
            return;
        }

        const data = grouped[matchingDifficulty];

        data.sessions++;
        data.rounds += Number(session.total_rounds) || 0;
        data.correct += Number(session.correct_answers) || 0;

    });


    container.innerHTML = "";


    difficulties.forEach(difficulty => {

        const data = grouped[difficulty];

        const accuracy = data.rounds > 0
            ? (data.correct / data.rounds) * 100
            : null;

        const card = document.createElement("div");
        card.className = "difficulty-card";

        const heading = document.createElement("h3");
        heading.textContent = difficulty;

        const accuracyElement = document.createElement("div");
        accuracyElement.className = "difficulty-accuracy";

        accuracyElement.textContent = accuracy !== null
            ? accuracy.toFixed(1) + "%"
            : "—";


        const detail = document.createElement("div");
        detail.className = "difficulty-detail";

        detail.textContent =
            data.sessions + " sessions · " +
            data.rounds + " rounds";


        card.appendChild(heading);
        card.appendChild(accuracyElement);
        card.appendChild(detail);

        container.appendChild(card);

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
        games[name].rounds += Number(session.total_rounds) || 0;
        games[name].correct += Number(session.correct_answers) || 0;

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
// REACTION TIME BY GAME
// ============================================

function displayReactionBreakdown(sessions) {

    const container =
        document.getElementById("reaction-breakdown");

    const games = {};


    // Group reaction times by game.

    sessions.forEach(session => {

        const name = session.game_name;
        const reaction = Number(session.average_response_ms);
        const rounds = Number(session.total_rounds) || 0;

        if (!name || !Number.isFinite(reaction) ||
            reaction <= 0 || rounds <= 0) {
            return;
        }

        if (!games[name]) {

            games[name] = {
                totalTime: 0,
                totalRounds: 0
            };

        }

        games[name].totalTime += reaction * rounds;
        games[name].totalRounds += rounds;

    });


    container.innerHTML = "";

    const gameNames = Object.keys(games);

    if (gameNames.length === 0) {

        container.innerHTML =
            '<p class="empty-message">No reaction time data available yet.</p>';

        return;

    }


    gameNames.forEach(name => {

        const data = games[name];

        const average =
            data.totalTime / data.totalRounds;

        const item = document.createElement("div");
        item.className = "reaction-item";

        const gameName = document.createElement("div");
        gameName.className = "reaction-name";
        gameName.textContent = name;

        const reactionValue = document.createElement("div");
        reactionValue.className = "reaction-value";
        reactionValue.textContent = formatReactionTime(average);

        item.appendChild(gameName);
        item.appendChild(reactionValue);

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
                <td colspan="6">No games completed yet.</td>
            </tr>
        `;

        return;

    }


    // Show the 10 most recent sessions.

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

            session.average_response_ms != null
                ? formatReactionTime(Number(session.average_response_ms))
                : "—",

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
