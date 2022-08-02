<script>
  import Paho from "paho-mqtt";
  import { v4 as uuidv4 } from "uuid";
  const clientId = "mobile-" + uuidv4();
  const client = new Paho.Client("wss://mq02.cy2.me/ws", clientId);
  const channel = "hat-draw-1";
  window.client = client;
  let connected = false;
  client.connect({
    onSuccess: (_) => {
      console.log("connected");
      connected = true;
      client.subscribe(channel);
    },
    onFailure: (_) => {
      console.log("failed");
      connected = false;
    },
  });
  let updateId;
  let lastRecieved = "";
  let firstUpdate = false;
  client.onMessageArrived = (message) => {
    if (message.destinationName === channel) {
      const data = JSON.parse(message.payloadString);
      console.log(data);
      console.log("Comparing update Ids: " + updateId + " " + data.updateId);
      // debugger;
      if (data.updateId != updateId && data.grid && JSON.stringify(data.grid) != JSON.stringify(grid)) {
        console.log("Updating grid");
        grid = [...data.grid];
        lastRecieved = JSON.stringify(grid);
      }
      firstUpdate = true;
    }
  };
  $: {
    if (connected && (firstUpdate || !(JSON.stringify(grid) == JSON.stringify(clear)))) {
      updateId = Math.round(Math.random() * 1000000);
      console.log("Creating new updateId: " + updateId);
      if (lastRecieved != JSON.stringify(grid)) client.publish(channel, JSON.stringify({ updateId, grid }), 0, true);
    }
  }
  let grid = new Array(64).fill("#000000");
  const clear = new Array(64).fill("#000000");
  let elements = new Array(64).fill(null);
  let drawing = false;
  let color = "#00FF00";
  let mode = "draw";
  $: console.log(color);
</script>

<main>
  <div class="tools">
    <button class:toolSelected={mode === "draw"} on:click={(_) => (mode = "draw")}>Draw</button>
    <button class:toolSelected={mode === "erase"} on:click={(_) => (mode = "erase")}>Erase</button>
    <button on:click={(_) => (grid = clear)}>Clear</button>
    <input type="color" name="" id="" bind:value={color} />
  </div>
  <div
    class="grid"
    on:mousedown={(_) => (drawing = true)}
    on:mouseup={(_) => (drawing = false)}
    on:touchmove={(e) => {
      grid[elements.indexOf(document.elementFromPoint(e.touches[0].pageX, e.touches[0].pageY))] = mode === "draw" ? color : "#000000";
    }}
  >
    {#each grid as item, i}
      <div
        bind:this={elements[i]}
        class="box"
        style={`background: ${item}`}
        on:mouseenter={(_) => {
          if (drawing) {
            switch (mode) {
              case "draw":
                grid[i] = color;
                break;
              case "erase":
                grid[i] = "#000000";
                break;
            }
          }
        }}
      />
    {/each}
  </div>
  <p><code>{connected ? "connected" : "disconnected"}<br />{clientId}</code></p>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
    max-width: 600px;
  }

  .tools {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  .tools > * {
    background: #ccc;
    border: none;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
  }

  .toolSelected {
    background: lightgreen;
  }

  .grid {
    width: 100%;
    display: grid;
    gap: 4px;
    aspect-ratio: 1;
    grid-template-columns: repeat(8, auto);
  }
  .box {
    border: 1px solid black;
    border-radius: 15%;
  }
  .colored {
    background-color: black;
  }
</style>
