// Stewardship Life — Game State Engine
// Vision: docs/sim-money-vision.md (David Strege brief)
// Score: Total = Wealth × (1 + Health/100 + Happiness/100)

const LIFE_START_AGE = 25.0;
const WORK_END_AGE = 65.0;
const LIFE_END_AGE = 85.0;
const AGE_OFFSET_FROM_LEGACY = 7; // Legacy cards were authored for ages 18–60

// Initializing Game State Variables
let gameState = {
    playMode: null, // "classroom" | "ongoing"
    // Demographics
    age: LIFE_START_AGE,
    seasonIdx: 0, // 0: Spring, 1: Summer, 2: Autumn, 3: Winter
    seasons: ["Spring", "Summer", "Autumn", "Winter"],
    
    // Core Pillars
    health: 80,
    wealth: 12000, // cash savings at ~age 25
    happiness: 75,
    
    // Stewardship plans (Spend / Save / Share + time + talents)
    spendingPlan: { spendPct: 70, savePct: 20, sharePct: 10 },
    timePlan: { work: 40, sleep: 56, learn: 5, serve: 3, social: 8, fun: 6 },
    talentFocus: "balanced", // self | others | balanced
    
    // Financial Portfolios
    portfolio: 0, // Stocks/Investments
    debt: 0,   // Education and lifestyle choices create debt during play
    
    // Recurring Monthly Income & Expenses (multiplied by 3 for season ticks)
    salary: 3200, // starting full-time around age 25
    rent: 900,
    foodCost: 350,
    transportCost: 120,
    gymCost: 0,
    subscriptionCost: 0,
    insuranceCost: 0,
    
    // Growth/Interest rates
    debtInterestRate: 0.045,   // Annual 4.5% rate
    portfolioYieldRate: 0.08,   // Annual 8.0% return
    savingsYieldRate: 0.02,     // Annual 2.0% returns (liquid)
    
    // Active status types (for visuals)
    activeHousing: "shared_apartment",
    activeTransport: "used_car",
    activeCareer: "entry_professional",
    activeHabits: {
        gym: false,
        organicFood: false,
        social: false,
        streaming: false,
        four01k: false
    },
    
    // Historical stats (for charting)
    history: [],
    
    // Track indicators
    hasGraduated: true,
    yoloCount: 0,
    hasFour01k: false,
    hasHomeEquity: 0,
    hasInsurance: false,
    sportsCarTimer: 0, 
    burnoutGrace: false,
    hasSideHustle: false,
    healthCrisisSeasons: 0,
    catchUpOffered: {
        health: false,
        debt: false,
        cashDebt: false
    },
    isPaused: false,
    tickerSpeed: 3000, // ms per tick
    tickerIntervalId: null,
    
    // Events state
    currentEvent: null,
    eventIndex: 0,
    eventQueue: [],
    activeTab: "decisions",
    unreadLogs: 0
};

// SVG Chart Path rendering function
function redrawChart() {
    const svg = document.getElementById("chart-svg");
    if (!svg) return;
    
    const count = gameState.history.length;
    if (count < 2) return;
    
    // Max and min boundaries
    const maxWealth = Math.max(...gameState.history.map(d => d.wealth), 15000);
    const minWealth = Math.min(...gameState.history.map(d => d.wealth), -20000);
    const rangeWealth = maxWealth - minWealth || 1;
    
    let pathHealthD = "";
    let pathWealthD = "";
    let pathHappinessD = "";
    
    gameState.history.forEach((data, index) => {
        const x = (index / (count - 1)) * 100;
        
        // Health line (0 to 100) -> SVG Y: 100 to 0
        const yHealth = 100 - data.health;
        
        // Happiness line (0 to 100) -> SVG Y: 100 to 0
        const yHappiness = 100 - data.happiness;
        
        // Wealth line (Map minWealth..maxWealth to 100..0, where 100 is bottom)
        const yWealth = 100 - (((data.wealth - minWealth) / rangeWealth) * 100);
        
        if (index === 0) {
            pathHealthD = `M ${x} ${yHealth}`;
            pathWealthD = `M ${x} ${yWealth}`;
            pathHappinessD = `M ${x} ${yHappiness}`;
        } else {
            pathHealthD += ` L ${x} ${yHealth}`;
            pathWealthD += ` L ${x} ${yWealth}`;
            pathHappinessD += ` L ${x} ${yHappiness}`;
        }
    });
    
    document.getElementById("chart-path-health").setAttribute("d", pathHealthD);
    document.getElementById("chart-path-wealth").setAttribute("d", pathWealthD);
    document.getElementById("chart-path-happiness").setAttribute("d", pathHappinessD);
}

// Visual Scenery Updates based on stats and selections
function updateVisualScenery() {
    const homeIconMap = {
        shared_apartment: "🏢",
        studio_apartment: "🏬",
        suburban_home: "🏡",
        luxury_mansion: "🏰",
        debt_collector: "🏚️"
    };
    
    const transportIconMap = {
        walking: "🚶",
        used_car: "🚗",
        beater_car: "🚗",
        reliable_sedan: "🚙",
        sports_car: "🏎️",
        electric_luxury: "⚡🚘"
    };

    const careerIconMap = {
        student: "🎓",
        entry_professional: "💼",
        entry_level: "💼",
        mid_level: "📊",
        executive: "👔",
        star_freelance: "🎨",
        retired: "👴",
        unemployed: "🏖️"
    };

    // Evaluate housing emoji
    let housingKey = gameState.activeHousing;
    if (gameState.debt > 35000 && gameState.wealth < -5000) {
        housingKey = "debt_collector"; // visually dilapidated
    }
    
    // Apply housing update
    const homeDiv = document.querySelector("#visual-home .lifestyle-emoji");
    const homeLabel = document.getElementById("home-status-label");
    if (homeDiv && homeLabel) {
        homeDiv.textContent = homeIconMap[housingKey] || "🏢";
        const displayTitles = {
            shared_apartment: "Shared Flat",
            studio_apartment: "Studio Apt",
            suburban_home: "My House",
            luxury_mansion: "Luxury Ville",
            debt_collector: "Default Flat"
        };
        homeLabel.textContent = displayTitles[housingKey] || "Home";
        
        // Set speech cloud detail
        document.getElementById("cloud-home").innerHTML = `
            <strong>Housing Status</strong><br>
            Type: ${displayTitles[housingKey]}<br>
            Quarterly Rent: $${gameState.rent * 3}
        `;
    }

    // Apply transport update
    const transportDiv = document.querySelector("#visual-transport .lifestyle-emoji");
    const transportLabel = document.getElementById("transport-status-label");
    if (transportDiv && transportLabel) {
        transportDiv.textContent = transportIconMap[gameState.activeTransport] || "🚶";
        const displayTitles = {
            walking: "Walk/Transit",
            used_car: "Used Car",
            beater_car: "Cheap Beater",
            reliable_sedan: "Reliable Sedan",
            sports_car: "Sports Car 🏎️",
            electric_luxury: "Tesla Luxury"
        };
        transportLabel.textContent = displayTitles[gameState.activeTransport] || "Walking";
        
        document.getElementById("cloud-transport").innerHTML = `
            <strong>Transport</strong><br>
            Style: ${displayTitles[gameState.activeTransport]}<br>
            Car Cost: $${gameState.transportCost * 3}/qtr
        `;
    }

    // Apply career update
    const workDiv = document.querySelector("#visual-work .lifestyle-emoji");
    const workLabel = document.getElementById("work-status-label");
    if (workDiv && workLabel) {
        workDiv.textContent = careerIconMap[gameState.activeCareer] || "💼";
        const displayTitles = {
            student: "Student life",
            entry_professional: "Early Career",
            entry_level: "Entry Corp",
            mid_level: "Mid-Mngr",
            executive: "VP Executive",
            star_freelance: "Creative Soul",
            retired: "Retired Legacy",
            unemployed: "Leisure Life"
        };
        workLabel.textContent = displayTitles[gameState.activeCareer] || "Worker";
        
        document.getElementById("cloud-work").innerHTML = `
            <strong>Occupation</strong><br>
            Job: ${displayTitles[gameState.activeCareer]}<br>
            Monthly Salary: $${gameState.salary}
        `;
    }

    // Apply character avatar expression based on pillars
    let characterAvatar = "🧑‍💻";
    let statusText = "Fit & Happy";
    let chatText = "";

    if (gameState.activeCareer === "student") {
        characterAvatar = "🧑‍🎓";
        chatText = "Studying hard...";
    } else if (gameState.activeCareer === "retired") {
        characterAvatar = gameState.health > 60 ? "👴" : "♿";
        chatText = "Enjoying retirement!";
    } else if (gameState.health < 30) {
        characterAvatar = "🤢";
        chatText = "So tired... Burnout near!";
    } else if (gameState.happiness < 35) {
        characterAvatar = "😢";
        chatText = "Feeling overwhelmed...";
    } else if (gameState.wealth < -2000) {
        characterAvatar = "😰";
        chatText = "Where is my money??";
    } else {
        characterAvatar = gameState.health > 75 ? "🏃" : "🧑";
        chatText = "Living balanced!";
    }

    const charDiv = document.querySelector("#visual-character .lifestyle-emoji");
    const chatBubble = document.getElementById("character-chat");
    if (charDiv) charDiv.textContent = characterAvatar;
    if (chatBubble) {
        chatBubble.textContent = chatText;
        chatBubble.style.opacity = Math.random() < 0.4 ? 1 : 0;
        setTimeout(() => chatBubble.style.opacity = 0, 5000);
    }

    updateHabitHeaderSummary();

    // Update banner details
    const lifeBanner = document.getElementById("life-banner");
    if (lifeBanner) {
        let displayStr = `${gameState.activeHousing.replace('_',' ').toUpperCase()} • ${gameState.activeTransport.toUpperCase()}`;
        lifeBanner.textContent = displayStr;
    }

    // Weather backgrounds based on season
    const weatherField = document.getElementById("world-sky");
    if (weatherField) {
        weatherField.parentElement.className = weatherField.parentElement.className.replace(/weather-season-\w+/g, "");
        weatherField.parentElement.classList.add(`weather-season-${gameState.seasons[gameState.seasonIdx].toLowerCase()}`);
    }
}

// Generate floating points and labels when decisions take place
function spawnFloatingParticle(elementId, text, valueClass) {
    const parent = document.getElementById("visual-particle-spawner");
    if (!parent) return;
    
    // Choose coordinate inside the panel
    const xCoord = 20 + Math.random() * 60; // 20% to 80%
    const yCoord = 40 + Math.random() * 40; // 40% to 80%
    
    const particle = document.createElement("div");
    particle.className = `floating-particle ${valueClass}`;
    particle.style.left = `${xCoord}%`;
    particle.style.top = `${yCoord}%`;
    particle.innerText = text;
    
    parent.appendChild(particle);
    
    // Cleanup after animation completes
    setTimeout(() => {
        particle.remove();
    }, 1800);
}

// Play notification triggers on UI boards
function flashStatChanges(healthDiff, wealthDiff, happinessDiff) {
    // Generate text animations
    if (healthDiff !== 0) {
        const hCard = document.getElementById("pillar-health-card");
        const changeVal = document.getElementById("change-health");
        changeVal.className = healthDiff > 0 ? "text-emerald-400" : "text-rose-400";
        changeVal.innerText = (healthDiff > 0 ? "+" : "") + healthDiff;
        spawnFloatingParticle("pillar-health-card", (healthDiff > 0 ? "+❤️" : "-❤️"), healthDiff > 0 ? "text-emerald-400" : "text-rose-400");
        
        hCard.classList.add("border-teal-500", "scale-[1.03]");
        setTimeout(() => {
            hCard.classList.remove("border-teal-500", "scale-[1.03]");
            changeVal.innerText = "";
        }, 1500);
    }
    
    if (happinessDiff !== 0) {
        const hCard = document.getElementById("pillar-happiness-card");
        const changeVal = document.getElementById("change-happiness");
        changeVal.className = happinessDiff > 0 ? "text-violet-400" : "text-rose-400";
        changeVal.innerText = (happinessDiff > 0 ? "+" : "") + happinessDiff;
        spawnFloatingParticle("pillar-happiness-card", (happinessDiff > 0 ? "+💖" : "-💔"), happinessDiff > 0 ? "text-violet-400" : "text-rose-400");
        
        hCard.classList.add("border-violet-500", "scale-[1.03]");
        setTimeout(() => {
            hCard.classList.remove("border-violet-500", "scale-[1.03]");
            changeVal.innerText = "";
        }, 1500);
    }
    
    if (wealthDiff !== 0) {
        const hCard = document.getElementById("pillar-wealth-card");
        const changeVal = document.getElementById("change-wealth");
        changeVal.className = wealthDiff > 0 ? "text-emerald-400" : "text-rose-400";
        changeVal.innerText = (wealthDiff > 0 ? "+$" : "-$") + Math.abs(wealthDiff).toLocaleString();
        
        spawnFloatingParticle("pillar-wealth-card", (wealthDiff > 0 ? "+💵" : "-💵"), wealthDiff > 0 ? "text-emerald-400" : "text-rose-400");
        
        hCard.classList.add("border-amber-400", "scale-[1.03]");
        setTimeout(() => {
            hCard.classList.remove("border-amber-400", "scale-[1.03]");
            changeVal.innerText = "";
        }, 1500);
    }
}

function getHabitSnapshot(state = gameState) {
    if (!state.activeHabits) state.activeHabits = {};

    const habits = [
        {
            id: "active-habits-1",
            active: !!state.activeHabits.organicFood,
            label: "Whole-food prep",
            shortLabel: "Food",
            cost: 300,
            effect: "+1.5 health/season, +0.75 joy"
        },
        {
            id: "active-habits-2",
            active: !!state.activeHabits.gym,
            label: "Gym program",
            shortLabel: "Gym",
            cost: 60,
            effect: "+2 health/season, +1 joy"
        },
        {
            id: "active-habits-3",
            active: !!state.activeHabits.social,
            label: "Weekend outings",
            shortLabel: "Outings",
            cost: 100,
            effect: "+4 joy/season"
        },
        {
            id: "active-habits-4",
            active: !!state.activeHabits.streaming,
            label: "Streaming comfort",
            shortLabel: "Streaming",
            cost: 15,
            effect: "+0.75 joy/season"
        }
    ];

    const active = habits.filter(habit => habit.active);
    const monthlyCost = active.reduce((sum, habit) => sum + habit.cost, 0);
    return { habits, active, monthlyCost };
}

function setHabitIconState(icon, active, title) {
    if (!icon) return;
    icon.title = title;
    if (active) {
        icon.classList.remove("opacity-30", "grayscale");
        icon.classList.add("opacity-100");
    } else {
        icon.classList.add("opacity-30", "grayscale");
        icon.classList.remove("opacity-100");
    }
}

function updateHabitHeaderSummary() {
    const snapshot = getHabitSnapshot();
    const label = document.getElementById("habit-summary-label");
    const wrap = document.getElementById("habit-icons-wrap");

    snapshot.habits.forEach(habit => {
        setHabitIconState(
            document.getElementById(habit.id),
            habit.active,
            `${habit.label}: ${habit.active ? "active" : "inactive"}. ${habit.cost > 0 ? `$${habit.cost}/mo. ` : ""}${habit.effect}`
        );
    });

    if (label) {
        label.textContent = snapshot.active.length > 0
            ? `${snapshot.active.length} active · $${snapshot.monthlyCost}/mo`
            : "0 active · open Budget";
    }

    if (wrap) {
        wrap.title = snapshot.active.length > 0
            ? snapshot.active.map(habit => `${habit.shortLabel}: ${habit.effect}`).join(" | ")
            : "No recurring habits active. Open Budget to add recovery habits before advancing.";
    }
}

function showTurnGuide() {
    const monthlyFlow = getMonthlyCashFlowSnapshot();
    const snapshot = getHabitSnapshot();
    const netFlowText = formatMoney(monthlyFlow.netFlow, true);

    if (gameState.currentEvent) {
        setGuidePanel(
            "Next Step",
            `Choose one option on the active life moment. Compare cash cost, new debt, and pillar changes. If a cost is bigger than your cash balance, the shortfall goes onto credit. Current cashflow: <strong>${netFlowText}/mo</strong>.`,
            "fa-list-check",
            "teal"
        );
        return;
    }

    const habitHint = snapshot.active.length > 0
        ? `Habits active: <strong>${snapshot.active.map(habit => habit.shortLabel).join(", ")}</strong> costing <strong>$${snapshot.monthlyCost}/mo</strong>.`
        : "No habits are active. Open Budget if health or joy is slipping before you advance.";

    setGuidePanel(
        "Next Step",
        `No choice is pending. Review Budget if you want to adjust recurring costs, then press <strong>Next Season</strong> in the header. ${habitHint} Current cashflow: <strong>${netFlowText}/mo</strong>.`,
        "fa-forward-step",
        "indigo"
    );
}

