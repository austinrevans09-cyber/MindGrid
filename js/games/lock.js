
// ============================================
// MINDGRID - LOCK GAME
// ============================================


// ============================================
// GAME SETTINGS
// ============================================

const lockSettings = {

    learning: {
        rounds: 5
    },

    assessment: {
        rounds: 10
    },

    practice: {
        rounds: Infinity
    }

};

const difficultySettings = {

    easy: {
        speed: 7,
        tolerance: 5,
        description: "Easy: slower dial movement and a wider target tolerance."
    },

    normal: {
        speed: 12,
        tolerance: 3,
        description: "Normal: faster dial movement and a smaller target tolerance."
    },

    hard: {
        speed: 18,
        tolerance: 1,
        description: "Hard: very fast dial movement and a narrow target tolerance."
    }

};


// ============================================
// GAME VARIABLES
// ============================================

let selectedMode = "learning";
let selectedDifficulty = "easy";

let gameActive = false;
let dialRunning = false;

let currentRound = 0;
let totalRounds = 0;

let score = 0;
let correctAnswers = 0;
let currentStreak = 0;
let bestStreak = 0;

let targetCombination = [];
let playerCombination = [];

let currentTargetIndex = 0;

let roundStartTime = 0;
let roundResponseTime = 0;

let totalResponseTime = 0;

let roundResults = [];

let dialPosition = 0;
let dialStartPosition = 0;
let dialStartTime = 0;

let animationFrame = null;
let nextRoundTimeout = null;

let sessionStartTime = 0;

let saveInProgress = false;


// ============================================
// PAGE ELEMENTS
// ============================================

const setupScreen = document.getElementById("lock-setup");
const gameScreen = document.getElementById("lock-game");
const resultsScreen = document.getElementById("lock-results");

const startButton = document.getElementById("start-game");
const stopButton = document.getElementById("stop-dial");
const finishButton = document.getElementById("finish-session");
const playAgainButton = document.getElementById("play-again");

const dialNumber = document.getElementById("dial-number");

const lockFeedback = document.getElementById("lock-feedback");

const lockStatusText = document.getElementById("lock-status-text");
const statusIndicator = document.getElementById("status-indicator");


// ============================================
// MODE SELECTION
// ============================================

document.querySelectorAll("[data-mode]").forEach(button => {

    button.addEventListener("click", () => {

        if (gameActive) {
            return;
        }

        selectedMode = button.dataset.mode;

        document.querySelectorAll("[data-mode]").forEach(item => {
            item.classList.remove("selected");
        });

        button.classList.add("selected");

    });

});


// ============================================
// DIFFICULTY SELECTION
// ============================================

document.querySelectorAll("[data-difficulty]").forEach(button => {

    button.addEventListener("click", () => {

        if (gameActive) {
            return;
        }

        selectedDifficulty = button.dataset.difficulty;

        document.querySelectorAll("[data-difficulty]").forEach(item => {
            item.classList.remove("selected");
        });

        button.classList.add("selected");

        document.getElementById("difficulty-description").textContent =
            difficultySettings[selectedDifficulty].description;

    });

});


// ============================================
// START GAME
// ============================================

function startGame() {

    resetGame();

    gameActive = true;

    sessionStartTime = Date.now();

    totalRounds = lockSettings[selectedMode].rounds;

    setupScreen.hidden = true;
    resultsScreen.hidden = true;
    gameScreen.hidden = false;

    finishButton.disabled = true;

    updateScoreboard();

    startRound();

}


// ============================================
// RESET GAME
// ============================================

function resetGame() {

    cancelAnimationFrame(animationFrame);
    clearTimeout(nextRoundTimeout);

    gameActive = false;
    dialRunning = false;

    currentRound = 0;

    score = 0;
    correctAnswers = 0;

    currentStreak = 0;
    bestStreak = 0;

    totalResponseTime = 0;

    targetCombination = [];
    playerCombination = [];

    currentTargetIndex = 0;

    roundResults = [];

    saveInProgress = false;

    stopButton.disabled = true;
    finishButton.disabled = true;

    document.getElementById("save-status").textContent =
        "Saving your results...";

    document.getElementById("save-status").className =
        "save-status";

}


// ============================================
// START A ROUND
// ============================================

