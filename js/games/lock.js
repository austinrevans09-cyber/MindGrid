// ============================================
// MINDGRID - LOCK GAME
// Four-stage rotating target-window challenge
// ============================================

const setupScreen = document.getElementById("setup-screen");
const playingScreen = document.getElementById("playing-screen");
const resultsScreen = document.getElementById("results-screen");
const dial = document.getElementById("lock-dial");
const ctx = dial.getContext("2d");

const stageSettings = {
    easy: [
        { window: 0.82, speed: 0.78, pattern: "steady" },
        { window: 0.62, speed: 1.00, pattern: "variable" },
        { window: 0.46, speed: 1.22, pattern: "bouncing" },
        { window: 0.32, speed: 1.48, pattern: "chaotic" }
    ],
    normal: [
        { window: 0.68, speed: 1.00, pattern: "steady" },
        { window: 0.48, speed: 1.35, pattern: "variable" },
        { window: 0.32, speed: 1.70, pattern: "bouncing" },
        { window: 0.20, speed: 2.15, pattern: "chaotic" }
    ],
    hard: [
        { window: 0.54, speed: 1.25, pattern: "variable" },
        { window: 0.34, speed: 1.75, pattern: "bouncing" },
        { window: 0.22, speed: 2.25, pattern: "jumps" },
        { window: 0.12, speed: 2.90, pattern: "chaotic" }
    ]
};

const TAU = Math.PI * 2;
const DIGIT_COUNT = 10;
const BASE_ANGLE = -Math.PI / 2;

let selectedMode = "learning";
let selectedDifficulty = "normal";
let soundEnabled = true;
let stage = 0;
let digitIndex = 0;
let codes = [];
let score = 0;
let hits = 0;
let misses = 0;
let completedLocks = 0;
let streak = 0;
let bestStreak = 0;
let totalResponseTime = 0;
let attempts = [];
let startTime = 0;
let attemptStart = 0;
let rotorAngle = 0;
let lastFrame = 0;
let animationId = null;
let elapsedTimer = null;
let running = false;
let waitingForFeedback = false;
let currentWindow = 0;
let currentSpeed = 1;
let patternTime = 0;
let patternDirection = 1;
let jumpIndex = 0;
let jumpTimer = 0;
let lastSaved = false;

function randomInt(max) {
    return Math.floor(Math.random() * max);
}

function makeCodes() {
    codes = Array.from({ length: 4 }, () =>
        Array.from({ length: 5 }, () => randomInt(10))
    );
}

function setMode() {
    document.querySelectorAll(".mode-card").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".mode-card").forEach(card => card.classList.remove("selected"));
            button.classList.add("selected");
            selectedMode = button.dataset.mode;
        });
    });
}

function playTone(type) {
    if (!soundEnabled) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.type = "sine";
    oscillator.frequency.value = type === "hit" ? 720 : type === "miss" ? 170 : 440;
    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.14);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.15);
    oscillator.onended = () => audio.close();
}

function startGame() {
    cancelAnimationFrame(animationId);
    clearInterval(elapsedTimer);

    selectedDifficulty = document.getElementById("difficulty").value;
    soundEnabled = document.getElementById("sound-enabled").checked;
    stage = 0;
    digitIndex = 0;
    score = 0;
    hits = 0;
    misses = 0;
    completedLocks = 0;
    streak = 0;
    bestStreak = 0;
    totalResponseTime = 0;
    attempts = [];
    lastSaved = false;
    makeCodes();

    setupScreen.classList.add("hidden");
    resultsScreen.classList.add("hidden");
    playingScreen.classList.remove("hidden");
    document.getElementById("mode-title").textContent =
        selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1) + " Mode";

    startTime = performance.now();
    elapsedTimer = setInterval(updateElapsed, 250);
    prepareStage();
    running = true;
    lastFrame = performance.now();
    attemptStart = lastFrame;
    animationId = requestAnimationFrame(animate);
}

function prepareStage() {
    const settings = stageSettings[selectedDifficulty][stage];
    currentWindow = settings.window;
    currentSpeed = settings.speed;
    patternTime = 0;
    patternDirection = 1;
    jumpIndex = 0;
    jumpTimer = 0;
    rotorAngle = Math.random() * TAU;
    digitIndex = 0;
    updateInterface();
    setFeedback("Wait for the highlight to reach the target digit.", "");
}