function setGuidePanel(title, html, iconClass = "fa-circle-info", tone = "indigo") {
    const panel = document.getElementById("chat-toast-notifications");
    const iconSlot = document.getElementById("guide-panel-icon");
    const titleElement = document.getElementById("guide-panel-title");
    const textElement = document.getElementById("guide-panel-text");
    if (!panel || !iconSlot || !titleElement || !textElement) return;

    const toneClasses = {
        indigo: ["bg-indigo-950/25 border-indigo-900/40", "text-indigo-400", "text-indigo-300", "text-indigo-200"],
        teal: ["bg-teal-950/25 border-teal-900/40", "text-teal-400", "text-teal-300", "text-teal-100"],
        amber: ["bg-amber-950/20 border-amber-900/40", "text-amber-400", "text-amber-300", "text-amber-100"],
        violet: ["bg-violet-950/25 border-violet-900/40", "text-violet-400", "text-violet-300", "text-violet-100"],
        slate: ["bg-slate-900/70 border-slate-800", "text-slate-300", "text-slate-300", "text-slate-300"]
    };
    const activeTone = toneClasses[tone] || toneClasses.indigo;

    panel.className = `${activeTone[0]} rounded-2xl p-3 flex gap-2.5 items-start text-xs relative select-none min-h-[68px] border transition-colors duration-200`;
    iconSlot.className = `${activeTone[1]} mt-0.5 flex-none`;
    iconSlot.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    titleElement.className = `text-[9px] uppercase tracking-widest font-black ${activeTone[2]} mb-0.5`;
    titleElement.textContent = title;
    textElement.className = `leading-relaxed ${activeTone[3]}`;
    textElement.innerHTML = html;
}

function showRulebookDefault() {
    showTurnGuide();
}

function updateJournalBadge() {
    const badge = document.getElementById("journal-unread-badge");
    if (!badge) return;

    const unreadCount = gameState.unreadLogs || 0;
    if (unreadCount <= 0) {
        badge.classList.add("hidden");
        badge.textContent = "0";
        return;
    }

    badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    badge.classList.remove("hidden");
}

function getLogIconHTML(message, isLiteracyLog) {
    if (isLiteracyLog) return '<i class="fa-solid fa-graduation-cap"></i>';
    if (message.includes("🚨") || message.includes("Error") || message.includes("INSUFFICIENT")) return '<i class="fa-solid fa-triangle-exclamation"></i>';
    if (message.includes("Paid") || message.includes("Transferred") || message.includes("Deposited")) return '<i class="fa-solid fa-coins"></i>';
    if (message.includes("Enrolled") || message.includes("Gym") || message.includes("Organic")) return '<i class="fa-solid fa-heart-pulse"></i>';
    return '<i class="fa-solid fa-circle-info"></i>';
}

// Detailed log of financial and life events
function addLog(message, isLiteracyLog = false) {
    const container = document.getElementById("journal-logs-container");
    if (!container) return;
    
    const entry = document.createElement("div");
    entry.className = `text-[11px] leading-relaxed border-l-2 pl-2 flex gap-2 items-start ${isLiteracyLog ? "border-indigo-400 text-indigo-300 bg-indigo-950/20 py-1 px-1 rounded" : "border-slate-800 text-slate-400"}`;
    
    const iconBadge = document.createElement("span");
    iconBadge.className = `mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-[9px] shrink-0 ${isLiteracyLog ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20" : "bg-slate-900 text-slate-400 border border-slate-800"}`;
    iconBadge.innerHTML = getLogIconHTML(message, isLiteracyLog);
    
    const entryBody = document.createElement("div");
    entryBody.className = "min-w-0 flex-1";
    
    const tag = document.createElement("span");
    tag.className = "font-extrabold text-slate-500 mr-1.5";
    tag.innerText = `Age ${gameState.age.toFixed(2)}:`;
    
    entryBody.appendChild(tag);
    entryBody.insertAdjacentHTML('beforeend', message);
    entry.appendChild(iconBadge);
    entry.appendChild(entryBody);
    
    container.appendChild(entry);
    
    if (gameState.activeTab !== "logs") {
        gameState.unreadLogs = Math.min(99, (gameState.unreadLogs || 0) + 1);
        updateJournalBadge();
    }
    
    // Auto-scroll log
    container.scrollTop = container.scrollHeight;
}

// Tab switcher logic
function switchTab(tabId) {
    // Collect tabs
    const panes = document.querySelectorAll(".tab-pane");
    const buttons = document.querySelectorAll(".tab-btn");
    
    panes.forEach(pane => pane.classList.add("hidden"));
    buttons.forEach(btn => btn.classList.remove("active-tab"));
    
    const targetPane = document.getElementById(`tab-${tabId}`);
    const targetBtn = document.getElementById(`tab-btn-${tabId}`);
    if (targetPane) targetPane.classList.remove("hidden");
    if (targetBtn) targetBtn.classList.add("active-tab");
    gameState.activeTab = tabId;
    if (tabId === "logs") {
        gameState.unreadLogs = 0;
        updateJournalBadge();
    }
    
    if (tabId === "history") {
        redrawChart();
    }
}

// Global Diagnostics Drawer Controller
function toggleDiagnosticPanel(pillarName) {
    const drawer = document.getElementById("panel-dynamics-drawer");
    const desc = document.getElementById("drawer-description");
    const drawerIconContainer = drawer ? drawer.querySelector(".h-6.w-6") : null;
    const drawerTitle = drawer ? drawer.querySelector("h4") : null;
    if (!drawer) return;
    
    if (!pillarName) {
        // Close if click Close [x] or null
        drawer.classList.add("hidden");
        return;
    }
    
    drawer.classList.remove("hidden");
    redrawChart();
    
    if (pillarName === 'health') {
        if (drawerIconContainer) {
            drawerIconContainer.className = "h-6 w-6 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs";
            drawerIconContainer.innerHTML = '<i class="fa-solid fa-heart-pulse text-emerald-450"></i>';
        }
        if (drawerTitle) drawerTitle.textContent = "Health Diagnostic Analysis";
        desc.innerHTML = `
            <strong class="text-emerald-400">PHYSICAL & BIOLOGICAL HUMAN CAPITAL:</strong><br>
            Current Health score: <span class="font-extrabold text-white">${gameState.health}/100</span>.<br>
            <span class="text-slate-400">Health drifts down slightly each season. Below 30, income is reduced by 15% and occasional $750 care costs can appear. Gym and whole-food habits offset that drift before it becomes a crisis.</span>
        `;
    } else if (pillarName === 'wealth') {
        if (drawerIconContainer) {
            drawerIconContainer.className = "h-6 w-6 rounded bg-amber-500/20 flex items-center justify-center text-amber-500 text-xs";
            drawerIconContainer.innerHTML = '<i class="fa-solid fa-wallet text-amber-450"></i>';
        }
        if (drawerTitle) drawerTitle.textContent = "Wealth Diagnostic Analysis";
        const netWorth = gameState.wealth + gameState.portfolio - gameState.debt;
        desc.innerHTML = `
            <strong class="text-amber-500">COMPOUNDING FINANCIAL NET WORTH:</strong><br>
            Current Net Worth: <span class="font-extrabold text-emerald-400">$${netWorth.toLocaleString()}</span> (Cash: $${gameState.wealth.toLocaleString()} | Stocks: $${gameState.portfolio.toLocaleString()}).<br>
            <span class="text-slate-400 font-medium">Debt balance: <span class="text-rose-400 font-bold">$${gameState.debt.toLocaleString()}</span>. If costs push your cash balance below $0, the shortfall moves to 19.8% credit-card debt. Compare that APR against the 8% stock return before deciding whether to invest or pay debt.</span>
        `;
    } else if (pillarName === 'happiness') {
        if (drawerIconContainer) {
            drawerIconContainer.className = "h-6 w-6 rounded bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs";
            drawerIconContainer.innerHTML = '<i class="fa-solid fa-face-smile text-violet-450"></i>';
        }
        if (drawerTitle) drawerTitle.textContent = "Joy Diagnostic Analysis";
        desc.innerHTML = `
            <strong class="text-violet-400">JOY, COMFORT & MENTAL HEALTH:</strong><br>
            Current Happiness: <span class="font-extrabold text-white">${gameState.happiness}/100</span>.<br>
            <span class="text-slate-400">Joy falls slowly each season and debt stress can drag it lower. Streaming gives a small comfort boost; weekend outings give a larger social recovery boost but cost more every month.</span>
        `;
    }
}

// Modal Toggle Switcher
function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (show) {
        modal.classList.add("active");
    } else {
        modal.classList.remove("active");
    }
}

// Dialog Trigger for Custom Background interactives
function triggerSceneDialogue(type) {
    const monthlyFlow = getMonthlyCashFlowSnapshot();
    let title = "Life Detail";
    let responseText = "";
    let iconClass = "fa-circle-info";
    let tone = "teal";
    
    if (type === "home") {
        title = "Housing Cost Floor";
        iconClass = "fa-house";
        const housingLabel = document.getElementById("home-status-label")?.textContent || gameState.activeHousing.replace('_',' ');
        responseText = `<strong>${housingLabel}</strong> costs <strong>$${gameState.rent.toLocaleString()}/mo</strong> or <strong>$${(gameState.rent * 3).toLocaleString()}/season</strong>. Housing is the fixed cost floor: lower rent raises savings rate, while higher privacy can protect health and joy.`;
    } else if (type === "transport") {
        title = "Commute Tradeoff";
        iconClass = "fa-route";
        const transportLabel = document.getElementById("transport-status-label")?.textContent || gameState.activeTransport.replace('_',' ');
        responseText = `<strong>${transportLabel}</strong> costs <strong>$${gameState.transportCost.toLocaleString()}/mo</strong>. Cheap transit preserves cash and often adds walking health; financed vehicles can boost joy but raise recurring drag and debt risk.`;
    } else if (type === "work") {
        title = "Role And Earning Power";
        iconClass = "fa-briefcase";
        tone = "amber";
        const workLabel = document.getElementById("work-status-label")?.textContent || gameState.activeCareer.replace('_',' ');
        responseText = `<strong>${workLabel}</strong> earns <strong>$${gameState.salary.toLocaleString()}/mo</strong>. Current net cashflow is <strong>${formatMoney(monthlyFlow.netFlow, true)}/mo</strong>. Career choices raise income ceilings, but health below 30 cuts pay by 15%.`;
    } else if (type === "habits") {
        title = "Habit Subscriptions";
        iconClass = "fa-heart-pulse";
        tone = "violet";
        const snapshot = getHabitSnapshot();
        const activeText = snapshot.active.length > 0
            ? snapshot.active.map(habit => `<strong>${habit.shortLabel}</strong> (${habit.effect}, $${habit.cost}/mo)`).join("; ")
            : "No recurring habits are active.";
        responseText = `${activeText}<br><span class="text-slate-400">Use the Budget tab to turn habits on or off before pressing Next Season. Total active habit cost: <strong>$${snapshot.monthlyCost}/mo</strong>.</span>`;
    }
    
    setGuidePanel(title, responseText, iconClass, tone);
}

function triggerCharacterDialogue() {
    triggerSceneDialogue("habits");
}

// Scenery Fold/Collapse Toggle Router
function toggleSceneryCollapse() {
    const pane = document.getElementById("scenery-panel");
    const canvas = document.getElementById("scenery-visual-canvas");
    const icon = document.getElementById("scenery-toggle-icon");
    if (!pane || !canvas) return;
    
    const textSpan = icon ? icon.nextElementSibling : null;
    
    if (pane.classList.contains("collapsed")) {
        pane.classList.remove("collapsed");
        canvas.style.display = "flex";
        if (icon) icon.className = "fa-solid fa-compress text-[8px]";
        if (textSpan) textSpan.textContent = "Fold";
    } else {
        pane.classList.add("collapsed");
        canvas.style.display = "none";
        if (icon) icon.className = "fa-solid fa-expand text-[8px]";
        if (textSpan) textSpan.textContent = "Expand";
    }
}

// Toggle Gym Athletics Habit
function toggleGymHabit() {
    if (gameState.activeHabits.gym) {
        gameState.activeHabits.gym = false;
        gameState.gymCost = 0;
        addLog("Cancelled Gym Athletics membership program to save cash flows.");
        flashStatChanges(0, 0, 0);
    } else {
        gameState.activeHabits.gym = true;
        gameState.gymCost = 60;
        addLog("Enrolled in Cardio & Athletics gym program (-$60/mo). Promotes physical capital compounding!");
        flashStatChanges(0, 0, 0);
    }
    updateHUD();
}

// Toggle Organic Foods Habit
function toggleOrganicFood() {
    if (gameState.activeHabits.organicFood) {
        gameState.activeHabits.organicFood = false;
        gameState.foodCost -= 300;
        addLog("Discontinued Organic premium food routines to optimize food budget.");
        flashStatChanges(0, 0, 0);
    } else {
        gameState.activeHabits.organicFood = true;
        gameState.foodCost += 300;
        addLog("Began Premium Organic whole-foods meal schedule (+$300/mo). Boosts biological vitality compounding!");
        flashStatChanges(0, 0, 0);
    }
    updateHUD();
}

// Toggle Luxury Streaming Comfort
function toggleLuxuryStreaming() {
    if (!gameState.activeHabits) gameState.activeHabits = {};

    if (gameState.activeHabits.streaming) {
        gameState.activeHabits.streaming = false;
        gameState.subscriptionCost = Math.max(0, gameState.subscriptionCost - 15);
        addLog("Cancelled Premium Streaming service subscriptions (-$15/mo saved).");
    } else {
        gameState.activeHabits.streaming = true;
        gameState.subscriptionCost += 15;
        addLog("Subscribed to Premium Over-the-Top Streaming networks (-$15/mo). Gradual joy accumulator.");
    }
    updateHUD();
}

// Toggle Roadtrips & Comfort outings Habit
function toggleRoadtrips() {
    if (gameState.activeHabits.social) {
        gameState.activeHabits.social = false;
        gameState.subscriptionCost = Math.max(0, gameState.subscriptionCost - 100);
        addLog("Suspended weekend Sabbaticals & Roadtrips outings.");
    } else {
        gameState.activeHabits.social = true;
        gameState.subscriptionCost += 100;
        addLog("Initiated scheduled weekend Sabbaticals & Roadtrips budget (-$100/mo). Elevates career stress tolerance!");
    }
    updateHUD();
}

// Side Hustle and Job Quit toggles
function toggleSideHustle() {
    if (gameState.hasSideHustle) {
        gameState.hasSideHustle = false;
        gameState.salary -= 650;
        addLog("Resigned from morning/late-night Side Hustle to rebuild personal health baseline.");
    } else {
        gameState.hasSideHustle = true;
        gameState.salary += 650;
        addLog("Began a high-intensity evening delivery Side Hustle (+$650 /mo). Higher recurring cash flow, but introduces heavy biological decay (+2.5 Health/Season fatigue decay, +1.5 Happiness/Season burnout decay).");
    }
    updateHUD();
}

function toggleActiveJob() {
    if (gameState.activeCareer === "unemployed" || gameState.salary === 0) {
        // Re-enter professional life
        gameState.activeCareer = "entry_level";
        gameState.salary = 2450;
        addLog("Re-entered professional corporate ranks in an entry-level capacity (+$2,450 /mo saved).");
    } else {
        // Quit job/unemployed
        gameState.activeCareer = "unemployed";
        gameState.salary = 0;
        addLog("Resigned entirely from professional career path! Slid base salary resources to $0. Clears corporate stress completely (+4.0 Happiness / Season comfort growth), but creates high economic drag.");
    }
    updateHUD();
}

