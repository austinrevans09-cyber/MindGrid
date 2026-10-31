// ============================================
// MINDGRID - DAY & NIGHT VERSION 3
// Randomised probability-learning game
// ============================================

// ELEMENTS

const setupScreen = document.getElementById("setup-screen");
const playingScreen = document.getElementById("playing-screen");
const resultsScreen = document.getElementById("results-screen");

const startButton = document.getElementById("start-game");
const nextButton = document.getElementById("next-round");
const retryButton = document.getElementById("retry-game");

const dayButton = document.getElementById("predict-day");
const nightButton = document.getElementById("predict-night");


// GAME CONFIGURATION

const difficultySettings = {
    easy: {
        combinations: 8,
        timeLimit: 8,
        minProbability: 0.12,
        maxProbability: 0.88
    },
    normal: {
        combinations: 10,
        timeLimit: 5,
        minProbability: 0.20,
        maxProbability: 0.80
    },
    hard: {
        combinations: 12,
        timeLimit: 3,
        minProbability: 0.35,
        maxProbability: 0.65
    }
};


// SYMBOL LIBRARY

const symbolLibrary = [
    "☀", "☾", "★", "◆",
    "●", "▲", "✦", "■",
    "♣", "♦", "✚", "⬟"
];


// GAME VARIABLES

let selectedMode = "learning";
let selectedDifficulty = "normal";

let totalRounds = 20;
let currentRound = 0;

let combinations = [];
let roundDeck = [];

let currentCombination;
let currentOutcome;

let score = 0;
let correct = 0;
let incorrect = 0;

let streak = 0;
let bestStreak = 0;

let answered = false;

let startTime = 0;
let roundStartTime = 0;

let totalResponseTime = 0;

let timerInterval = null;
let countdownInterval = null;

let roundResults = [];
let combinationStats = {};

let soundEnabled = true;


// ============================================
// RANDOM NUMBER HELPERS
// ============================================

function randomNumber(min, max) {
    return Math.random() * (max - min) + min;
}


function shuffleArray(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] =
            [shuffled[j], shuffled[i]];
    }

    return shuffled;
}


// ============================================
// GENERATE RANDOM COMBINATIONS
// ============================================

function generateCombinations() {
    combinations = [];
    combinationStats = {};

    const settings =
        difficultySettings[selectedDifficulty];

    const possiblePairs = [];

    for (let i = 0; i < symbolLibrary.length; i++) {
        for (let j = i + 1; j < symbolLibrary.length; j++) {
            possiblePairs.push({
                symbolOne: symbolLibrary[i],
                symbolTwo: symbolLibrary[j]
            });
        }
    }

    const shuffledPairs = shuffleArray(possiblePairs);

    const selectedPairs =
        shuffledPairs.slice(0, settings.combinations);

    selectedPairs.forEach((pair, index) => {
        const probability = randomNumber(
            settings.minProbability,
            settings.maxProbability
        );

        const combination = {
            id: index + 1,
            name: "Combination " + (index + 1),
            symbolOne: pair.symbolOne,
            symbolTwo: pair.symbolTwo,
            dayProbability: Number(probability.toFixed(2))
        };

        combinations.push(combination);

        combinationStats[combination.name] = {
            attempts: 0,
            correct: 0,
            dayAttempts: 0,
            nightAttempts: 0,
            dayCorrect: 0,
            nightCorrect: 0,
            totalResponseTime: 0
        };
    });
}


// ============================================
// ROUND DECK
// ============================================

function createRoundDeck() {
    roundDeck = shuffleArray(combinations);
}


function selectNextCombination() {
    if (roundDeck.length === 0) {
        createRoundDeck();
    }

    return roundDeck.pop();
}


// ============================================
// SOUND EFFECTS
// ============================================

function playSound(type) {
    if (!soundEnabled) return;

    const AudioContext =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) return;

    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.connect(gain);
    gain.connect(context.destination);

    if (type === "correct") {
        oscillator.frequency.value = 650;
    } else if (type === "incorrect") {
        oscillator.frequency.value = 220;
    } else {
        oscillator.frequency.value = 440;
    }

    oscillator.type = "sine";

    gain.gain.setValueAtTime(0.12, context.currentTime);

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.2
    );

    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);

    oscillator.onended = () => context.close();
}