function updateInterface() {
    document.getElementById("stage-label").textContent = `STAGE ${stage + 1} / 4`;
    document.getElementById("digit-label").textContent = `DIGIT ${digitIndex + 1} / 5`;
    document.getElementById("score").textContent = score;
    document.getElementById("stage-progress").style.width =
        `${((stage * 5 + digitIndex) / 20) * 100}%`;

    document.querySelectorAll(".stage-light").forEach((light, index) => {
        light.classList.toggle("active", index === stage);
        light.classList.toggle("complete", index < stage);
    });

    const code = codes[stage];
    const codeElement = document.getElementById("lock-code");
    codeElement.innerHTML = "";
    code.forEach((digit, index) => {
        const span = document.createElement("span");
        span.textContent = index <= digitIndex ? digit : "–";
        if (index < digitIndex) span.classList.add("done");
        codeElement.appendChild(span);
    });

    const status = document.getElementById("lock-status");
    status.textContent = "LOCKED";
    status.classList.remove("unlocked");
    document.getElementById("target-hint").textContent =
        selectedMode === "assessment" ? "ENTER THE NEXT DIGIT" : `NEXT DIGIT: ${code[digitIndex]}`;
}

function updateElapsed() {
    const seconds = Math.floor((performance.now() - startTime) / 1000);
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    document.getElementById("elapsed-time").textContent = `${mins}:${secs}`;
}

function setFeedback(message, type) {
    const element = document.getElementById("lock-feedback");
    element.textContent = message;
    element.className = "lock-feedback" + (type ? ` ${type}` : "");
}

function getVelocity(dt) {
    const settings = stageSettings[selectedDifficulty][stage];
    const base = currentSpeed * 1.42;
    patternTime += dt;

    switch (settings.pattern) {
        case "steady":
            return base;
        case "variable":
            // Smooth acceleration and deceleration around the dial.
            return base * (0.30 + 0.95 * (0.5 + 0.5 * Math.sin(patternTime * 1.65)));
        case "bouncing":
            // Speed changes and direction reversals.
            if (Math.sin(patternTime * 1.15) < -0.88) patternDirection = -1;
            else if (Math.sin(patternTime * 1.15) > 0.88) patternDirection = 1;
            return base * (0.45 + 0.75 * Math.abs(Math.sin(patternTime * 1.9))) * patternDirection;
        case "jumps":
            // Short bursts between separated positions, then a moving sweep.
            return base * (0.65 + 0.65 * Math.sin(patternTime * 2.4));
        case "chaotic":
            return base * (0.18 + 1.35 * (0.5 + 0.5 * Math.sin(patternTime * 2.7 + Math.sin(patternTime * 0.8) * 2)));
        default:
            return base;
    }
}

function animate(timestamp) {
    if (!running) return;
    const dt = Math.min((timestamp - lastFrame) / 1000, 0.04);
    lastFrame = timestamp;

    const settings = stageSettings[selectedDifficulty][stage];
    const pattern = settings.pattern;

    if (pattern === "jumps") {
        jumpTimer += dt;
        if (jumpTimer > Math.max(0.16, 0.55 / currentSpeed)) {
            jumpTimer = 0;
            jumpIndex++;
            rotorAngle += (Math.PI / 2) + (Math.random() * Math.PI * 0.9);
        } else {
            rotorAngle += getVelocity(dt) * dt;
        }
    } else {
        rotorAngle += getVelocity(dt) * dt;
    }

    drawDial();
    animationId = requestAnimationFrame(animate);
}