// Interactive Wealth Asset Transfers (Tab 2 clicks)
function interactWealth(action, amount) {
    if (action === "invest") {
        if (gameState.wealth >= amount) {
            gameState.wealth -= amount;
            gameState.portfolio += amount;
            addLog(`Transferred <span class="text-emerald-400 font-bold">$${amount.toLocaleString()}</span> Cash into Stocks portfolio.`);
            flashStatChanges(0, -amount, 0);
        } else {
            addLog(`<span class="text-rose-400 font-semibold shadow-sm">NSF Error:</span> Not enough liquid cash savings to purchase $${amount} stocks.`, false);
        }
    } else if (action === "sell_portfolio") {
        if (gameState.portfolio >= amount) {
            // Apply tax drag on liquidating (captures Capital gains/reallocation cost: 10% fee)
            const transactionFee = Math.round(amount * 0.05);
            gameState.portfolio -= amount;
            gameState.wealth += (amount - transactionFee);
            addLog(`Liquidated <span class="text-emerald-400 font-bold">$${amount.toLocaleString()}</span> Stocks. Capital gains taxes and broker commissions deducted: $${transactionFee}. Net cash credited: <span class="text-emerald-400 font-bold">$${(amount-transactionFee).toLocaleString()}</span>.`, true);
            flashStatChanges(0, amount - transactionFee, 0);
        } else {
            addLog(`<span class="text-rose-400 font-semibold">Error:</span> Portfolio value holds less than $${amount} stocks.`, false);
        }
    } else if (action === "pay_debt") {
        if (gameState.debt <= 0) {
            addLog(`Lending provider message: You completed premium payments. You are debt-free!`, false);
            return;
        }
        
        let paymentAmount = Math.min(amount, gameState.debt);
        if (gameState.wealth >= paymentAmount) {
            gameState.wealth -= paymentAmount;
            gameState.debt -= paymentAmount;
            addLog(`Paid down <span class="text-emerald-400 font-bold">$${paymentAmount.toLocaleString()}</span> of outstanding liabilities. Debt remaining: <span class="text-rose-400 font-bold">-$${gameState.debt.toLocaleString()}</span>.`);
            
            if (gameState.debt <= 0) {
                gameState.debt = 0;
                addLog(`🎉 <span class="text-emerald-400 font-bold uppercase">Debt Free Achievement unlocked!</span> Interest drain halts completely. happiness +10!`);
                gameState.happiness = Math.min(100, gameState.happiness + 10);
            }
            flashStatChanges(0, -paymentAmount, 0);
        } else {
            addLog(`<span class="text-rose-400 font-semibold">Error:</span> Not enough liquid cash to pay $${paymentAmount.toLocaleString()}. Keep the emergency buffer fluid!`, false);
        }
    }
    
    updateHUD();
}

// Calculates sliding wealth target based on player age (age 25 baseline).
// Age 25: ~$12k | Age 40: grows | Age 65: retirement target band
function getTargetWealthForAge(age) {
    const years = Math.max(0, age - LIFE_START_AGE);
    return 12000 + Math.pow(years, 2.2) * 100;
}

function formatMoney(value, showSign = false) {
    const rounded = Math.round(value || 0);
    const prefix = rounded < 0 ? "-" : (showSign && rounded > 0 ? "+" : "");
    return `${prefix}$${Math.abs(rounded).toLocaleString()}`;
}

function getCurrentNetWorth() {
    return gameState.wealth + gameState.portfolio - gameState.debt;
}

/** David's formula: Total = Wealth + (Health% × Wealth) + (Happiness% × Wealth) */
function getLifetimeScore(state = gameState) {
    const wealth = (state.wealth || 0) + (state.portfolio || 0) - (state.debt || 0);
    const healthFactor = Math.max(0, Math.min(100, state.health || 0)) / 100;
    const happinessFactor = Math.max(0, Math.min(100, state.happiness || 0)) / 100;
    return wealth * (1 + healthFactor + happinessFactor);
}

function formatCompactMoney(value) {
    const n = Math.round(value || 0);
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 10_000) return `${sign}$${Math.round(abs / 1000)}k`;
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
    return `${sign}$${abs.toLocaleString()}`;
}

function setStatWheel(cardId, pct, color) {
    const card = document.getElementById(cardId);
    if (!card) return;
    const wheel = card.querySelector(".stat-wheel");
    if (!wheel) return;
    const clamped = Math.max(0, Math.min(100, pct));
    wheel.style.setProperty("--wheel-pct", clamped);
    if (color) wheel.style.setProperty("--wheel-color", color);
}

function convertCashShortfallToCredit(sourceLabel) {
    if (gameState.wealth >= 0) return 0;

    const shortfall = Math.ceil(Math.abs(gameState.wealth));
    gameState.debt += shortfall;
    gameState.wealth = 0;
    gameState.debtInterestRate = 0.198;

    addLog(`💳 <span class="text-amber-300 font-black uppercase">Credit used:</span> ${sourceLabel} pushed your cash balance <span class="text-amber-300 font-bold">$${shortfall.toLocaleString()}</span> below $0. That shortfall was covered by high-interest credit-card debt at <span class="text-amber-300 font-black">19.8%</span> APR.`, true);
    return shortfall;
}

function getMonthlyCashFlowSnapshot(state = gameState) {
    const stockMonthlyRate = Math.round((state.portfolio || 0) * (state.portfolioYieldRate / 12));
    const savingMonthlyRate = state.wealth > 0 ? Math.round((state.wealth || 0) * (state.savingsYieldRate / 12)) : 0;
    const debtMonthlyFee = Math.round((state.debt || 0) * (state.debtInterestRate / 12));
    const income = (state.salary || 0) + stockMonthlyRate + savingMonthlyRate;
    const expenses = (state.rent || 0) + (state.foodCost || 0) + (state.transportCost || 0) + debtMonthlyFee + (state.gymCost || 0) + (state.subscriptionCost || 0) + (state.insuranceCost || 0);

    return {
        income,
        expenses,
        netFlow: income - expenses,
        stockMonthlyRate,
        savingMonthlyRate,
        debtMonthlyFee
    };
}

function estimateCompoundedValue(amount) {
    if (amount <= 0) return 0;
    const yearsRemaining = Math.max(0, WORK_END_AGE - gameState.age);
    return Math.round(amount * Math.pow(1 + gameState.portfolioYieldRate, yearsRemaining));
}

function getDecisionRuleText(event) {
    const tag = (event.tag || "").toLowerCase();
    if (tag.includes("education") || tag.includes("career") || tag.includes("work")) {
        return "Career choices change income ceilings, but stress and health loss can reduce real earning power later.";
    }
    if (tag.includes("housing")) {
        return "Housing is a recurring fixed cost. Low rent raises savings rate; high rent buys comfort but narrows your emergency margin.";
    }
    if (tag.includes("transport") || tag.includes("lifestyle")) {
        return "Depreciating purchases can raise joy now while adding monthly pressure and reducing investable cash.";
    }
    if (tag.includes("health") || tag.includes("wellness") || tag.includes("nutrition")) {
        return "Health below 30 cuts salary by 15% and can trigger care costs. Health spending can be productive capital.";
    }
    if (tag.includes("investment") || tag.includes("wealth")) {
        return "Investments compound quietly, debt compounds against you, and panic selling can lock in losses.";
    }
    if (tag.includes("social") || tag.includes("spending")) {
        return "Joy matters, but repeating costs and credit-funded fun become long-term payment drag.";
    }
    return "If choices or seasonal bills push your cash balance below $0, the shortfall becomes high-interest credit-card debt at 19.8% APR.";
}

function getDecisionMechanicsHTML(event) {
    const netWorth = getCurrentNetWorth();
    const targetWealth = getTargetWealthForAge(gameState.age);
    const monthlyFlow = getMonthlyCashFlowSnapshot();
    const flowClass = monthlyFlow.netFlow >= 0 ? "text-emerald-400" : "text-rose-400";
    const debtClass = gameState.debtInterestRate >= 0.15 ? "text-rose-400" : "text-amber-400";
    const netClass = netWorth >= 0 ? "text-emerald-400" : "text-rose-400";

    return `
        <div class="flex items-start justify-between gap-2 mb-2">
            <div>
                <div class="text-[8px] uppercase tracking-widest font-black text-slate-500">Decision Mechanics</div>
                <div class="text-[11px] text-slate-300 leading-snug">This card tests <span class="font-extrabold text-white">${event.tag || "life tradeoffs"}</span>: ${getDecisionRuleText(event)}</div>
            </div>
            <span class="shrink-0 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[8px] font-black text-slate-400 uppercase">Age ${gameState.age.toFixed(1)}</span>
        </div>
        <div class="grid grid-cols-1 xs:grid-cols-3 gap-1.5">
            <div class="rounded-xl bg-slate-900/80 border border-slate-800 p-2">
                <span class="block text-[7.5px] uppercase tracking-wider font-black text-slate-500">Cashflow</span>
                <strong class="block ${flowClass} text-[11px]">${formatMoney(monthlyFlow.netFlow, true)}/mo</strong>
            </div>
            <div class="rounded-xl bg-slate-900/80 border border-slate-800 p-2">
                <span class="block text-[7.5px] uppercase tracking-wider font-black text-slate-500">Debt APR</span>
                <strong class="block ${debtClass} text-[11px]">${(gameState.debtInterestRate * 100).toFixed(1)}%</strong>
            </div>
            <div class="rounded-xl bg-slate-900/80 border border-slate-800 p-2">
                <span class="block text-[7.5px] uppercase tracking-wider font-black text-slate-500">Net/Target</span>
                <strong class="block ${netClass} text-[11px]">${formatMoney(netWorth)} / ${formatMoney(targetWealth)}</strong>
            </div>
        </div>
        <div class="mt-2 text-[9.5px] text-slate-400 leading-snug">
            Mechanics to watch: choice costs and seasonal bills hit cash first. If your cash balance drops below $0, only the shortfall becomes 19.8% credit-card debt. Debt above $25k drains joy, health below 30 cuts income by 15%, and health over 85 adds a 5% focus bonus.
        </div>
    `;
}

function setHabitControl(buttonId, statusId, isActive, inactiveAction, activeAction, tone = "emerald") {
    const button = document.getElementById(buttonId);
    const status = document.getElementById(statusId);
    if (!button || !status) return;

    const toneClasses = {
        emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
        violet: "border-violet-500/25 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20"
    };
    const actionClass = toneClasses[tone] || toneClasses.emerald;

    status.textContent = isActive ? "Active" : "Inactive";
    status.className = isActive
        ? "px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/25"
        : "px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-slate-900 text-slate-400 border border-slate-800";
    button.textContent = isActive ? activeAction : inactiveAction;
    button.className = isActive
        ? "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border border-rose-500/25 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition"
        : `px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border transition ${actionClass}`;
}

// Recalculating recurring statements & Redrawing numbers
function updateHUD() {
    const netWorth = getCurrentNetWorth();
    const lifetimeScore = getLifetimeScore();
    const targetWealth = getTargetWealthForAge(gameState.age);
    let wealthScore = 0;
    if (netWorth > 0) {
        wealthScore = Math.max(0, Math.min(100, Math.round((netWorth / targetWealth) * 100)));
    }

    // Health & Happiness wheels; Wealth shows net worth; grand total uses David's formula
    document.getElementById("val-health").textContent = `${Math.round(gameState.health)}%`;
    setStatWheel("pillar-health-card", gameState.health, "#10B981");
    document.getElementById("val-wealth").textContent = formatCompactMoney(netWorth);
    document.getElementById("val-happiness").textContent = `${Math.round(gameState.happiness)}%`;
    setStatWheel("pillar-happiness-card", gameState.happiness, "#8B5CF6");

    const totalEl = document.getElementById("pillar-total-score");
    if (totalEl) totalEl.textContent = formatMoney(lifetimeScore);
    const hudTotal = document.getElementById("hud-total-score");
    if (hudTotal) {
        hudTotal.textContent = formatCompactMoney(lifetimeScore);
        hudTotal.className = lifetimeScore >= 0
            ? "font-black text-teal-300 truncate tabular-nums"
            : "font-black text-rose-400 truncate tabular-nums";
    }
    
    const hCard = document.getElementById("pillar-health-card");
    if (gameState.health < 30) hCard.classList.add("danger-flash");
    else hCard.classList.remove("danger-flash");

    const wCard = document.getElementById("pillar-wealth-card");
    if (netWorth < 0 || wealthScore < 30) wCard.classList.add("danger-flash");
    else wCard.classList.remove("danger-flash");

    const hapCard = document.getElementById("pillar-happiness-card");
    if (gameState.happiness < 30) hapCard.classList.add("danger-flash");
    else hapCard.classList.remove("danger-flash");
    
    let healthDesc = "Fit & Focused";
    if (gameState.health >= 85) healthDesc = "Strong & Restored";
    else if (gameState.health < 30) healthDesc = "Critical Burnout";
    else if (gameState.health < 55) healthDesc = "Fatigued";
    document.getElementById("desc-health").textContent = healthDesc;
    
    let wealthDesc = "Balanced Ledger";
    if (netWorth < 0) wealthDesc = "Sinking in Debt";
    else if (wealthScore >= 120) wealthDesc = `Ahead of pace (${formatCompactMoney(targetWealth)})`;
    else if (wealthScore >= 90) wealthDesc = `On target (${formatCompactMoney(targetWealth)})`;
    else if (wealthScore >= 60) wealthDesc = `Steady pace (${formatCompactMoney(targetWealth)})`;
    else if (wealthScore >= 30) wealthDesc = `Behind target (${formatCompactMoney(targetWealth)})`;
    else wealthDesc = `Underfunded (${formatCompactMoney(targetWealth)})`;
    document.getElementById("desc-wealth").textContent = wealthDesc;
    
    let hapDesc = "Feeling Good";
    if (gameState.happiness >= 85) hapDesc = "Flourishing";
    else if (gameState.happiness < 30) hapDesc = "Stressed & Empty";
    else if (gameState.happiness < 55) hapDesc = "Routine Drift";
    document.getElementById("desc-happiness").textContent = hapDesc;
    
    document.getElementById("player-age").textContent = gameState.age.toFixed(2);
    document.getElementById("player-season").textContent = gameState.seasons[gameState.seasonIdx];
    document.getElementById("hud-net-worth").textContent = netWorth >= 0 ? `$${netWorth.toLocaleString()}` : `-$${Math.abs(netWorth).toLocaleString()}`;
    document.getElementById("hud-net-worth").className = netWorth >= 0 ? "font-black text-emerald-400 truncate tabular-nums" : "font-black text-rose-400 truncate tabular-nums";

    const modeBadge = document.getElementById("mode-badge");
    if (modeBadge) {
        modeBadge.textContent = gameState.playMode === "classroom" ? "CLASSROOM" : "ONGOING";
    }
    
    document.getElementById("budget-salary").textContent = `$${gameState.salary.toLocaleString()} /mo`;
    
    const stockMonthlyRate = Math.round(gameState.portfolio * (gameState.portfolioYieldRate / 12));
    const savingMonthlyRate = Math.round(gameState.wealth * (gameState.savingsYieldRate / 12));
    document.getElementById("budget-investment-income").textContent = `+$${(stockMonthlyRate + savingMonthlyRate).toLocaleString()} /mo`;
    
    document.getElementById("budget-rent").textContent = `-$${gameState.rent.toLocaleString()} /mo`;
    document.getElementById("budget-food").textContent = `-$${gameState.foodCost.toLocaleString()} /mo`;
    document.getElementById("budget-transport").textContent = `-$${gameState.transportCost.toLocaleString()} /mo`;
    
    const debtMonthlyFee = Math.round(gameState.debt * (gameState.debtInterestRate / 12));
    document.getElementById("budget-debt-interest").textContent = `-$${debtMonthlyFee.toLocaleString()} /mo`;
    
    const insuranceAndGym = gameState.insuranceCost + gameState.gymCost;
    document.getElementById("budget-health").textContent = `-$${insuranceAndGym.toLocaleString()} /mo`;
    
    document.getElementById("budget-social").textContent = `-$${gameState.subscriptionCost.toLocaleString()} /mo`;
    
    const monthlyIncome = gameState.salary + stockMonthlyRate + savingMonthlyRate;
    const monthlyExpenses = gameState.rent + gameState.foodCost + gameState.transportCost + debtMonthlyFee + insuranceAndGym + gameState.subscriptionCost;
    const netFlow = monthlyIncome - monthlyExpenses;
    
    const budgetNetElement = document.getElementById("budget-net-flow");
    budgetNetElement.textContent = (netFlow >= 0 ? "+$" : "-$") + Math.abs(netFlow).toLocaleString() + " /mo";
    budgetNetElement.className = netFlow >= 0 ? "text-base font-black text-emerald-400" : "text-base font-black text-rose-400";
    
    const budgetWarning = document.getElementById("budget-warning");
    if (netFlow < 0) budgetWarning.classList.remove("hidden");
    else budgetWarning.classList.add("hidden");
    
    document.getElementById("asset-savings").textContent = `$${Math.round(gameState.wealth).toLocaleString()}`;
    document.getElementById("asset-portfolio").textContent = `$${Math.round(gameState.portfolio).toLocaleString()}`;
    document.getElementById("asset-debt").textContent = `-$${Math.round(gameState.debt).toLocaleString()}`;
    
    setHabitControl("toggle-gym-btn", "gym-status", gameState.activeHabits.gym, "Join", "Cancel", "emerald");
    setHabitControl("toggle-organic-btn", "organic-status", gameState.activeHabits.organicFood, "Set Up", "Cancel", "emerald");
    setHabitControl("toggle-streaming-btn", "streaming-status", !!gameState.activeHabits.streaming, "Activate", "Cancel", "violet");
    setHabitControl("toggle-roadtrip-btn", "roadtrip-status", gameState.activeHabits.social, "Plan", "Pause", "violet");

    updateVisualScenery();
    updateHabitHeaderSummary();
}


