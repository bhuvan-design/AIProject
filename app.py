from flask import Flask, render_template, request, jsonify
from collections import deque

app = Flask(__name__)

CAMPUS_DATA = {
    "nodes": [
        {"id": "MG", "name": "Main Gate"},
        {"id": "AB", "name": "Admin Block"},
        {"id": "CL", "name": "Central Library"},
        {"id": "CS", "name": "CSE Block"},
        {"id": "ME", "name": "Mechanical Block"},
        {"id": "AUD", "name": "Auditorium"},
        {"id": "CAF", "name": "Student Cafeteria"},
        {"id": "SP", "name": "Sports Complex"},
        {"id": "BH", "name": "Boys Hostel"},
        {"id": "GH", "name": "Girls Hostel"}
    ],
    "edges": [
        {"from": "MG", "to": "AB", "dist": 150},
        {"from": "AB", "to": "CL", "dist": 180},
        {"from": "AB", "to": "CS", "dist": 200},
        {"from": "CS", "to": "GH", "dist": 220},
        {"from": "CS", "to": "ME", "dist": 160},
        {"from": "CS", "to": "CAF", "dist": 210},
        {"from": "CL", "to": "ME", "dist": 190},
        {"from": "CL", "to": "AUD", "dist": 250},
        {"from": "ME", "to": "CAF", "dist": 170},
        {"from": "ME", "to": "AUD", "dist": 210},
        {"from": "CAF", "to": "BH", "dist": 280},
        {"from": "AUD", "to": "SP", "dist": 230},
        {"from": "ME", "to": "SP", "dist": 310},
        {"from": "BH", "to": "SP", "dist": 190}
    ]
}


class CampusNavigationAgent:

    def __init__(self, data):
        self.nodes = {
            node["id"]: node for node in data["nodes"]
        }

        self.adjacency_list = {
            node_id: [] for node_id in self.nodes
        }

        for edge in data["edges"]:
            u = edge["from"]
            v = edge["to"]
            distance = edge["dist"]

            self.adjacency_list[u].append({
                "node": v,
                "dist": distance
            })

            self.adjacency_list[v].append({
                "node": u,
                "dist": distance
            })

    def search_bfs(self, start, goal):

        if start not in self.nodes:
            raise ValueError("Invalid starting location.")

        if goal not in self.nodes:
            raise ValueError("Invalid destination.")

        if start == goal:
            return {
                "path": [start],
                "visited": [start],
                "steps": 0
            }

        queue = deque([[start]])
        visited = {start}
        steps = 0

        while queue:

            path = queue.popleft()
            current = path[-1]
            steps += 1

            if current == goal:
                return {
                    "path": path,
                    "visited": list(visited),
                    "steps": steps
                }

            for item in self.adjacency_list[current]:

                neighbor = item["node"]

                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(path + [neighbor])

        return {
            "path": [],
            "visited": list(visited),
            "steps": steps
        }

    def calculate_distance(self, path):

        total = 0

        for u, v in zip(path, path[1:]):
            for item in self.adjacency_list[u]:
                if item["node"] == v:
                    total += item["dist"]
                    break

        return total


agent = CampusNavigationAgent(CAMPUS_DATA)


@app.route("/")
def home():
    return render_template(
        "index.html",
        nodes=CAMPUS_DATA["nodes"]
    )


@app.route("/api/navigate", methods=["POST"])
def navigate():

    data = request.get_json(silent=True) or {}

    source = str(data.get("source", "MG")).upper()
    goal = str(data.get("goal", "BH")).upper()

    try:
        result = agent.search_bfs(source, goal)
        path = result["path"]

        distance = agent.calculate_distance(path)

        directions = []

        for i, (u, v) in enumerate(
            zip(path, path[1:]), start=1
        ):

            leg_distance = next(
                item["dist"]
                for item in agent.adjacency_list[u]
                if item["node"] == v
            )

            directions.append({
                "step": i,
                "from": u,
                "to": v,
                "fromName": agent.nodes[u]["name"],
                "toName": agent.nodes[v]["name"],
                "distance": leg_distance
            })

        return jsonify({
            "success": bool(path),
            "source": source,
            "goal": goal,
            "path": path,
            "pathNames": [
                agent.nodes[node]["name"] for node in path
            ],
            "distance": distance,
            "walkingTime": round(distance / 75, 1),
            "hops": max(0, len(path) - 1),
            "visited": result["visited"],
            "stepsEvaluated": result["steps"],
            "directions": directions
        })

    except ValueError as error:
        return jsonify({
            "success": False,
            "error": str(error)
        }), 400


if __name__ == "__main__":
    app.run(debug=True)