function drawDial() {
    const w = dial.width;
    const h = dial.height;
    const cx = w / 2;
    const cy = h / 2;
    const outer = 226;
    const inner = 145;
    const digitRadius = 184;
    const settings = stageSettings[selectedDifficulty][stage];
    const segmentWidth = (TAU / DIGIT_COUNT) * currentWindow;

    ctx.clearRect(0, 0, w, h);

    // Outer housing.
    ctx.beginPath();
    ctx.arc(cx, cy, outer + 12, 0, TAU);
    ctx.fillStyle = "#29293c";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, TAU);
    ctx.fillStyle = "#bfc2ce";
    ctx.fill();

    // Ten alternating dial panels.
    for (let i = 0; i < DIGIT_COUNT; i++) {
        const a = BASE_ANGLE + i * TAU / DIGIT_COUNT;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.arc(cx, cy, outer - 3, a, a + TAU / DIGIT_COUNT);
        ctx.arc(cx, cy, inner, a + TAU / DIGIT_COUNT, a, true);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? "#e7e8ee" : "#d6d8e1";
        ctx.fill();
        ctx.strokeStyle = "#a2a5b2";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // The moving selectable window.
    const start = rotorAngle - segmentWidth / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, outer - 3, start, start + segmentWidth);
    ctx.arc(cx, cy, inner, start + segmentWidth, start, true);
    ctx.closePath();
    ctx.fillStyle = "rgba(49, 54, 72, 0.82)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Digit labels.
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 35px Consolas, monospace";
    for (let i = 0; i < DIGIT_COUNT; i++) {
        const angle = BASE_ANGLE + i * TAU / DIGIT_COUNT;
        const x = cx + Math.cos(angle) * digitRadius;
        const y = cy + Math.sin(angle) * digitRadius;
        ctx.fillStyle = "#252735";
        ctx.fillText(String(i), x, y + 2);
    }

    // Inner rim.
    ctx.beginPath();
    ctx.arc(cx, cy, inner - 5, 0, TAU);
    ctx.strokeStyle = "#777b8d";
    ctx.lineWidth = 9;
    ctx.stroke();
}

function getHighlightedDigit() {
    // Find the digit nearest the centre of the moving window.
    let angle = ((rotorAngle - BASE_ANGLE) % TAU + TAU) % TAU;
    return Math.round(angle / (TAU / DIGIT_COUNT)) % DIGIT_COUNT;
}

function isDigitInsideWindow(digit) {
    // The target must actually sit inside the highlighted arc.
    const digitAngle = BASE_ANGLE + digit * (TAU / DIGIT_COUNT);
    const halfWindow = ((TAU / DIGIT_COUNT) * currentWindow) / 2;
    let difference = Math.atan2(
        Math.sin(rotorAngle - digitAngle),
        Math.cos(rotorAngle - digitAngle)
    );
    return Math.abs(difference) <= halfWindow;
}

function stopRotor() {
    if (!running || waitingForFeedback) return;
    const responseTime = (performance.now() - attemptStart) / 1000;
    const chosenDigit = getHighlightedDigit();
    const requiredDigit = codes[stage][digitIndex];
    const correct = isDigitInsideWindow(requiredDigit);

    attempts.push({
        symbols: [stage + 1, digitIndex + 1, requiredDigit, chosenDigit],
        prediction: String(chosenDigit),
        outcome: String(requiredDigit),
        correct: correct,
        responseTime: responseTime
    });
    totalResponseTime += responseTime;

    if (correct) {
        hits++;
        score += Math.round(100 + Math.max(0, 80 - responseTime * 20));
        streak++;
        bestStreak = Math.max(bestStreak, streak);
        playTone("hit");
        digitIndex++;
        updateInterface();

        if (digitIndex >= 5) {
            completedLocks++;
            document.getElementById("lock-status").textContent = "UNLOCKED";
            document.getElementById("lock-status").classList.add("unlocked");
            document.getElementById("target-hint").textContent = "LOCK OPEN";
            if (selectedMode === "learning") {
                setFeedback(`Correct. Stage ${stage + 1} unlocked.`, "good");
            } else {
                setFeedback("Lock unlocked.", "good");
            }
            waitingForFeedback = true;
            setTimeout(() => {
                waitingForFeedback = false;
                if (stage === 3) finishGame();
                else {
                    stage++;
                    prepareStage();
                    attemptStart = performance.now();
                }
            }, selectedMode === "assessment" ? 450 : 850);
            return;
        }

        if (selectedMode === "learning") setFeedback(`Correct — ${chosenDigit} secured.`, "good");
        else setFeedback("Correct digit.", "good");
    } else {
        misses++;
        streak = 0;
        playTone("miss");
        digitIndex = 0; // A miss resets the current lock's full five-digit code.
        updateInterface();
        if (selectedMode === "learning") {
            setFeedback(`Missed. You stopped on ${chosenDigit}; the target was ${requiredDigit}. This lock has reset.`, "bad");
        } else {
            setFeedback("Miss — this lock has reset.", "bad");
        }
    }

    waitingForFeedback = true;
    running = false;
    cancelAnimationFrame(animationId);
    drawDial();

    const delay = selectedMode === "assessment" ? 280 : 850;
    setTimeout(() => {
        if (!playingScreen.classList.contains("hidden")) {
            waitingForFeedback = false;
            running = true;
            lastFrame = performance.now();
            attemptStart = lastFrame;
            animationId = requestAnimationFrame(animate);
        }
    }, delay);
}

