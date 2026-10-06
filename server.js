const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Default Game State
const defaultState = {
  config: {
    initialCoins: 1000,
    eventName: "AlgoAuct 2026",
    timerDurationSec: 15
  },
  gameState: "SETUP", // SETUP, BIDDING, QUESTION, FINALE
  teams: [], // { id, name, members, color, coins, algorithms: [], score: 0, eliminated: false, socketId }
  algorithmsCatalog: [
    // PART A — GRAPH / GRAPH-RELATED ALGORITHMS
    { id: "a1", name: "BFS – Breadth-First Search", category: "Graph Traversal", minBid: 30, description: "Traversal / shortest path in unweighted graphs." },
    { id: "a2", name: "DFS – Depth-First Search", category: "Graph Traversal", minBid: 30, description: "Graph traversal / connectivity exploration." },
    { id: "a3", name: "Dijkstra's Algorithm", category: "Shortest Path", minBid: 50, description: "Single-source shortest path with non-negative edge weights." },
    { id: "a4", name: "A* (A-Star)", category: "Heuristic Search", minBid: 70, description: "Heuristic shortest-path search using g(n) + h(n)." },
    { id: "a5", name: "Kruskal's Algorithm", category: "Minimum Spanning Tree", minBid: 50, description: "Greedy MST construction using edge list and Union-Find." },
    { id: "a6", name: "Prim's Algorithm", category: "Minimum Spanning Tree", minBid: 50, description: "Greedy MST construction from a starting vertex." },
    { id: "a7", name: "Bellman-Ford Algorithm", category: "Shortest Path", minBid: 60, description: "Shortest path supporting negative edges and cycle detection." },
    { id: "a8", name: "Floyd-Warshall Algorithm", category: "All-Pairs Shortest Path", minBid: 80, description: "Computes shortest paths between all pairs of vertices in O(V^3)." },
    { id: "a9", name: "Bidirectional Search", category: "Graph Search", minBid: 40, description: "Simultaneous search from source and destination." },
    { id: "a10", name: "Hill Climbing", category: "Local Search", minBid: 40, description: "Heuristic local search choosing locally optimal neighbor." },

    // PART B — OTHER ALGORITHMS
    { id: "b1", name: "Greedy Algorithm", category: "General Paradigm", minBid: 40, description: "Makes locally optimal choices at each step." },
    { id: "b2", name: "Linear Search", category: "Searching", minBid: 20, description: "Sequential search on unsorted collections." },
    { id: "b3", name: "Binary Search", category: "Searching", minBid: 50, description: "O(log N) search on sorted arrays." },
    { id: "b4", name: "Bubble Sort", category: "Sorting", minBid: 20, description: "Simple comparison sorting by adjacent swaps." },
    { id: "b5", name: "Insertion Sort", category: "Sorting", minBid: 30, description: "Efficient sorting for small or nearly-sorted datasets." },
    { id: "b6", name: "Selection Sort", category: "Sorting", minBid: 20, description: "Simple in-place sorting with O(1) extra space." },
    { id: "b7", name: "Quick Sort", category: "Sorting", minBid: 60, description: "Fast average O(N log N) in-place sorting." },
    { id: "b8", name: "Merge Sort", category: "Sorting", minBid: 70, description: "Guaranteed O(N log N) worst-case divide-and-conquer sorting." },
    { id: "b9", name: "Two Pointer", category: "Array Technique", minBid: 50, description: "Two-pointer technique for sorted arrays/strings." },
    { id: "b10", name: "Dynamic Programming", category: "Optimization", minBid: 100, description: "Solves overlapping subproblems via memoization/tabulation." }
  ],
  questionsCatalog: [
    // PART A — GRAPH ALGORITHMS
    {
      id: "qa-1",
      title: "A1. Shortest Path in an Unweighted Network",
      description: "A college network contains N computers connected by network links. Every link has the same cost. Given a source computer and a destination computer, find the minimum number of links required to reach the destination.",
      optionAlgoIds: ["a3", "a2", "a1", "a4", "a9", "a10"],
      correctAlgoId: "a1",
      explanation: "Because all edges have equal cost, BFS explores the graph level by level and guarantees the shortest path in terms of number of edges.",
      rewardPoints: 100
    },
    {
      id: "qa-2",
      title: "A2. Explore All Reachable Nodes",
      description: "Given a network starting from computer S, visit every reachable computer by exploring as deeply as possible before returning to previous nodes.",
      optionAlgoIds: ["a1", "a3", "a2", "a4", "a9", "a10"],
      correctAlgoId: "a2",
      explanation: "The required exploration strategy is depth-first traversal.",
      rewardPoints: 100
    },
    {
      id: "qa-3",
      title: "A3. Cheapest Route Between Cities",
      description: "There are N cities connected by roads. Every road has a positive travel cost. Find the minimum-cost route from city S to city T.",
      optionAlgoIds: ["a1", "a4", "a2", "a3", "a7", "a8"],
      correctAlgoId: "a3",
      explanation: "All edge weights are positive and only a single-source shortest path is required.",
      rewardPoints: 100
    },
    {
      id: "qa-4",
      title: "A4. Shortest Path with Negative Edge Costs",
      description: "A transportation network contains roads whose costs may be positive or negative. Find the shortest distance from a source to every other vertex and determine whether a negative-weight cycle exists.",
      optionAlgoIds: ["a3", "a8", "a7", "a1", "a2", "a4"],
      correctAlgoId: "a7",
      explanation: "Bellman-Ford supports negative edge weights and can detect negative-weight cycles.",
      rewardPoints: 120
    },
    {
      id: "qa-5",
      title: "A5. Shortest Distance Between Every Pair",
      description: "A small transportation network contains N cities. Find the shortest distance between every pair of cities.",
      optionAlgoIds: ["a3", "a7", "a1", "a8", "a2", "a4"],
      correctAlgoId: "a8",
      explanation: "The requirement is all-pairs shortest paths, which is the primary application of Floyd-Warshall.",
      rewardPoints: 120
    },
    {
      id: "qa-6",
      title: "A6. Minimum-Cost Cable Network",
      description: "A university wants to connect all its buildings using network cables. Each possible cable has a different cost. Connect all buildings with minimum total cable cost. The input is provided as a list of weighted edges.",
      optionAlgoIds: ["a6", "b1", "a5", "a3", "a1", "a2"],
      correctAlgoId: "a5",
      explanation: "The problem is a Minimum Spanning Tree problem, and the edge-list representation makes Kruskal particularly suitable.",
      rewardPoints: 100
    },
    {
      id: "qa-7",
      title: "A7. Minimum Network from a Starting Building",
      description: "A university wants to connect all buildings with minimum total cable cost. The network is represented using an adjacency matrix, and construction starts from a specified building.",
      optionAlgoIds: ["a5", "b1", "a3", "a6", "a1", "a2"],
      correctAlgoId: "a6",
      explanation: "Prim's grows the Minimum Spanning Tree from a starting vertex and works naturally with an adjacency matrix.",
      rewardPoints: 100
    },
    {
      id: "qa-8",
      title: "A8. Search from Both Ends",
      description: "A large unweighted network has a known source and destination. Find the shortest route by searching simultaneously from both the source and destination until the searches meet.",
      optionAlgoIds: ["a1", "a2", "a9", "a3", "a4", "a10"],
      correctAlgoId: "a9",
      explanation: "The problem specifically benefits from simultaneous search from both endpoints.",
      rewardPoints: 100
    },
    {
      id: "qa-9",
      title: "A9. GPS Navigation",
      description: "A GPS system needs to find a shortest route between two locations. The system knows the actual cost traveled so far and also has a valid estimate of the remaining distance to the destination.",
      optionAlgoIds: ["a3", "a1", "a2", "a4", "a9", "a10"],
      correctAlgoId: "a4",
      explanation: "A* combines the cost already travelled with a heuristic estimate of the remaining cost.",
      rewardPoints: 120
    },
    {
      id: "qa-10",
      title: "A10. Heuristic-Based Robot Navigation",
      description: "A robot is moving toward a target. At every step, it examines neighboring positions and chooses the position that appears closest to the target according to a heuristic. The objective is to reach the target quickly rather than guarantee the globally shortest route.",
      optionAlgoIds: ["a4", "b1", "a1", "a10", "a2", "a9"],
      correctAlgoId: "a10",
      explanation: "The algorithm repeatedly chooses the locally most promising neighboring state.",
      rewardPoints: 100
    },

    // PART B — OTHER ALGORITHMS
    {
      id: "qb-1",
      title: "B1. Search an Unsorted List",
      description: "You are given an unsorted list of student IDs. Determine whether a particular ID exists in the list. Only one search operation is required.",
      optionAlgoIds: ["b3", "b4", "b2", "b6", "b5", "b7"],
      correctAlgoId: "b2",
      explanation: "The data is unsorted and only one search is required. Sorting first would add unnecessary work.",
      rewardPoints: 80
    },
    {
      id: "qb-2",
      title: "B2. Search a Sorted List",
      description: "A college stores student IDs in ascending order. Given an ID, determine whether it exists. The list contains up to 1,000,000 IDs.",
      optionAlgoIds: ["b2", "b7", "b3", "b8", "b5", "b6"],
      correctAlgoId: "b3",
      explanation: "The list is already sorted, allowing the search space to be halved at every step.",
      rewardPoints: 100
    },
    {
      id: "qb-3",
      title: "B3. Sort a Small Dataset",
      description: "Sort a small collection of numbers in ascending order. Constraints: N <= 50, O(1) additional memory is preferred, simple implementation is preferred.",
      optionAlgoIds: ["b4", "b5", "b7", "b6", "b8", "b1"],
      correctAlgoId: "b6",
      explanation: "For a very small dataset with constant auxiliary space and simple implementation, Selection Sort is the intended choice.",
      rewardPoints: 80
    },
    {
      id: "qb-4",
      title: "B4. Sort a Nearly Sorted Array",
      description: "A list of student marks is already almost sorted. Only a small number of elements are out of position. Sort the complete list.",
      optionAlgoIds: ["b4", "b6", "b5", "b7", "b8", "b1"],
      correctAlgoId: "b5",
      explanation: "Insertion Sort performs very well when the number of inversions is small.",
      rewardPoints: 100
    },
    {
      id: "qb-5",
      title: "B5. Guaranteed Worst-Case Sorting",
      description: "A large dataset must be sorted. The system requires a guaranteed worst-case time complexity of O(N log N).",
      optionAlgoIds: ["b7", "b5", "b6", "b8", "b4", "b1"],
      correctAlgoId: "b8",
      explanation: "Merge Sort guarantees O(N log N) worst-case complexity, while standard Quick Sort can degrade to O(N²).",
      rewardPoints: 120
    },
    {
      id: "qb-6",
      title: "B6. Fast In-Place Sorting",
      description: "A large array needs to be sorted efficiently. The application prefers an in-place algorithm and is primarily concerned with average-case performance.",
      optionAlgoIds: ["b8", "b5", "b7", "b6", "b4", "b1"],
      correctAlgoId: "b7",
      explanation: "Quick Sort is generally efficient in practice, has good average-case performance, and can be implemented in-place.",
      rewardPoints: 120
    },
    {
      id: "qb-7",
      title: "B7. Search One Million Sorted IDs",
      description: "A database contains one million student IDs in sorted order. The system receives many search queries and must determine whether each ID exists.",
      optionAlgoIds: ["b2", "b7", "b8", "b3", "b5", "b6"],
      correctAlgoId: "b3",
      explanation: "The data is already sorted, so Binary Search provides O(log N) search per query.",
      rewardPoints: 100
    },
    {
      id: "qb-8",
      title: "B8. Find a Pair with a Given Sum",
      description: "Given a sorted array of N <= 100,000 integers and a target value T, determine whether two different elements have a sum equal to T. Constraints: Array is already sorted, O(1) extra space.",
      optionAlgoIds: ["b2", "b3", "b9", "b4", "b7", "b8"],
      correctAlgoId: "b9",
      explanation: "Two pointers can solve the problem in O(N) time and O(1) extra space.",
      rewardPoints: 120
    },
    {
      id: "qb-9",
      title: "B9. Maximum Sum Without Adjacent Elements",
      description: "You are given an array where each element represents the value of a house. You cannot select two adjacent houses. Find the maximum total value that can be collected. Example: Input [2, 7, 9, 3, 1] -> Output: 12 (Selection: 2 + 9 + 1 = 12).",
      optionAlgoIds: ["b1", "b2", "b3", "b10", "b7", "b8"],
      correctAlgoId: "b10",
      explanation: "The problem has overlapping subproblems and optimal substructure. The solution can be built from solutions to smaller prefixes.",
      rewardPoints: 150
    },
    {
      id: "qb-10",
      title: "B10. Find a Pair in a Sorted Array",
      description: "Given a sorted array of N <= 200,000 integers and a target value T, determine whether two numbers add up to T. Constraints: Array is already sorted, O(1) additional space, target complexity: O(N).",
      optionAlgoIds: ["b2", "b3", "b4", "b9", "b5", "b7"],
      correctAlgoId: "b9",
      explanation: "Place one pointer at each end. Move the left or right pointer depending on whether the current sum is smaller or larger than the target.",
      rewardPoints: 120
    }
  ],
  currentAuction: {
    active: false,
    algo: null,
    highestBid: 0,
    highestBidderId: null,
    highestBidderName: null,
    timerSeconds: 10,
    announcementStage: 0, // 0: Normal, 1: "Going ONCE", 2: "Going TWICE", 3: "SOLD"
    statusMessage: "Waiting for auction to start..."
  },
  currentQuestion: {
    active: false,
    question: null,
    revealed: false,
    submissions: {} // { teamId: { optionId, isCorrect, submittedAt } }
  },
  bidsHistory: [], // [{ timestamp, teamName, algoName, amount, isSold }]
  logs: []
};

