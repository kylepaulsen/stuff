// This function assumes that nodes have id and neighbors properties.
function aStar(startNode, endNode, distFunc, heuristicFunc) {
    "use strict";
    var closedSet = {};
    var openSet = priorityQueue(function(a, b) {
        if (!a || !b) {
            debugger;
        }
        return a.estimateScore > b.estimateScore;
    });
    // stores nodes that were used to get to the current node.
    var pathTo = {};

    startNode.realScore = 0;
    startNode.estimateScore = startNode.realScore + heuristicFunc(startNode, endNode);
    openSet.add(startNode);

    var buildNodePath = function() {
        var path = [endNode];
        var previousNode = pathTo[endNode.id];
        while (previousNode) {
            path.push(previousNode);
            previousNode = pathTo[previousNode.id];
        }
        return path;
    };

    while (openSet.size() > 0) {
        var currentNode = openSet.pop();
        if (currentNode === endNode) {
            return buildNodePath();
        }

        closedSet[currentNode.id] = 1;
        var currentNeighbors = Object.keys(currentNode.neighbors);
        var x = currentNeighbors.length;
        while (x-- > 0) {
            var neighbor = currentNode.neighbors[currentNeighbors[x]];
            if (!closedSet[neighbor.id]) {
                var neighborRealScore = currentNode.realScore + distFunc(currentNode, neighbor);
                var neighborInOpenSet = openSet.has(neighbor);
                if (!neighborInOpenSet || neighborRealScore < neighbor.realScore) {
                    pathTo[neighbor.id] = currentNode;
                    neighbor.realScore = neighborRealScore;
                    neighbor.estimateScore = neighbor.realScore + heuristicFunc(neighbor, endNode);
                    if (!neighborInOpenSet) {
                        openSet.add(neighbor);
                    } else {
                        openSet.update(neighbor);
                    }
                }
            }
        }
    }
    return [];
}