function startRound() {

    if (!gameActive) {
        return;
    }

    if (selectedMode !== "practice" && currentRound >= totalRounds) {
        finishGame();
        return;
    }

    currentRound++;

    targetCombination = generateCombination();

    playerCombination = [];

    currentTargetIndex = 0;

    roundResponseTime = 0;

    document.getElementById("round-display").textContent =
        selectedMode === "practice"
            ? currentRound
            : currentRound + " / " + totalRounds;

    updateScoreboard();

    resetProgressSteps();

    displayCombination();

}


// ============================================
// GENERATE THREE RANDOM NUMBERS
// ============================================

function generateCombination() {

    const combination = [];

    while (combination.length < 3) {

        const number = Math.floor(Math.random() * 100);

        if (!combination.includes(number)) {
            combination.push(number);
        }

    }

    return combination;

}


// ============================================
// DISPLAY COMBINATION
// ============================================

function displayCombination() {

    document.getElementById("target-one").textContent =
        formatNumber(targetCombination[0]);

    document.getElementById("target-two").textContent =
        formatNumber(targetCombination[1]);

    document.getElementById("target-three").textContent =
        formatNumber(targetCombination[2]);


    document.getElementById("combination-instruction").textContent =
        "Memorise this combination";

    document.getElementById("combination-hint").textContent =
        "The combination will disappear shortly.";

    lockFeedback.textContent = "Memorise the three numbers.";
    lockFeedback.className = "lock-feedback";

    updateStatus("MEMORISE THE COMBINATION", "warning");

    stopButton.disabled = true;

    dialNumber.textContent = "--";


    // Give the player time to memorise the combination.

    const memoryTime = selectedMode === "learning" ? 5000 : 3000;

    nextRoundTimeout = setTimeout(() => {

        if (!gameActive) {
            return;
        }

        hideCombination();

        startDial();

    }, memoryTime);

}


// ============================================
// HIDE COMBINATION
// ============================================

function hideCombination() {

    document.getElementById("target-one").textContent = "??";
    document.getElementById("target-two").textContent = "??";
    document.getElementById("target-three").textContent = "??";

    document.getElementById("combination-instruction").textContent =
        "Unlock the combination";

    document.getElementById("combination-hint").textContent =
        "Remember the numbers and enter them in order.";

}


// ============================================
// START MOVING DIAL
// ============================================

function startDial() {

    if (!gameActive) {
        return;
    }

    const settings = difficultySettings[selectedDifficulty];

    dialPosition = Math.random() * 100;

    dialStartPosition = dialPosition;

    dialStartTime = performance.now();

    roundStartTime = dialStartTime;

    dialRunning = true;

    stopButton.disabled = false;

    lockFeedback.textContent =
        "Find the first number and stop the dial.";

    lockFeedback.className = "lock-feedback";

    updateStatus("DIAL ACTIVE - STOP AT THE TARGET", "active");

    document.getElementById("dial-number").textContent =
        formatNumber(Math.floor(dialPosition));

    animateDial();

}


// ============================================
// ANIMATE DIAL
// ============================================

function animateDial() {

    if (!dialRunning || !gameActive) {
        return;
    }

    const settings = difficultySettings[selectedDifficulty];

    const currentTime = performance.now();

    const elapsedSeconds = (currentTime - dialStartTime) / 1000;

    dialPosition =
        (dialStartPosition + elapsedSeconds * settings.speed) % 100;

    const displayedNumber = Math.floor(dialPosition);

    dialNumber.textContent = formatNumber(displayedNumber);

    animationFrame = requestAnimationFrame(animateDial);

}


// ============================================
// STOP DIAL
// ============================================

function stopDial() {

    if (!dialRunning || !gameActive) {
        return;
    }

    dialRunning = false;

    cancelAnimationFrame(animationFrame);

    const settings = difficultySettings[selectedDifficulty];

    const stoppedNumber = Math.floor(dialPosition);

    const targetNumber = targetCombination[currentTargetIndex];

    const difference = circularDistance(
        stoppedNumber,
        targetNumber
    );

    playerCombination.push(stoppedNumber);

    stopButton.disabled = true;


    // Check whether the player stopped close enough.

    if (difference <= settings.tolerance) {

        successfulStop();

    } else {

        failedStop(stoppedNumber, targetNumber);

    }

}


// ============================================
// CIRCULAR DISTANCE
// Handles the 99-to-00 boundary.
// ============================================

function circularDistance(first, second) {

    const difference = Math.abs(first - second);

    return Math.min(difference, 100 - difference);

}


// ============================================
// SUCCESSFUL POSITION
// ============================================