const baseBidsMap = {
  a1: 30, a2: 30, a3: 50, a4: 70, a5: 50, a6: 50, a7: 60, a8: 80, a9: 40, a10: 40,
  b1: 40, b2: 20, b3: 50, b4: 20, b5: 30, b6: 20, b7: 60, b8: 70, b9: 50, b10: 100
};

function calculateDynamicMinBids(st) {
  if (!st || !st.algorithmsCatalog || !st.questionsCatalog) return;
  st.algorithmsCatalog.forEach(algo => {
    const correctCount = st.questionsCatalog.filter(q => q.correctAlgoId === algo.id).length;
    const base = baseBidsMap[algo.id] !== undefined ? baseBidsMap[algo.id] : (algo.baseMinBid || algo.minBid || 40);
    algo.baseMinBid = base;
    algo.importanceCount = correctCount;
    algo.minBid = base + (correctCount * 20);
  });
}

function normalizeQuestionsCatalog(st) {
  if (!st || !st.questionsCatalog) return;
  st.questionsCatalog.forEach(q => {
    if (q.rewardPoints === undefined) q.rewardPoints = 100;
    if (q.partialPoints === undefined) q.partialPoints = Math.round(q.rewardPoints * 0.25);
    if (q.coinsRequired === undefined) q.coinsRequired = 50;
  });
}

