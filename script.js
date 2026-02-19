let comparisonChart = null;
let stepProcesses = [];
let stepTime = 0;
let stepQueue = [];
let stepMode = false;
const cpuStateDiv = document.getElementById("cpuState");
const readyQueueDiv = document.getElementById("readyQueue");
const algorithm = document.getElementById("algorithm");
const quantum = document.getElementById("quantum");
const runBtn = document.getElementById("runBtn");
const addProcessBtn = document.getElementById("addProcess");
const table = document.getElementById("processTable");
const gantt = document.getElementById("gantt");
const metrics = document.getElementById("metrics");
const compareBtn = document.getElementById("compareBtn");
const processColors = {};
const colorPalette = [
    "#2563eb", // blue
    "#16a34a", // green
    "#ea580c", // orange
    "#7c3aed", // purple
    "#dc2626", // red
    "#0d9488"  // teal
];
function updateCPUState(text, color = "#111") {
    cpuStateDiv.textContent = text;
    cpuStateDiv.style.backgroundColor = color;
}

function assignProcessColors(processes) {
    let idx = 0;
    processes.forEach(p => {
        if (!processColors[p.id]) {
            processColors[p.id] = colorPalette[idx % colorPalette.length];
            idx++;
        }
    });
}

compareBtn.addEventListener("click", () => {
    compareAlgorithms();
});
function updateReadyQueue(queue) {
    readyQueueDiv.innerHTML = "";

    queue.forEach(p => {
        const div = document.createElement("div");
        div.className = "ready-item";
        div.textContent = p.id;
        div.style.backgroundColor = processColors[p.id];
        div.style.color = "#fff";
        readyQueueDiv.appendChild(div);
    });
}




let timeline = 0;

// Show quantum only for Round Robin
algorithm.addEventListener("change", () => {
    quantum.style.display = algorithm.value === "rr" ? "inline-block" : "none";
});

// Add new process row
addProcessBtn.addEventListener("click", () => {
    const rowCount = table.rows.length;
    const row = table.insertRow();

    row.innerHTML = `
        <td>P${rowCount}</td>
        <td><input type="number" value="0" min="0"></td>
        <td><input type="number" value="1" min="1"></td>
    `;
});

// Run simulation
runBtn.addEventListener("click", () => {

    // ✅ HIDE STEP VISUALS when running full simulation
    document.getElementById("stepVisuals").style.display = "none";

    if (algorithm.value === "fcfs") {
        runFCFS();
    } else if (algorithm.value === "sjf") {
        runSJF();
    } else if (algorithm.value === "rr") {
        runRoundRobin();
    }
});




const stepBtn = document.getElementById("stepBtn");
const resetBtn = document.getElementById("resetBtn");

stepBtn.addEventListener("click", () => {
    if (!stepMode) initStepMode();
    stepExecute();
});

resetBtn.addEventListener("click", resetStepMode);


// Read processes from table
function getProcesses() {
    let processes = [];

    for (let i = 1; i < table.rows.length; i++) {
        const cells = table.rows[i].cells;

        processes.push({
            id: cells[0].innerText,
            arrival: Number(cells[1].children[0].value),
            burst: Number(cells[2].children[0].value)
        });
    }

    return processes;
}

