/**
 * The pathfinding visualization.
 * It uses raphael.js to show the grids.
 */
var View = {
    nodeSize: 25, // width and height of a single node, in pixel
    nodeStyle: {
        normal: {
            /*fill: 'rgba(255, 255, 255, 0.0)',*/
            'stroke-opacity': 0.02, // the border
            stroke: '#ccc'
        },
        blocked: {//wall
            fill: 'rgba(128, 128, 128, 0.1)',
            'stroke-opacity': 1.2,
        },
        lift: {
            fill: 'rgba(128, 128, 128, 0.7)', 
            'stroke-opacity': 1.2,
            
            image: "http://localhost:51188/doc/lifttwo.png",
            
            size:25
        },
        stair: {
            fill: 'rgba(128, 128, 128, 0.7)',
            'stroke-opacity': 1.2,
            image: "http://localhost:51188/doc/stair2r.png",
            size: 25
        },
        star: {
            fill: 'rgba(128, 128, 128, 0.7)',
            'stroke-opacity': 1.2,
            image: "http://localhost:51188/doc/star1.png",
            size: 25
        },
        escalator: {
            fill: 'rgba(128, 128, 128, 0.7)',
            'stroke-opacity': 1.2,
            image: "http://localhost:51188/doc/escalator.png",
            
            size: 25
        },
        start: {
            //fill: '#0d0',
            //'stroke-opacity': 1.2,
            //'fill-opacity': 0.5,
            fill: 'rgba(128, 128, 128, 0.7)',
            'stroke-opacity': 1.2,
            image: "http://localhost:51188/doc/startreal.png",

            size: 25
        },
        end: {
            //fill: '#e40',
            //'stroke-opacity': 0.2,
            //'fill-opacity': 0.5, 
            fill: 'rgba(128, 128, 128, 0.7)',
            'stroke-opacity': 1.2,
            image: "http://localhost:51188/doc/end.png",
        },
        opened: {
            fill: 'rgba(152, 251, 152, 0)', // Light green transparent
            'stroke-opacity': 10.2,
        },
        closed: {
            fill: 'rgba(175, 238, 238, 0)', // Light blue transparent
            'stroke-opacity': 10.2,
        },
        failed: {
            fill: 'rgba(255, 136, 136, 0)', // Red transparent
            'stroke-opacity': 0.2,
        },
        tested: {
            fill: 'rgba(229, 229, 229, 0)', // Grey transparent
            'stroke-opacity': 0.1,
            'fill-opacity': 0.0,
        },
        //test
        g1: {
            //fill: '#e40',
            //'stroke-opacity': 0.2,
            //'fill-opacity': 0.5, 
            fill: 'rgba(128, 128, 128, 0.7)',
            'stroke-opacity': 1.2,
            image: "http://localhost:51188/doc/g1.png",
        },
        g2: {
            //fill: '#e40',
            //'stroke-opacity': 0.2,
            //'fill-opacity': 0.5, 
            fill: 'rgba(128, 128, 128, 0.7)',
            'stroke-opacity': 1.2,
            image: "http://localhost:51188/doc/g2.png",
        },

    },
    nodeColorizeEffect: {
        duration: 0,
    },
    nodeZoomEffect: {
        duration: 200,
        transform: 's1.2', // scale by 1.2x
        transformBack: 's1.0',
    },
    pathStyle: {
        stroke: 'green',
        'stroke-width': 3,
    },
    supportedOperations: ['opened', 'closed', 'tested'],
    init: function(opts) {
        //this.numCols      = opts.numCols;
        //this.numRows      = opts.numRows;
        //this.paper        = Raphael('draw_area');
        //this.$stats       = $('#stats');
        this.numCols = Math.floor(window.innerWidth / this.nodeSize);
        this.numRows = Math.floor(window.innerHeight / this.nodeSize);
        this.paper = Raphael('draw_area');
        this.$stats = $('#stats');

        this.generateGrid();
    },
    /**
     * Generate the grid asynchronously.
     * This method will be a very expensive task.
     * Therefore, in order to not to block the rendering of browser ui,
     * I decomposed the task into smaller ones. Each will only generate a row.
     */
    generateGrid: function(callback) {
        var i, j, x, y,
            rect,
            normalStyle, nodeSize,
            createRowTask, sleep, tasks,
            nodeSize    = this.nodeSize,
            normalStyle = this.nodeStyle.normal,
            numCols     = this.numCols,
            numRows     = this.numRows,
            paper       = this.paper,
            rects       = this.rects = [],
            $stats      = this.$stats;

        paper.setSize(numCols * nodeSize, numRows * nodeSize);

        createRowTask = function(rowId) {
            return function(done) {
                rects[rowId] = [];
                for (j = 0; j < numCols; ++j) {
                    x = j * nodeSize;
                    y = rowId * nodeSize;

                    rect = paper.rect(x, y, nodeSize, nodeSize);
                    rect.attr(normalStyle);
                    rects[rowId].push(rect);
                }
                $stats.text(
                    'generating grid ' +
                    Math.round((rowId + 1) / numRows * 100) + '%'
                );
                done(null);
            };
        };

        sleep = function(done) {
            setTimeout(function() {
                done(null);
            }, 0);
        };

        tasks = [];
        for (i = 0; i < numRows; ++i) {
            tasks.push(createRowTask(i));
            tasks.push(sleep);
        }

        async.series(tasks, function() {
            if (callback) {
                callback();
            }
        });
    },
    setStartPos: function(gridX, gridY) {
        var coord = this.toPageCoordinate(gridX, gridY);
        var imgSize = this.nodeStyle.start.size || 25; // Default size if not set

        if (!this.startNode) {
            this.startNode = this.paper.image(
                this.nodeStyle.start.image, 
                coord[0],
                coord[1],
                this.nodeSize,
                this.nodeSize
            ).attr(this.nodeStyle.normal)
             .animate(this.nodeStyle.start, 1000);
        } else {
            this.startNode.attr({ x: coord[0], y: coord[1] }).toFront();
        }
    },
    setEndPos: function(gridX, gridY) {
        var coord = this.toPageCoordinate(gridX, gridY);
        if (!this.endNode) {
            this.endNode = this.paper.image(
                this.nodeStyle.end.image, 
                coord[0],
                coord[1],
                this.nodeSize,
                this.nodeSize
            ).attr(this.nodeStyle.normal)
             .animate(this.nodeStyle.end, 1000);
        } else {
            this.endNode.attr({ x: coord[0], y: coord[1] }).toFront();
        }
    },
    /**
     * Set the attribute of the node at the given coordinate.
     */
    setAttributeAt: function (gridX, gridY, attr, value) {
        var color, nodeStyle = this.nodeStyle;
        switch (attr) {
        case 'icon':
            this.setIconAt(gridX, gridY, value);
            console.log('lift at: ' + gridX + "," + gridY + 'value: ' + value);
            break;
        case 'walkable':
            color = value ? nodeStyle.normal.fill : nodeStyle.blocked.fill;
            this.setWalkableAt(gridX, gridY, value);
            break;
        case 'opened':
            this.colorizeNode(this.rects[gridY][gridX], nodeStyle.opened.fill);
            this.setCoordDirty(gridX, gridY, true);
            break;
        case 'closed':
            this.colorizeNode(this.rects[gridY][gridX], nodeStyle.closed.fill);
            this.setCoordDirty(gridX, gridY, true);
            break;
        case 'tested':
            color = (value === true) ? nodeStyle.tested.fill : nodeStyle.normal.fill;

            this.colorizeNode(this.rects[gridY][gridX], color);
            this.setCoordDirty(gridX, gridY, true);
            break;
        case 'parent':
            // XXX: Maybe draw a line from this node to its parent?
            // This would be expensive.
            break;
        default:
            console.error('unsupported operation: ' + attr + ':' + value);
            return;
        }
    },
    colorizeNode: function(node, color) {
        node.animate({
            fill: color
        }, this.nodeColorizeEffect.duration);
    },
    zoomNode: function(node) {
        node.toFront().attr({
            transform: this.nodeZoomEffect.transform,
        }).animate({
            transform: this.nodeZoomEffect.transformBack,
        }, this.nodeZoomEffect.duration);
    },
    setWalkableAt: function (gridX, gridY, value) {

        console.log('siniaizat:' + gridX + "," + gridY);
        var node, i, blockedNodes = this.blockedNodes;
        //var imageUrl = this.nodeStyle.blocked.image;
        if (!blockedNodes) {
            blockedNodes = this.blockedNodes = new Array(this.numRows);
            for (i = 0; i < this.numRows; ++i) {
                blockedNodes[i] = [];
            }
        }
       
        node = blockedNodes[gridY][gridX];
        //node = blockedNodes[27][13];

        if (value) {
            // clear blocked node
            if (node) {
                this.colorizeNode(node, this.rects[gridY][gridX].attr('fill'));
                this.zoomNode(node);
                setTimeout(function() {
                    node.remove();
                }, this.nodeZoomEffect.duration);
                blockedNodes[gridY][gridX] = null;
            }
        } else {
            // draw blocked node
            //if (node) {
            //    return;
            //}
            node = blockedNodes[gridY][gridX] = this.rects[gridY][gridX].clone();
            this.colorizeNode(node, this.nodeStyle.blocked.fill);
            this.zoomNode(node);
            //node.attr({
            //    fill: `url(${imageUrl})`, // Set image as background
            //});
        }
    },
    setIconAtt: function (gridX, gridY, value) {

        var node, i, blockedNodes = this.blockedNodes;
        var imageUrl = this.nodeStyle.lift.image;
        if (!blockedNodes) {
            blockedNodes = this.blockedNodes = new Array(this.numRows);
            for (i = 0; i < this.numRows; ++i) {
                blockedNodes[i] = [];
            }
        }

        node = blockedNodes[gridY][gridX];

        if (value) {
            // clear blocked node
            if (node) {
                this.colorizeNode(node, this.rects[gridY][gridX].attr('fill'));
                this.zoomNode(node);
                setTimeout(function () {
                    node.remove();
                }, this.nodeZoomEffect.duration);
                blockedNodes[gridY][gridX] = null;
            }
        } else {//aizat
            node = blockedNodes[gridY][gridX] = this.rects[gridY][gridX].clone();
            
            this.zoomNode(node);
            //node.attr({
            //    fill: `url(${imageUrl})`, 
            //});
            node.attr({
                fill: `url(${this.nodeStyle.lift.image})` 
            });
            
            
        }
    },
    setIconAt: function (gridX, gridY, value) {
        this.generateGrid(() => {
            var node, i, blockedNodes = this.blockedNodes;
            var imageUrl = this.nodeStyle.lift.image;
            //if (!blockedNodes) {
            //    blockedNodes = this.blockedNodes = new Array(this.numRows);
            //    for (i = 0; i < this.numRows; ++i) {
            //        blockedNodes[i] = [];
            //    }
            //}

            //node = blockedNodes[gridY][gridX];

            node = blockedNodes[gridY][gridX] = this.rects[gridY][gridX].clone();
            this.zoomNode(node);
            console.log('sini-->' + value);
            if (value === 'escalator') {
                node.attr({
                    fill: `url(${this.nodeStyle.escalator.image})`
                });
            }
            else if (value === 'stair') {
                node.attr({
                    fill: `url(${this.nodeStyle.stair.image})`
                });
            }
            else if (value === 'landmark') {
                node.attr({
                    fill: `url(${this.nodeStyle.star.image})`
                });
            }//test
            else if (value === 'G1') {
                node.attr({
                    fill: `url(${this.nodeStyle.g1.image})`
                });
            }
            else if (value === 'G2') {
                node.attr({
                    fill: `url(${this.nodeStyle.g2.image})`
                });
            }
            //test
            else {
                node.attr({
                    fill: `url(${this.nodeStyle.lift.image})`
                });
            }
               
            
        });
    },
    clearFootprints: function() {
        var i, x, y, coord, coords = this.getDirtyCoords();
        for (i = 0; i < coords.length; ++i) {
            coord = coords[i];
            x = coord[0];
            y = coord[1];
            this.rects[y][x].attr(this.nodeStyle.normal);
            this.setCoordDirty(x, y, false);
        }
    },
    clearBlockedNodes: function() {
        var i, j, blockedNodes = this.blockedNodes;
        if (!blockedNodes) {
            return;
        }
        for (i = 0; i < this.numRows; ++i) {
            for (j = 0 ;j < this.numCols; ++j) {
                if (blockedNodes[i][j]) {
                    blockedNodes[i][j].remove();
                    blockedNodes[i][j] = null;
                }
            }
        }
    },
    drawPath: function(path, index) {
        if (!path.length) {
            return;
        }
        const colors = ["#00FF00", "#FFD700", "#FF4500"];
        var svgPath = this.buildSvgPath(path);
        let color = colors[index] || "black";
        this.path = this.paper.path(svgPath).attr({
            stroke: color,
            "stroke-width": 3
        });
    },
    /**
     * Given a path, build its SVG represention.
     */
    buildSvgPath: function(path) {
        var i, strs = [], size = this.nodeSize;

        strs.push('M' + (path[0][0] * size + size / 2) + ' ' +
                  (path[0][1] * size + size / 2));
        for (i = 1; i < path.length; ++i) {
            strs.push('L' + (path[i][0] * size + size / 2) + ' ' +
                      (path[i][1] * size + size / 2));
        }

        return strs.join('');
    },
    clearPath: function () {
        if (this.path) {
            this.path.remove();
        }
    },
    clearPathCustom: function (pathPassed) {
        if (pathPassed) {
            this.path.remove();
        }
    },
    /**
     * Helper function to convert the page coordinate to grid coordinate
     */
    toGridCoordinate: function(pageX, pageY) {
        return [
            Math.floor(pageX / this.nodeSize),
            Math.floor(pageY / this.nodeSize)
        ];
    },
    /**
     * helper function to convert the grid coordinate to page coordinate
     */
    toPageCoordinate: function(gridX, gridY) {
        return [
            gridX * this.nodeSize,
            gridY * this.nodeSize
        ];
    },
    showStats: function(opts) {
        var texts = [
            'length: ' + Math.round(opts.pathLength * 100) / 100,
            'time: ' + opts.timeSpent + 'ms',
            'operations: ' + opts.operationCount
        ];
        $('#stats').show().html(texts.join('<br>'));
    },
    setCoordDirty: function(gridX, gridY, isDirty) {
        var x, y,
            numRows = this.numRows,
            numCols = this.numCols,
            coordDirty;

        if (this.coordDirty === undefined) {
            coordDirty = this.coordDirty = [];
            for (y = 0; y < numRows; ++y) {
                coordDirty.push([]);
                for (x = 0; x < numCols; ++x) {
                    coordDirty[y].push(false);
                }
            }
        }

        this.coordDirty[gridY][gridX] = isDirty;
    },
    getDirtyCoords: function() {
        var x, y,
            numRows = this.numRows,
            numCols = this.numCols,
            coordDirty = this.coordDirty,
            coords = [];

        if (coordDirty === undefined) {
            return [];
        }

        for (y = 0; y < numRows; ++y) {
            for (x = 0; x < numCols; ++x) {
                if (coordDirty[y][x]) {
                    coords.push([x, y]);
                }
            }
        }
        return coords;
    },
};