let state = loadState();

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      const loaded = JSON.parse(raw);
      if (!loaded.bidsHistory) loaded.bidsHistory = [];
      loaded.questionsCatalog = JSON.parse(JSON.stringify(defaultState.questionsCatalog));
      loaded.algorithmsCatalog = JSON.parse(JSON.stringify(defaultState.algorithmsCatalog));
      normalizeQuestionsCatalog(loaded);
      calculateDynamicMinBids(loaded);
      return loaded;
    }
  } catch (err) {
    console.error("Error loading state.json, loading default:", err);
  }
  const def = JSON.parse(JSON.stringify(defaultState));
  normalizeQuestionsCatalog(def);
  calculateDynamicMinBids(def);
  return def;
}

function saveState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error("Error saving state.json:", err);
  }
}

// Serve Static Files from 'public'
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Main Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Auction Timer Loop (Runs every 1 second)
let auctionInterval = null;

function startAuctionTimer() {
  if (auctionInterval) clearInterval(auctionInterval);
  
  auctionInterval = setInterval(() => {
    if (!state.currentAuction || !state.currentAuction.active) return;
    
    let auc = state.currentAuction;
    const maxSec = state.config.timerDurationSec || 10;
    const firstCallSec = Math.max(1, Math.floor(maxSec * 0.5));
    const secondCallSec = Math.max(1, Math.floor(maxSec * 0.25));

    if (auc.timerSeconds > 0) {
      auc.timerSeconds--;
      
      // Dynamic Announcement Calls: 1st Call, 2nd Call
      if (auc.timerSeconds <= firstCallSec && auc.timerSeconds > secondCallSec && auc.announcementStage < 1) {
        auc.announcementStage = 1;
        const currentHigh = auc.highestBid > 0 ? `${auc.highestBid} Coins by ${auc.highestBidderName}` : `Base Bid (${auc.algo.minBid} Coins)`;
        auc.statusMessage = `📣 1st CALL: Going ONCE at ${currentHigh}!`;
        addLog(`[AUCTION] 1st CALL for ${auc.algo.name} (${currentHigh})`);
        io.emit('auctionCallSound', { stage: 1 });
      } else if (auc.timerSeconds <= secondCallSec && auc.timerSeconds > 0 && auc.announcementStage < 2) {
        auc.announcementStage = 2;
        const currentHigh = auc.highestBid > 0 ? `${auc.highestBid} Coins by ${auc.highestBidderName}` : `Base Bid (${auc.algo.minBid} Coins)`;
        auc.statusMessage = `📣📣 2nd CALL: Going TWICE at ${currentHigh}! Final bids!`;
        addLog(`[AUCTION] 2nd CALL for ${auc.algo.name} (${currentHigh})`);
        io.emit('auctionCallSound', { stage: 2 });
      }
      
      if (auc.timerSeconds === 0) {
        // Finalize Auction! 3rd & Final Call / SOLD OUT
        auc.announcementStage = 3;
        auc.active = false;
        
        if (auc.highestBidderId) {
          const winningTeam = state.teams.find(t => t.id === auc.highestBidderId);
          if (winningTeam) {
            winningTeam.coins -= auc.highestBid;
            if (!winningTeam.algorithms.some(a => a.id === auc.algo.id)) {
              winningTeam.algorithms.push({
                id: auc.algo.id,
                name: auc.algo.name,
                boughtFor: auc.highestBid
              });
            }

            // Mark algorithm as sold in catalog
            const catAlgo = state.algorithmsCatalog.find(a => a.id === auc.algo.id);
            if (catAlgo) {
              catAlgo.sold = true;
              catAlgo.soldTo = winningTeam.name;
              catAlgo.soldPrice = auc.highestBid;
            }

            auc.statusMessage = `🔨 3rd CALL: SOLD OUT to ${winningTeam.name} for ${auc.highestBid} Coins! 🎉`;
            addLog(`[AUCTION SOLD] 3rd CALL: ${auc.algo.name} sold to ${winningTeam.name} for ${auc.highestBid} coins!`);
            
            // Add to live public bids history feed
            if (!state.bidsHistory) state.bidsHistory = [];
            state.bidsHistory.unshift({
              timestamp: new Date().toLocaleTimeString(),
              teamName: winningTeam.name,
              algoName: auc.algo.name,
              amount: auc.highestBid,
              isSold: true
            });

            io.emit('auctionSoldSound', { winnerId: winningTeam.id, winnerName: winningTeam.name, algoName: auc.algo.name, price: auc.highestBid });
          }
        } else {
          auc.statusMessage = `❌ 3rd CALL: CLOSED WITH NO BIDS. ${auc.algo.name} remains unsold.`;
          addLog(`[AUCTION UNSOLD] 3rd CALL: ${auc.algo.name} closed with no bids.`);
          io.emit('auctionSoldSound', { winnerId: null, winnerName: null, algoName: auc.algo.name, price: 0 });
        }
        saveState();
      }
      
      io.emit('stateUpdate', getPublicState());
    }
  }, 1000);
}