// FCFS Scheduling
function runFCFS() {
    if (comparisonChart) {
        comparisonChart.destroy();
        comparisonChart = null;
    }

    timeline = 0;
    gantt.innerHTML = "";
    metrics.innerHTML = "";

    let processes = getProcesses();

    // Sort by arrival time
    processes.sort((a, b) => a.arrival - b.arrival);

    let currentTime = 0;
    let totalWT = 0;
    let totalTAT = 0;

    processes.forEach(p => {
        // CPU Idle time
        if (currentTime < p.arrival) {
            drawGanttBlock("IDLE", p.arrival - currentTime);
            currentTime = p.arrival;
        }

        const start = currentTime;
        const finish = start + p.burst;

        p.turnaround = finish - p.arrival;
        p.waiting = p.turnaround - p.burst;

        totalWT += p.waiting;
        totalTAT += p.turnaround;

        drawGanttBlock(p.id, p.burst);

        currentTime = finish;
    });

    const n = processes.length;

    // Metrics Table
    let tableHTML = `
    <table>
        <tr>
            <th>Process</th>
            <th>Waiting Time</th>
            <th>Turnaround Time</th>
        </tr>
    `;

    processes.forEach(p => {
        tableHTML += `
        <tr>
            <td>${p.id}</td>
            <td>${p.waiting}</td>
            <td>${p.turnaround}</td>
        </tr>
        `;
    });

    tableHTML += `</table>`;

    metrics.innerHTML = `
        <h3>Process Metrics</h3>
        ${tableHTML}
        <p><strong>Average Waiting Time:</strong> ${(totalWT / n).toFixed(2)}</p>
        <p><strong>Average Turnaround Time:</strong> ${(totalTAT / n).toFixed(2)}</p>
    `;
}
function initStepMode() {
    gantt.innerHTML = "";
    metrics.innerHTML = "";
    timeline = 0;

    stepProcesses = getProcesses()
        .map(p => ({ ...p }))
        .sort((a, b) => a.arrival - b.arrival);

    assignProcessColors(stepProcesses);

    stepTime = 0;
    stepQueue = [];
    stepMode = true;

    // ✅ SHOW CPU STATE + READY QUEUE
    document.getElementById("stepVisuals").style.display = "block";
    updateCPUState("CPU: IDLE", "#111827");
}


function stepExecute() {
    // Add arrived processes to ready queue
    while (
        stepProcesses.length > 0 &&
        stepProcesses[0].arrival <= stepTime
    ) {
        stepQueue.push(stepProcesses.shift());
    }

    // Update Ready Queue
    updateReadyQueue(stepQueue);

    // CPU IDLE
    if (stepQueue.length === 0) {
        updateCPUState("CPU: IDLE", "#6b7280"); // gray
        drawGanttBlock("IDLE", 1);
        stepTime++;
        return;
    }

    // Execute first process
    let p = stepQueue[0];

    updateCPUState(
        `CPU: RUNNING ${p.id}`,
        processColors[p.id]
    );

    drawGanttBlock(p.id, 1);

    p.burst--;
    stepTime++;

    // Process finished
    if (p.burst === 0) {
        stepQueue.shift();
    }

    updateReadyQueue(stepQueue);
}


function resetStepMode() {
    gantt.innerHTML = "";
    metrics.innerHTML = "";
    timeline = 0;

    stepProcesses = [];
    stepQueue = [];
    stepTime = 0;
    stepMode = false;

    // ✅ HIDE STEP VISUALS
    document.getElementById("stepVisuals").style.display = "none";
    readyQueueDiv.innerHTML = "";
    updateCPUState("CPU: IDLE", "#111827");
}



