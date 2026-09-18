// --- Configuration ---
const PARENT_CODE = "1234"; // Code secret pour les parents (à modifier !)
const POINTS_PER_LEVEL = 10;

// --- État du jeu ---
let playerName = "";
let score = 0;
let currentLevel = 1;
let nodes = [];       // {id, x, y}
let solutionEdges = []; // {from, to}
let userEdges = [];   // {from, to}
let isDrawing = false;
let startNode = null;
let currentNode = null;

// --- Éléments DOM ---
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiName = document.getElementById('ui-name');
const uiScore = document.getElementById('ui-score');
const uiLevel = document.getElementById('ui-level');

// --- Initialisation ---
function init() {
    // Vérifier si un joueur est déjà sauvegardé
    const savedName = localStorage.getItem('nodeGameName');
    const savedScore = localStorage.getItem('nodeGameScore');
    const savedLevel = localStorage.getItem('nodeGameLevel');

    if (savedName && savedScore && savedLevel) {
        playerName = savedName;
        score = parseInt(savedScore);
        currentLevel = parseInt(savedLevel);
        document.getElementById('saved-name').innerText = playerName;
        document.getElementById('welcome-back').classList.remove('hidden');
        document.getElementById('start-btn').classList.add('hidden');
    }

    // Événements
    document.getElementById('start-btn').addEventListener('click', startNewGame);
    document.getElementById('continue-btn').addEventListener('click', () => loadGame(playerName, score, currentLevel));
    document.getElementById('reset-btn').addEventListener('click', resetLevel);
    document.getElementById('solution-btn').addEventListener('click', showParentModal);
    document.getElementById('next-level-btn').addEventListener('click', nextLevel);
    
    // Gestion de la modale parent
    document.getElementById('cancel-parent').addEventListener('click', () => document.getElementById('parent-modal').classList.add('hidden'));
    document.getElementById('submit-parent').addEventListener('click', checkParentCode);

    // Redimensionnement du canvas
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
}

// --- Gestion du Canvas ---
function resizeCanvas() {
    const size = Math.min(window.innerWidth - 40, window.innerHeight - 200, 500);
    canvas.width = size;
    canvas.height = size;
    if (nodes.length > 0) draw();
}

// --- Démarrage du jeu ---
function startNewGame() {
    const nameInput = document.getElementById('player-name').value.trim();
    if (nameInput === "") {
        alert("S'il te plaît, entre ton nom !");
        return;
    }
    playerName = nameInput;
    score = 0;
    currentLevel = 1;
    saveProgress();
    loadGame(playerName, score, currentLevel);
}

function loadGame(name, currentScore, level) {
    playerName = name;
    score = currentScore;
    currentLevel = level;
    
    uiName.innerText = playerName;
    uiScore.innerText = score;
    uiLevel.innerText = currentLevel;

    loginScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    generateLevel(currentLevel);
    resizeCanvas();
    draw();
}

// --- Sauvegarde ---
function saveProgress() {
    localStorage.setItem('nodeGameName', playerName);
    localStorage.setItem('nodeGameScore', score);
    localStorage.setItem('nodeGameLevel', currentLevel);
}

// --- Générateur de Niveaux (Algorithme) ---
function generateLevel(level) {
    nodes = [];
    solutionEdges = [];
    userEdges = [];

    // Taille de la grille augmente avec le niveau (ex: niveau 1 = 2x2, niveau 10 = 4x4)
    const gridSize = Math.min(Math.floor(level / 5) + 2, 6); 
    const padding = 40;
    const cellSize = (canvas.width - padding * 2) / (gridSize - 1);

    // Création des nœuds sur la grille
    let nodeId = 0;
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            nodes.push({
                id: nodeId++,
                x: padding + col * cellSize,
                y: padding + row * cellSize
            });
        }
    }

    // Génération d'un chemin (Algorithme de type "Serpent" avec virages aléatoires)
    // Pour simplifier, on va créer un chemin qui visite tous les nœuds exactement une fois.
    // On utilise une marche aléatoire guidée pour éviter les impasses.
    let current = nodes[Math.floor(Math.random() * nodes.length)];
    let unvisited = new Set(nodes.map(n => n.id));
    unvisited.delete(current.id);

    while (unvisited.size > 0) {
        // Trouver les voisins non visités
        let neighbors = nodes.filter(n => {
            if (!unvisited.has(n.id)) return false;
            const dx = Math.abs(n.x - current.x);
            const dy = Math.abs(n.y - current.y);
            return (dx === cellSize && dy === 0) || (dx === 0 && dy === cellSize);
        });

        if (neighbors.length > 0) {
            // Choisir un voisin au hasard
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            solutionEdges.push({ from: current.id, to: next.id });
            current = next;
            unvisited.delete(current.id);
        } else {
            // Impasse : on recommence la génération (très rare sur une grille)
            return generateLevel(level); 
        }
    }
}