startAuctionTimer();

function addLog(msg) {
  const timestamp = new Date().toLocaleTimeString();
  state.logs.unshift({ timestamp, text: msg });
  if (state.logs.length > 50) state.logs.pop();
}

function getPublicState() {
  return state;
}

// Socket.IO Communication
io.on('connection', (socket) => {
  // Send state on connect
  socket.emit('stateUpdate', getPublicState());

  // --- Participant Registration ---
  socket.on('registerTeam', (data, callback) => {
    const { name, members, color } = data;
    if (!name || name.trim() === '') {
      return callback && callback({ success: false, message: 'Team Name is required.' });
    }
    
    const existing = state.teams.find(t => t.name.toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      // Reconnect team
      existing.socketId = socket.id;
      if (!existing.wonQuestions) existing.wonQuestions = [];
      if (!existing.lostQuestions) existing.lostQuestions = [];
      saveState();
      io.emit('stateUpdate', getPublicState());
      return callback && callback({ success: true, team: existing, reconnected: true });
    }

    const newTeam = {
      id: 'team-' + Date.now() + '-' + Math.floor(Math.random()*1000),
      name: name.trim(),
      members: members ? members.trim() : 'Anonymous',
      color: color || '#00f0ff',
      coins: state.config.initialCoins,
      algorithms: [],
      score: 0,
      wonQuestions: [],
      lostQuestions: [],
      eliminated: false,
      socketId: socket.id
    };

    state.teams.push(newTeam);
    addLog(`[REGISTER] New team registered: ${newTeam.name} (${newTeam.members})`);
    saveState();
    io.emit('stateUpdate', getPublicState());
    callback && callback({ success: true, team: newTeam });
  });

  // --- Participant Bidding ---
  socket.on('placeBid', (data, callback) => {
    const { teamId, amount } = data;
    if (!state.currentAuction || !state.currentAuction.active || state.currentAuction.timerSeconds <= 0 || state.currentAuction.announcementStage >= 3) {
      return callback && callback({ success: false, message: 'Bidding is currently closed for this algorithm auction.' });
    }

    const team = state.teams.find(t => t.id === teamId);
    if (!team) {
      return callback && callback({ success: false, message: 'Team not found.' });
    }

    if (team.eliminated) {
      return callback && callback({ success: false, message: 'Your team has been eliminated.' });
    }

    const auc = state.currentAuction;

    // PREVENT SELF-BIDDING CONFLICT!
    if (auc.highestBidderId === team.id) {
      return callback && callback({ success: false, message: '⭐ Your team is ALREADY the highest bidder! You cannot bid against yourself.' });
    }

    const bidValue = parseInt(amount, 10);
    const minRequired = auc.highestBid > 0 ? auc.highestBid + 10 : auc.algo.minBid;

    if (isNaN(bidValue) || bidValue < minRequired) {
      return callback && callback({ success: false, message: `Minimum valid bid is ${minRequired} coins.` });
    }

    if (team.coins < bidValue) {
      return callback && callback({ success: false, message: `Insufficient coins! You have ${team.coins} coins.` });
    }

    // Accept Bid & RESET Timer
    auc.highestBid = bidValue;
    auc.highestBidderId = team.id;
    auc.highestBidderName = team.name;
    auc.timerSeconds = state.config.timerDurationSec || 15;
    auc.announcementStage = 0; // Reset announcement sequence
    auc.statusMessage = `⚡ New High Bid: ${bidValue} Coins by ${team.name}!`;

    // Track in live public bids history ticker
    if (!state.bidsHistory) state.bidsHistory = [];
    state.bidsHistory.unshift({
      timestamp: new Date().toLocaleTimeString(),
      teamName: team.name,
      algoName: auc.algo.name,
      amount: bidValue,
      isSold: false
    });
    if (state.bidsHistory.length > 40) state.bidsHistory.pop();

    addLog(`[BID] ${team.name} bid ${bidValue} coins on ${auc.algo.name}`);
    saveState();
    io.emit('stateUpdate', getPublicState());
    io.emit('bidPlacedSound', { bidderId: team.id, bidderName: team.name, amount: bidValue });
    callback && callback({ success: true });
  });

  // --- Question Submission ---
  socket.on('submitQuestionAnswer', (data, callback) => {
    const { teamId, selectedAlgoId } = data;
    if (!state.currentQuestion || !state.currentQuestion.active) {
      return callback && callback({ success: false, message: 'No active question.' });
    }

    const team = state.teams.find(t => t.id === teamId);
    if (!team || team.eliminated) {
      return callback && callback({ success: false, message: 'Team disqualified or invalid.' });
    }

    const q = state.currentQuestion.question;
    const coinsReq = q.coinsRequired !== undefined ? parseInt(q.coinsRequired, 10) : 50;

    // Check if team has enough coins to pay the submission fee
    if (team.coins < coinsReq) {
      return callback && callback({ success: false, message: `Insufficient coins to submit answer! Required fee is ${coinsReq} coins, but your team has only ${team.coins} coins.` });
    }

    // Check if team owns the selected algorithm
    const ownsAlgo = team.algorithms.some(a => a.id === selectedAlgoId);
    if (!ownsAlgo) {
      return callback && callback({ success: false, message: 'Your team does not possess this algorithm!' });
    }

    // Deduct entry fee
    team.coins -= coinsReq;

    const isCorrect = selectedAlgoId === q.correctAlgoId;
    state.currentQuestion.submissions[teamId] = {
      selectedAlgoId,
      isCorrect,
      paidCoins: coinsReq,
      submittedAt: new Date().toLocaleTimeString()
    };

    addLog(`[ANSWER SUBMITTED] Team ${team.name} paid ${coinsReq} coins & submitted algorithm answer for "${q.title}"`);
    saveState();
    io.emit('stateUpdate', getPublicState());
    callback && callback({ success: true, message: `Answer submitted successfully! (${coinsReq} Coins deducted)` });
  });

  // --- ADMIN ACTIONS ---
  
  // 1. Config Updates
  socket.on('adminUpdateConfig', (newConfig) => {
    state.config = { ...state.config, ...newConfig };
    saveState();
    io.emit('stateUpdate', getPublicState());
  });

  // 2. Add / Edit Team Balance
  socket.on('adminUpdateTeamCoins', ({ teamId, coins, score }) => {
    const team = state.teams.find(t => t.id === teamId);
    if (team) {
      if (coins !== undefined) team.coins = parseInt(coins, 10);
      if (score !== undefined) team.score = parseInt(score, 10);
      saveState();
      io.emit('stateUpdate', getPublicState());
    }
  });

  // 3. Toggle Team Elimination
  socket.on('adminToggleElimination', ({ teamId }) => {
    const team = state.teams.find(t => t.id === teamId);
    if (team) {
      team.eliminated = !team.eliminated;
      addLog(`[ELIMINATION] Team ${team.name} state changed: ${team.eliminated ? 'ELIMINATED' : 'RESTORED'}`);
      saveState();
      io.emit('stateUpdate', getPublicState());
    }
  });

  // 4. Start Algorithm Auction
  socket.on('adminStartAuction', ({ algoId, force }) => {
    const algo = state.algorithmsCatalog.find(a => a.id === algoId);
    if (!algo) return;
    if (algo.sold && !force) {
      return socket.emit('auctionError', { message: `"${algo.name}" has already been SOLD to ${algo.soldTo}! Re-add it or enable "Show Sold" to re-auction.` });
    }

    state.gameState = "BIDDING";
    state.currentAuction = {
      active: true,
      algo: algo,
      highestBid: 0,
      highestBidderId: null,
      highestBidderName: null,
      timerSeconds: state.config.timerDurationSec || 15,
      announcementStage: 0,
      statusMessage: `🔥 AUCTION STARTED for ${algo.name}! Base Price: ${algo.minBid} Coins.`
    };

    startAuctionTimer();
    addLog(`[ADMIN] Started auction for ${algo.name}`);
    saveState();
    io.emit('stateUpdate', getPublicState());
    io.emit('auctionStartSound');
  });

  // Toggle Algorithm Sold state manually
  socket.on('adminToggleAlgoSold', ({ algoId }) => {
    const algo = state.algorithmsCatalog.find(a => a.id === algoId);
    if (algo) {
      algo.sold = !algo.sold;
      if (!algo.sold) {
        delete algo.soldTo;
        delete algo.soldPrice;
      }
      addLog(`[ADMIN] Toggled sold status for ${algo.name}: ${algo.sold ? 'SOLD OUT' : 'AVAILABLE'}`);
      saveState();
      io.emit('stateUpdate', getPublicState());
    }
  });

  // 5. Pause / Stop Auction
  socket.on('adminStopAuction', () => {
    if (state.currentAuction) {
      state.currentAuction.active = false;
      state.currentAuction.statusMessage = "⏸️ Auction paused by Admin.";
      saveState();
      io.emit('stateUpdate', getPublicState());
    }
  });

  // 6. Launch Graph Question
  socket.on('adminLaunchQuestion', ({ questionId }) => {
    const q = state.questionsCatalog.find(item => item.id === questionId);
    if (!q) return;

    state.gameState = "QUESTION";
    state.currentQuestion = {
      active: true,
      question: q,
      revealed: false,
      submissions: {}
    };

    addLog(`[ADMIN] Launched Question: "${q.title}"`);
    saveState();
    io.emit('stateUpdate', getPublicState());
    io.emit('questionLaunchSound');
  });

  // 7. Reveal Question Answer & Award Rewards (Optimal & Partial Credit)
  socket.on('adminRevealAndAward', () => {
    if (!state.currentQuestion || !state.currentQuestion.active) return;
    const q = state.currentQuestion.question;
    state.currentQuestion.revealed = true;

    const optimalPts = q.rewardPoints !== undefined ? parseInt(q.rewardPoints, 10) : 100;
    const partialPts = q.partialPoints !== undefined ? parseInt(q.partialPoints, 10) : Math.round(optimalPts * 0.25);

    state.teams.forEach(team => {
      if (!team.wonQuestions) team.wonQuestions = [];
      if (!team.lostQuestions) team.lostQuestions = [];

      const sub = state.currentQuestion.submissions[team.id];
      
      if (sub) {
        if (!sub.awarded) {
          sub.awarded = true;
          if (sub.isCorrect) {
            // Optimal Answer -> Full Optimal Points (e.g. +100 Pts)
            team.score += optimalPts;
            if (!team.wonQuestions.some(w => w.qId === q.id)) {
              team.wonQuestions.push({
                qId: q.id,
                title: q.title,
                points: optimalPts,
                isOptimal: true,
                timestamp: new Date().toLocaleTimeString()
              });
            }
            addLog(`[REWARD - OPTIMAL] ${team.name} earned +${optimalPts} points for OPTIMAL solution to "${q.title}"!`);
          } else {
            // Suboptimal / Valid Option -> Partial Points (e.g. +25 Pts)
            team.score += partialPts;
            if (!team.wonQuestions.some(w => w.qId === q.id)) {
              team.wonQuestions.push({
                qId: q.id,
                title: q.title,
                points: partialPts,
                isOptimal: false,
                timestamp: new Date().toLocaleTimeString()
              });
            }
            addLog(`[REWARD - SUBOPTIMAL] ${team.name} earned +${partialPts} partial points for submitting answer to "${q.title}"!`);
          }
        }
      } else {
        // Did not attempt / Locked
        if (!team.lostQuestions.some(l => l.qId === q.id) && !team.wonQuestions.some(w => w.qId === q.id)) {
          const optionAlgoIds = q.optionAlgoIds || [];
          const ownsAnyOption = team.algorithms.some(a => optionAlgoIds.includes(a.id));
          team.lostQuestions.push({
            qId: q.id,
            title: q.title,
            reason: ownsAnyOption ? 'Time Expired / Not Submitted' : 'Locked (Do not possess any featured algorithm)',
            timestamp: new Date().toLocaleTimeString()
          });
        }
      }
    });

    saveState();
    io.emit('stateUpdate', getPublicState());
  });

  // 8. Create Custom Algorithm
  socket.on('adminAddAlgorithm', (algoData) => {
    const newAlgo = {
      id: 'algo-' + Date.now(),
      name: algoData.name || 'Custom Algorithm',
      category: algoData.category || 'General',
      minBid: parseInt(algoData.minBid, 10) || 50,
      description: algoData.description || ''
    };
    state.algorithmsCatalog.push(newAlgo);
    saveState();
    io.emit('stateUpdate', getPublicState());
  });

  // 9. Create Custom Question (Multi-Algorithm Options)
  socket.on('adminAddQuestion', (qData) => {
    const rewardPts = parseInt(qData.rewardPoints, 10) || 100;
    const newQ = {
      id: 'q-' + Date.now(),
      title: qData.title || 'Custom Algorithm Problem',
      description: qData.description || '',
      optionAlgoIds: qData.optionAlgoIds || [],
      correctAlgoId: qData.correctAlgoId || '',
      rewardPoints: rewardPts,
      partialPoints: qData.partialPoints !== undefined ? parseInt(qData.partialPoints, 10) : Math.round(rewardPts * 0.25),
      coinsRequired: qData.coinsRequired !== undefined ? parseInt(qData.coinsRequired, 10) : 50
    };
    state.questionsCatalog.push(newQ);
    calculateDynamicMinBids(state);
    saveState();
    io.emit('stateUpdate', getPublicState());
  });

  // 9b. Update Question Settings (Coins Required, Optimal Points, Partial Points)
  socket.on('adminUpdateQuestion', ({ questionId, coinsRequired, rewardPoints, partialPoints }) => {
    const q = state.questionsCatalog.find(item => item.id === questionId);
    if (q) {
      if (coinsRequired !== undefined) q.coinsRequired = parseInt(coinsRequired, 10);
      if (rewardPoints !== undefined) q.rewardPoints = parseInt(rewardPoints, 10);
      if (partialPoints !== undefined) q.partialPoints = parseInt(partialPoints, 10);
      addLog(`[ADMIN] Updated settings for question "${q.title}"`);
      saveState();
      io.emit('stateUpdate', getPublicState());
    }
  });

  // 10. Grand Finale Winner Declaration
  socket.on('adminTriggerFinale', () => {
    state.gameState = "FINALE";
    addLog(`[FINALE] Admin announced Grand Finale!`);
    saveState();
    io.emit('stateUpdate', getPublicState());
    io.emit('finaleSound');
  });

  // 11. Full System Reset
  socket.on('adminResetGame', () => {
    state = JSON.parse(JSON.stringify(defaultState));
    calculateDynamicMinBids(state);
    saveState();
    io.emit('stateUpdate', getPublicState());
    addLog(`[SYSTEM RESET] Admin reset all game data.`);
  });
});

