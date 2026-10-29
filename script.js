const nodeInfo = {
    MG: { name: "Main Gate", x: 95, y: 430 },
    AB: { name: "Admin Block", x: 240, y: 385 },
    CL: { name: "Central Library", x: 385, y: 430 },
    CS: { name: "CSE Block", x: 270, y: 235 },
    ME: { name: "Mechanical Block", x: 460, y: 285 },
    AUD: { name: "Auditorium", x: 600, y: 400 },
    CAF: { name: "Student Cafeteria", x: 440, y: 110 },
    SP: { name: "Sports Complex", x: 720, y: 275 },
    BH: { name: "Boys Hostel", x: 700, y: 100 },
    GH: { name: "Girls Hostel", x: 210, y: 75 }
};

const edges = [
    ["MG", "AB", 150],
    ["AB", "CL", 180],
    ["AB", "CS", 200],
    ["CS", "GH", 220],
    ["CS", "ME", 160],
    ["CS", "CAF", 210],
    ["CL", "ME", 190],
    ["CL", "AUD", 250],
    ["ME", "CAF", 170],
    ["ME", "AUD", 210],
    ["CAF", "BH", 280],
    ["AUD", "SP", 230],
    ["ME", "SP", 310],
    ["BH", "SP", 190]
];

const $ = id => document.getElementById(id);

let latestResult = null;
let simulationTimer = null;
let simulationIndex = 0;


function svgElement(tag, attributes = {}) {
    const element = document.createElementNS(
        "http://www.w3.org/2000/svg",
        tag
    );

    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });

    return element;
}


function edgeKey(a, b) {
    return [a, b].sort().join("-");
}


function drawGraph(result = null) {
    const svg = $("campusGraph");
    svg.replaceChildren();

    const path = result?.path || [];

    const routeEdges = new Set(
        path.slice(1).map((node, index) =>
            edgeKey(path[index], node)
        )
    );

    const source = $("source").value;
    const goal = $("goal").value;

    // Draw campus connections.
    edges.forEach(([a, b, distance]) => {
        const A = nodeInfo[a];
        const B = nodeInfo[b];

        const isRoute = routeEdges.has(edgeKey(a, b));

        const line = svgElement("line", {
            x1: A.x,
            y1: A.y,
            x2: B.x,
            y2: B.y,
            class: "edge" + (isRoute ? " route-edge" : "")
        });

        svg.appendChild(line);

        const middleX = (A.x + B.x) / 2;
        const middleY = (A.y + B.y) / 2;

        const labelGroup = svgElement("g");

        labelGroup.appendChild(svgElement("rect", {
            x: middleX - 18,
            y: middleY - 9,
            width: 36,
            height: 16,
            rx: 4,
            class: "edge-label-bg"
        }));

        const text = svgElement("text", {
            x: middleX,
            y: middleY + 3,
            class: "edge-label"
        });

        text.textContent = distance + "m";

        labelGroup.appendChild(text);
        svg.appendChild(labelGroup);
    });

    // Draw campus buildings.
    Object.entries(nodeInfo).forEach(([id, node]) => {
        const classes = ["node"];

        if (id === source) classes.push("source");
        if (id === goal) classes.push("goal");
        if (path.includes(id)) classes.push("on-path");

        const group = svgElement("g", {
            class: classes.join(" "),
            tabindex: "0",
            role: "button",
            "aria-label": node.name
        });

        group.appendChild(svgElement("circle", {
            cx: node.x,
            cy: node.y,
            r: 16,
            class: "node-circle"
        }));

        const idText = svgElement("text", {
            x: node.x,
            y: node.y + 4,
            class: "node-id"
        });

        idText.textContent = id;
        group.appendChild(idText);

        const label = svgElement("text", {
            x: node.x,
            y: node.y + 29,
            class: "node-label"
        });

        label.textContent = node.name;
        group.appendChild(label);

        function selectDestination() {
            $("goal").value = id;
            drawGraph(latestResult);

            $("notice").textContent =
                node.name + " selected. Click Find Route.";
        }

        group.addEventListener("click", selectDestination);

        group.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectDestination();
            }
        });

        svg.appendChild(group);
    });
}


async function findRoute() {
    stopSimulation();

    const source = $("source").value;
    const goal = $("goal").value;

    $("notice").textContent = "Searching the campus graph...";
    $("goalStatus").textContent = "SEARCHING";

    try {
        const response = await fetch("/api/navigate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ source, goal })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "No route found.");
        }

        latestResult = data;

        renderResult(data);

        $("notice").textContent =
            "Route found successfully using BFS.";

    } catch (error) {
        $("notice").textContent = error.message;
        $("goalStatus").textContent = "ERROR";
        $("goalTest").textContent = error.message;
    }
}


