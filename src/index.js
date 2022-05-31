import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const rows = 40;
const columns = 40;
const period = 333;
const coinEmoji = "🪙";
const startingResources = 3000;
const costPerCell = 1000;
const nodeResourceGeneration = 50;
const cellDeathResourceGeneration = 5;
const cellUpkeepCost = 1;
const secondsToAverage = 5;

function Cell(props) {
  return (
    <button
      className={`cell-${props.status ? "alive" : "dead"}-${
        props.nextState === -1
          ? "dying"
          : props.nextState === 1
          ? "living"
          : "unchanging"
      }`}
      onClick={props.onClick}
    >
      <div className="resourceNode">{props.resourceNode ? coinEmoji : ""}</div>
    </button>
  );
}

class Board extends React.Component {
  constructor() {
    super();
    let cells = [];
    let livingCells = [];
    let availableResourceNodes = ~~((rows * columns) / 100);
    for (let row = 0; row < rows; row++) {
      cells[row] = [];
      for (let column = 0; column < columns; column++) {
        let cellIsResourceNode = false;
        const rando = Math.random();
        if (rando > 0.99 && availableResourceNodes > 0) {
          cellIsResourceNode = true;
          availableResourceNodes--;
        }
        cells[row][column] = {
          state: false,
          modifyState: 0,
          resourceNode: cellIsResourceNode,
        };
      }
    }
    this.state = {
      cells: cells,
      livingCells: livingCells,
      resources: startingResources,
      resourcesGainedLastNSeconds: [0],
      avgResourcesPerSecond: 0,
    };
  }