// Start listening
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n====================================================');
  console.log('🚀 ALGORITHM AUCTION SERVER IS LIVE!');
  console.log('====================================================');
  
  const interfaces = os.networkInterfaces();
  const physicalIps = [];
  const virtualIps = [];

  for (const name of Object.keys(interfaces)) {
    const isVirtual = /virtual|vmware|vbox|vethernet|wsl|bluetooth|loopback/i.test(name);
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        if (isVirtual) {
          virtualIps.push({ name, ip: net.address });
        } else {
          physicalIps.push({ name, ip: net.address });
        }
      }
    }
  }

  console.log('📡 LAB PARTICIPANT URL (Share this with lab PCs):');
  if (physicalIps.length > 0) {
    physicalIps.forEach(item => {
      console.log(`   👉 http://${item.ip}:${PORT}  (${item.name}) <-- USE THIS ONE!`);
    });
  } else {
    // Fallback if interface names don't match pattern
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`   👉 http://${net.address}:${PORT}  (${name})`);
        }
      }
    }
  }

  if (virtualIps.length > 0) {
    console.log('\n⚠️ VIRTUAL ADAPTER IPs (Do NOT give these to lab PCs):');
    virtualIps.forEach(item => {
      console.log(`   ⛔ http://${item.ip}:${PORT}  (${item.name})`);
    });
  }
  
  console.log('\n👑 ADMIN CONTROL DASHBOARD (ADMIN PC ONLY):');
  console.log(`   👉 http://localhost:${PORT}/admin`);
  console.log('====================================================');
  console.log('🛡️ IF LAB PCs CANNOT CONNECT ("Connection Refused"):');
  console.log('   Run PowerShell as Admin and execute:');
  console.log('   New-NetFirewallRule -DisplayName "AlgoAuct Server" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow');
  console.log('====================================================\n');
});