// ============================================
// MODE SELECTION
// ============================================

document.querySelectorAll(".mode-card").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".mode-card").forEach(card => {
            card.classList.remove("selected");
        });

        button.classList.add("selected");
        selectedMode = button.dataset.mode;
    });
});


// ============================================
// SOUND SETTING
// ============================================

document.getElementById("sound-enabled")
    .addEventListener("change", event => {
        soundEnabled = event.target.checked;
    });


// ============================================
// START GAME
// ============================================

startButton.addEventListener("click", startGame);


function startGame() {
    clearInterval(timerInterval);
    clearInterval(countdownInterval);

    totalRounds = Number(
        document.getElementById("round-count").value
    );

    selectedDifficulty =
        document.getElementById("difficulty").value;

    currentRound = 0;

    score = 0;
    correct = 0;
    incorrect = 0;

    streak = 0;
    bestStreak = 0;

    totalResponseTime = 0;
    roundResults = [];
    answered = false;

    generateCombinations();
    createRoundDeck();

    setupScreen.classList.add("hidden");
    resultsScreen.classList.add("hidden");
    playingScreen.classList.remove("hidden");

    document.getElementById("mode-title").textContent =
        selectedMode.charAt(0).toUpperCase() +
        selectedMode.slice(1) + " Mode";

    startTime = Date.now();

    updateSessionTimer();

    timerInterval = setInterval(updateSessionTimer, 250);

    startNextRound();
}


// ============================================
// SESSION TIMER
// ============================================

function updateSessionTimer() {
    const elapsed = Math.floor(
        (Date.now() - startTime) / 1000
    );

    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    document.getElementById("timer").textContent =
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0") + " elapsed";
}


// ============================================
// START NEXT ROUND
// ============================================

function startNextRound() {
    clearInterval(countdownInterval);

    if (currentRound >= totalRounds) {
        endGame();
        return;
    }

    currentRound++;
    answered = false;

    document.getElementById("feedback").classList.add("hidden");

    dayButton.disabled = false;
    nightButton.disabled = false;

    document.getElementById("score").textContent = score;

    document.getElementById("round-number").textContent =
        `ROUND ${currentRound} / ${totalRounds}`;

    document.getElementById("progress-bar").style.width =
        `${((currentRound - 1) / totalRounds) * 100}%`;

    // Select a combination using the shuffled deck.

    currentCombination = selectNextCombination();

    // Generate the actual outcome independently.

    currentOutcome =
        Math.random() < currentCombination.dayProbability
            ? "day"
            : "night";

    // Randomise symbol display order.

    const reversed = Math.random() < 0.5;

    document.getElementById("symbol-one").textContent =
        reversed
            ? currentCombination.symbolTwo
            : currentCombination.symbolOne;

    document.getElementById("symbol-two").textContent =
        reversed
            ? currentCombination.symbolOne
            : currentCombination.symbolTwo;

    document.getElementById("combination-name").textContent =
        currentCombination.name;

    // Probability information.

    const probabilityBox =
        document.getElementById("probability-information");

    if (selectedMode === "learning") {
        probabilityBox.classList.remove("hidden");

        const dayChance =
            Math.round(currentCombination.dayProbability * 100);

        const nightChance = 100 - dayChance;

        document.getElementById("day-probability").textContent =
            dayChance + "%";

        document.getElementById("night-probability").textContent =
            nightChance + "%";
    } else {
        probabilityBox.classList.add("hidden");
    }

    // Instructions.

    document.getElementById("game-instructions").textContent =
        selectedMode === "assessment"
            ? "Make your prediction before the countdown expires."
            : "Select the outcome you believe is most likely.";

    roundStartTime = Date.now();

    document.getElementById("round-timer").textContent = "";

    // Assessment countdown.

    if (selectedMode === "assessment") {
        const timeLimit =
            difficultySettings[selectedDifficulty].timeLimit;

        let deadline = Date.now() + timeLimit * 1000;

        function updateCountdown() {
            const remaining =
                Math.max(0, (deadline - Date.now()) / 1000);

            document.getElementById("round-timer").textContent =
                remaining.toFixed(1) + " seconds remaining";

            if (remaining <= 0 && !answered) {
                clearInterval(countdownInterval);
                submitPrediction("timeout");
            }
        }

        updateCountdown();

        countdownInterval = setInterval(updateCountdown, 100);
    }

    // Hide the Next Round button until the player has answered.
    nextButton.classList.add("hidden");
}