function successfulStop() {

    const currentStep = currentTargetIndex + 1;

    const stepElement =
        document.getElementById("step-" + numberToWord(currentStep));

    stepElement.classList.add("completed");

    lockFeedback.textContent =
        "Correct! Position " + currentStep + " unlocked.";

    lockFeedback.className = "lock-feedback success";

    updateStatus("POSITION " + currentStep + " UNLOCKED", "active");


    currentTargetIndex++;


    // All three numbers have been entered.

    if (currentTargetIndex >= 3) {

        completeRound(true);

        return;

    }


    updateActiveStep();

    lockFeedback.textContent =
        "Correct! Now find position " + (currentTargetIndex + 1) + ".";


  
    nextRoundTimeout = setTimeout(() => {

        if (!gameActive) {
            return;
        }

        // Restart the dial from its current position.

        dialStartPosition = dialPosition;
        dialStartTime = performance.now();

        dialRunning = true;

        stopButton.disabled = false;

        lockFeedback.textContent =
            "Find the next number and stop the dial.";

        updateStatus("DIAL ACTIVE - STOP AT THE TARGET", "active");

        animateDial();

    }, 350);
 


}


// ============================================
// FAILED POSITION
// ============================================

function failedStop(stoppedNumber, targetNumber) {

    lockFeedback.textContent =
        "Incorrect! You stopped at " +
        formatNumber(stoppedNumber) + ".";

    lockFeedback.className = "lock-feedback error";

    updateStatus("COMBINATION FAILED", "warning");

    if (selectedMode !== "assessment") {

        document.getElementById("combination-hint").textContent =
            "The correct combination was " +
            targetCombination.map(formatNumber).join(" - ");

    }

    completeRound(false);

}


// ============================================
// COMPLETE ROUND
// ============================================

function completeRound(success) {

    if (!gameActive) {
        return;
    }

    dialRunning = false;

    cancelAnimationFrame(animationFrame);

    clearTimeout(nextRoundTimeout);

    stopButton.disabled = true;

    roundResponseTime =
        (performance.now() - roundStartTime) / 1000;

    totalResponseTime += roundResponseTime;


    if (success) {

        correctAnswers++;

        currentStreak++;

        bestStreak = Math.max(bestStreak, currentStreak);


        // Base score plus a speed bonus.

        const speedBonus = Math.max(
            0,
            Math.round(30 - roundResponseTime * 2)
        );

        const streakBonus = Math.min(
            (currentStreak - 1) * 5,
            25
        );

        score += 100 + speedBonus + streakBonus;

        lockFeedback.textContent =
            "Vault unlocked! +" +
            (100 + speedBonus + streakBonus) + " points.";

        lockFeedback.className = "lock-feedback success";

        updateStatus("VAULT UNLOCKED", "active");

    } else {

        currentStreak = 0;

    }


    // Save individual round information.

    roundResults.push({

        symbols: targetCombination.map(formatNumber),

        prediction: playerCombination.map(formatNumber).join("-"),

        outcome: targetCombination.map(formatNumber).join("-"),

        correct: success,

        responseTime: roundResponseTime

    });


    updateScoreboard();

    finishButton.disabled = false;


    if (!success && selectedMode === "learning") {

        lockFeedback.textContent +=
            " Correct combination: " +
            targetCombination.map(formatNumber).join(" - ");

    }


    // Continue after a short delay.

    nextRoundTimeout = setTimeout(() => {

        if (!gameActive) {
            return;
        }

        if (selectedMode !== "practice" &&
            currentRound >= totalRounds) {

            finishGame();

        } else {

            startRound();

        }

    }, 1800);

}


// ============================================
// UPDATE SCOREBOARD
// ============================================

function updateScoreboard() {

    document.getElementById("score-display").textContent =
        score;

    document.getElementById("streak-display").textContent =
        currentStreak;

    document.getElementById("round-display").textContent =
        selectedMode === "practice"
            ? currentRound
            : currentRound + " / " + totalRounds;

}


// ============================================
// PROGRESS STEPS
// ============================================

function resetProgressSteps() {

    ["one", "two", "three"].forEach(step => {

        const element = document.getElementById("step-" + step);

        element.classList.remove("active", "completed");

    });

    document.getElementById("step-one").classList.add("active");

}


function updateActiveStep() {

    ["one", "two", "three"].forEach((step, index) => {

        const element = document.getElementById("step-" + step);

        element.classList.remove("active");

        if (index === currentTargetIndex) {
            element.classList.add("active");
        }

    });

}


