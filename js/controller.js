/**
 * The visualization controller will works as a state machine.
 * See files under the `doc` folder for transition descriptions.
 * See https://github.com/jakesgordon/javascript-state-machine
 * for the document of the StateMachine module.
 */
var Controller = StateMachine.create({
    initial: 'none',
    events: [
        {
            name: 'init',
            from: 'none',
            to:   'ready'
        },
        {
            name: 'search',
            from: 'starting',
            to:   'searching'
        },
        {
            name: 'pause',
            from: 'searching',
            to:   'paused'
        },
        {
            name: 'finish',
            from: 'searching',
            to:   'finished'
        },
        {
            name: 'resume',
            from: 'paused',
            to:   'searching'
        },
        {
            name: 'cancel',
            from: 'paused',
            to:   'ready'
        },
        {
            name: 'modify',
            from: 'finished',
            to:   'modified'
        },
        {
            name: 'reset',
            from: '*',
            to:   'ready'
        },
        {
            name: 'clear',
            from: ['finished', 'modified'],
            to:   'ready'
        },
        {
            name: 'start',
            from: ['ready', 'modified', 'restarting'],
            to:   'starting'
        },
        {
            name: 'restart',
            from: ['searching', 'finished'],
            to:   'restarting'
        },
        {
            name: 'dragStart',
            from: ['ready', 'finished'],
            to:   'draggingStart'
        },
        {
            name: 'dragEnd',
            from: ['ready', 'finished'],
            to:   'draggingEnd'
        },
        {
            name: 'drawWall',
            from: ['ready', 'finished'],
            to:   'drawingWall'
        },
        {
            name: 'eraseWall',
            from: ['ready', 'finished'],
            to:   'erasingWall'
        },
        {
            name: 'rest',
            from: ['draggingStart', 'draggingEnd', 'drawingWall', 'erasingWall'],
            to  : 'ready'
        },
    ],
});