// ============================================
// PLAYER INPUT
// ============================================

dayButton.addEventListener("click", () => {
    submitPrediction("day");
});

nightButton.addEventListener("click", () => {
    submitPrediction("night");
});


// Keyboard controls:
// 1 = predict Day
// 2 = predict Night
// Space = next round after feedback

document.addEventListener("keydown", event => {
    if (playingScreen.classList.contains("hidden")) return;

    // Do not interfere with typing or form controls.

    const activeElement = document.activeElement;

    const isTyping = activeElement && (
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.tagName === "SELECT" ||
        activeElement.isContentEditable
    );

    if (isTyping) return;
    if (event.repeat) return;

    // Number keys select Day and Night.

    if (!answered && event.key === "1") {
        event.preventDefault();
        submitPrediction("day");
        return;
    }

    if (!answered && event.key === "2") {
        event.preventDefault();
        submitPrediction("night");
        return;
    }

    // Space advances after feedback in all three modes.

    if (event.code === "Space" && answered) {
        event.preventDefault();
        nextButton.click();
    }
});


// ============================================
// PROCESS PREDICTION
// ============================================

function submitPrediction(prediction) {
    if (answered) return;

    answered = true;

    clearInterval(countdownInterval);

    dayButton.disabled = true;
    nightButton.disabled = true;

    const timeLimit =
        difficultySettings[selectedDifficulty].timeLimit;

    let responseTime =
        (Date.now() - roundStartTime) / 1000;

    if (prediction === "timeout") {
        responseTime = timeLimit;
    }

    totalResponseTime += responseTime;

    const wasCorrect =
        prediction === currentOutcome;

    const stats =
        combinationStats[currentCombination.name];

    stats.attempts++;
    stats.totalResponseTime += responseTime;

    if (currentOutcome === "day") {
        stats.dayAttempts++;
    } else {
        stats.nightAttempts++;
    }

    if (wasCorrect) {
        correct++;
        score += 100;

        streak++;
        bestStreak = Math.max(bestStreak, streak);

        stats.correct++;

        if (currentOutcome === "day") {
            stats.dayCorrect++;
        } else {
            stats.nightCorrect++;
        }

        playSound("correct");
    } else {
        incorrect++;
        streak = 0;

        playSound("incorrect");
    }

    roundResults.push({
        combination: currentCombination.name,
        prediction: prediction,
        outcome: currentOutcome,
        correct: wasCorrect,
        probability: currentCombination.dayProbability,
        responseTime: responseTime
    });

    document.getElementById("score").textContent = score;

    // All modes now show feedback after each answer.
    // Assessment feedback does not reveal probability.

    document.getElementById("round-timer").textContent = "";

    showFeedback(prediction, wasCorrect);
}


// ============================================
// FEEDBACK
// ============================================

function showFeedback(prediction, wasCorrect) {
    const feedback =
        document.getElementById("feedback");

    const title =
        document.getElementById("feedback-title");

    const message =
        document.getElementById("feedback-message");

    feedback.classList.remove("hidden");

    if (wasCorrect) {
        title.textContent = "Correct prediction!";
        title.style.color = "#56D69B";
    } else {
        title.textContent = "Not quite!";
        title.style.color = "#FF8585";
    }

    message.textContent =
        `You predicted ${prediction === "timeout" ? "no answer" : prediction.toUpperCase()}. ` +
        `The actual outcome was ${currentOutcome.toUpperCase()}.`;

    // Only Learning and Practice reveal probability information.

    if (selectedMode !== "assessment") {
        message.textContent +=
            ` This combination has a ${Math.round(currentCombination.dayProbability * 100)}% chance of producing Day.`;
    }

    if (selectedMode === "learning") {
        message.textContent +=
            " Use this information to guide your next prediction.";
    }

    // Show the Next Round button after feedback.

    nextButton.classList.remove("hidden");
}