// Event Card Queue Logic
const DECISION_CARDS = [
    // --- 18 YEARS ---
    {
        age: 18.0,
        title: "The Road Diverges",
        speaker: "Guidance Counselor",
        avatar: "🧑‍🏫",
        tag: "EDUCATION",
        description: "Your grade school days are behind you. It's time to choose. Will you take high-interest loans for prestige college, select a short technical trade school apprenticeship, or head directly into the physical labor market?",
        literacy: "<strong>Human Capital:</strong> The primary trade-off early in life is building Human Capital (via higher skills) vs securing immediate income. Higher skill increases income limits, but loan debt is compounding friction.",
        choices: [
            {
                label: "Enroll in Ivy League College (4 Years Study)",
                effects: {
                    cashChange: -500,
                    debtIncrease: 30000,
                    healthChange: 5,
                    happinessChange: 5,
                    custom: (state) => {
                        state.activeCareer = "student";
                        state.salary = 300; // tiny campus job
                        state.rent = 300; // dorm share
                        state.debtInterestRate = 0.045; // average student loan 4.5%
                        addLog("📚 Enrolled at University. Accrued $30,000 student loan balance. Salary set to $300 part-time campus job.");
                    }
                }
            },
            {
                label: "Enlist in Mechanical Trade School (1.5 Years Study)",
                effects: {
                    cashChange: -1000,
                    debtIncrease: 4000,
                    healthChange: -2,
                    happinessChange: 0,
                    custom: (state) => {
                        state.activeCareer = "student";
                        state.salary = 800; // apprentice pay
                        state.rent = 300;
                        state.debtInterestRate = 0.05;
                        addLog("🔧 Entered Mechanical Trade School. Minor apprentice loan of $4,000, with $800 monthly stipend.");
                    }
                }
            },
            {
                label: "Immediately enter Workforce as Warehouse Loader",
                effects: {
                    cashChange: 1500,
                    debtIncrease: 0,
                    healthChange: -5,
                    happinessChange: -2,
                    custom: (state) => {
                        state.activeCareer = "entry_level";
                        state.salary = 1800; // warehouse pay
                        state.rent = 400; // shared flat
                        state.hasGraduated = true;
                        addLog("📦 Entered Workforce straightaway as warehouse loader. Starting salary $1,800/mo. No student debt! Ready.");
                    }
                }
            }
        ]
    },
    // --- 19 YEARS ---
    {
        age: 19.0,
        title: "Selecting Where to Anchor",
        speaker: "Apartment Broker",
        avatar: "🏢",
        tag: "HOUSING",
        description: "You need a standard domestic shelter. A fancy loft near the downtown nightlife lets you socialize easily but consumes cash fast. Rooming with sloppy college buddies is loud but dirt-cheap. Which is it?",
        literacy: "<strong>Housing Costs:</strong> Industry benchmarks advise allocating less than 30% of gross income to housing expenses. Overextending causes 'house poor' paralysis, starving your savings rate.",
        choices: [
            {
                label: "Dormitory/Messy House Share ($300/mo Rent)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: -4,
                    happinessChange: -5,
                    custom: (state) => {
                        state.activeHousing = "shared_apartment";
                        state.rent = 300;
                        addLog("🏠 Squeezed into cheap shared housing. Messy and noisy but housing expenses capped at $300/mo.");
                    }
                }
            },
            {
                label: "Cozy Studio Flat for Independence ($650/mo Rent)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 2,
                    happinessChange: 10,
                    custom: (state) => {
                        state.activeHousing = "studio_apartment";
                        state.rent = 650;
                        addLog("🏬 Leased a cozy independent studio apartment. Solid privacy and peace of mind! $650/mo rent.");
                    }
                }
            }
        ]
    },
    // --- 20 YEARS ---
    {
        age: 20.0,
        title: "The Commuting Conundrum",
        speaker: "Dealership Associate",
        avatar: "🚘",
        tag: "TRANSPORT",
        description: "Getting around is tedious. The dealer has a shiny sports car on 9% auto-loan financing with '0% down payment required'. Or you could buy a dented 10-year-old beater cash, or use public transit.",
        literacy: "<strong>Depreciating Liabilities:</strong> Cars are depreciating assets. Funding them through high-interest loans compounds losses. Always opt for functional utility over status symbols.",
        choices: [
            {
                label: "Buy local Bus & Transit Pass ($60/mo Payment)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 2, // exercise walking
                    happinessChange: -5,
                    custom: (state) => {
                        state.activeTransport = "walking";
                        state.transportCost = 60;
                        addLog("🚌 Standard public transit strategy. Cheap $60/mo, plenty of walking exercise, but minor delays.");
                    }
                }
            },
            {
                label: "Purchase dependable Beater Car ($2,500 Cash Upfront)",
                effects: {
                    cashChange: -2500,
                    debtIncrease: 0,
                    healthChange: 0,
                    happinessChange: 12,
                    custom: (state) => {
                        state.activeTransport = "beater_car";
                        state.transportCost = 120; // petrol/maintenance
                        addLog("🚗 Bought a used beater car for $2,500 cash. Ugly but reliable, transport maintenance estimated at $120/mo.");
                    }
                }
            },
            {
                label: "Finance New Sports Sedan ($500 down, $500/mo loan/ins)",
                effects: {
                    cashChange: -500,
                    debtIncrease: 12000, // sports auto loan
                    healthChange: 0,
                    happinessChange: 25,
                    custom: (state) => {
                        state.activeTransport = "sports_car";
                        state.transportCost = 450;
                        state.insuranceCost += 120;
                        state.sportsCarTimer = 8; // happiness boost lasts 8 seasons
                        addLog("🏎️ Financed a gorgeous brand-new sports sedan! $12k loan balance added. monthly recurring transport spikes to $570.");
                    }
                }
            }
        ]
    },
    // --- 21 YEARS ---
    {
        age: 21.0,
        title: "Fuelling the Organic Vessel",
        speaker: "Cooking channel host",
        avatar: "🍔",
        tag: "NUTRITION",
        description: "Meal prep is time-consuming. Buying fast-food burgers and standard instant noodles is incredibly easy and cheap, but leads to midday energy sluggishness. Organic local grocery prep costs three times as much.",
        literacy: "<strong>Human Health & Compounding:</strong> Health is physical capital. What you save on cheap food delivery often returns later (compounded) as high medical bills and low productivity.",
        choices: [
            {
                label: "Ramen & Microwaves ($150/mo Food Expense)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: -12,
                    happinessChange: -2,
                    custom: (state) => {
                        state.foodCost = 150;
                        state.activeHabits.organicFood = false;
                        addLog("🍕 Diet shift: Microwaved junk food and quick bites. Low food expense at $150/mo but energy levels slip.");
                    }
                }
            },
            {
                label: "Balanced Home Cooking ($300/mo Food Expense)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 3,
                    happinessChange: 5,
                    custom: (state) => {
                        state.foodCost = 300;
                        state.activeHabits.organicFood = false;
                        addLog("🥗 Cook at Home strategy. Nourishing food for $300/mo. Health begins to rise.");
                    }
                }
            },
            {
                label: "All-Natural Organic Farm Share ($600/mo Premium Diet)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 15,
                    happinessChange: 10,
                    custom: (state) => {
                        state.foodCost = 600;
                        state.activeHabits.organicFood = true;
                        addLog("🍏 Signed up for Premium Organic subscription. Health increases heavily, but budget shrinks by $600/mo.");
                    }
                }
            }
        ]
    },
    // --- 22 YEARS (Graduation Event / Direct Job check) ---
    {
        age: 22.0,
        title: "Entering Professional Career Paths",
        speaker: "Recruiter Assistant",
        avatar: "💼",
        tag: "CAREER",
        description: "School schedules end! If you went to College/Ivy League, major firms are offering elite Corporate Trainee spots. If you went to Trade School, technical agencies want you. Alternatively, you can seek freelance flex work.",
        literacy: "<strong>Career Compounding:</strong> Unlocking higher income bands lets you invest larger capital sums. Watch out for lifestyle inflation where salary gains translate directly into more spending.",
        choices: [
            {
                label: "Take Corporate Cadet Track (High stress, High pay)",
                effects: {
                    cashChange: 1000,
                    debtIncrease: 0,
                    healthChange: -8,
                    happinessChange: -4,
                    custom: (state) => {
                        state.hasGraduated = true;
                        if (state.activeCareer === "student" && state.debt > 15000) {
                            // College grad success
                            state.activeCareer = "entry_level";
                            state.salary = 3800;
                            addLog("👔 University Grad corporate cadet position accepted. Starting salary: $3,800/mo. Fast path!");
                        } else if (state.activeCareer === "student") {
                            // Trade school success
                            state.activeCareer = "entry_level";
                            state.salary = 2400;
                            addLog("🛠️ Technical apprenticeship complete. Switched into Corporate junior associate. Salary: $2,400/mo.");
                        } else {
                            // Warehouse direct pathway
                            state.activeCareer = "entry_level";
                            state.salary = 2100;
                            addLog("📦 Promoted at Warehouse into Logistics Clerk. Salary increased to $2,100/mo.");
                        }
                    }
                }
            },
            {
                label: "Take Creative Independent Designer Track",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 4,
                    happinessChange: 15,
                    custom: (state) => {
                        state.hasGraduated = true;
                        state.activeCareer = "star_freelance";
                        state.salary = 2000;
                        addLog("🎨 Switched to full-time Freelance Designer. Maximum independence! Low stress, starting salary: $2,000/mo.");
                    }
                }
            }
        ]
    },
    // --- 24 YEARS ---
    {
        age: 24.0,
        title: "Trip Invitations: Vegas / Ibiza Calls",
        speaker: "Social Circle",
        avatar: "👥",
        tag: "SOCIAL",
        description: "Your closest friends are booking an luxurious, high-end vacation with VIP club passes. Tickets and stay cost $3,000. It requires exhausting travel but holds extreme pleasure potential.",
        literacy: "<strong>Opportunity Cost of YOLO:</strong> Compound calculations show that spending $3,000 at age 24 is equivalent to skipping over $30,000 in your retirement portfolio at age 65. Keep experiential spending within margins.",
        choices: [
            {
                label: "Charge it to credit cards! YOLO!",
                effects: {
                    cashChange: 0,
                    debtIncrease: 3000,
                    healthChange: -15, // heavy hangover/sleeplessness
                    happinessChange: 25,
                    custom: (state) => {
                        state.yoloCount++;
                        addLog("🎉 Flew to Ibiza! Charged $3,000 onto credit card lines. Exhausted but full of legendary memories!");
                    }
                }
            },
            {
                label: "Opt for a cheap weekend road trip alternative ($400)",
                effects: {
                    cashChange: -400,
                    debtIncrease: 0,
                    healthChange: -2,
                    happinessChange: 10,
                    custom: (state) => {
                        addLog("🚗 Chapped a modest local road trip instead. Kept costs capped at $400, solid happiness upgrade with healthy budget.");
                    }
                }
            },
            {
                label: "Decline trip and stay home (Save Cash)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 6,
                    happinessChange: -10, // severe FOMO
                    custom: (state) => {
                        addLog("🏠 Stayed home to save money. Experienced severe anxiety and FOMO browsing friends' social feeds, but cash preserved.");
                    }
                }
            }
        ]
    },
    // --- 26 YEARS ---
    {
        age: 26.0,
        title: "Gym Buddy Fitness Offer",
        speaker: "Gym Associate",
        avatar: "🏋️",
        tag: "WELLNESS",
        description: "Your health trajectory matters. A local boutique gym wants you to sign up for membership and personal coaching. It costs $60/mo, but guarantees high physical motivation.",
        literacy: "<strong>Health is Wealth:</strong> Fitness expenses are productive investments. Reducing health failures acts as direct medical insurance and raises career output potential.",
        choices: [
            {
                label: "Join Gym Membership Plan ($60/mo Recurrent)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 20,
                    happinessChange: 5,
                    custom: (state) => {
                        state.gymCost = 60;
                        state.activeHabits.gym = true;
                        addLog("🏋️ Signed up for Fitness Gym membership, adding $60/mo. Body transformation begins!");
                    }
                }
            },
            {
                label: "Opt for Home workouts / Park jogging (Free)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 8,
                    happinessChange: 0,
                    custom: (state) => {
                        state.gymCost = 0;
                        state.activeHabits.gym = false;
                        addLog("🏃 Vowed to exercise at local parks for free. Decent health upgrade, no financial drag.");
                    }
                }
            }
        ]
    },
    // --- 28 YEARS ---
    {
        age: 28.0,
        title: "Corporate 401(k) Match Opportunity",
        speaker: "HR Specialist",
        avatar: "📈",
        tag: "INVESTMENT",
        description: "Your company offers a 401(k) program. They will match 100% of your contributions up to 6% of your monthly salary. That's literally free money, but it reduces your immediate spendable cash.",
        literacy: "<strong>100% Guaranteed Return:</strong> Skipping employer matching programs is throwing away free cash. It is a guaranteed double-your-money (100% ROI) returns before market growth even starts.",
        choices: [
            {
                label: "Contribute 6% of Salary (Direct Stock investment with match)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 0,
                    happinessChange: -2,
                    custom: (state) => {
                        state.hasFour01k = true;
                        addLog("📈 Activated 401(k) match! 6% of paycheck auto-invests directly in S&P 500 stocks with company matching doubling it.");
                    }
                }
            },
            {
                label: "Keep cash fluid (Skip matching program)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 0,
                    happinessChange: 5,
                    custom: (state) => {
                        state.hasFour01k = false;
                        addLog("💵 Skipped matching program. Recieved higher immediate liquid cash, but lost free company benefit structures.");
                    }
                }
            }
        ]
    },
    // --- 30 YEARS ---
    {
        age: 30.0,
        title: "The Home Buying Milestone",
        speaker: "Bank Lender",
        avatar: "🏡",
        tag: "LIFESTYLE",
        description: "Age 30! The mortgage market is open. Renting limits your domestic improvements, whereas buying a suburban home requires an immediate $12,000 cash down payment and $1,200/mo mortgage, but builds secure property equity.",
        literacy: "<strong>Assets and Equity:</strong> A primary residence is a leveraged long-term equity builder. Mortgages act as forced generic savings plans while stabilizing housing cost volatility.",
        choices: [
            {
                label: "Buy Suburban House ($12,000 Down, Mortgage $1,200/mo)",
                effects: {
                    cashChange: -12000,
                    debtIncrease: 0, // represented as mortgage but built into custom
                    healthChange: 6,
                    happinessChange: 15,
                    custom: (state) => {
                        state.activeHousing = "suburban_home";
                        state.rent = 1200;
                        state.hasHomeEquity = 300; // Adds $300/season equity wealth value in background calculations
                        addLog("🏡 Purchased a beautiful suburban property! Replaced rent with $1,200/mo mortgage, building equity over the years.");
                    }
                }
            },
            {
                label: "Continue Renting & Keep Capital Fluid",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 0,
                    happinessChange: 2,
                    custom: (state) => {
                        addLog("🏢 Retained cheap flexible apartment rental. Retained liquid capital for active stock investments.");
                    }
                }
            }
        ]
    },
    // --- 33 YEARS ---
    {
        age: 33.0,
        title: "Burnout & Overtime Hustle",
        speaker: "Executive Senior",
        avatar: "👔",
        tag: "WORK",
        description: "Your directors are reviewing promotion schedules. If you agree to take over weekend project oversight (adding 15 hours of work per week), your salary will instantly jump by 35%, but stress levels will soar.",
        literacy: "<strong>Occupational Overwork Trade-offs:</strong> Converting sleep, fitness, and socialization time directly to cash flow builds deep health debts. Always budget recovery buffers in career plans.",
        choices: [
            {
                label: "Accept promotion with extra hours (+35% Salary Increase)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: -22,
                    happinessChange: -12,
                    custom: (state) => {
                        state.salary = Math.round(state.salary * 1.35);
                        addLog("👔 Accepted senior executive overtime promotion. Salary inflated heavily, but fatigue and stress levels spike.");
                    }
                }
            },
            {
                label: "Reject overtime to focus on personal work-life balance",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 8,
                    happinessChange: 8,
                    custom: (state) => {
                        addLog("🧘 Declined overwork request. Maintained mental recovery stability and personal peace.");
                    }
                }
            }
        ]
    },
    // --- 36 YEARS ---
    {
        age: 36.0,
        title: "Love & Marriage: The Big Wedding Plan",
        speaker: "Partner Suggestion",
        avatar: "💍",
        tag: "SOCIAL",
        description: "You are building a family foundation. Your partner dreams of a lavish, fairy-tale ceremony with over 200 guests. It costs $18,000 cash or loans, or you can opt for a cozy backyard wedding for $2,000.",
        literacy: "<strong>Starting Debt Free:</strong> Grand wedding ceremonies are major sources of early marriage arguments. Beginning a co-operative household deep in debt stalls critical compounding investments.",
        choices: [
            {
                label: "Book fairy-tale wedding ($18,000 cash or financed debt)",
                effects: {
                    cashChange: -4000,
                    debtIncrease: 14000,
                    healthChange: -2,
                    happinessChange: 30,
                    custom: (state) => {
                        addLog("👰 Celebrated a grand fairy-tale wedding! Drained savings and accrued $14,000 in loan lines. Memorable but costly!");
                    }
                }
            },
            {
                label: "Host simple backyard wedding with close circles ($2,000)",
                effects: {
                    cashChange: -2000,
                    debtIncrease: 0,
                    healthChange: 2,
                    happinessChange: 20,
                    custom: (state) => {
                        addLog("🏡 Intimate backyard ceremony with family. Cozy, deeply fulfilling, and cost only $2,000 cash. No debt!");
                    }
                }
            }
        ]
    },
    // --- 40 YEARS ---
    {
        age: 40.0,
        title: "Stock Market Crash Opportunity!",
        speaker: "Finance News",
        avatar: "📈",
        tag: "INVESTMENT",
        description: "Fear rules Wall Street! The major stock index has collapsed by 30% due to panic selling. Financial pundits recommend escaping to safe cash gold nodes. Wise allocators argue stocks are on major sale.",
        literacy: "<strong>Contrarian Buying:</strong> Stock market volatility is natural. Selling in panic locks in paper losses. Buying discounted stocks when others are fearful speeds wealth accumulation.",
        choices: [
            {
                label: "Buy the Discount! Transfer $5,000 from cash savings into Stocks",
                effects: {
                    cashChange: -5000,
                    debtIncrease: 0,
                    healthChange: 0,
                    happinessChange: 2,
                    custom: (state) => {
                        // Stocks bought at 30% crash bonus!
                        state.portfolio += 7500; // instant equity booster
                        addLog("📈 Contrarian investor: Bought crash dip with $5,000 liquid savings. Acquired $7,500 worth of equities at bargain valuations!", true);
                    }
                }
            },
            {
                label: "Hold steady (Ignore panic lines)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 0,
                    happinessChange: 0,
                    custom: (state) => {
                        addLog("🧘 Held positions static. Avoided emotional reactive panic, maintaining investment course.");
                    }
                }
            },
            {
                label: "Panic Liquidation (Sell stock portfolio to fluid cash)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: -4,
                    happinessChange: -8,
                    custom: (state) => {
                        if (state.portfolio > 0) {
                            const lossFactor = Math.round(state.portfolio * 0.3);
                            state.wealth += Math.round(state.portfolio * 0.7);
                            state.portfolio = 0;
                            addLog("📉 Panic Seller: Liquidated entire stock market portfolio at bottom valuations lock-in, suffering key losses of $" + lossFactor, true);
                        } else {
                            addLog("🧘 Attempted panic liquidation, but portfolio did not hold active equity holdings.");
                        }
                    }
                }
            }
        ]
    },
    // --- 44 YEARS ---
    {
        age: 44.0,
        title: "A Sudden Healthcare Challenge",
        speaker: "Doctor",
        avatar: "🩺",
        tag: "HEALTH",
        description: "You have been experiencing chronic tooth pain and deep joint stiffness. A comprehensive diagnostic scan confirms emergency root canal requirements and skeletal alignment courses. Direct cash costs: $4,000.",
        literacy: "<strong>Health Outlays and Co-pays:</strong> Medical emergencies are primary drivers of bankruptcy. Establishing liquid savings shields your assets from immediate forced sell-offs.",
        choices: [
            {
                label: "Pay full premium medical procedures ($4,000 cash or loan)",
                effects: {
                    cashChange: -4000,
                    debtIncrease: 0,
                    healthChange: 25,
                    happinessChange: 8,
                    custom: (state) => {
                        addLog("🩺 Underwent full advanced surgical and dental rehabilitation. Restored natural energy. Cost: $4,000 cash.");
                    }
                }
            },
            {
                label: "Ignore diagnostics & rely on cheap home remedies ($300)",
                effects: {
                    cashChange: -300,
                    debtIncrease: 0,
                    healthChange: -25,
                    happinessChange: -15,
                    custom: (state) => {
                        addLog("😷 Postponed professional clinical procedures. Sustained chronic physical pain and severe exhaustion.");
                    }
                }
            }
        ]
    },
    // --- 48 YEARS ---
    {
        age: 48.0,
        title: "Mid-Life Career Burnout Crisis",
        speaker: "Psychologist",
        avatar: "🧠",
        tag: "CAREER",
        description: "The daily corporate grind feels draining. Your brain feels overloaded. Will you step down to a quiet part-time Consulting role with 30% lower salary but low stress, or grind along?",
        literacy: "<strong>Emotional Hedonics:</strong> Work is a marathon, not a sprint. Stepping back to protect health and mental sanity often prevents catastrophic midlife collapse.",
        choices: [
            {
                label: "Transition to Part-time Consulting (Lower pay, High self-care)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 15,
                    happinessChange: 18,
                    custom: (state) => {
                        state.salary = Math.round(state.salary * 0.70);
                        state.activeCareer = "star_freelance";
                        addLog("🧠 Transitioned to flexible Consulting. Slashed monthly salary by 30% but won vital mental relaxation.");
                    }
                }
            },
            {
                label: "Grind past fatigue to maintain highest cash streams",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: -18,
                    happinessChange: -10,
                    custom: (state) => {
                        addLog("⚡ Chose to power through career exhaustion. Income remains peak, but emotional fatigue weakens immunity.");
                    }
                }
            }
        ]
    },
    // --- 52 YEARS ---
    {
        age: 52.0,
        title: "Mid-Life Luxury Yacht / Corvette Temptation",
        speaker: "Inner Ego",
        avatar: "🛥️",
        tag: "LIFESTYLE",
        description: "You've worked decades. Your suburban neighbors are showing off shiny luxury sports gear. A gorgeous midsize sailboat or vintage sports cruiser is on sale for $12,000 cash. Fulfill your dream?",
        literacy: "<strong>Hedonic Treadmill status goals:</strong> Purchasing high-cost luxury hobbies creates rapid utility spikes, but the thrill fades fast. Recurring docking, insurance and fuel fees drag cash flows.",
        choices: [
            {
                label: "Acquire Corvette Cruiser! ($12,000 cash outlay, +$150/mo fees)",
                effects: {
                    cashChange: -12000,
                    debtIncrease: 0,
                    healthChange: 0,
                    happinessChange: 20,
                    custom: (state) => {
                        state.subscriptionCost += 150; // boat fees
                        addLog("🏎️ Fulfills dream: Acquired vintage luxury machine! Major dopamine rush, adding $150/mo in recurring operational maintenance.");
                    }
                }
            },
            {
                label: "Decline temptation and redirect $12k to S&P 500 Index fund",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 3,
                    happinessChange: 2,
                    custom: (state) => {
                        state.portfolio += 12000;
                        addLog("📈 Financial discipline: Deposited $12,000 midlife cash directly into stock portfolio. Let compounding accelerate!", true);
                    }
                }
            }
        ]
    },
    // --- 56 YEARS ---
    {
        age: 56.0,
        title: "A Distant Bequest Arrives",
        speaker: "Executor Lawyer",
        avatar: "✉️",
        tag: "WEALTH",
        description: "An aging family relative has passed away, leaving you a surprise cash bequest of $25,000. How do you handle this unexpected capital windfall?",
        literacy: "<strong>Windfall Allocation Rules:</strong> Instant cash windfalls should be systematically split: pay down high-interest debts, secure an emergency fund, and invest the remainder.",
        choices: [
            {
                label: "Pay down remaining Debts, and invest excess cash in S&P 500",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0, // customized below
                    healthChange: 0,
                    happinessChange: 5,
                    custom: (state) => {
                        const originalDebt = state.debt;
                        if (originalDebt > 0) {
                            const paid = Math.min(25000, originalDebt);
                            state.debt -= paid;
                            const excess = 25000 - paid;
                            state.portfolio += excess;
                            addLog(`✉️ Retained windfall split: Liquidated $${paid.toLocaleString()} outstanding debts and deposited remaining $${excess.toLocaleString()} into long-term equities!`, true);
                        } else {
                            state.portfolio += 25000;
                            addLog("📈 Clean Balance windfalls: Deposited full $25,000 inheritance into compounding equity files.", true);
                        }
                    }
                }
            },
            {
                label: "Plan a world cruise with first-class travel tickets ($15,000)",
                effects: {
                    cashChange: 10000, // keep 10k, spend 15k
                    debtIncrease: 0,
                    healthChange: 8,
                    happinessChange: 30, // maximum happiness boost
                    custom: (state) => {
                        addLog("🚢 Went on legendary first-class world cruise, spending $15,000 cash. Retained remaining $10,000 inside checking rows.");
                    }
                }
            }
        ]
    },
    // --- 60 YEARS ---
    {
        age: 60.0,
        title: "Establishing Legacy Foundations",
        speaker: "Family Council",
        avatar: "👥",
        tag: "SOCIAL",
        description: "You are reaching old age. Your descendants or local neighborhood suggest sponsoring a Community Garden Park, or custom upgrading your home for senior relaxation with a custom Spa deck ($8,000 cost).",
        literacy: "<strong>Generational Well-being:</strong> Philanthropy and community connection create profound dopamine spikes in old age. Generous living raises subjective longevity values.",
        choices: [
            {
                label: "Sponsor Local Community Green Park ($8,000 donation)",
                effects: {
                    cashChange: -8000,
                    debtIncrease: 0,
                    healthChange: 6,
                    happinessChange: 26,
                    custom: (state) => {
                        addLog("🌲 Sponsered the 'LifeForge Community Park' project. Neighborhood relationships thrive, delivering deep spiritual fulfillment.");
                    }
                }
            },
            {
                label: "Install Luxury Therapeutic Spa Deck at your Home ($8,000)",
                effects: {
                    cashChange: -8000,
                    debtIncrease: 0,
                    healthChange: 14,
                    happinessChange: 14,
                    custom: (state) => {
                        addLog("🛀 Installed advanced indoor sauna and hydrotherapy jacuzzi equipment, delivering physical health care.");
                    }
                }
            },
            {
                label: "Decline actions and preserve cash cushions for retirement stability",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 0,
                    happinessChange: -5,
                    custom: (state) => {
                        addLog("💵 Retained capital reserves for post-65 healthcare protections.");
                    }
                }
            }
        ]
    }
];