function runSJF() {
    if (comparisonChart) {
        comparisonChart.destroy();
        comparisonChart = null;
    }

    timeline = 0;
    gantt.innerHTML = "";
    metrics.innerHTML = "";

    let processes = getProcesses();
    let completed = 0;
    let currentTime = 0;
    let n = processes.length;

    let totalWT = 0;
    let totalTAT = 0;

    processes.forEach(p => p.done = false);

    while (completed < n) {
        // Get arrived & not completed processes
        let available = processes.filter(
            p => p.arrival <= currentTime && !p.done
        );

        // CPU idle
        if (available.length === 0) {
            let nextArrival = Math.min(
                ...processes.filter(p => !p.done).map(p => p.arrival)
            );

            drawGanttBlock("IDLE", nextArrival - currentTime);
            currentTime = nextArrival;
            continue;
        }

        // Pick shortest burst
        available.sort((a, b) => a.burst - b.burst);
        let p = available[0];

        const start = currentTime;
        const finish = start + p.burst;

        p.turnaround = finish - p.arrival;
        p.waiting = p.turnaround - p.burst;

        totalWT += p.waiting;
        totalTAT += p.turnaround;

        drawGanttBlock(p.id, p.burst);

        currentTime = finish;
        p.done = true;
        completed++;
    }

    // Metrics Table
    let tableHTML = `
    <table>
        <tr>
            <th>Process</th>
            <th>Waiting Time</th>
            <th>Turnaround Time</th>
        </tr>
    `;

    processes.forEach(p => {
        tableHTML += `
        <tr>
            <td>${p.id}</td>
            <td>${p.waiting}</td>
            <td>${p.turnaround}</td>
        </tr>
        `;
    });

    tableHTML += `</table>`;

    metrics.innerHTML = `
        <h3>Process Metrics (SJF)</h3>
        ${tableHTML}
        <p><strong>Average Waiting Time:</strong> ${(totalWT / n).toFixed(2)}</p>
        <p><strong>Average Turnaround Time:</strong> ${(totalTAT / n).toFixed(2)}</p>
    `;
}
function runRoundRobin() {
    if (comparisonChart) {
        comparisonChart.destroy();
        comparisonChart = null;
    }

    timeline = 0;
    gantt.innerHTML = "";
    metrics.innerHTML = "";

    let quantumTime = Number(quantum.value);
    if (!quantumTime || quantumTime <= 0) {
        alert("Please enter valid Time Quantum");
        return;
    }

    let processes = getProcesses();
    let n = processes.length;

    processes.forEach(p => {
        p.remaining = p.burst;
        p.waiting = 0;
        p.turnaround = 0;
        p.done = false;
    });

    let currentTime = 0;
    let completed = 0;
    let queue = [];

    // Sort by arrival
    processes.sort((a, b) => a.arrival - b.arrival);

    while (completed < n) {
        // Add arrived processes to queue
        processes.forEach(p => {
            if (p.arrival <= currentTime && !queue.includes(p) && !p.done && p.remaining === p.burst) {
                queue.push(p);
            }
        });

        // CPU idle
        if (queue.length === 0) {
            let nextArrival = Math.min(
                ...processes.filter(p => !p.done).map(p => p.arrival)
            );
            drawGanttBlock("IDLE", nextArrival - currentTime);
            currentTime = nextArrival;
            continue;
        }

        let p = queue.shift();

        let execTime = Math.min(quantumTime, p.remaining);
        drawGanttBlock(p.id, execTime);

        currentTime += execTime;
        p.remaining -= execTime;

        // Add newly arrived processes during execution
        processes.forEach(proc => {
            if (
                proc.arrival > currentTime - execTime &&
                proc.arrival <= currentTime &&
                !queue.includes(proc) &&
                !proc.done
            ) {
                queue.push(proc);
            }
        });

        if (p.remaining > 0) {
            queue.push(p);
        } else {
            p.done = true;
            p.turnaround = currentTime - p.arrival;
            p.waiting = p.turnaround - p.burst;
            completed++;
        }
    }

    let totalWT = 0;
    let totalTAT = 0;

    let tableHTML = `
    <table>
        <tr>
            <th>Process</th>
            <th>Waiting Time</th>
            <th>Turnaround Time</th>
        </tr>
    `;

    processes.forEach(p => {
        totalWT += p.waiting;
        totalTAT += p.turnaround;

        tableHTML += `
        <tr>
            <td>${p.id}</td>
            <td>${p.waiting}</td>
            <td>${p.turnaround}</td>
        </tr>
        `;
    });

    tableHTML += `</table>`;

    metrics.innerHTML = `
        <h3>Process Metrics (Round Robin)</h3>
        ${tableHTML}
        <p><strong>Average Waiting Time:</strong> ${(totalWT / n).toFixed(2)}</p>
        <p><strong>Average Turnaround Time:</strong> ${(totalTAT / n).toFixed(2)}</p>
    `;
}

function compareAlgorithms() {
    metrics.innerHTML = "";
    gantt.innerHTML = "";
    timeline = 0;

    const originalProcesses = getProcesses();

    function cloneProcesses() {
        return originalProcesses.map(p => ({
            id: p.id,
            arrival: p.arrival,
            burst: p.burst
        }));
    }

    const results = [];

    results.push(runFCFSForComparison(cloneProcesses()));
    results.push(runSJFForComparison(cloneProcesses()));
    results.push(runRRForComparison(cloneProcesses()));

    let tableHTML = `
    <h3>Algorithm Comparison</h3>
    <table>
        <tr>
            <th>Algorithm</th>
            <th>Avg Waiting Time</th>
            <th>Avg Turnaround Time</th>
        </tr>
    `;

    results.forEach(r => {
        tableHTML += `
        <tr>
            <td>${r.name}</td>
            <td>${r.avgWT}</td>
            <td>${r.avgTAT}</td>
        </tr>
        `;
    });

    tableHTML += `</table>`;
    metrics.innerHTML = tableHTML;
    drawComparisonChart(results);
}
function runFCFSForComparison(processes) {
    processes.sort((a, b) => a.arrival - b.arrival);

    let time = 0, totalWT = 0, totalTAT = 0;

    processes.forEach(p => {
        if (time < p.arrival) time = p.arrival;
        let finish = time + p.burst;
        let tat = finish - p.arrival;
        let wt = tat - p.burst;

        totalWT += wt;
        totalTAT += tat;
        time = finish;
    });

    return {
        name: "FCFS",
        avgWT: (totalWT / processes.length).toFixed(2),
        avgTAT: (totalTAT / processes.length).toFixed(2)
    };
}