// ============================================
// NEXT ROUND
// ============================================

nextButton.addEventListener("click", startNextRound);


// ============================================
// END GAME
// ============================================

function endGame() {
    clearInterval(timerInterval);
    clearInterval(countdownInterval);

    playingScreen.classList.add("hidden");
    resultsScreen.classList.remove("hidden");

    const elapsed =
        (Date.now() - startTime) / 1000;

    const accuracy =
        Math.round((correct / totalRounds) * 100);

    const averageTime =
        (totalResponseTime / totalRounds).toFixed(2);

    document.getElementById("final-score").textContent =
        score;

    document.getElementById("final-percentage").textContent =
        accuracy + "% accuracy";

    document.getElementById("correct-count").textContent =
        correct;

    document.getElementById("incorrect-count").textContent =
        incorrect;

    document.getElementById("average-time").textContent =
        averageTime + "s";

    document.getElementById("best-streak").textContent =
        bestStreak;

    document.getElementById("progress-bar").style.width = "100%";

    displayCombinationReview();
    displayOutcomeStatistics();
}


// ============================================
// COMBINATION REVIEW
// ============================================

function displayCombinationReview() {
    const review =
        document.getElementById("combination-review");

    review.innerHTML = "";

    combinations.forEach(combination => {
        const stats =
            combinationStats[combination.name];

        const accuracy = stats.attempts > 0
            ? Math.round(
                (stats.correct / stats.attempts) * 100
            )
            : 0;

        const row = document.createElement("div");
        row.className = "review-row";

        const name = document.createElement("span");

        name.textContent =
            combination.name + " " +
            combination.symbolOne + " + " +
            combination.symbolTwo;

        const result = document.createElement("span");

        result.textContent =
            `${accuracy}% (${stats.correct}/${stats.attempts})`;

        row.appendChild(name);
        row.appendChild(result);

        review.appendChild(row);
    });
}


// ============================================
// DAY AND NIGHT STATISTICS
// ============================================

function displayOutcomeStatistics() {
    const review =
        document.getElementById("combination-review");

    let dayAttempts = 0;
    let dayCorrect = 0;

    let nightAttempts = 0;
    let nightCorrect = 0;

    Object.values(combinationStats).forEach(stats => {
        dayAttempts += stats.dayAttempts;
        dayCorrect += stats.dayCorrect;

        nightAttempts += stats.nightAttempts;
        nightCorrect += stats.nightCorrect;
    });

    const dayAccuracy = dayAttempts > 0
        ? Math.round((dayCorrect / dayAttempts) * 100)
        : 0;

    const nightAccuracy = nightAttempts > 0
        ? Math.round((nightCorrect / nightAttempts) * 100)
        : 0;

    const heading = document.createElement("h3");

    heading.textContent = "Outcome accuracy";
    heading.style.marginTop = "25px";

    review.appendChild(heading);

    const result = document.createElement("p");

    result.style.marginTop = "12px";

    result.textContent =
        `Day: ${dayAccuracy}% (${dayCorrect}/${dayAttempts}) | ` +
        `Night: ${nightAccuracy}% (${nightCorrect}/${nightAttempts})`;

    review.appendChild(result);
}


// ============================================
// RETRY GAME
// ============================================

retryButton.addEventListener("click", () => {
    clearInterval(timerInterval);
    clearInterval(countdownInterval);

    resultsScreen.classList.add("hidden");
    setupScreen.classList.remove("hidden");
});


// ============================================
// AUTHENTICATION CHECK
// ============================================

async function checkGameAuthentication() {
    const loadingScreen =
        document.getElementById("auth-loading");

    try {
        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error || !data.session) {
            window.location.replace("../login.html");
            return;
        }

        // The user is logged in, so reveal the game.

        if (loadingScreen) {
            loadingScreen.remove();
        }

    } catch (error) {
        console.error("Authentication check failed:", error);
        window.location.replace("../login.html");
    }
}

checkGameAuthentication();