// Fallback random seasonal triggers (life events) when timeline steps
const RANDOM_EVENTS_DECK = [
    {
        title: "Major Dental Extraction Pain",
        speaker: "Dentist Clinic",
        avatar: "🦷",
        tag: "HEALTH",
        description: "Your wisdom teeth have severely infected neighboring gums. Medical surgeons demand $1,200 cash payment upfront to perform dental extractions.",
        literacy: "<strong>Emergency Funds:</strong> Holding 3 to 6 months of expenses in high-yield cash products shields you from taking on credit card debt for unexpected events.",
        choices: [
            {
                label: "Undergo surgery ($1,200 Cash)",
                effects: {
                    cashChange: -1200,
                    debtIncrease: 0,
                    healthChange: 10,
                    happinessChange: 4,
                    custom: (state) => { addLog("🦷 Extracted infected teeth, eliminating critical systemic inflammation. Cost: $1,200."); }
                }
            },
            {
                label: "Refuse treatment and endure tooth decay",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: -15,
                    happinessChange: -10,
                    custom: (state) => { addLog("🤢 Refused treatment, allowing bacterial toxicity to weaken immune physical health."); }
                }
            }
        ]
    },
    {
        title: "Streaming Subscriptions Overload",
        speaker: "Ego check",
        avatar: "📺",
        tag: "SPENDING",
        description: "You realize you are paying for Netflix, Spotify, Gym memberships, food apps, and storage lines. They aggregate to a creeping $100/mo cash leak.",
        literacy: "<strong>Subscription Creep:</strong> Tiny repeating expenses represent 'silent wealth killers'. A recurring $100/mo leak equals $1,200/yr which compounding blocks from investing portfolios.",
        choices: [
            {
                label: "Audit ledger and cancel luxury subscriptions (Save $100/mo)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 0,
                    happinessChange: -4,
                    custom: (state) => {
                        state.subscriptionCost = Math.max(0, state.subscriptionCost - 100);
                        addLog("📺 Audited finances and purged unused streaming lines. Reclaimed $100 monthly cash flow!");
                    }
                }
            },
            {
                label: "Retain memberships for immediate digital indulgence",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: -1,
                    happinessChange: 4,
                    custom: (state) => {
                        state.subscriptionCost += 30; // some creep
                        addLog("🎮 Retained streaming catalogs. Fast media entertainment preserved, budget slightly more compressed.");
                    }
                }
            }
        ]
    },
    {
        title: "Speculative Crypto / Meme coin FOMO",
        speaker: "Subreddit Trend",
        avatar: "🚀",
        tag: "INVESTMENT",
        description: "An alternative micro-currency has spiked 800% this week. Friends are posting snapshot profits. A $1,500 buy-in offers massive speculative return probabilities or risk of absolute wipeout.",
        literacy: "<strong>Speculative Gambling:</strong> High return claims hide massive risk. Wealth is reliably created via slow compounding of diversified real-world businesses, not zero-sum crypto lotteries.",
        choices: [
            {
                label: "Decline gamble, sticking to S&P 500 Broad index",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 1,
                    happinessChange: 0,
                    custom: (state) => { addLog("📈 Safe investing course maintained. Ignored asset bubbles, prioritizing sound assets."); }
                }
            },
            {
                label: "Speculate heavily ($1,500 Cash investment)",
                effects: {
                    cashChange: -1500,
                    debtIncrease: 0, // customized randomized loss/win
                    healthChange: -4,
                    happinessChange: 5,
                    custom: (state) => {
                        const winProbability = Math.random() < 0.20; // 20% win chance
                        if (winProbability) {
                            state.portfolio += 8000;
                            addLog("🚀 LUCKY BREAK! Speculative coins surged dramatically! Handed $8,000 equity increase on your $1,500 risk!", true);
                        } else {
                            addLog("📉 Bubble Pop: Speculative coin rug-pulled. Your full $1,500 asset position was completely wiped out.", true);
                        }
                    }
                }
            }
        ]
    },
    {
        title: "HVAC Climate / Auto break downs",
        speaker: "Mechanic Shop",
        avatar: "🔧",
        tag: "LIFESTYLE",
        description: "An unexpected mechanical fail splits your vehicle gears or house heating system. Safe operations require immediate $1,500 technician maintenance.",
        literacy: "<strong>Emergency Cost Controls:</strong> Maintaining a separate, safe cash savings buffer prevents these inevitable physical breakdowns from forcing high-interest credit card debt loads.",
        choices: [
            {
                label: "Pay professional repairs ($1,500 Cash)",
                effects: {
                    cashChange: -1500,
                    debtIncrease: 0,
                    healthChange: 0,
                    happinessChange: 2,
                    custom: (state) => { addLog("🔧 Machinery issues resolved. Paid repair invoice of $1,500 cash from liquid accounts."); }
                }
            },
            {
                label: "Delay fixes (Rely on thick winter blankets or transit walking)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: -8,
                    happinessChange: -12,
                    custom: (state) => { addLog("🥶 Delayed machinery fixes. Suffered heavy indoor freezing elements and physical stress."); }
                }
            }
        ]
    }
];