function skipLock() {
    if (!running && !waitingForFeedback) return;
    running = false;
    waitingForFeedback = false;
    cancelAnimationFrame(animationId);
    attempts.push({
        symbols: [stage + 1, "skip", ...codes[stage]],
        prediction: "skip",
        outcome: codes[stage].join(""),
        correct: false,
        responseTime: 0
    });
    streak = 0;
    if (stage === 3) {
        finishGame();
    } else {
        stage++;
        prepareStage();
        running = true;
        lastFrame = performance.now();
        attemptStart = lastFrame;
        animationId = requestAnimationFrame(animate);
        setFeedback("Lock skipped. Moving to the next stage.", "");
    }
}

async function finishGame() {
    running = false;
    waitingForFeedback = false;
    cancelAnimationFrame(animationId);
    clearInterval(elapsedTimer);

    playingScreen.classList.add("hidden");
    resultsScreen.classList.remove("hidden");

    const duration = Math.round((performance.now() - startTime) / 1000);
    const avg = attempts.length ? totalResponseTime / attempts.length : 0;
    const accuracy = attempts.length ? (hits / attempts.length) * 100 : 0;

    document.getElementById("results-title").textContent =
        completedLocks === 4 ? "All locks opened!" : "Challenge complete";
    document.getElementById("results-description").textContent =
        "Your Lock Game performance has been recorded below.";
    document.getElementById("final-score").textContent = score;
    document.getElementById("final-summary").textContent = `${hits} successful digits • ${completedLocks} of 4 locks opened • ${accuracy.toFixed(1)}% hit rate`;
    document.getElementById("digits-hit").textContent = hits;
    document.getElementById("miss-count").textContent = misses;
    document.getElementById("locks-complete").textContent = `${completedLocks}/4`;
    document.getElementById("average-time").textContent = `${avg.toFixed(2)}s`;

    if (lastSaved) return;
    lastSaved = true;
    const saveStatus = document.getElementById("save-status");

    const result = await saveGameSession({
        gameName: "Lock Game",
        mode: selectedMode,
        difficulty: selectedDifficulty,
        totalRounds: attempts.length,
        correctAnswers: hits,
        score: score,
        averageResponseTime: avg,
        bestStreak: bestStreak,
        durationSeconds: duration,
        rounds: attempts
    });

    saveStatus.textContent = result.success
        ? "Results saved to your MindGrid statistics."
        : "Your game finished, but the results could not be saved. Please check your connection and try again.";
}

document.getElementById("start-game").addEventListener("click", startGame);
document.getElementById("stop-button").addEventListener("click", stopRotor);
document.getElementById("skip-button").addEventListener("click", skipLock);
document.getElementById("retry-game").addEventListener("click", () => {
    resultsScreen.classList.add("hidden");
    setupScreen.classList.remove("hidden");
});
dial.addEventListener("pointerdown", stopRotor);
document.getElementById("sound-enabled").addEventListener("change", event => {
    soundEnabled = event.target.checked;
});
document.addEventListener("keydown", event => {
    if (event.code === "Space" && !playingScreen.classList.contains("hidden")) {
        event.preventDefault();
        stopRotor();
    }
});

setMode();
checkGameAuthentication();