// ============================================
// STATUS INDICATOR
// ============================================

function updateStatus(message, type) {

    lockStatusText.textContent = message;

    statusIndicator.className = "status-dot";

    if (type) {
        statusIndicator.classList.add(type);
    }

}


// ============================================
// NUMBER HELPERS
// ============================================

function formatNumber(number) {

    return String(number).padStart(2, "0");

}


function numberToWord(number) {

    const words = ["one", "two", "three"];

    return words[number - 1];

}


// ============================================
// FINISH SESSION
// ============================================

function finishSession() {

    if (!gameActive || saveInProgress) {
        return;
    }

    if (roundResults.length === 0) {

        lockFeedback.textContent =
            "Complete at least one round before finishing.";

        return;

    }

    finishGame();

}


// ============================================
// FINISH GAME AND DISPLAY RESULTS
// ============================================

async function finishGame() {

    if (!gameActive || saveInProgress) {
        return;
    }

    gameActive = false;
    dialRunning = false;

    saveInProgress = true;

    cancelAnimationFrame(animationFrame);
    clearTimeout(nextRoundTimeout);

    stopButton.disabled = true;
    finishButton.disabled = true;

    gameScreen.hidden = true;
    resultsScreen.hidden = false;


    const completedRounds = roundResults.length;

    const accuracy = completedRounds > 0
        ? (correctAnswers / completedRounds) * 100
        : 0;

    const averageResponseTime = completedRounds > 0
        ? totalResponseTime / completedRounds
        : 0;

    const elapsed = Math.round(
        (Date.now() - sessionStartTime) / 1000
    );


    // Display final statistics.

    document.getElementById("results-title").textContent =
        selectedMode === "assessment"
            ? "Assessment complete!"
            : "Vault challenge complete!";

    document.getElementById("results-description").textContent =
        "You completed " + completedRounds + " lock attempts.";

    document.getElementById("result-score").textContent =
        score;

    document.getElementById("result-accuracy").textContent =
        accuracy.toFixed(1) + "%";

    document.getElementById("result-correct").textContent =
        correctAnswers + " / " + completedRounds;

    document.getElementById("result-reaction").textContent =
        formatReactionTime(averageResponseTime * 1000);

    document.getElementById("result-streak").textContent =
        bestStreak;


    // Show round-by-round summary.

    const breakdown = document.getElementById("results-breakdown");

    breakdown.innerHTML = "";

    const summary = document.createElement("p");

    summary.textContent =
        "Difficulty: " + capitalise(selectedDifficulty) +
        " | Mode: " + capitalise(selectedMode) +
        " | Total time: " + elapsed + " seconds";

    breakdown.appendChild(summary);


    // Save results to Supabase.

    const saveStatus = document.getElementById("save-status");

    saveStatus.textContent = "Saving your results...";
    saveStatus.className = "save-status";


    const saveResult = await saveGameSession({

        gameName: "Lock Game",

        mode: selectedMode,

        difficulty: selectedDifficulty,

        totalRounds: completedRounds,

        correctAnswers: correctAnswers,

        score: score,

        averageResponseTime: averageResponseTime,

        bestStreak: bestStreak,

        durationSeconds: elapsed,

        rounds: roundResults

    });


    if (saveResult.success) {

        saveStatus.textContent =
            "Your results have been saved successfully.";

        saveStatus.className = "save-status saved";

    } else {

        saveStatus.textContent =
            "We couldn't save your results: " + saveResult.error;

        saveStatus.className = "save-status failed";

    }

    saveInProgress = false;

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
// CAPITALISE TEXT
// ============================================

function capitalise(text) {

    return text.charAt(0).toUpperCase() + text.slice(1);

}


// ============================================
// EVENT LISTENERS
// ============================================

startButton.addEventListener("click", startGame);

stopButton.addEventListener("click", stopDial);

finishButton.addEventListener("click", finishSession);

playAgainButton.addEventListener("click", () => {

    resultsScreen.hidden = true;
    setupScreen.hidden = false;

});


// ============================================
// KEYBOARD CONTROLS
// SPACEBAR = STOP DIAL
// ============================================

document.addEventListener("keydown", event => {

    if (event.code !== "Space") {
        return;
    }

    if (event.repeat) {
        return;
    }

    if (!gameActive || !dialRunning) {
        return;
    }

    event.preventDefault();

    stopDial();

});


// ============================================
// AUTHENTICATION
// ============================================

checkGameAuthentication();