// Single manual turn cycle - seasonal progression update
function tickSeason(forceAdvance = false) {
    if (gameState.isPaused && !forceAdvance) return;

    // Player-led pacing: life waits for the player to resolve active decisions.
    if (gameState.currentEvent !== null) {
        updateDecisionMilestoneVisual();
        setPlayerLedWaitState("CHOICE READY");
        return;
    }

    // Full life arc ends at 85 (work typically to 65; retirement years still score)
    if (gameState.age >= LIFE_END_AGE) {
        endGameRetirement("age_limit");
        return;
    }

    // At work-end age, shift career to retired if still earning wages
    if (gameState.age >= WORK_END_AGE && gameState.activeCareer !== "retired" && gameState.salary > 0) {
        const priorSalary = gameState.salary;
        gameState.activeCareer = "retired";
        gameState.salary = 0;
        addLog(`🌅 <span class="text-amber-300 font-black">Retirement transition:</span> Wage income of $${priorSalary.toLocaleString()}/mo ended at age ${WORK_END_AGE}. Living on savings, investments, and stewardship choices through age ${LIFE_END_AGE}.`, true);
    }

    // 1. Advance age structures
    gameState.age += 0.25; // 3 months
    gameState.seasonIdx = (gameState.seasonIdx + 1) % 4;

    // Redraw scenery weather/particles based on seasonal changes
    updateSeasonalEffects();

    // 2. Apply recurring cashflow finance algorithms
    const monthsInSeason = 3;
    
    // Core stock portfolio compound yields (Quarterly returns)
    let stockYieldRatio = gameState.portfolioYieldRate / 4;
    let portfolioAdGain = Math.round(gameState.portfolio * stockYieldRatio);
    gameState.portfolio += portfolioAdGain;
    
    // Liquid savings compound yields (Quarterly returns)
    let liquidYieldRatio = gameState.savingsYieldRate / 4;
    let savingsAdGain = Math.round(gameState.wealth * liquidYieldRatio);
    if (gameState.wealth > 0) {
        gameState.wealth += savingsAdGain;
    }
    
    // 401k corporate match savings injections
    let matchingInflow = 0;
    if (gameState.hasFour01k) {
        // Redirect 6% of salary directly to stocks every month, matched 100% by employer!
        // Total invested = (salary * 0.06 * 2) * 3 months
        let baseInvested = Math.round(gameState.salary * 0.06 * monthsInSeason);
        let corpMatchBenefit = baseInvested; // matching 100%
        gameState.portfolio += (baseInvested + corpMatchBenefit);
        matchingInflow = baseInvested; // deductions from spending cash
    }

    // Leveraged house equity gains
    if (gameState.activeHousing === "suburban_home" && gameState.hasHomeEquity > 0) {
        // Leveraged home appreciates in value. Adding $300/season equity values to wealth assets
        gameState.portfolio += gameState.hasHomeEquity;
    }

    // High interest liability calculations (Debt compounds)
    let quarterlyDebtInterest = 0;
    if (gameState.debt > 0) {
        quarterlyDebtInterest = Math.round(gameState.debt * (gameState.debtInterestRate / 4));
        gameState.debt += quarterlyDebtInterest;
    }

    // Standard cash inflows
    let quarterlyGrossSalary = (gameState.salary) * monthsInSeason;
    
    // Deduct stock matching from liquid spendable savings
    if (gameState.hasFour01k) {
        quarterlyGrossSalary -= (matchingInflow);
    }

    // Adjust salary values based on critical health multipliers (Literacy logs link)
    let healthSalaryAdjustment = 0;
    if (gameState.health >= 85) {
        healthSalaryAdjustment = Math.round(quarterlyGrossSalary * 0.05); // +5% Focus bonus
        quarterlyGrossSalary += healthSalaryAdjustment;
    } else if (gameState.health < 30) {
        healthSalaryAdjustment = -Math.round(quarterlyGrossSalary * 0.15); // Focus and energy drag
        quarterlyGrossSalary += healthSalaryAdjustment;
        gameState.healthCrisisSeasons++;
        
        if (gameState.healthCrisisSeasons === 1 || gameState.healthCrisisSeasons % 4 === 0) {
            const sickFee = 750;
            gameState.wealth -= sickFee;
            addLog(`🩺 <span class="text-amber-300 font-semibold">Health warning:</span> Low energy reduced earning power and added $750 in care costs. Recovery options may appear soon.`, true);
        }
    } else {
        gameState.healthCrisisSeasons = 0;
    }

    // Standard core monthly expenses
    const monthlySumOutflows = gameState.rent + gameState.foodCost + gameState.transportCost + gameState.gymCost + gameState.subscriptionCost + gameState.insuranceCost;
    const quarterlyOutflows = monthlySumOutflows * monthsInSeason;

    // Net fluid savings delta
    const netCurrentTally = quarterlyGrossSalary - quarterlyOutflows;
    gameState.wealth += netCurrentTally;

    // Seasonal cash shortfall check
    const seasonalShortfall = convertCashShortfallToCredit("This season's income, bills, and care costs");
    if (seasonalShortfall > 0) {
        addLog(`🧭 Watch for a catch-up option, or use Budget/Assets before advancing another season.`, true);
        gameState.happiness = Math.max(0, gameState.happiness - 10);
    }

    // 3. PILLAR DYNAMICS - DECAY AND BONUSES
    // Standard natural health and joy decays over season time
    gameState.happiness = Math.max(0, gameState.happiness - 0.75);
    gameState.health = Math.max(0, gameState.health - 0.65);

    // Side Hustle fatigue drag
    if (gameState.hasSideHustle) {
        gameState.health = Math.max(0, gameState.health - 1.0);
        gameState.happiness = Math.max(0, gameState.happiness - 0.75);
    }

    // Leisure recovery when fully unemployed
    if (gameState.activeCareer === "unemployed") {
        gameState.happiness = Math.min(100, gameState.happiness + 4.0);
    }

    // Food adjustments
    if (gameState.activeHabits.organicFood) {
        gameState.health = Math.min(100, gameState.health + 1.5);
        gameState.happiness = Math.min(100, gameState.happiness + 0.75);
    } else {
        gameState.health = Math.max(0, gameState.health - 0.25); // lower nutrition drag
    }

    // Fitness adjustments
    if (gameState.activeHabits.gym) {
        gameState.health = Math.min(100, gameState.health + 2.0);
        gameState.happiness = Math.min(100, gameState.happiness + 1.0);
    }

    // Recurring joy habits
    if (gameState.activeHabits.social) {
        gameState.happiness = Math.min(100, gameState.happiness + 4.0);
    }

    if (gameState.activeHabits.streaming) {
        gameState.happiness = Math.min(100, gameState.happiness + 0.75);
    }

    // Debt stress happiness dampener
    if (gameState.debt > 25000) {
        gameState.happiness = Math.max(0, gameState.happiness - 1.5);
    } else if (gameState.debt > 5000) {
        gameState.happiness = Math.max(0, gameState.happiness - 0.5);
    }

    // Sports car temporary thrill decay (Hedonic treadmill)
    if (gameState.activeTransport === "sports_car") {
        if (gameState.sportsCarTimer > 0) {
            gameState.sportsCarTimer--;
            gameState.happiness = Math.min(100, gameState.happiness + 6.0); // maximum joy early
        } else {
            // thrill is gone, but payment is still there!
            gameState.happiness = Math.max(0, gameState.happiness - 1.0); // annoyed at payments
        }
    }

    // Keep stats in bounds (0 - 100)
    gameState.health = Math.max(0, Math.min(100, gameState.health));
    gameState.happiness = Math.max(0, Math.min(100, gameState.happiness));

    // 4. CRITICAL STATE BREAK POINTS (DEATH OR DEPRESSION CRISIS)
    if (gameState.health <= 0) {
        endGameRetirement("health_crisis");
        return;
    }

    if (gameState.happiness <= 0) {
        addLog(`🧠 <span class="text-violet-400 font-bold uppercase">Mental Health Break:</span> Joy hit bottom. Forced onto temporary unpaid leave for clinical therapy. Cash flow halted for 1 season. Cost: $2,500.`, true);
        gameState.wealth = Math.max(0, gameState.wealth - 2500);
        gameState.happiness = 30; // reset
        gameState.health = Math.max(10, gameState.health - 15);
    }

    // Save historical data
    gameState.history.push({
        age: gameState.age,
        health: gameState.health,
        wealth: gameState.wealth + gameState.portfolio - gameState.debt,
        happiness: gameState.happiness
    });

    // 5. QUEUE SCHEDULER: DISPATCH EVENTS AT CORRECT MILESTONES
    dispatchPendingChoice();

    updateHUD();
}

// Scenery season elements transitions
function updateSeasonalEffects() {
    const parent = document.getElementById("scenery-particles");
    if (!parent) return;
    
    parent.innerHTML = ""; // clear past items
    const activeSeason = gameState.seasons[gameState.seasonIdx];
    
    let particleEmoji = "🌸";
    if (activeSeason === "Summer") particleEmoji = "☀️";
    else if (activeSeason === "Autumn") particleEmoji = "🍂";
    else if (activeSeason === "Winter") particleEmoji = "❄️";
    
    // Spawn 4 static-ish little seasonal weather indicators
    for (let i = 0; i < 4; i++) {
        const span = document.createElement("span");
        span.className = "absolute text-xs opacity-20 pointer-events-none select-none";
        span.style.left = `${5 + Math.random() * 90}%`;
        span.style.top = `${10 + Math.random() * 40}%`;
        span.textContent = particleEmoji;
        parent.appendChild(span);
    }
}

function ensureCatchUpFlags() {
    if (!gameState.catchUpOffered) {
        gameState.catchUpOffered = { health: false, debt: false, cashDebt: false };
    }
}

function createHealthCatchUpEvent() {
    return {
        title: "Recovery Plan Check-In",
        speaker: "Community Health Coach",
        avatar: "🧘",
        tag: "RECOVERY",
        description: "Your body is sending early warning signs. Nothing is over, but this is a good moment to choose a recovery plan before stress becomes a crisis.",
        literacy: "<strong>Preventive Care:</strong> Small recovery investments can protect income, reduce future medical bills, and keep life choices open.",
        choices: [
            {
                label: "Join a basic gym and sleep routine ($60/mo)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 18,
                    happinessChange: 6,
                    custom: (state) => {
                        state.activeHabits.gym = true;
                        state.gymCost = 60;
                        state.healthCrisisSeasons = 0;
                        addLog("🧘 Recovery plan started: basic gym, sleep routine, and weekly movement now support health each season.", true);
                    }
                }
            },
            {
                label: "Use a community clinic preventive checkup ($500)",
                effects: {
                    cashChange: -500,
                    debtIncrease: 0,
                    healthChange: 12,
                    happinessChange: 2,
                    custom: (state) => {
                        state.healthCrisisSeasons = 0;
                        addLog("🩺 Preventive clinic visit caught small issues early. Health recovered before it became a major expense.", true);
                    }
                }
            },
            {
                label: "Take a low-cost reset week and reduce strain ($300 lost income)",
                effects: {
                    cashChange: -300,
                    debtIncrease: 0,
                    healthChange: 8,
                    happinessChange: 8,
                    custom: (state) => {
                        state.healthCrisisSeasons = 0;
                        addLog("🌿 Took a reset week. It cost income, but restored enough energy to keep moving.");
                    }
                }
            }
        ]
    };
}

function createDebtCatchUpEvent() {
    return {
        title: "Credit Counselor Catch-Up Plan",
        speaker: "Nonprofit Credit Counselor",
        avatar: "💳",
        tag: "DEBT HELP",
        description: "Your high-interest balance is growing, but lenders would rather see a workable payment plan than a total collapse. You can still stabilize the situation.",
        literacy: "<strong>Debt Stabilization:</strong> Real life includes hardship plans, refinancing, selling expensive assets, and structured repayment. These choices still cost something, but they stop runaway compounding.",
        choices: [
            {
                label: "Enter hardship repayment plan (lower APR, partial fee waiver)",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 0,
                    happinessChange: 6,
                    custom: (state) => {
                        const waived = Math.min(9000, Math.round(state.debt * 0.18));
                        state.debt = Math.max(0, state.debt - waived);
                        state.debtInterestRate = Math.min(state.debtInterestRate, 0.09);
                        addLog(`💳 Hardship plan approved. Fees waived: $${waived.toLocaleString()}. Debt APR reduced to 9.0%.`, true);
                    }
                }
            },
            {
                label: "Sell lifestyle costs and refinance the balance",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 2,
                    happinessChange: -5,
                    custom: (state) => {
                        const payoff = Math.min(12000, Math.round(state.debt * 0.22));
                        state.debt = Math.max(0, state.debt - payoff);
                        state.debtInterestRate = Math.min(state.debtInterestRate, 0.11);
                        if (state.activeTransport === "sports_car") {
                            state.activeTransport = "walking";
                            state.transportCost = 60;
                            state.insuranceCost = Math.max(0, state.insuranceCost - 120);
                        }
                        addLog(`🔁 Refinanced and cut lifestyle drag. Debt reduced by $${payoff.toLocaleString()} and recurring transport pressure fell.`, true);
                    }
                }
            },
            {
                label: "Keep current plan and monitor it for now",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 0,
                    happinessChange: -3,
                    custom: () => {
                        addLog("💳 Kept the current repayment pattern. No immediate change, but the interest meter keeps mattering.");
                    }
                }
            }
        ]
    };
}

function createCashDebtCoachEvent() {
    return {
        title: "Cash And Debt Strategy Check",
        speaker: "Financial Coach",
        avatar: "🧾",
        tag: "MONEY COACH",
        description: "You have enough liquid cash to change your debt picture. Keeping an emergency fund matters, but high-interest debt is also quietly charging you every month.",
        literacy: "<strong>Opportunity Cost:</strong> Paying high-interest debt can be a guaranteed return because it removes future interest charges. The best answer still preserves enough cash for emergencies.",
        choices: [
            {
                label: "Pay a focused chunk of high-interest debt from cash",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 0,
                    happinessChange: 5,
                    custom: (state) => {
                        const payment = Math.min(state.debt, Math.max(1000, Math.round(state.wealth * 0.45)));
                        state.wealth -= payment;
                        state.debt -= payment;
                        if (state.debt <= 0) state.debtInterestRate = 0.045;
                        addLog(`🧾 Paid $${payment.toLocaleString()} from cash toward debt while keeping an emergency reserve.`, true);
                    }
                }
            },
            {
                label: "Keep the cash buffer and set a slower payoff target",
                effects: {
                    cashChange: 0,
                    debtIncrease: 0,
                    healthChange: 0,
                    happinessChange: 1,
                    custom: () => {
                        addLog("🧾 Kept a larger cash buffer. Safe for emergencies, but interest remains a drag to watch.");
                    }
                }
            },
            {
                label: "Refinance first, then make smaller payments",
                effects: {
                    cashChange: -300,
                    debtIncrease: 0,
                    healthChange: 0,
                    happinessChange: 3,
                    custom: (state) => {
                        state.debtInterestRate = Math.min(state.debtInterestRate, 0.085);
                        addLog("🧾 Refinanced paperwork cost $300, but debt APR dropped to 8.5% for a more realistic payoff path.", true);
                    }
                }
            }
        ]
    };
}