$.extend(Controller, {
    gridSize: [64, 36], // number of nodes horizontally and vertically
    operationsPerSecond: 300,

    /**
     * Asynchronous transition from `none` state to `ready` state.
     */
    onleavenone: function() {
        var numCols = this.gridSize[0],
            numRows = this.gridSize[1];

        this.grid = new PF.Grid(numCols, numRows);
        
        View.init({
            numCols: numCols,
            numRows: numRows
        });
        View.generateGrid(function() {
            Controller.setDefaultStartEndPos();
            Controller.bindEvents();
            Controller.transition(); // transit to the next state (ready)
            
            
        });

        this.$buttons = $('.control_button');

        this.hookPathFinding();
        return StateMachine.ASYNC;
        // => ready
    },
        

    ondrawWall: function(event, from, to, gridX, gridY) {
        this.setWalkableAt(gridX, gridY, false);
        // => drawingWall
    },
    oneraseWall: function (event, from, to, gridX, gridY) {
        console.log("aizat");
        this.setWalkableAt(gridX, gridY, true);
        // => erasingWall
    },
    yenKShortestPaths: function (grid, finder, startX, startY, endX, endY, K) {
        let paths = [];
        let gridClone = grid.clone(); 
        let shortestPath = finder.findPath(startX, startY, endX, endY, gridClone);

        if (shortestPath.length === 0) {
            console.warn("No path found!");
            return [];
        }

        paths.push(shortestPath);

        // Create a new grid for blocking previous paths
        //let newGrid = grid.clone();
        let latestGrid = grid.clone(); 
        for (let k = 1; k < K; k++) {
            let newGrid = latestGrid.clone(); 
            
            for (let i = 1; i < paths[k - 1].length - 1; i++) { 
                let [x, y] = paths[k - 1][i];
                newGrid.setWalkableAt(x, y, false); 
            }

            let newPath = finder.findPath(startX, startY, endX, endY, newGrid);

            if (newPath.length === 0) break; 

            console.log('Alternative path ' + k + ': ', newPath);
            paths.push(newPath); 
        }

        return paths;
    },

    onsearch: function (event, from, to) {
        let liftChecked, stairChecked, escalatorChecked;
        var currentPage = window.location.pathname;

        if (currentPage.includes("index.html") || currentPage === "/") {
            liftChecked = document.getElementById("checkbox_lift").checked;
            stairChecked = document.getElementById("checkbox_stair").checked;
            escalatorChecked = document.getElementById("checkbox_escalator").checked;
            if (!liftChecked && !stairChecked && !escalatorChecked) {
                alert('You are going to different floor, please at least choose 1 method to go to another floor.');
                return;
            }
            const selectedRadio = document.querySelector('input[name="destination"]:checked');
            
            if (selectedRadio) {
                console.log("Selected Destination:", selectedRadio.value);
                [this.endFloor, this.endX, this.endY] = selectedRadio.value.split(",").map(Number);
            }
            else {
                alert('Please choose destination');
                return;
            }
            if (this.endFloor === 1) {
                this.setEndPos(this.endX, this.endY);
            }
            else {
                
                localStorage.setItem("localEndFloor", this.endFloor);
                localStorage.setItem("localEndX", this.endX);
                localStorage.setItem("localEndY", this.endY);
            }
        } else {
            this.setEndPos(this.endX, this.endY);
        }
        
        
        console.log("onsearch triggered!", from, to);
        console.log("Current state manual aizat:", Controller.current); 
        var grid,
            timeStart, timeEnd,
            finder = Panel.getFinder();
        timeStart = window.performance ? performance.now() : Date.now();
        grid = this.grid.clone();
        
        
        //var lifts = [hahah
        //    { x: 10, y: 1 },
        //    { x: 11, y: 25 },
        //    { x: 51, y: 25 },
        //    { x: 52, y: 2 }
        //];
        var shortestPath = null;
        var shortestDistance = Infinity;


        if (this.endFloor === 1) {
            //this.path = finder.findPath(
            //    this.startX, this.startY, this.endX, this.endY, grid
            //);
            let K = 2; // Number of alternative paths to find
            this.paths = this.yenKShortestPaths(grid, finder, this.startX, this.startY, this.endX, this.endY, K);
            for (let i = 0; i < this.paths.length; i++) {
                //View.drawPath(this.paths[i]);
                console.log('path for ' + (i + 1) + ' is : ' + JSON.stringify(this.paths[i]));
            }
            if (this.paths.length < 1) {
                alert('No path found');
                return;
            } else {
                /*alert('You have ' + this.paths.length + ' path.');*/
                //let choices = this.paths.map((p, index) => `${index + 1}: Path with ${p.length} steps`).join("\n");
                //let choice = prompt(`You have ${this.paths.length} paths available. Choose one:\n${choices}`, "1");

                //let chosenPathIndex = parseInt(choice) - 1;
                //if (!isNaN(chosenPathIndex) && chosenPathIndex >= 0 && chosenPathIndex < this.paths.length) {
                //    this.selectedPath = this.paths[chosenPathIndex];
                //    alert(`You selected path ${chosenPathIndex + 1}`);
                //}
                //else {
                //    alert("Invalid selection. Defaulting to the shortest path.");
                //    this.selectedPath = this.paths[0]; // Default to shortest if invalid choice
                //}
                let choices = this.paths.map((p, index) => `${index + 1}: Path with ${p.length} steps`).join("\n");
                choices += `\n${this.paths.length + 1}: Show all paths`; // Add option for all paths

                let choice = prompt(`You have ${this.paths.length} paths to destination floor 1 available. Choose one or show all:\n${choices}`, "1");

                let chosenPathIndex = parseInt(choice) - 1;
                this.allPath = this.paths;
                if (!isNaN(chosenPathIndex) && chosenPathIndex >= 0 && chosenPathIndex < this.paths.length) {
                    // User chose a specific path
                    this.paths = [this.paths[chosenPathIndex]];
                    //alert(`You selected Path ${chosenPathIndex + 1}`);
                } else if (chosenPathIndex === this.paths.length) {
                    // User chose to show all paths
                    this.paths = this.paths;
                    //alert(`You selected all paths`);
                } else {
                   //alert("Invalid selection. Defaulting to the shortest path.");
                    this.paths = [this.paths[0]]; // Default to shortest if invalid choice
                }

            }

            console.log(`Start at (${this.startX}, ${this.startY}) and end at (${this.endX}, ${this.endY}) `);
            //sini aizat
            //this.loop();
            //View.drawPath(this.paths[0], 0);
            //View.drawPath(this.paths[1], 1);
            //View.drawPath(this.paths[2], 2);
            //return;
        }
        else {
            var lifts = [
                { x: 8, y: 1 },
                { x: 9, y: 15 },
                { x: 34, y: 2 },
                { x: 34, y: 15 }
            ];
            
            var savedLifts = JSON.parse(localStorage.getItem("customLifts")) || [];
            lifts = lifts.concat(savedLifts); 

            var escalators = [
                { x: 12, y: 7 },
                { x: 29, y: 7 },
            ];

            var stairs = [
                { x: 7, y: 1 },
                { x: 8, y: 15 },
                { x: 33, y: 2 },
                { x: 33, y: 15 },
            ];
            var allPossibleConnection = [];
            var blockedNodes = []; // Store blocked coordinates

            //if (liftChecked) allPossibleConnection = allPossibleConnection.concat(lifts);
            //if (stairChecked) allPossibleConnection = allPossibleConnection.concat(stairs);
            //if (escalatorChecked) allPossibleConnection = allPossibleConnection.concat(escalators);
            let possibleConnections = []; // Stores names of possible connections

            if (liftChecked) {
                allPossibleConnection = allPossibleConnection.concat(lifts);
                possibleConnections.push("Lift");
            } else {
                blockedNodes = blockedNodes.concat(lifts);
            }

            if (stairChecked) {
                allPossibleConnection = allPossibleConnection.concat(stairs);
                possibleConnections.push("Stair");
            } else {
                blockedNodes = blockedNodes.concat(stairs);
            }

            if (escalatorChecked) {
                allPossibleConnection = allPossibleConnection.concat(escalators);
                possibleConnections.push("Escalator");
            } else {
                blockedNodes = blockedNodes.concat(escalators);
            }
            this.possibleConnectionText = possibleConnections.join(" / "); 

            for (let i = 0; i < blockedNodes.length; i++) {
                let { x, y } = blockedNodes[i];
                //grid.setWalkableAt(x, y, false);//set grid cannot step
                //this.setWalkableAt(x, y, false);//set color
            }
            console.log("Selected connections:", allPossibleConnection);



            var liftChoosen = null;
            if (currentPage.includes("index.html") || currentPage === "/") {
                
                
                //for (var i = 0; i < lifts.length; i++) {
                //    var lift = lifts[i];
                //    var tempGrid = grid.clone();

                //    var temp = finder.findPath(
                //        this.startX, this.startY, lift.x, lift.y, tempGrid
                //    );
                //    console.log('lift ' + (i + 1) + ' disctance is:' + temp.length);
                //    if (temp.length < shortestDistance) {
                //        liftChoosen = i;
                //        shortestDistance = temp.length;

                //    }

                //}
                //let distances = [];
                for (var i = 0; i < allPossibleConnection.length; i++) {
                    var lift = allPossibleConnection[i];
                    var tempGrid = grid.clone();
                    var temp = Math.sqrt(
                        Math.pow(this.startX - lift.x, 2) + Math.pow(this.startY - lift.y, 2)
                    );

                    
                    console.log('lift ' + (i + 1) + ' disctance mathematic is:' + temp);
                    //distances.push({ index: i, distance: temp });
                    //distances.sort((a, b) => a.distance - b.distance);

                    if (temp < shortestDistance) {
                        liftChoosen = i;
                        shortestDistance = temp;

                    }

                }
                //let top3Indexes = distances.slice(0, 3).map(item => item.index);
                //this.paths = finder.findPath(
                //    this.startX, this.startY, allPossibleConnection[liftChoosen].x, allPossibleConnection[liftChoosen].y, grid
                //);
                let K = 2; // Number of alternative paths to find
                this.paths = this.yenKShortestPaths(grid, finder, this.startX, this.startY, allPossibleConnection[liftChoosen].x, allPossibleConnection[liftChoosen].y, K);
                //var tempGrid = grid.clone();
                //this.paths1 = finder.findPath(
                //    this.startX, this.startY, allPossibleConnection[top3Indexes[0]].x, allPossibleConnection[top3Indexes[0]].y, tempGrid
                //);
                //var tempGrid = grid.clone();
                //this.paths2 = finder.findPath(
                //    this.startX, this.startY, allPossibleConnection[top3Indexes[1]].x, allPossibleConnection[top3Indexes[1]].y, tempGrid
                //);
                //var tempGrid = grid.clone();
                //this.paths3 = finder.findPath(
                //    this.startX, this.startY, allPossibleConnection[top3Indexes[2]].x, allPossibleConnection[top3Indexes[2]].y, tempGrid
                //);
                if (this.paths.length < 1) {
                    alert('No path found to any lift');
                    return;
                } else {
                    //alert('You have ' + this.paths.length + ' path to ' + this.possibleConnectionText);
                }
                localStorage.setItem("startLiftX", allPossibleConnection[liftChoosen].x);
                localStorage.setItem("startLiftY", allPossibleConnection[liftChoosen].y);
                console.log(`to lift, Start at (${this.startX}, ${this.startY}) and end at (10, 1) `);
                this.operationCount = this.operations.length;
                timeEnd = window.performance ? performance.now() : Date.now();
                this.timeSpent = (timeEnd - timeStart).toFixed(4);
                this.loop();
                View.drawPath(this.paths, 0);
                console.log("Current state lepas draw ke lift:", Controller.current); 
                return;
            }
            else {
                x = localStorage.getItem("startLiftX");
                y = localStorage.getItem("startLiftY");
                this.setStartPos(x, y);
                this.paths = this.yenKShortestPaths(grid, finder, x, y, this.endX, this.endY, 2);
                //this.path = finder.findPath(
                //    x, y, this.endX, this.endY, grid
                //);
                if (this.paths.length < 1) {
                    alert('No path found to the destination');
                    return;
                } else {
                    
                }
                this.allPAthFloorTwo = this.paths;
                console.log(`Start at (10, 1) and end at (${this.endX}, ${this.endY}) `);
            }
            
        }
        this.operationCount = this.operations.length;
        timeEnd = window.performance ? performance.now() : Date.now();
        this.timeSpent = (timeEnd - timeStart).toFixed(4);
        //View.drawPath(this.path);
        
        
        //this.loop();
        if (Controller.can('finish')) {
            Controller.finish();
        }
        console.log("Current state lepas draw semua:", Controller.current); 
        // => searching
    },

    onsearchAuto: function (startX, startY, endX, endY) {
        console.log("onsearchAuto triggered dalam!");
        console.log("Current state auto:", Controller.current); 
        
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        if (Controller.can('start')) {
            Controller.start(); // Move from "ready" to "starting"
        }
        if (Controller.can('search')) {
            Controller.search(); // Move from "starting" to "searching"
        }
        if (Controller.can('finish')) {
            Controller.finish(); // Move from "searching" to "finished"
            this.isAutoSearching = false;
        }
    },

    onrestart: function() {
        // When clearing the colorized nodes, there may be
        // nodes still animating, which is an asynchronous procedure.
        // Therefore, we have to defer the `abort` routine to make sure
        // that all the animations are done by the time we clear the colors.
        // The same reason applies for the `onreset` event handler.
        setTimeout(function () {
            //location.reload();

            Controller.clearOperations();
            Controller.clearFootprints();
            Controller.start();
        }, View.nodeColorizeEffect.duration * 1.2);
        // => restarting
    },
    onpause: function(event, from, to) {
        // => paused
    },
    onresume: function(event, from, to) {
        this.loop();
        // => searching
    },
    oncancel: function(event, from, to) {
        this.clearOperations();
        this.clearFootprints();
        // => ready
    },
    onfinish: function(event, from, to) {
        View.showStats({
            pathLength: PF.Util.pathLength(this.paths),
            timeSpent:  this.timeSpent,
            operationCount: this.operationCount,
        });
        //View.drawPath(this.path);
        for (let i = 0; i < this.paths.length; i++) {
            View.drawPath(this.paths[i], i); // Pass index to change color
        }
        // => finished
    },
    onclear: function(event, from, to) {
        this.clearOperations();
        this.clearFootprints();

        // => ready
        //location.reload();


    },
    onmodify: function(event, from, to) {
        // => modified
    },
    onreset: function(event, from, to) {
        setTimeout(function() {
            Controller.clearOperations();
            Controller.clearAll();
            Controller.buildNewGrid();
        }, View.nodeColorizeEffect.duration * 1.2);
        // => ready
    },

    /**
     * The following functions are called on entering states.
     */

    onready: function() {
        console.log('=> ready1');
        this.setButtonStates({
            id: 1,
            /*text: 'Start Search',*/
            enabled: true,
            callback: $.proxy(this.start, this),
        }, {
            id: 2,
            text: 'Pause Search',
            enabled: false,
        }, {
            id: 3,
            text: 'Clear Walls',
            enabled: true,
            callback: $.proxy(this.reset, this),
        },);
        // => [starting, draggingStart, draggingEnd, drawingStart, drawingEnd]
        var currentPage = window.location.pathname; // Get current page name
        var startX, startY, endX, endY;
        console.log("Current state aizat:", Controller.current);
        //monitor
        //View.setAttributeAt(10, 1, 'icon');
        //View.setAttributeAt(11, 25, 'icon');
        //View.setAttributeAt(51, 25, 'icon');
        //View.setAttributeAt(52, 2, 'icon');

        //laptop
        //View.setAttributeAt(8, 1, 'icon');
        //View.setAttributeAt(9, 15, 'icon');
        //View.setAttributeAt(34, 2, 'icon');
        //View.setAttributeAt(34, 15, 'icon');
        if (currentPage.includes("/floortwo.html")) {
            // Retrieve Floor 1's end position
            startX = localStorage.getItem("floor1_endX");
            startY = localStorage.getItem("floor1_endY");
            endX = localStorage.getItem("localEndX");
            endY = localStorage.getItem("localEndY");//aizatsini


            if (startX !== null && startY !== null && endX !== null && endY !== null) {
                startX = parseInt(startX);
                startY = parseInt(startY);
                endX = parseInt(endX);
                endY = parseInt(endY);

                // Set start position for Floor 2
                //View.setStartPos(startX, startY);
                //View.setAttributeAt(startX, startY, 'icon');
                let lifts = JSON.parse(localStorage.getItem("lifts")) || [];

                if (lifts.length > 0) {
                    lifts.forEach((lift, index) => {
                        View.setAttributeAt(lift.x, lift.y, 'icon');
                    });
                } else {
                    console.log("No lifts stored in localStorage.");
                }
                setTimeout(() => {

                    Controller.onsearchAuto(startX, startY, endX, endY);
                }, 500);




            } else {
                console.error("Missing start or end positions in localStorage.");
            }
        } else {
            localStorage.removeItem("lifts");
        }
    },
    onstarting: function(event, from, to) {
        console.log('=> starting');
        // Clears any existing search progress
        this.clearFootprints();
        this.setButtonStates({
            id: 2,
            enabled: true,
        });
        this.search();
        // => searching
    },
    onsearching: function() {
        console.log('=> searching');
        this.setButtonStates({
            id: 1,
            text: 'Restart Search',
            enabled: true,
            callback: $.proxy(this.restart, this),
        }, {
            id: 2,
            text: 'Pause Search',
            enabled: true,
            callback: $.proxy(this.pause, this),
        });
        // => [paused, finished]
    },
    

    onpaused: function() {
        console.log('=> paused');
        this.setButtonStates({
            id: 1,
            text: 'Resume Search',
            enabled: true,
            callback: $.proxy(this.resume, this),
        }, {
            id: 2,
            text: 'Cancel Search',
            enabled: true,
            callback: $.proxy(this.cancel, this),
        });
        // => [searching, ready]
    },
    onfinished: function () {
        this.endFloor = this.endFloor;
        if (this.endFloor === 1) {
            this.paths = this.paths;
            this.allPath = this.allPath;
            let notSelectedIndexes = this.allPath
                .map((paths, index) => index) // Get all indexes from allPaths
                .filter(index => !this.paths.includes(this.allPath[index]));
            var currentPage = window.location.pathname;
            var notSelect = 'Show Path ' + notSelectedIndexes.map(i => i + 1).join(', ');
            let isEnabled = notSelectedIndexes.length > 0; // Disable button if no unselected paths

            var buttonText = (currentPage === "/" || currentPage === "/index.html")
                ? 'Restart Search'
                : 'Back';
            this.setButtonStates({
                id: 1,
                text: buttonText,
                enabled: true,
                callback: $.proxy(this.restart, this),
            }, {
                id: 2,
                text: notSelect,
                enabled: isEnabled, // Set dynamically
                //callback: $.proxy(this.clear, this),
                callback: () => this.handleNotSelectedPaths(notSelectedIndexes),

            });
        }
        else
        {
            var currentPage = window.location.pathname;
            if (currentPage.includes("floortwo.html")) {
                this.allPAthFloorTwo = this.allPAthFloorTwo;

                let choices = this.paths.map((p, index) => `${index + 1}: Path with ${p.length} steps`).join("\n");
                choices += `\n${this.paths.length + 1}: Show all paths`; // Add option for all paths

                let choice = prompt(`You have ${this.paths.length} paths to destinantion floor 2 available. Choose one or show all:\n${choices}`, "1");

                let chosenPathIndex = parseInt(choice) - 1;
                this.allPath = this.paths;
                if (!isNaN(chosenPathIndex) && chosenPathIndex >= 0 && chosenPathIndex < this.paths.length) {
                    // User chose a specific path
                    this.paths = [this.paths[chosenPathIndex]];
                    //alert(`You selected Path ${chosenPathIndex + 1}`);
                } else if (chosenPathIndex === this.paths.length) {
                    // User chose to show all paths
                    this.paths = this.paths;
                    //alert(`You selected all paths`);
                } else {
                    //alert("Invalid selection. Defaulting to the shortest path.");
                    this.paths = [this.paths[0]]; // Default to shortest if invalid choice
                }
                let notSelectedIndexes = this.allPAthFloorTwo
                    .map((paths, index) => index)
                    .filter(index => !this.paths.includes(this.allPAthFloorTwo[index]));
                var notSelect = 'Show Path ' + notSelectedIndexes.map(i => i + 1).join(', ');
                let isEnabled = notSelectedIndexes.length > 0;
                this.setButtonStates({
                    id: 2,
                    text: 'Back to Floor 1',
                    enabled: true,
                    //callback: $.proxy(this.restart, this),
                }, {
                    id: 1,
                    text: notSelect,
                    enabled: isEnabled,
                    callback: () => this.handleNotSelectedPaths2nd(notSelectedIndexes),
                });
            }
            else {
                this.pathsToLift = this.paths;

                let choices = this.paths.map((p, index) => `${index + 1}: Path with ${p.length} steps`).join("\n");
                choices += `\n${this.paths.length + 1}: Show all paths`; // Add option for all paths

                let choice = prompt(`You have ${this.paths.length} paths to ${this.possibleConnectionText} available. Choose one or show all:\n${choices}`, "1");

                let chosenPathIndex = parseInt(choice) - 1;
                this.allPath = this.paths;
                if (!isNaN(chosenPathIndex) && chosenPathIndex >= 0 && chosenPathIndex < this.paths.length) {
                    // User chose a specific path
                    this.paths = [this.paths[chosenPathIndex]];
                    //alert(`You selected Path ${chosenPathIndex + 1}`);
                } else if (chosenPathIndex === this.paths.length) {
                    // User chose to show all paths
                    this.paths = this.paths;
                    //alert(`You selected all paths`);
                } else {
                    //alert("Invalid selection. Defaulting to the shortest path.");
                    this.paths = [this.paths[0]]; // Default to shortest if invalid choice
                }
                let notSelectedIndexes = this.pathsToLift
                    .map((paths, index) => index)
                    .filter(index => !this.paths.includes(this.pathsToLift[index]));
                var notSelect = 'Show Path ' + notSelectedIndexes.map(i => i + 1).join(', ');
                let isEnabled = notSelectedIndexes.length > 0;
                this.setButtonStates({
                    id: 2,
                    text: notSelect,
                    enabled: isEnabled, // Set dynamically
                    //callback: $.proxy(this.clear, this),
                    callback: () => this.handleNotSelectedPaths(notSelectedIndexes),

                });
            }
            
        }
        
       
        var currentPage = window.location.pathname;
        if (currentPage.includes("index.html") || currentPage === "/") {
            if (this.endFloor === 2) {
                setTimeout(function () {
                    window.location.href = 'floortwo.html';
                }, 1000); // Delay of 1 second
            }

        } else {
            //View.setAttributeAt(10, 1, 'icon');
        }
        

    },
    handleNotSelectedPaths(notSelectedIndexes) {
        let selectedIndex = notSelectedIndexes[0];
        View.clearPath();
        this.paths = this.allPath[notSelectedIndexes];
        View.drawPath(this.paths, 0);

       
        let remainingIndexes = this.allPath
            .map((_, index) => index) // Get all indexes from allPath
            .filter(index => index !== selectedIndex); // Exclude the current selected path
        var notSelect = 'Show Path ' + remainingIndexes.map(i => i + 1).join(', ');
        //View.clearPathCustom(this.allPath[remainingIndexes]);
        
        this.setButtonStates({
            id: 2,
            text: notSelect,
            callback: () => this.handleNotSelectedPaths(remainingIndexes),

        });
    },
    handleNotSelectedPaths2nd(notSelectedIndexes) {
        let selectedIndex = notSelectedIndexes[0];
        View.clearPath();
        this.paths = this.allPath[notSelectedIndexes];
        View.drawPath(this.paths, 0);


        let remainingIndexes = this.allPath
            .map((_, index) => index) // Get all indexes from allPath
            .filter(index => index !== selectedIndex); // Exclude the current selected path
        var notSelect = 'Show Path ' + remainingIndexes.map(i => i + 1).join(', ');
        //View.clearPathCustom(this.allPath[remainingIndexes]);

        this.setButtonStates({
            id: 1,
            text: notSelect,
            callback: () => this.handleNotSelectedPaths2nd(remainingIndexes),

        });
    },
    onmodified: function() {
        console.log('=> modified');
        this.setButtonStates({
            id: 1,
            text: 'Start Search',
            enabled: true,
            callback: $.proxy(this.start, this),
        }, {
            id: 2,
            text: 'Clear Path',
            enabled: true,
            callback: $.proxy(this.clear, this),
        });
    },

    /**
     * Define setters and getters of PF.Node, then we can get the operations
     * of the pathfinding.
     */
    hookPathFinding: function() {

        PF.Node.prototype = {
            get opened() {
                return this._opened;
            },
            set opened(v) {
                this._opened = v;
                Controller.operations.push({
                    x: this.x,
                    y: this.y,
                    attr: 'opened',
                    value: v
                });
            },
            get closed() {
                return this._closed;
            },
            set closed(v) {
                this._closed = v;
                Controller.operations.push({
                    x: this.x,
                    y: this.y,
                    attr: 'closed',
                    value: v
                });
            },
            get tested() {
                return this._tested;
            },
            set tested(v) {
                this._tested = v;
                Controller.operations.push({
                    x: this.x,
                    y: this.y,
                    attr: 'tested',
                    value: v
                });
            },
        };

        this.operations = [];
    },
    bindEvents: function() {
        $('#draw_area').mousedown($.proxy(this.mousedown, this));
        $(window)
            .mousemove($.proxy(this.mousemove, this))
            .mouseup($.proxy(this.mouseup, this));
    },
    loop: function() {
        var interval = 1000 / this.operationsPerSecond;
        (function loop() {
            if (!Controller.is('searching')) {
                return;
            }
            console.log("Hereatas:", Controller.current); 
            Controller.step();
            console.log("Herebawah:", Controller.current); 
            setTimeout(loop, interval);
        })();
    },
    step: function() {
        var operations = this.operations,
            op, isSupported;

        do {
            if (!operations.length) {
                this.finish(); // transit to `finished` state//aizat
                return;
            }
            op = operations.shift();
            isSupported = View.supportedOperations.indexOf(op.attr) !== -1;
        } while (!isSupported);

        View.setAttributeAt(op.x, op.y, op.attr, op.value);
    },
    clearOperations: function() {
        this.operations = [];
    },
    clearFootprints: function() {
        View.clearFootprints();
        View.clearPath();
        this.paths = [];
        this.path = null;
    },
    clearAll: function() {
        this.clearFootprints();
        View.clearBlockedNodes();
    },
    buildNewGrid: function() {
        this.grid = new PF.Grid(this.gridSize[0], this.gridSize[1]);
    },
    getClosestPathPoint: function (landmark) {
        if (this.paths === null || this.paths === undefined) return null;
        let minDist = Infinity;
        let closestPoint = null;
        
        for (let pathPoint of this.paths) {
            let [pathX, pathY] = pathPoint;
            let dist = Math.abs(pathX - landmark.x) + Math.abs(pathY - landmark.y); // Manhattan distance

            if (dist < minDist) {
                minDist = dist;
                closestPoint = { x: pathX, y: pathY };
            }
        }

        return closestPoint || landmark; // Default to landmark if no path point is found
    },
    getDirectionIconq: function (from, to) {
        if (!from || !to) return "";

        if (to.x > from.x) return "--> right";
        if (to.x < from.x) return "<-- left";
        if (to.y > from.y) return " Down";
        if (to.y < from.y) return " behind";

        return "wrong";
    },
    getDirectionIconm: function (landmark, from, to) {
        if (!from || !to) return "";

        let direction = "";

        if (to.x > from.x) direction = "--> right";
        if (to.x < from.x) direction = "<-- left";
        if (to.y > from.y) direction = "opposite";
        if (to.y < from.y) direction = "behind";

        // **Check if the landmark is behind the path**
        let landmarkFacingPath =
            (landmark.y === from.y && landmark.y === to.y) ||
            (landmark.x === from.x && landmark.x === to.x);

        if (!landmarkFacingPath) {
            if (to.x > from.x) direction = "<-- left";
            if (to.x < from.x) direction = "--> right";
            if (to.y > from.y) direction = "opposite";
            if (to.y < from.y) direction = "behind";
        }

        return direction;
    },
    getDirectionIcon: function (landmark, from, to, wallPosition) {
        if (!from || !to) return "";

        let direction = "";

        if (to.x > from.x) direction = "right ";
        if (to.x < from.x) direction = "left";
        if (to.y > from.y) direction = "opposite";
        if (to.y < from.y) direction = "behind";

        // **Check if the landmark is behind the path**
        let landmarkBelowPath =
            (from.y > landmark.y);
        
        let same = (from.y === landmark.y);
        if (!landmarkBelowPath && !same) {
            if (to.x > from.x) direction = "left";
            if (to.x < from.x) direction = "right";
            if (to.y > from.y) direction = "opposite";
            if (to.y < from.y) direction = "behind";
        }
        if (wallPosition) {
            if (wallPosition.y > landmark.y) {
                direction = "wall is down";
                if (to.x > from.x) direction = "left";
                if (to.x < from.x) direction = "right";
            }
            else if (wallPosition.y < landmark.y) {
                direction = "wall is up";
                if (to.x > from.x) direction = "right ";
                if (to.x < from.x) direction = "left";
            } 
        }
        return direction;
    },




    






    mousedown: function (event) {
        var coord = View.toGridCoordinate(event.pageX, event.pageY),
            gridX = coord[0],
            gridY = coord[1],
            grid = this.grid;

        if (event.button === 2) {
            this.setIcon(gridX, gridY);
            
            var savedLifts = JSON.parse(localStorage.getItem("customLifts")) || [];
            savedLifts.push({ x: gridX, y: gridY });
            localStorage.setItem("customLifts", JSON.stringify(savedLifts));


            return;
        }
        this.landmarks = [
            //{ x: 10, y: 6, name:'zus.jpeg' },
            { x: 12, y: 3 , name:'crs.jpeg'},
            { x: 19, y: 3, name: 'baskbear.mp4' },
            { x: 13, y: 13, name: 'deliwau.jpeg' },
            { x: 27, y: 13, name: 'sopoong.jpeg' },
            //test
            //{ x: 10, y: 10, name: 'sopoong.jpeg' },
            //{ x: 10, y: 13, name: 'sopoong.jpeg' },
            //{ x: 11, y: 7, name: 'sopoong.jpeg' },
            //{ x: 11, y: 11, name: 'sopoong.jpeg' },
            //{ x: 11, y: 9, name: 'sopoong.jpeg' },
            //test
            
            //{ x: 32, y: 10, name: 'moneyChanger.jpeg' }
        ];
        let isLandmark = this.landmarks.some(landmark => landmark.x === gridX && landmark.y === gridY);
        this.allPath = this.allPath;
        this.paths = this.paths;
        
        if (isLandmark) {
            if (this.G1 !== undefined) {
                //View.setAttributeAt(this.G1.x, this.G1.y, 'opened');
                //View.setAttributeAt(this.G2.x, this.G2.y, 'opened');
            }
            
            let minDist = Infinity;
            this.G1 = null;
            this.G2 = null;
            let landmark = this.landmarks.find(landmark => landmark.x === gridX && landmark.y === gridY);
            if (this.paths === null || this.paths === undefined) {
               // directionIcon = 'No path yet';
            }
            else {
                console.log("this.paths:", JSON.stringify(this.paths)); 

                if (Array.isArray(this.paths[0]) && Array.isArray(this.paths[0][0])) {
                    this.pathsForLandmark = this.paths[0];
                } else {
                    this.pathsForLandmark = this.paths;
                }

                //console.log('check sini1:', JSON.stringify(this.pathsForLandmark));

                //console.log('check sini: ' + this.pathsForLandmark);
                let landmarkIndex = this.pathsForLandmark.findIndex(
                    ([pathX, pathY]) => pathX === landmark.x && pathY === landmark.y
                );
                if (landmarkIndex !== -1) {
                    landmark = landmark;//here store x and y for landmark
                    let directions = [
                        { dx: 0, dy: -1 },  // UP
                        { dx: 0, dy: 1 },   // DOWN
                        { dx: -1, dy: 0 },  // LEFT
                        { dx: 1, dy: 0 }    // RIGHT
                    ];
                    this.wallPosition = null;
                    for (let { dx, dy } of directions) {
                        let checkX = landmark.x + dx;
                        let checkY = landmark.y + dy;

                        if (View.blockedNodes[checkY]?.[checkX]) {
                            this.wallPosition = { x: checkX, y: checkY };
                            break; 
                        }
                    }
                    



                    if (landmarkIndex + 1 < this.pathsForLandmark.length) {
                        this.G1 = { x: this.pathsForLandmark[landmarkIndex + 1][0], y: this.pathsForLandmark[landmarkIndex + 1][1] };
                    }
                    if (landmarkIndex + 2 < this.pathsForLandmark.length) {
                        this.G2 = { x: this.pathsForLandmark[landmarkIndex + 2][0], y: this.pathsForLandmark[landmarkIndex + 2][1] };
                    }
                }
                else {
                    let minDist = Infinity;
                    let tempG1 = null;

                    for (let pathPoint of this.pathsForLandmark) {
                        let [pathX, pathY] = pathPoint;
                        let dist = Math.abs(pathX - landmark.x) + Math.abs(pathY - landmark.y);

                        //radius 2 tiles/grid only
                        if (dist <= 2 && dist < minDist) {
                            minDist = dist;
                            tempG1 = { x: pathX, y: pathY };
                        }
                    }

                    
                    if (tempG1) {
                        let g1Index = this.pathsForLandmark.findIndex(
                            ([pathX, pathY]) => pathX === tempG1.x && pathY === tempG1.y
                        );

                        if (g1Index !== -1 && g1Index + 1 < this.pathsForLandmark.length) {
                            this.G1 = tempG1;
                            this.G2 = { x: this.pathsForLandmark[g1Index + 1][0], y: this.pathsForLandmark[g1Index + 1][1] };
                        }
                    }
                }
            }
            //test
            //if (this.G1 !== null){
            //    View.setAttributeAt(this.G1.x, this.G1.y, 'icon', 'G1');
            //    View.setAttributeAt(this.G2.x, this.G2.y, 'icon', 'G2');
            //}
            
            let fileUrl = `http://localhost:51188/doc/landmarks/${landmark.name}`;

            let isVideo = landmark.name.endsWith('.mp4');
            //let closestPathPoint = this.getClosestPathPoint({ x: gridX, y: gridY });
            let directionIcon = null;
            if (this.G1 === null) {
                directionIcon = 'No path near this landmark';
            } else {
                this.wallPosition = this.wallPosition;
                //console.log('Landmark: ' + landmark.x + ', ' + landmark.y);
                //console.log('wall position is:' + this.wallPosition.x + ", " + this.wallPosition.y);
                //let arrowDirection = this.getDirectionIconm(landmark, this.G1, this.G2);
                let arrowDirectionNew = this.getDirectionIcon(landmark, this.G1, this.G2, this.wallPosition);
                //let arrowDirectionOg = this.getDirectionIconq(landmark, this.G1, this.G2, this.pathsForLandmark);
                //directionIcon = `This landmark near with the path! Face this landmark and move toward ${arrowDirection} of this landmark to reach the destination.`;
                directionIcon = `Face the landmark, then proceed to ${arrowDirectionNew}.`;
                //directionIcon = `og: ${arrowDirectionOg}, second: ${arrowDirection}, latest: ${arrowDirectionNew}.`;
                

            }
            if (this.isEndPos(gridX, gridY)) {
                directionIcon = 'This landmark is the destination';
            }
            
            

            

           // Swal.fire({
           //     title: "",
           //     text: directionIcon,
           //     imageUrl: isVideo ? "" : fileUrl,
           //     html: isVideo
           //         ? `<video width="450" height="300" controls autoplay>
           //   <source src="${fileUrl}" type="video/mp4">
           //   Your browser does not support the video tag.
           //</video>`
           //         : "", // Embed video inside HTML
           //     imageWidth: 455,
           //     imageHeight: 370,
           //     imageAlt: "Landmark Icon",
           //     didOpen: () => {
           //         document.querySelector('.swal2-confirm').style.minWidth = '80px';
           //     }
            // });
            Swal.fire({
                title: "",
                html: `
                <p style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">${directionIcon}</p>
                ${isVideo ? `<video width="450" height="250" controls autoplay>
                <source src="${fileUrl}" type="video/mp4">
                   Your browser does not support the video tag.
               </video>`: `<img src="${fileUrl}" width="450" height="370" alt="Landmark Icon" style="display: block; margin: auto;">`
                    }
    `,
                showConfirmButton: true,
                didOpen: () => {
                    document.querySelector('.swal2-confirm').style.minWidth = '80px';
                }
            });



            return;
        }


        if (this.can('dragStart') && this.isStartPos(gridX, gridY)) {
            this.dragStart();
            return;
        }
        if (this.can('dragEnd') && this.isEndPos(gridX, gridY)) {
            this.dragEnd();
            return;
        }
        if (this.can('drawWall') && grid.isWalkableAt(gridX, gridY)) {
            this.drawWall(gridX, gridY);
            return;
        }
        if (this.can('eraseWall') && !grid.isWalkableAt(gridX, gridY)) {
            this.eraseWall(gridX, gridY);
        }
    },
    mousemove: function(event) {
        var coord = View.toGridCoordinate(event.pageX, event.pageY),
            grid = this.grid,
            gridX = coord[0],
            gridY = coord[1];

        if (this.isStartOrEndPos(gridX, gridY)) {
            return;
        }

        switch (this.current) {
            case 'draggingStart':
                console.log("masuk draggingStart");
            if (grid.isWalkableAt(gridX, gridY)) {
                this.setStartPos(gridX, gridY);
            }
            break;
            case 'draggingEnd':
                console.log("masuk draggingEnd");
            if (grid.isWalkableAt(gridX, gridY)) {
                this.setEndPos(gridX, gridY);
            }
            break;
            case 'drawingWall':
                console.log("masuk drawingWall");
            this.setWalkableAt(gridX, gridY, false);
            break;
            case 'erasingWall':
                console.log("masuk erasingWall");
            this.setWalkableAt(gridX, gridY, true);
                break;
        }

    },
    mouseup: function(event) {
        if (Controller.can('rest')) {
            Controller.rest();
        }
    },
    setButtonStates: function() {
        $.each(arguments, function(i, opt) {
            var $button = Controller.$buttons.eq(opt.id - 1);
            if (opt.text) {
                $button.text(opt.text);
            }
            if (opt.callback) {
                $button
                    .unbind('click')
                    .click(opt.callback);
            }
            if (opt.enabled === undefined) {
                return;
            } else if (opt.enabled) {
                $button.removeAttr('disabled');
            } else {
                $button.attr({ disabled: 'disabled' });
            }
        });
    },
    /**
     * When initializing, this method will be called to set the positions
     * of start node and end node.
     * It will detect user's display size, and compute the best positions.
     */
    setDefaultStartEndPos: function() {
        var width, height,
            marginRight, availWidth,
            centerX, centerY,
            endX, endY,
            nodeSize = View.nodeSize;

        width  = $(window).width();
        height = $(window).height();

        marginRight = $('#algorithm_panel').width();
        availWidth = width - marginRight;

        centerX = Math.ceil(availWidth / 2 / nodeSize);
        centerY = Math.floor(height / 2 / nodeSize);
        var currentPage = window.location.pathname;
        if (currentPage.includes("index.html") || currentPage === "/") {
            this.setStartPos(2, 7); 
            localStorage.removeItem("customLifts");

            //this.setEndPos(centerX + 5, centerY);
            
        } else if (currentPage.includes("floortwo.html")) {
            //this.setEndPos(2, 3);//here based on click
            
        }
        
        
        ////sini aizat
        ////this.setWalkableAt(27, 19, false);

        ////this.setWalkableAt(28, 26, false)//0 is x, 9 is y
        //for (let y = 0; y <= 30; y++) {
        //    this.setWalkableAt(0, y, false); // Block each node at x = 0
        //}
        //for (let y = 0; y <= 30; y++) {
        //    this.setWalkableAt(57, y, false); // Block each node at x = 0
        //}

        //for (let x = 1; x <= 56; x++) {
        //    this.setWalkableAt(x, 30, false); // Block each node at y = 29, x from 1 to 56
        //}

        //for (let x = 1; x <= 56; x++) {
        //    this.setWalkableAt(x, 0, false); // Block each node at y = 29, x from 1 to 56
        //}
        //// Vertical lines
        //for (let y = 11; y <= 16; y++) {
        //    this.setWalkableAt(22, y, false); // Left side
        //    this.setWalkableAt(38, y, false); // Right side
        //}

        //// Horizontal lines
        //for (let x = 22; x <= 38; x++) {
        //    this.setWalkableAt(x, 11, false); // Top side
        //    this.setWalkableAt(x, 16, false); // Bottom side
        //}
        //this.setWalkableAt(9, 1, false);
        //for (let y = 3; y <= 26; y++) {
        //    this.setWalkableAt(9, y, false);
        //}
        //for (let y = 1; y <= 26; y++) {
        //    this.setWalkableAt(55, y, false);
        //}
        ////this.setWalkableAt(10, 26, false);
        ////this.setWalkableAt(27, 26, false);

        //for (let x = 10; x <= 27; x++) {
        //    this.setWalkableAt(x, 26, false);
        //}
        //for (let x = 32; x <= 55; x++) {
        //    this.setWalkableAt(x, 26, false);
        //}
        //// Box 1
        //for (let x = 10; x <= 14; x++) {
        //    this.setWalkableAt(x, 5, false);  // Top edge
        //    this.setWalkableAt(x, 24, false); // Bottom edge
        //}
        //for (let y = 5; y <= 24; y++) {
        //    this.setWalkableAt(10, y, false); // Left edge
        //    this.setWalkableAt(14, y, false); // Right edge
        //}

        //// Box 2
        //for (let x = 17; x <= 28; x++) {
        //    this.setWalkableAt(x, 23, false);  // Top edge
        //    this.setWalkableAt(x, 25, false); // Bottom edge
        //}
        //for (let y = 23; y <= 25; y++) {
        //    this.setWalkableAt(17, y, false); // Left edge
        //    this.setWalkableAt(28, y, false); // Right edge
        //}

        //// Box 3
        //for (let x = 32; x <= 48; x++) {
        //    this.setWalkableAt(x, 23, false);  // Top edge
        //    this.setWalkableAt(x, 25, false); // Bottom edge
        //}
        //for (let y = 23; y <= 25; y++) {
        //    this.setWalkableAt(32, y, false); // Left edge
        //    this.setWalkableAt(48, y, false); // Right edge
        //}

        //// Box 4
        //for (let x = 50; x <= 54; x++) {
        //    this.setWalkableAt(x, 5, false);  // Top edge
        //    this.setWalkableAt(x, 23, false); // Bottom edge
        //}
        //for (let y = 5; y <= 23; y++) {
        //    this.setWalkableAt(50, y, false); // Left edge
        //    this.setWalkableAt(54, y, false); // Right edge
        //}

        //// Box 5
        //for (let x = 16; x <= 48; x++) {
        //    this.setWalkableAt(x, 1, false);  // Top edge
        //    this.setWalkableAt(x, 4, false); // Bottom edge
        //}
        //for (let y = 1; y <= 4; y++) {
        //    this.setWalkableAt(16, y, false); // Left edge
        //    this.setWalkableAt(48, y, false); // Right edge
        //}
        

        // Set top boundary
        for (let x = 0; x <= 37; x++) {
            this.setWalkableAt(x, 0, false);
        }

        // Set bottom boundary
        for (let x = 0; x <= 37; x++) {
            this.setWalkableAt(x, 18, false);
        }

        // Set left boundary
        for (let y = 0; y <= 18; y++) {
            this.setWalkableAt(0, y, false);
        }

        // Set right boundary
        for (let y = 0; y <= 18; y++) {
            this.setWalkableAt(37, y, false);
        }
        // Vertical part (6,2) to (6,16)
        for (let y = 2; y <= 16; y++) {
            this.setWalkableAt(6, y, false);
        }

        // Horizontal part (6,16) to (18,16)
        for (let x = 6; x <= 18; x++) {
            this.setWalkableAt(x, 16, false);
        }

        for (let x = 21; x <= 36; x++) {
            this.setWalkableAt(x, 16, false);
        }
        // Draw a box from (14,6) to (25,10)
        for (let x = 14; x <= 25; x++) {
            this.setWalkableAt(x, 6, false);  // Top edge
            this.setWalkableAt(x, 10, false); // Bottom edge
        }

        for (let y = 6; y <= 10; y++) {
            this.setWalkableAt(14, y, false); // Left edge
            this.setWalkableAt(25, y, false); // Right edge
        }

        // Draw a horizontal line from (11,2) to (31,2)
        this.setWalkableAt(11, 1, false);
        this.setWalkableAt(31, 1, false);
        for (let x = 11; x <= 31; x++) {
            this.setWalkableAt(x, 2, false);
        }
        // Draw vertical lines from (6,3) to (6,14) and (9,3) to (9,14)
        for (let y = 3; y <= 14; y++) {
            this.setWalkableAt(6, y, false);
            this.setWalkableAt(9, y, false);
        }

        // Draw horizontal lines from (6,3) to (9,3) and (6,14) to (9,14)
        for (let x = 6; x <= 9; x++) {
            this.setWalkableAt(x, 3, false);
            this.setWalkableAt(x, 14, false);
        }
        for (let y = 3; y <= 14; y++) {
            this.setWalkableAt(33, y, false);
            this.setWalkableAt(36, y, false);
        }

        // Draw horizontal lines from (33,3) to (36,3) and (33,14) to (36,14)
        for (let x = 33; x <= 36; x++) {
            this.setWalkableAt(x, 3, false);
            this.setWalkableAt(x, 14, false);
        }

        // Draw vertical edges at x = 22 and x = 31 from y = 14 to y = 15
        for (let y = 14; y <= 15; y++) {
            this.setWalkableAt(22, y, false);
            this.setWalkableAt(31, y, false);
        }

        // Draw horizontal edges at y = 14 and y = 15 from x = 22 to x = 31
        for (let x = 22; x <= 31; x++) {
            this.setWalkableAt(x, 14, false);
            this.setWalkableAt(x, 15, false);
        }

        // Draw vertical edges at x = 11 and x = 18 from y = 14 to y = 15
        for (let y = 14; y <= 15; y++) {
            this.setWalkableAt(11, y, false);
            this.setWalkableAt(18, y, false);
        }

        // Draw horizontal edges at y = 14 and y = 15 from x = 11 to x = 18
        for (let x = 11; x <= 18; x++) {
            this.setWalkableAt(x, 14, false);
            this.setWalkableAt(x, 15, false);
        }
        
        //parking
        // Draw line from (4,2) to (4,15)
        for (var y = 2; y <= 15; y++) {
            this.setWalkableAt(4, y, false);
        }

        // Draw line from (1,2) to (1,15)
        for (var y = 2; y <= 15; y++) {
            this.setWalkableAt(1, y, false);
        }

        // Draw line from (3,16) to (18,16)
        for (var x = 3; x <= 18; x++) {
            this.setWalkableAt(x, 16, false);
        }


            



    },
    setStartPos: function(gridX, gridY) {
        this.startX = gridX;
        this.startY = gridY;
        View.setStartPos(gridX, gridY);
        //aizat
        
    },
    setEndPos: function(gridX, gridY) {
        this.endX = gridX;
        this.endY = gridY;
        View.setEndPos(gridX, gridY);
        //localStorage.setItem("floor1_endX", gridX);
        //localStorage.setItem("floor1_endY", gridY);
        var currentPage = window.location.pathname;
        if (currentPage.includes("/floortwo.html")) {
            localStorage.setItem("floor2_endX", gridX);
            localStorage.setItem("floor2_endY", gridY);
        }
        else {
            localStorage.setItem("floor1_endX", gridX);
            localStorage.setItem("floor1_endY", gridY);
        }
    },
    setWalkableAt: function (gridX, gridY, walkable) {//aizat
        //console.log('aizatsini: ' + gridX + ", " + gridY);
        this.grid.setWalkableAt(gridX, gridY, walkable);
        View.setAttributeAt(gridX, gridY, 'walkable', walkable);
    },
    setIcon: function (gridX, gridY) {
        View.setAttributeAt(gridX, gridY, 'icon');
    },
    isStartPos: function(gridX, gridY) {
        return gridX === this.startX && gridY === this.startY;
    },
    isEndPos: function(gridX, gridY) {
        return gridX === this.endX && gridY === this.endY;
    },
    isStartOrEndPos: function(gridX, gridY) {
        return this.isStartPos(gridX, gridY) || this.isEndPos(gridX, gridY);
    },
});