// --- Dessin ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Dessiner les lignes de la solution (si le parent a validé)
    if (window.showSolutionFlag) {
        ctx.strokeStyle = 'rgba(76, 175, 80, 0.3)';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        solutionEdges.forEach(edge => {
            const n1 = nodes.find(n => n.id === edge.from);
            const n2 = nodes.find(n => n.id === edge.to);
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
        });
    }

    // 2. Dessiner les lignes de l'utilisateur
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    userEdges.forEach(edge => {
        const n1 = nodes.find(n => n.id === edge.from);
        const n2 = nodes.find(n => n.id === edge.to);
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
    });

    // 3. Dessiner la ligne en cours de tracé
    if (isDrawing && startNode && currentNode) {
        ctx.strokeStyle = '#81C784';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(startNode.x, startNode.y);
        ctx.lineTo(currentNode.x, currentNode.y);
        ctx.stroke();
    }

    // 4. Dessiner les nœuds
    nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.stroke();
    });
}

// --- Interaction (Souris / Tactile) ---
function getNodeAt(x, y) {
    for (let node of nodes) {
        const dist = Math.hypot(node.x - x, node.y - y);
        if (dist < 30) return node; // Zone de clic généreuse pour les enfants
    }
    return null;
}

function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
    };
}

function handleStart(e) {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    const node = getNodeAt(coords.x, coords.y);
    if (node) {
        isDrawing = true;
        startNode = node;
        currentNode = node;
        draw();
    }
}

function handleMove(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    const node = getNodeAt(coords.x, coords.y);
    
    if (node && node.id !== startNode.id) {
        // Vérifier si le nœud est adjacent (pas de saut par-dessus les autres)
        const dx = Math.abs(node.x - startNode.x);
        const dy = Math.abs(node.y - startNode.y);
        const cellSize = canvas.width / (Math.sqrt(nodes.length) + 1); // Approximation

        // Si c'est un voisin direct
        if ((dx <= cellSize * 1.5 && dy <= cellSize * 0.5) || (dx <= cellSize * 0.5 && dy <= cellSize * 1.5)) {
            // Vérifier si la connexion n'existe pas déjà
            const exists = userEdges.some(edge => 
                (edge.from === startNode.id && edge.to === node.id) || 
                (edge.from === node.id && edge.to === startNode.id)
            );

            if (!exists) {
                userEdges.push({ from: startNode.id, to: node.id });
                startNode = node; // Le nouveau point de départ devient le nœud actuel
                checkWin();
            }
        }
    }
    currentNode = node || currentNode;
    draw();
}

function handleEnd(e) {
    e.preventDefault();
    isDrawing = false;
    startNode = null;
    currentNode = null;
    draw();
}

// Événements
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);
canvas.addEventListener('mouseleave', handleEnd);
canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd);

// --- Vérification de la Victoire ---
function checkWin() {
    if (userEdges.length === solutionEdges.length) {
        // Vérifier que toutes les arêtes de la solution sont présentes
        const isWin = solutionEdges.every(solEdge => 
            userEdges.some(usrEdge => 
                (usrEdge.from === solEdge.from && usrEdge.to === solEdge.to) ||
                (usrEdge.from === solEdge.to && usrEdge.to === solEdge.from)
            )
        );

        if (isWin) {
            setTimeout(() => {
                score += POINTS_PER_LEVEL;
                uiScore.innerText = score;
                saveProgress();
                document.getElementById('win-level').innerText = currentLevel;
                document.getElementById('win-modal').classList.remove('hidden');
            }, 300);
        }
    }
}

// --- Niveau Suivant ---
function nextLevel() {
    document.getElementById('win-modal').classList.add('hidden');
    currentLevel++;
    uiLevel.innerText = currentLevel;
    saveProgress();
    window.showSolutionFlag = false;
    generateLevel(currentLevel);
    resizeCanvas();
    draw();
}

// --- Recommencer le niveau ---
function resetLevel() {
    userEdges = [];
    window.showSolutionFlag = false;
    draw();
}

// --- Afficher la solution (Code Parent) ---
function showParentModal() {
    document.getElementById('parent-modal').classList.remove('hidden');
    document.getElementById('parent-code').value = '';
    document.getElementById('parent-error').classList.add('hidden');
}

function checkParentCode() {
    const code = document.getElementById('parent-code').value;
    if (code === PARENT_CODE) {
        document.getElementById('parent-modal').classList.add('hidden');
        window.showSolutionFlag = true;
        draw();
    } else {
        document.getElementById('parent-error').classList.remove('hidden');
    }
}

// Démarrer l'application
init();