function getCatchUpOpportunity() {
    ensureCatchUpFlags();

    if (!gameState.catchUpOffered.health && gameState.health < 35) {
        gameState.catchUpOffered.health = true;
        return createHealthCatchUpEvent();
    }

    if (!gameState.catchUpOffered.debt && gameState.debtInterestRate >= 0.15 && gameState.debt > 10000) {
        gameState.catchUpOffered.debt = true;
        return createDebtCatchUpEvent();
    }

    if (!gameState.catchUpOffered.cashDebt && gameState.debt > 0 && gameState.wealth > 10000 && gameState.wealth > gameState.debt * 0.4) {
        gameState.catchUpOffered.cashDebt = true;
        return createCashDebtCoachEvent();
    }

    return null;
}

// Dispatches a decision card if milestone matches
function dispatchPendingChoice() {
    // 1. Check if an active choice card is currently visual to avoid overwrites
    if (gameState.currentEvent !== null) return;
    
    // 2. Hunt for chronological cards (legacy ages shifted +7 so 18→25, 60→67)
    let match = DECISION_CARDS.find(card => Math.abs((card.age + AGE_OFFSET_FROM_LEGACY) - gameState.age) < 0.1);
    
    if (match) {
        presentEventCard(match);
    } else {
        const catchUpEvent = getCatchUpOpportunity();
        if (catchUpEvent) {
            presentEventCard(catchUpEvent);
            return;
        }

        // 3. Fallback conditional rates: 15% probability per season of random secondary life events
        const randomOccur = Math.random() < 0.15;
        if (randomOccur) {
            const picked = RANDOM_EVENTS_DECK[Math.floor(Math.random() * RANDOM_EVENTS_DECK.length)];
            presentEventCard(picked);
        }
    }
}

// Active decision milestone prompt updater
function updateDecisionMilestoneVisual() {
    const banner = document.getElementById("decision-milestone-banner");
    const timeLeft = document.getElementById("decision-ready-label");
    if (!banner || !timeLeft || !gameState.currentEvent) return;

    banner.classList.remove("hidden");
    timeLeft.textContent = "Choose when ready";
    banner.className = "bg-teal-500/10 border border-teal-500/25 px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-xs transition duration-300";
    timeLeft.className = "bg-slate-950 text-teal-200 border border-teal-500/20 font-black px-2 py-0.5 rounded-lg text-[9px] tracking-wide shadow text-right";
}

function getChoiceTeachingNote(choice, event) {
    event = event || {};
    const effects = choice.effects || {};
    const cashChange = effects.cashChange || 0;
    const debtIncrease = effects.debtIncrease || 0;
    const healthChange = effects.healthChange || 0;
    const happinessChange = effects.happinessChange || 0;
    const tag = (event.tag || "").toLowerCase();

    if (debtIncrease > 0 && happinessChange > 10) {
        return "Fast joy, delayed bill. The fun arrives immediately, but the lender keeps charging interest every month.";
    }
    if (debtIncrease > 0) {
        return `Borrowing adds about ${formatMoney(debtIncrease * (gameState.debtInterestRate / 12))}/mo in interest before you even reduce principal.`;
    }
    if (cashChange < 0 && healthChange > 0) {
        return "This converts cash into health capital. It can protect future income if it keeps you away from burnout and medical penalties.";
    }
    if (cashChange < 0 && happinessChange > 0) {
        return "This buys quality of life. The question is whether the joy is worth the capital that will no longer compound.";
    }
    if (cashChange > 0 && healthChange < 0) {
        return "This boosts liquidity by spending energy. Watch whether the extra income is worth the health and focus decay.";
    }
    if (healthChange < 0 && happinessChange > 0) {
        return "This is a classic thrill trade: happiness rises now, while the body pays some of the invoice.";
    }
    if (tag.includes("investment") || tag.includes("wealth")) {
        return "This choice changes which side of compounding you stand on: owning assets or owing payments.";
    }
    if (tag.includes("education") || tag.includes("career")) {
        return "This choice shapes future income range. Higher earning power can overcome early cost, but only if debt stays manageable.";
    }
    return "Compare the immediate score change with the recurring pressure it creates in the seasons ahead.";
}

function getChoiceMechanicsHTML(choice, event) {
    event = event || {};
    const effects = choice.effects || {};
    const cashChange = effects.cashChange || 0;
    const debtIncrease = effects.debtIncrease || 0;
    const netWorthDelta = cashChange - debtIncrease;
    const capitalAtStake = Math.max(0, -cashChange) + Math.max(0, debtIncrease);
    const futureValue = estimateCompoundedValue(capitalAtStake);
    const addedDebtInterest = Math.round(debtIncrease * (gameState.debtInterestRate / 12));
    const projectedNetWorth = getCurrentNetWorth() + netWorthDelta;
    const netDeltaClass = netWorthDelta >= 0 ? "text-emerald-400" : "text-rose-400";
    const projectedClass = projectedNetWorth >= 0 ? "text-emerald-400" : "text-rose-400";

    return `
        <div class="mt-3 rounded-xl bg-slate-950/55 border border-slate-800/70 p-2.5">
            <div class="grid grid-cols-1 xs:grid-cols-3 gap-1.5">
                <div class="rounded-lg bg-slate-900/80 border border-slate-800 px-2 py-1.5">
                    <span class="block text-[7px] uppercase tracking-wider text-slate-500 font-black">Net Now</span>
                    <strong class="block text-[10px] ${netDeltaClass}">${formatMoney(netWorthDelta, true)}</strong>
                </div>
                <div class="rounded-lg bg-slate-900/80 border border-slate-800 px-2 py-1.5">
                    <span class="block text-[7px] uppercase tracking-wider text-slate-500 font-black">Debt Cost</span>
                    <strong class="block text-[10px] ${addedDebtInterest > 0 ? "text-amber-400" : "text-slate-300"}">${addedDebtInterest > 0 ? `${formatMoney(addedDebtInterest)}/mo` : "No new debt"}</strong>
                </div>
                <div class="rounded-lg bg-slate-900/80 border border-slate-800 px-2 py-1.5">
                    <span class="block text-[7px] uppercase tracking-wider text-slate-500 font-black">After Pick</span>
                    <strong class="block text-[10px] ${projectedClass}">${formatMoney(projectedNetWorth)}</strong>
                </div>
            </div>
            ${capitalAtStake > 0 ? `<div class="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-1.5 text-[9px] leading-snug text-amber-100"><strong>Compounding lens:</strong> ${formatMoney(capitalAtStake)} redirected from assets or added as debt could represent about ${formatMoney(futureValue)} by age 65 at 8% growth.</div>` : ""}
            <div class="mt-2 text-[9.5px] leading-snug text-slate-400"><strong class="text-slate-300">Why it matters:</strong> ${getChoiceTeachingNote(choice, event)}</div>
        </div>
    `;
}

// Predict and format expected effects of any choice option
function getChoiceEffectsHTML(choice, event) {
    let badges = [];
    if (choice.effects) {
        // Cash change
        if (choice.effects.cashChange !== undefined && choice.effects.cashChange !== 0) {
            if (choice.effects.cashChange > 0) {
                badges.push(`<span class="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-extrabold"><i class="fa-solid fa-wallet"></i> +$${choice.effects.cashChange.toLocaleString()} Cash</span>`);
            } else {
                badges.push(`<span class="inline-flex items-center gap-1 bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-extrabold"><i class="fa-solid fa-wallet"></i> -$${Math.abs(choice.effects.cashChange).toLocaleString()} Cash</span>`);
                const projectedShortfall = Math.max(0, Math.abs(choice.effects.cashChange) - Math.max(0, gameState.wealth));
                if (projectedShortfall > 0) {
                    badges.push(`<span class="inline-flex items-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-extrabold"><i class="fa-solid fa-credit-card"></i> $${projectedShortfall.toLocaleString()} Shortfall to Credit</span>`);
                }
            }
        }
        
        // Debt change
        if (choice.effects.debtIncrease !== undefined && choice.effects.debtIncrease !== 0) {
            badges.push(`<span class="inline-flex items-center gap-1 bg-amber-500/15 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-extrabold"><i class="fa-solid fa-hand-holding-dollar"></i> +$${choice.effects.debtIncrease.toLocaleString()} Debt</span>`);
        }

        // Health change
        if (choice.effects.healthChange !== undefined && choice.effects.healthChange !== 0) {
            if (choice.effects.healthChange > 0) {
                badges.push(`<span class="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-extrabold"><i class="fa-solid fa-heart animate-pulse text-[9px]"></i> +${choice.effects.healthChange} Health</span>`);
            } else {
                badges.push(`<span class="inline-flex items-center gap-1 bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-extrabold"><i class="fa-solid fa-heart text-[9px]"></i> ${choice.effects.healthChange} Health</span>`);
            }
        }

        // Happiness change
        if (choice.effects.happinessChange !== undefined && choice.effects.happinessChange !== 0) {
            if (choice.effects.happinessChange > 0) {
                badges.push(`<span class="inline-flex items-center gap-1 bg-violet-500/15 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded text-[10px] font-extrabold"><i class="fa-solid fa-face-smile text-[9px] animate-bounce"></i> +${choice.effects.happinessChange} Joy</span>`);
            } else {
                badges.push(`<span class="inline-flex items-center gap-1 bg-pink-500/15 text-pink-400 border border-pink-500/30 px-2 py-0.5 rounded text-[10px] font-extrabold"><i class="fa-solid fa-face-frown text-[9px]"></i> ${choice.effects.happinessChange} Joy</span>`);
            }
        }
    }

    // Attempt to detect visual outcomes
    let outcomeTags = [];
    const text = (choice.label + " " + (choice.effects && choice.effects.custom ? choice.effects.custom.toString() : "")).toLowerCase();
    
    if (text.includes("career") || text.includes("student") || text.includes("salary") || text.includes("workforce")) {
        outcomeTags.push(`<span class="inline-flex items-center gap-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded text-[10px] font-bold"><i class="fa-solid fa-briefcase text-[9px]"></i> Updates Career</span>`);
    }
    if (text.includes("apartment") || text.includes("house") || text.includes("housing") || text.includes("rent") || text.includes("suburban")) {
        outcomeTags.push(`<span class="inline-flex items-center gap-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px] font-bold"><i class="fa-solid fa-house text-[9px]"></i> Upgrade House Visual</span>`);
    }
    if (text.includes("transit") || text.includes("beater") || text.includes("sports") || text.includes("car") || text.includes("trans")) {
        outcomeTags.push(`<span class="inline-flex items-center gap-1 bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded text-[10px] font-bold"><i class="fa-solid fa-car text-[9px]"></i> Change Vehicle Visual</span>`);
    }

    // Return combined html block
    let html = "";
    if (badges.length > 0) {
        html += `<div class="flex flex-wrap gap-1.5 mt-2">${badges.join("")}</div>`;
    }
    if (outcomeTags.length > 0) {
        html += `<div class="flex flex-wrap gap-1.5 mt-1.5 pt-1.5 border-t border-slate-800/60">${outcomeTags.join("")}</div>`;
    }
    html += getChoiceMechanicsHTML(choice, event);
    return html;
}

// Visual layout injector for interactive cards
function presentEventCard(event) {
    if (!event) return;

    gameState.currentEvent = event;
    setPlayerLedWaitState("CHOICE READY");
    
    // Make sure the milestone banner shows up
    setTimeout(() => {
        updateDecisionMilestoneVisual();
    }, 50);
    
    // Load visuals details
    const eCard = document.getElementById("active-event-card");
    const eFallback = document.getElementById("empty-queue-message");
    const labelRemaining = document.getElementById("cards-remaining");
    const banner = document.getElementById("decision-milestone-banner");
    if (banner) banner.classList.add("hidden");
    
    document.getElementById("event-avatar").textContent = event.avatar || "👤";
    document.getElementById("event-speaker").textContent = event.speaker || "Speaker";
    document.getElementById("event-tag").textContent = event.tag || "LIFE EVENT";
    document.getElementById("event-title").textContent = event.title || "Quick decision";
    document.getElementById("event-description").innerHTML = event.description || "";
    document.getElementById("event-literacy").innerHTML = event.literacy || "Carefully evaluate compound choices.";
    const mechanicsPanel = document.getElementById("decision-mechanics-panel");
    if (mechanicsPanel) mechanicsPanel.innerHTML = getDecisionMechanicsHTML(event);
    
    // Inject choices buttons
    const container = document.getElementById("event-choices-container");
    container.innerHTML = "";
    
    event.choices.forEach((choice, index) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn group text-left px-4 py-3 bg-slate-900/90 border border-slate-800 hover:border-teal-500 hover:bg-slate-800/80 rounded-2xl transition duration-200 active:scale-[0.98] w-full flex flex-col gap-1.5 shadow-md hover:shadow-teal-500/5";
        
        // HTML layouts inside button including dynamic consequences projection
        btn.innerHTML = `
            <div class="flex items-start justify-between w-full gap-3">
                <div class="flex-1 mr-2">
                    <span class="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block mb-0.5">Choice #${index + 1}</span>
                    <span class="text-xs font-bold text-slate-100 leading-snug group-hover:text-teal-400 transition">${choice.label}</span>
                </div>
                <span class="shrink-0 inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2 py-1 rounded-lg">
                    Pick <i class="fa-solid fa-arrow-right text-[8px]"></i>
                </span>
            </div>
            ${getChoiceEffectsHTML(choice, event)}
        `;
        
        // Handle choices clicks
        btn.onclick = () => selectChoice(index);
        container.appendChild(btn);
    });
    
    // Bring card layer in
    eFallback.classList.add("hidden");
    eCard.style.display = "flex";
    eCard.classList.remove("opacity-0", "translate-y-2");
    eCard.style.opacity = "1";
    eCard.style.transform = "none";
    
    labelRemaining.textContent = "1 Critical Decision Pending";
    labelRemaining.classList.replace("bg-slate-900", "bg-teal-500/10");
    labelRemaining.classList.replace("text-slate-400", "text-teal-300");
    showTurnGuide();

    // Smoothly scroll the card into view so players never miss active choices!
    setTimeout(() => {
        const center = document.getElementById("active-event-card");
        if (center) {
            center.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, 100);
}

// Action executor when players click options on card
function selectChoice(index) {
    if (!gameState.currentEvent) return;
    
    const choice = gameState.currentEvent.choices[index];
    if (!choice) return;
    
    // Standard effect processing structures
    let hpChg = 0;
    let wtChg = 0;
    let hpChgValue = 0;
    
    if (choice.effects) {
        if (choice.effects.healthChange !== undefined) {
            gameState.health = Math.max(0, Math.min(100, gameState.health + choice.effects.healthChange));
            hpChg = choice.effects.healthChange;
        }
        if (choice.effects.happinessChange !== undefined) {
            gameState.happiness = Math.max(0, Math.min(100, gameState.happiness + choice.effects.happinessChange));
            hpChgValue = choice.effects.happinessChange;
        }
        if (choice.effects.cashChange !== undefined) {
            gameState.wealth += choice.effects.cashChange;
            wtChg += choice.effects.cashChange;
        }
        if (choice.effects.debtIncrease !== undefined) {
            gameState.debt += choice.effects.debtIncrease;
            wtChg -= choice.effects.debtIncrease;
        }
        
        // Execute custom functional states override
        if (choice.effects.custom) {
            choice.effects.custom(gameState);
        }
    }

    const choiceShortfall = convertCashShortfallToCredit(`Your choice "${choice.label}"`);
    if (choiceShortfall > 0) {
        addLog(`🧾 Cause: the choice cost was larger than your available cash, so only the uncovered amount became credit-card debt.`, true);
    }
    
    // Log choice literacy info into journal
    addLog(`💬 Prompt choices: <strong>${choice.label}</strong>`);
    if (gameState.currentEvent.literacy) {
        addLog(`<i class="fa-solid fa-graduation-cap text-teal-400"></i> ${gameState.currentEvent.literacy}`, true);
    }
    
    flashStatChanges(hpChg, wtChg, hpChgValue);
    
    // Clear and restore normal timelines
    gameState.currentEvent = null;
    setPlayerLedWaitState("READY");
    
    const eCard = document.getElementById("active-event-card");
    const eFallback = document.getElementById("empty-queue-message");
    const labelRemaining = document.getElementById("cards-remaining");
    const banner = document.getElementById("decision-milestone-banner");
    if (banner) banner.classList.add("hidden");
    
    eCard.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => {
        // remove from layout after animation to avoid empty space
        eCard.style.display = "none";
        eFallback.classList.remove("hidden");
        labelRemaining.textContent = "No actions pending";
        labelRemaining.classList.replace("bg-teal-500/10", "bg-slate-900");
        labelRemaining.classList.replace("text-teal-300", "text-slate-400");
        
        updateHUD();
        showTurnGuide();
    }, 200);   
}