window.onload = function () {
    View.setAttributeAt(8, 1, 'icon');
    View.setAttributeAt(9, 15, 'icon');
    View.setAttributeAt(34, 2, 'icon');
    View.setAttributeAt(34, 15, 'icon');

    View.setAttributeAt(12, 7, 'icon', 'escalator');
    View.setAttributeAt(29, 7, 'icon', 'escalator');

    View.setAttributeAt(7, 1, 'icon', 'stair');
    View.setAttributeAt(8, 15, 'icon', 'stair');
    View.setAttributeAt(33, 2, 'icon', 'stair');
    View.setAttributeAt(33, 15, 'icon', 'stair');

    //View.setAttributeAt(10, 6, 'icon', 'landmark');
    View.setAttributeAt(12, 3, 'icon', 'landmark');
    View.setAttributeAt(19, 3, 'icon', 'landmark');
    

    View.setAttributeAt(13, 13, 'icon', 'landmark');
    View.setAttributeAt(27, 13, 'icon', 'landmark');
    //View.setAttributeAt(32, 10, 'icon', 'landmark');

    //test
    //View.setAttributeAt(10, 10, 'icon', 'landmark');
    //View.setAttributeAt(10, 13, 'icon', 'landmark');
    //View.setAttributeAt(11, 7, 'icon', 'landmark');
    //View.setAttributeAt(11, 11, 'icon', 'landmark');
    //View.setAttributeAt(11, 9, 'icon', 'landmark');
    
    
    var currentPage = window.location.pathname;
    if (currentPage.includes("/floortwo.html")) {
        var savedLifts = JSON.parse(localStorage.getItem("customLifts")) || [];
        if (savedLifts.length > 0) {
            for (var i = 0; i < savedLifts.length; i++) {
                var xTemp = savedLifts[i].x;
                var yTemp = savedLifts[i].y;
                View.setAttributeAt(xTemp, yTemp, 'icon');
            }
        }
    }


};