function runSJFForComparison(processes) {
    let time = 0, completed = 0;
    let totalWT = 0, totalTAT = 0;
    let n = processes.length;

    processes.forEach(p => p.done = false);

    while (completed < n) {
        let available = processes.filter(p => p.arrival <= time && !p.done);

        if (available.length === 0) {
            time++;
            continue;
        }

        available.sort((a, b) => a.burst - b.burst);
        let p = available[0];

        let finish = time + p.burst;
        let tat = finish - p.arrival;
        let wt = tat - p.burst;

        totalWT += wt;
        totalTAT += tat;

        time = finish;
        p.done = true;
        completed++;
    }

    return {
        name: "SJF",
        avgWT: (totalWT / n).toFixed(2),
        avgTAT: (totalTAT / n).toFixed(2)
    };
}

function runRRForComparison(processes) {
    let tq = Number(quantum.value) || 2;
    let time = 0, completed = 0;
    let n = processes.length;

    processes.forEach(p => {
        p.remaining = p.burst;
        p.done = false;
    });

    let queue = [];

    while (completed < n) {
        processes.forEach(p => {
            if (p.arrival <= time && !queue.includes(p) && !p.done && p.remaining === p.burst) {
                queue.push(p);
            }
        });

        if (queue.length === 0) {
            time++;
            continue;
        }

        let p = queue.shift();
        let exec = Math.min(tq, p.remaining);
        p.remaining -= exec;
        time += exec;

        if (p.remaining > 0) {
            queue.push(p);
        } else {
            p.done = true;
            completed++;
            p.turnaround = time - p.arrival;
            p.waiting = p.turnaround - p.burst;
        }
    }

    let totalWT = processes.reduce((s, p) => s + p.waiting, 0);
    let totalTAT = processes.reduce((s, p) => s + p.turnaround, 0);

    return {
        name: "Round Robin",
        avgWT: (totalWT / n).toFixed(2),
        avgTAT: (totalTAT / n).toFixed(2)
    };
}

function drawGanttBlock(pid, duration) {
    const block = document.createElement("div");

    // Single text node, no inner divs

    block.style.width = `${duration * 60}px`;
    block.style.height = "50px";

    block.style.display = "flex";
    block.style.alignItems = "center";
    block.style.justifyContent = "center";

    
    block.style.backgroundColor =
    pid === "IDLE" ? "#9ca3af" : processColors[pid];

    block.style.color = "#ffffff";
    block.textContent = `${pid} (${timeline} → ${timeline + duration})`;


    block.style.fontSize = "14px";
    block.style.fontWeight = "500";

    block.style.borderRadius = "8px";

    // CRITICAL: remove any inherited transparency
    block.style.opacity = "1";

    gantt.appendChild(block);
    timeline += duration;
}
function drawComparisonChart(results) {
    const ctx = document.getElementById("comparisonChart").getContext("2d");

    // Destroy old chart if exists
    if (comparisonChart) {
        comparisonChart.destroy();
    }

    const labels = results.map(r => r.name);
    const avgWT = results.map(r => r.avgWT);
    const avgTAT = results.map(r => r.avgTAT);

    comparisonChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Average Waiting Time",
                    data: avgWT,
                    backgroundColor: "rgba(79, 70, 229, 0.7)" // muted indigo
                },
                {
                    label: "Average Turnaround Time",
                    data: avgTAT,
                    backgroundColor: "rgba(16, 185, 129, 0.7)" // soft green
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: "#333",
                        font: { size: 13 }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: "#333"
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        color: "#333"
                    },
                    grid: {
                        color: "#e5e7eb"
                    }
                }
            }
        }
    });
}



