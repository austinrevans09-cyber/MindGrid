// ============================================
// MINDGRID - SHARED GAME FUNCTIONS
// Authentication and statistics storage
// ============================================


// ============================================
// CHECK GAME AUTHENTICATION
// ============================================

async function checkGameAuthentication() {

    const loadingScreen =
        document.getElementById("auth-loading");

    try {

        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error || !data.session) {

            window.location.replace("../login.html");
            return false;

        }

        // User is authenticated.
        // Remove the loading screen.

        if (loadingScreen) {
            loadingScreen.remove();
        }

        return true;

    } catch (error) {

        console.error("Authentication error:", error);

        window.location.replace("../login.html");

        return false;

    }

}


// ============================================
// SAVE GAME SESSION AND ROUND RESULTS
// ============================================

async function saveGameSession(gameData) {

    try {

        // Get the currently logged-in user.

        const { data: userData, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError || !userData.user) {
            throw new Error("Could not identify the logged-in user.");
        }

        const userId = userData.user.id;


        // Calculate overall statistics.

        const accuracy = gameData.totalRounds > 0
            ? (gameData.correctAnswers / gameData.totalRounds) * 100
            : 0;


        // Create the main game session record.

        const sessionRecord = {

            user_id: userId,

            game_name: gameData.gameName,

            mode: gameData.mode,

            difficulty: gameData.difficulty,

            total_rounds: gameData.totalRounds,

            correct_answers: gameData.correctAnswers,

            score: gameData.score,

            accuracy: Number(accuracy.toFixed(2)),

            average_response_ms: Math.round(
                gameData.averageResponseTime * 1000
            ),

            best_streak: gameData.bestStreak,

            duration_seconds: gameData.durationSeconds

        };


        // Insert the session into Supabase.

        const { data: sessionData, error: sessionError } =
            await supabaseClient
                .from("game_sessions")
                .insert(sessionRecord)
                .select("id")
                .single();


        if (sessionError) {
            throw sessionError;
        }


        const sessionId = sessionData.id;


        // Prepare individual round records.

        const roundRecords = gameData.rounds.map((round, index) => {

            return {

                session_id: sessionId,

                round_number: index + 1,

                symbols: round.symbols,

                prediction: round.prediction,

                actual_outcome: round.outcome,

                is_correct: round.correct,

                response_time_ms: Math.round(
                    round.responseTime * 1000
                ),

                timed_out: round.prediction === "timeout"

            };

        });


        // Insert all round records.

        if (roundRecords.length > 0) {

            const { error: roundsError } =
                await supabaseClient
                    .from("game_rounds")
                    .insert(roundRecords);

            if (roundsError) {
                throw roundsError;
            }

        }


        console.log("MindGrid: Game results saved successfully.");

        return {
            success: true,
            sessionId: sessionId
        };


    } catch (error) {

        console.error("MindGrid: Could not save game results:", error);

        return {
            success: false,
            error: error.message
        };

    }

}