// Game termination summary screens compiler
function endGameRetirement(reason) {
    pauseSimulation();
    
    const finalNetWorth = gameState.wealth + gameState.portfolio - gameState.debt;
    
    // Set avatars and card titles based on scenarios
    const titleEl = document.getElementById("retirement-title");
    const avatarEl = document.getElementById("retirement-avatar");
    const ageSubtitle = document.getElementById("retirement-age-subtitle");
    const narrativeEl = document.getElementById("retirement-narrative");
    const insightsEl = document.getElementById("retirement-financial-insights");
    
    document.getElementById("retirement-health").textContent = `${Math.round(gameState.health)}%`;
    document.getElementById("retirement-wealth").textContent = `$${finalNetWorth.toLocaleString()}`;
    document.getElementById("retirement-happiness").textContent = `${Math.round(gameState.happiness)}%`;
    const retirementTotal = document.getElementById("retirement-total-score");
    if (retirementTotal) retirementTotal.textContent = formatMoney(getLifetimeScore());
    
    ageSubtitle.textContent = `Completed journey at Age ${gameState.age.toFixed(1)}`;
    
    let pathLabel = "Balanced Voyager";
    let icon = "👴";
    let message = "";
    
    if (reason === "health_crisis") {
        icon = "🩺";
        titleEl.textContent = "Life Interrupted";
        pathLabel = "Early Collapse — Reboot";
        message = "Health reached zero before the intended finish. In the full design, an early death before 65 reboots the run so students can try a wiser stewardship plan. Press Play Again to restart.";
    } else {
        // Evaluate typical timeline milestones
        if (finalNetWorth > 300000 && gameState.happiness > 70 && gameState.health > 70) {
            icon = "🤴🏆";
            pathLabel = "Faithful Steward";
            message = "You spent less than you earned, shared generously, invested wisely, and guarded health and relationships. Net worth mattered — but so did the life around it. That is the lesson.";
        } else if (finalNetWorth > 250000 && gameState.health < 40) {
            icon = "📊💼";
            pathLabel = "Wealth Without Wellness";
            message = "You built impressive assets, but sacrificed health along the way. The lifetime score formula shows why: money multiplied by a broken body still leaves a diminished life.";
        } else if (finalNetWorth < 5000 && gameState.happiness > 75) {
            icon = "🎒🏝️";
            pathLabel = "Rich in Relationships";
            message = "You lived with joy and connection, but thin reserves. Happiness without a savings and sharing plan can still leave later years fragile.";
        } else if (finalNetWorth < -10000) {
            icon = "🏚️🧗";
            pathLabel = "Debt Bondage";
            message = "High-interest debt and overspending compounded against you. Biblical wisdom urges living below your means and limiting debt — this ending shows why.";
        } else if (reason === "classroom_projection") {
            icon = "🎓";
            pathLabel = "Classroom Projection";
            message = "This is a fast lifetime projection from your spending, time, and talent plans. Use it for discussion: what would you change after the lesson?";
        } else {
            icon = "🏠☕";
            pathLabel = "Steady Steward";
            message = "You kept a workable balance of spend, save, and share. There is room to grow — especially in rest, service, and long-term investing — but you avoided the worst traps.";
        }
    }
    
    titleEl.textContent = `Legacy: ${pathLabel}`;
    avatarEl.textContent = icon;
    narrativeEl.textContent = message;
    
    // Compile educational retrospective points
    let educationHTML = "";
    
    if (gameState.portfolio > 50000) {
        educationHTML += `
            <div class="flex gap-2 items-start text-[11px] leading-normal">
                <span class="text-emerald-400 mt-0.5"><i class="fa-solid fa-circle-check"></i></span>
                <span><strong>Compounding Ace:</strong> Your stock investments grew to <strong>$${Math.round(gameState.portfolio).toLocaleString()}</strong>. Putting money into Wall Street diversified indexes let compounding interest fight your inflation drags. Excellent security creation!</span>
            </div>
        `;
    } else {
        educationHTML += `
            <div class="flex gap-2 items-start text-[11px] leading-normal">
                <span class="text-amber-500 mt-0.5"><i class="fa-solid fa-triangle-exclamation"></i></span>
                <span><strong>Under-Compounded Assets:</strong> You ended the timeline with only <strong>$${Math.round(gameState.portfolio).toLocaleString()}</strong> in active stock equities. Missing out on early diversified investments forced you to rely on direct physical hours for cash flow.</span>
            </div>
        `;
    }
    
    if (gameState.yoloCount > 1) {
        educationHTML += `
            <div class="flex gap-2 items-start text-[11px] leading-normal mt-2">
                <span class="text-rose-400 mt-0.5"><i class="fa-solid fa-circle-xmark"></i></span>
                <span><strong>The Hedonic Premium:</strong> You chose <strong>${gameState.yoloCount}</strong> high-cost YOLO lifestyle trips. While they increased early Happiness, funding luxury via credit cards locked you into heavy interest balances that drained your lifetime cash flow.</span>
            </div>
        `;
    } else {
        educationHTML += `
            <div class="flex gap-2 items-start text-[11px] leading-normal mt-2">
                <span class="text-emerald-400 mt-0.5"><i class="fa-solid fa-circle-check"></i></span>
                <span><strong>Experiential Balance:</strong> You filtered short-term impulses, preferring low-cost experience structures. This protected your emergency liquidity while letting capital accumulate where it matters.</span>
            </div>
        `;
    }

    if (gameState.debt > 0) {
         educationHTML += `
            <div class="flex gap-2 items-start text-[11px] leading-normal mt-2">
                <span class="text-rose-400 mt-0.5"><i class="fa-solid fa-triangle-exclamation"></i></span>
                <span><strong>The Debt Anchor:</strong> You carried outstanding liabilities of <strong>-$${Math.round(gameState.debt).toLocaleString()}</strong> into retirement. Compound interest acted as a drag, transferring valuable cash margins to lending institutions.</span>
            </div>
        `;
    } else {
        educationHTML += `
            <div class="flex gap-2 items-start text-[11px] leading-normal mt-2">
                <span class="text-emerald-400 mt-0.5"><i class="fa-solid fa-circle-check"></i></span>
                <span><strong>Debt-Free Freedom:</strong> You eliminated debt traps. Keeping credit balances clean redirected 100% of your earned salary to personal wealth expansion and lifestyle enjoyment.</span>
            </div>
        `;
    }

    insightsEl.innerHTML = educationHTML;
    
    toggleModal("modal-retirement", true);
}
// Turn Core Controls 
function setPlayerLedWaitState(label = "READY") {
    gameState.isPaused = true;
    clearInterval(gameState.tickerIntervalId);
    gameState.tickerIntervalId = null;

    const cpStatus = document.getElementById("engine-status-text");

    if (cpStatus) {
        cpStatus.textContent = label;
        cpStatus.className = "text-teal-400 font-extrabold";
    }
}

function pauseSimulation() {
    setPlayerLedWaitState("READY");
}

function startSimulation() {
    if (gameState.currentEvent !== null) {
        updateDecisionMilestoneVisual();
        setPlayerLedWaitState("CHOICE READY");
    } else {
        setPlayerLedWaitState("READY");
    }
    showTurnGuide();
}

function resumeSimulation() {
    startSimulation();
}

// User-driven manual season tick (when paused)
function forceManualTick() {
    tickSeason(true);
    if (gameState.currentEvent === null) {
        setPlayerLedWaitState("READY");
        showTurnGuide();
    }
}

function createDefaultGameState(playMode = null) {
    return {
        playMode,
        age: LIFE_START_AGE,
        seasonIdx: 0,
        seasons: ["Spring", "Summer", "Autumn", "Winter"],
        health: 80,
        wealth: 12000,
        happiness: 75,
        spendingPlan: { spendPct: 70, savePct: 20, sharePct: 10 },
        timePlan: { work: 40, sleep: 56, learn: 5, serve: 3, social: 8, fun: 6 },
        talentFocus: "balanced",
        portfolio: 0,
        debt: 0,
        salary: 3200,
        rent: 900,
        foodCost: 350,
        transportCost: 120,
        gymCost: 0,
        subscriptionCost: 0,
        insuranceCost: 150,
        debtInterestRate: 0.045,
        portfolioYieldRate: 0.08,
        savingsYieldRate: 0.02,
        activeHousing: "shared_apartment",
        activeTransport: "used_car",
        activeCareer: "entry_professional",
        activeHabits: { gym: false, organicFood: false, social: false, streaming: false, four01k: false },
        history: [],
        hasGraduated: true,
        yoloCount: 0,
        hasFour01k: false,
        hasHomeEquity: 0,
        hasInsurance: true,
        sportsCarTimer: 0,
        burnoutGrace: false,
        hasSideHustle: false,
        healthCrisisSeasons: 0,
        catchUpOffered: { health: false, debt: false, cashDebt: false },
        isPaused: true,
        tickerSpeed: 3000,
        tickerIntervalId: null,
        currentEvent: null,
        eventIndex: 0,
        eventQueue: [],
        activeTab: "decisions",
        unreadLogs: 0
    };
}

function showModeSelect() {
    toggleModal("modal-retirement", false);
    toggleModal("modal-classroom-plan", false);
    toggleModal("modal-mode-select", true);
    pauseSimulation();
}

function startGameMode(mode) {
    toggleModal("modal-mode-select", false);
    if (mode === "classroom") {
        gameState = createDefaultGameState("classroom");
        updateHUD();
        toggleModal("modal-classroom-plan", true);
        return;
    }
    beginOngoingGame();
}

function beginOngoingGame() {
    toggleModal("modal-classroom-plan", false);
    toggleModal("modal-retirement", false);
    gameState = createDefaultGameState("ongoing");

    document.getElementById("journal-logs-container").innerHTML = `
        <div class="text-[11px] text-indigo-300 leading-snug">
            <span class="font-bold text-slate-500">Age ${LIFE_START_AGE.toFixed(1)}:</span> Stewardship Life begins. Spend less than you earn, share generously, invest wisely — and guard health and happiness as carefully as net worth.
        </div>
    `;
    updateJournalBadge();
    showRulebookDefault();
    switchTab("decisions");
    updateHUD();

    // First playable milestone: legacy age 18 card maps to age 25
    const firstCard = DECISION_CARDS.find(c => Math.abs((c.age + AGE_OFFSET_FROM_LEGACY) - LIFE_START_AGE) < 0.1) || DECISION_CARDS[0];
    presentEventCard(firstCard);
    setPlayerLedWaitState("CHOICE READY");
}

function readClassroomPlanFromForm() {
    const spendPct = Number(document.getElementById("plan-spend-pct").value) || 0;
    const savePct = Number(document.getElementById("plan-save-pct").value) || 0;
    const sharePct = Number(document.getElementById("plan-share-pct").value) || 0;
    const timePlan = {
        work: Number(document.getElementById("plan-time-work").value) || 0,
        sleep: Number(document.getElementById("plan-time-sleep").value) || 0,
        learn: Number(document.getElementById("plan-time-learn").value) || 0,
        serve: Number(document.getElementById("plan-time-serve").value) || 0,
        social: Number(document.getElementById("plan-time-social").value) || 0,
        fun: Number(document.getElementById("plan-time-fun").value) || 0
    };
    const talentFocus = document.getElementById("plan-talent-focus").value || "balanced";
    return { spendPct, savePct, sharePct, timePlan, talentFocus };
}

/** Fast classroom projection: apply plan effects across working + retirement years. */
function runClassroomProjection() {
    const plan = readClassroomPlanFromForm();
    const pctTotal = plan.spendPct + plan.savePct + plan.sharePct;
    const hint = document.getElementById("plan-pct-hint");
    if (Math.abs(pctTotal - 100) > 0.5) {
        if (hint) {
            hint.textContent = `Percentages total ${pctTotal}% — adjust to 100% before projecting.`;
            hint.className = "text-[9px] text-rose-400 mt-1";
        }
        return;
    }
    if (hint) {
        hint.textContent = "Should total 100%. Biblical wisdom encourages ≥10% sharing.";
        hint.className = "text-[9px] text-slate-500 mt-1";
    }

    gameState = createDefaultGameState("classroom");
    gameState.spendingPlan = { spendPct: plan.spendPct, savePct: plan.savePct, sharePct: plan.sharePct };
    gameState.timePlan = plan.timePlan;
    gameState.talentFocus = plan.talentFocus;

    // Map time plan into habit flags
    gameState.activeHabits.gym = plan.timePlan.fun >= 4;
    gameState.activeHabits.social = plan.timePlan.social >= 5;
    gameState.hasFour01k = plan.savePct >= 15;
    gameState.activeHabits.four01k = gameState.hasFour01k;

    const annualGross = gameState.salary * 12;
    let health = 78;
    let happiness = 70;
    let cash = gameState.wealth;
    let portfolio = 0;
    let debt = 5000; // modest starter debt

    const sleepOk = plan.timePlan.sleep >= 49; // ~7h/night
    const serveOk = plan.timePlan.serve >= 2;
    const learnOk = plan.timePlan.learn >= 3;
    const overwork = plan.timePlan.work > 50;
    const shareOk = plan.sharePct >= 10;
    const saveRate = plan.savePct / 100;
    const shareRate = plan.sharePct / 100;

    for (let age = LIFE_START_AGE; age < LIFE_END_AGE; age += 1) {
        const working = age < WORK_END_AGE;
        const income = working ? annualGross * (learnOk ? 1.02 : 1) * (overwork ? 1.08 : 1) : portfolio * 0.04;
        const giving = income * shareRate;
        const saved = Math.max(0, (income - giving) * saveRate);
        const spentPressure = plan.spendPct > 80 ? 1.15 : 1;

        cash += saved * 0.35;
        portfolio += saved * 0.65;
        portfolio *= working ? 1.07 : 1.05;
        cash *= 1.015;
        debt = Math.max(0, debt * 1.03 - saved * 0.1);
        cash -= giving * 0.05; // residual giving friction already mostly from income

        // Health dynamics
        if (!sleepOk || overwork) health -= 1.8;
        else health += 0.4;
        if (plan.timePlan.fun >= 4) health += 0.6;
        else health -= 0.5;

        // Happiness: service & sharing last; consumption fades
        if (serveOk) happiness += 1.2;
        else happiness -= 1.4;
        if (shareOk) happiness += 0.8;
        if (plan.talentFocus === "others") happiness += 0.6;
        else if (plan.talentFocus === "self") happiness -= 0.3;
        if (plan.timePlan.social >= 6) happiness += 0.7;
        if (plan.spendPct >= 85) happiness += 0.4 * spentPressure; // short burst then fade next years
        happiness -= 0.35; // baseline fade without stewardship

        if (working && learnOk) portfolio += annualGross * 0.01;

        health = Math.max(5, Math.min(100, health));
        happiness = Math.max(5, Math.min(100, happiness));

        gameState.history.push({
            age,
            health,
            wealth: cash + portfolio - debt,
            happiness
        });
    }

    gameState.age = LIFE_END_AGE;
    gameState.health = health;
    gameState.happiness = happiness;
    gameState.wealth = Math.round(cash);
    gameState.portfolio = Math.round(portfolio);
    gameState.debt = Math.round(debt);
    gameState.activeCareer = "retired";
    gameState.salary = 0;

    toggleModal("modal-classroom-plan", false);
    updateHUD();
    endGameRetirement("classroom_projection");
}

function restartGame() {
    if (gameState.playMode === "classroom") {
        toggleModal("modal-retirement", false);
        toggleModal("modal-classroom-plan", true);
        return;
    }
    if (gameState.playMode === "ongoing") {
        beginOngoingGame();
        return;
    }
    showModeSelect();
}

// Setup Event listeners when Window elements finish mounting
window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-restart").addEventListener("click", showModeSelect);
    
    document.getElementById("btn-show-guide").addEventListener("click", () => toggleModal("modal-literacy", true));
    
    document.getElementById("btn-force-season").addEventListener("click", forceManualTick);
    
    document.getElementById("btn-clear-logs").addEventListener("click", () => {
        document.getElementById("journal-logs-container").innerHTML = "";
        gameState.unreadLogs = 0;
        updateJournalBadge();
    });

    gameState = createDefaultGameState(null);
    updateHUD();
    showModeSelect();
});