function renderResult(data) {
    $("goalStatus").textContent = "GOAL REACHED";

    $("startText").textContent = nodeInfo[data.source].name;
    $("goalText").textContent = nodeInfo[data.goal].name;

    $("goalTest").textContent =
        data.source === data.goal
            ? "Passed (Already at destination!)"
            : "Passed (Target Found!)";

    $("distanceMetric").innerHTML =
        `${data.distance} <small>meters</small>`;

    $("timeMetric").innerHTML =
        `${data.walkingTime} <small>mins</small>`;

    $("hopsMetric").textContent = data.hops;
    $("nodesMetric").textContent = data.visited.length;

    $("queueSize").textContent = "0";

    $("queueOutput").textContent =
        data.source === data.goal
            ? "[ Start is the goal ]"
            : "[ BFS Complete ]";

    $("exploredCount").textContent =
        `${data.visited.length} locations`;

    const visitedContainer = $("visitedNodes");
    visitedContainer.replaceChildren();

    data.visited.forEach(id => {
        const chip = document.createElement("span");

        chip.className =
            "chip" + (data.path.includes(id) ? " path-chip" : "");

        chip.textContent = id;

        visitedContainer.appendChild(chip);
    });

    $("routeLabel").textContent = data.path.join(" → ");

    const directions = $("directions");
    directions.replaceChildren();

    if (data.directions.length === 0) {
        directions.innerHTML =
            '<div class="empty-state">' +
            'You are already at your destination.' +
            '</div>';
    }

    data.directions.forEach(item => {
        const row = document.createElement("div");
        row.className = "direction-row";

        const number = document.createElement("span");
        number.className = "step-number";
        number.textContent = item.step;

        const copy = document.createElement("div");
        copy.className = "direction-copy";

        const title = document.createElement("strong");
        title.textContent =
            `${item.fromName} → ${item.toName}`;

        const detail = document.createElement("small");
        detail.textContent = `${item.from} to ${item.to}`;

        copy.append(title, detail);

        const distance = document.createElement("span");
        distance.className = "leg-distance";
        distance.textContent = `${item.distance} m`;

        row.append(number, copy, distance);
        directions.appendChild(row);
    });

    drawGraph(data);
}


function stopSimulation() {
    if (simulationTimer !== null) {
        clearInterval(simulationTimer);
        simulationTimer = null;
    }
}


function startSimulation() {
    stopSimulation();

    if (!latestResult) {
        $("notice").textContent = "Find a route first.";
        return;
    }

    const path = latestResult.path;
    simulationIndex = 0;

    $("notice").textContent =
        "Step simulation is running...";

    simulationTimer = setInterval(() => {
        if (simulationIndex >= path.length) {
            stopSimulation();

            $("notice").textContent =
                "Step simulation completed.";

            return;
        }

        const current = path[simulationIndex];

        $("queueOutput").textContent =
            `[ Step ${simulationIndex + 1}/${path.length} ] ` +
            `Agent at ${current}: ${nodeInfo[current].name}`;

        $("goalTest").textContent =
            current === latestResult.goal
                ? "Passed (Target Found!)"
                : `Checking ${current}...`;

        simulationIndex++;

    }, 850);
}


function resetApp() {
    stopSimulation();

    latestResult = null;

    $("source").value = "MG";
    $("goal").value = "BH";

    $("goalStatus").textContent = "READY";
    $("startText").textContent = "Main Gate";
    $("goalText").textContent = "Boys Hostel";

    $("goalTest").textContent = "Waiting for search...";
    $("queueSize").textContent = "0";

    $("queueOutput").textContent =
        "[ Select Find Route to start BFS ]";

    $("exploredCount").textContent = "0 locations";

    $("visitedNodes").innerHTML =
        '<span class="empty-chip">Waiting for search</span>';

    $("distanceMetric").innerHTML =
        '-- <small>meters</small>';

    $("timeMetric").innerHTML =
        '-- <small>mins</small>';

    $("hopsMetric").textContent = "--";
    $("nodesMetric").textContent = "--";

    $("routeLabel").textContent = "No route calculated";

    $("directions").innerHTML =
        '<div class="empty-state">' +
        'Route directions will appear here.' +
        '</div>';

    $("notice").textContent =
        "Select your locations to begin.";

    drawGraph();
}


$("findRoute").addEventListener("click", findRoute);
$("simulate").addEventListener("click", startSimulation);
$("reset").addEventListener("click", resetApp);

$("source").addEventListener("change", () => {
    drawGraph(latestResult);
});

$("goal").addEventListener("change", () => {
    drawGraph(latestResult);
});

drawGraph();
findRoute();