  componentDidMount() {
    this.interval = setInterval(() => {
      this.gameTick();
    }, period);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  cell(r, c) {
    return this.state.cells[r][c];
  }

  incrementResources(amount) {
    this.setState({
      resources: this.state.resources + amount,
    });
  }

  gameTick() {
    let nextTick = [];

    let resourcesGainedThisTick = 0;

    for (let r = 0; r < rows; r++) {
      nextTick[r] = [...this.state.cells[r]];
      for (let c = 0; c < columns; c++) {
        let cellState = this.calculateCellState(r, c);
        if (!cellState && this.state.cells[r][c].state) {
          resourcesGainedThisTick += cellDeathResourceGeneration;
        } else if (cellState) {
          //Incur upkeep
          resourcesGainedThisTick -= cellUpkeepCost;
          if (!nextTick[r][c].state && nextTick[r][c].resourceNode) {
            //Generate resources if a cell was created on a resource node.
            resourcesGainedThisTick += nodeResourceGeneration;
          }
        }
        nextTick[r][c] = {
          state: cellState,
          modifyState: nextTick[r][c].modifyState,
          resourceNode: nextTick[r][c].resourceNode,
        };
      }
    }

    let resourcesGainedLastNSeconds = [
      ...this.state.resourcesGainedLastNSeconds,
    ];

    if (
      resourcesGainedLastNSeconds.length >
      (secondsToAverage * 1000) / period
    ) {
      resourcesGainedLastNSeconds = resourcesGainedLastNSeconds.slice(1);
    }

    resourcesGainedLastNSeconds.push(resourcesGainedThisTick);

    const avgResourcesPerSecond = this.resourcesPerSecond(
      resourcesGainedLastNSeconds
    );

    let newResourceTotal = this.state.resources + resourcesGainedThisTick;
    if (newResourceTotal < 0) {
      newResourceTotal = 0;
    }

    this.setState({
      cells: [...nextTick],
      resources: newResourceTotal,
      resourcesGainedLastNSeconds: [...resourcesGainedLastNSeconds],
      avgResourcesPerSecond: avgResourcesPerSecond,
    });
  }

  getCellNeighbors(cellRow, cellColumn) {
    let neighbors = [];
    for (let rowVector = -1; rowVector <= 1; rowVector++) {
      const checkRow = cellRow + rowVector;
      //Check out of bounds
      if (checkRow >= 0 && checkRow < rows) {
        for (let colVector = -1; colVector <= 1; colVector++) {
          const checkColumn = cellColumn + colVector;
          //Check out of bounds
          if (checkColumn >= 0 && checkColumn < columns) {
            //Check for the current cell
            if (!(checkRow === cellRow && checkColumn === cellColumn)) {
              neighbors.push({ row: checkRow, column: checkColumn });
            }
          }
        }
      }
    }
    return neighbors;
  }

  cellOnClick(row, column) {
    let cells = [...this.state.cells];
    let currentModState = cells[row][column].modifyState;
    let nextModState = currentModState;

    nextModState++;
    if (nextModState > 1) {
      nextModState = -1;
    }
    if (this.state.resources >= costPerCell || nextModState !== 1) {
      let newResourceTotal = this.state.resources;
      if (nextModState !== 0 && currentModState === 0) {
        newResourceTotal -= costPerCell;
      } else if (nextModState === 0 && currentModState !== 0) {
        newResourceTotal += costPerCell;
      }
      cells[row][column].modifyState = nextModState;
      this.setState({
        cells: [...cells],
        resources: newResourceTotal,
      });
    }
  }

  resourcesPerSecond(previousTicks) {
    let avg = 0;
    previousTicks.forEach((n) => (avg += n / previousTicks.length));
    avg = Math.round(avg * (1000 / period));
    return avg;
  }

  submitButtonClick() {
    console.log("Submitted");
    let cells = [...this.state.cells];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < rows; c++) {
        let modState = this.cell(r, c).modifyState;
        if (modState !== 0) {
          if (modState === 1) {
            cells[r][c].state = true;
          } else {
            cells[r][c].state = false;
          }
        }
        cells[r][c].modifyState = 0;
      }
    }
    this.setState({
      cells: [...cells],
    });
  }

  clearButtonClick() {
    let nextTick = [];

    for (let r = 0; r < rows; r++) {
      nextTick[r] = [...this.state.cells[r]];
      for (let c = 0; c < columns; c++) {
        nextTick[r][c] = {
          state: false,
          modifyState: nextTick[r][c].modifyState,
          resourceNode: nextTick[r][c].resourceNode,
        };
      }
    }

    this.setState({
      cells: [...nextTick],
    });
  }

  calculateCellState(cellRow, cellColumn) {
    const neighbors = this.getCellNeighbors(cellRow, cellColumn);
    let livingNeighborCount = 0;
    neighbors.forEach((neighbor) => {
      let neighborState = this.cell(neighbor.row, neighbor.column).state;
      if (neighborState) {
        livingNeighborCount++;
      }
    });

    let currentState = this.cell(cellRow, cellColumn).state;

    if (
      currentState &&
      (livingNeighborCount === 2 || livingNeighborCount === 3)
    ) {
      //Any live cell with 2 or 3 neighbors survives
      return true;
    } else if (!currentState && livingNeighborCount === 3) {
      //Any dead cell with exactly three neighbors becomes a live cell.
      return true;
    } else {
      return false;
    }
  }

  render() {
    let body = [];
    for (let row = 0; row < this.state.cells.length; row++) {
      for (let column = 0; column < this.state.cells[row].length; column++) {
        body.push(
          <Cell
            key={`${row}-${column}`}
            status={this.cell(row, column).state}
            nextState={this.cell(row, column).modifyState}
            onClick={() => {
              this.cellOnClick(row, column);
            }}
            resourceNode={this.cell(row, column).resourceNode}
          ></Cell>
        );
      }
    }
    return (
      <div id="game">
        <button
          id="submit"
          class="game-options-button"
          onClick={() => {
            this.submitButtonClick();
          }}
        >
          Submit Build Order
        </button>
        <button
          id="clear"
          class="game-options-button"
          onClick={() => {
            this.clearButtonClick();
          }}
        >
          Clear Grid
        </button>
        <div id="resourceCounter">
          {coinEmoji}
          {this.state.resources}
        </div>
        <div id="resourcesPerSecondCounter">
          Resources Per Second: {this.state.avgResourcesPerSecond}
        </div>
        <div
          id="grid"
          style={{
            display: "grid",
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
          }}
        >
          {body}
        </div>
      </div>
    );
  }
}

// ========================================

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Board />);
