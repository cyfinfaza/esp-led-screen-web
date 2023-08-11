<script>
	import Paho from "paho-mqtt";
	import { v4 as uuidv4 } from "uuid";
	import { renderPixels } from "./pixel-font.js";

	let text = null,
		confirmedTextOverwrite = sessionStorage.getItem("confirmedTextOverwrite") || false;
	$: sessionStorage.setItem("confirmedTextOverwrite", confirmedTextOverwrite);
	function updateText() {
		let pixels = renderPixels(text);
		if (pixels.length < 7) pixels = pixels.concat(new Array(7 - pixels.length).fill([]));
		grid = pixels
			.reduce((acc, val) => acc.concat([...val, ...new Array(Math.max(72 - val.length, 0)).fill(0)].slice(0, 72)), [])
			.slice(0, 7 * 72);
		console.log(grid.length);
	}
	$: if (text !== null) updateText();

	const clientId = "mobile-" + uuidv4();
	const client = new Paho.Client("wss://mqtt.4hcomputers.club/mqtt", clientId);
	const clientChannel = "sign-draw-1";
	const signChannel = "sign-draw-2";
	window.client = client;

	let connected = false;
	function mqttConnect() {
		client.connect({
			onSuccess: (_) => {
				console.log("connected");
				connected = true;
				client.subscribe(clientChannel);
			},
			onFailure: (_) => {
				console.log("failed");
				connected = false;
				setTimeout(() => {
					mqttConnect();
				}, 3000);
			},
			cleanSession: true,
		});
	}
	client.onConnectionLost = (_) => {
		console.log("disconnected");
		connected = false;
		setTimeout(() => {
			mqttConnect();
		}, 1000);
	};
	mqttConnect();

	let updateIds = [],
		lastRecieved = "",
		firstUpdate = false;
	client.onMessageArrived = (message) => {
		if (message.destinationName === clientChannel) {
			const data = JSON.parse(message.payloadString);
			console.log(data);
			// console.log("Comparing update Ids: " + updateId + " " + data.updateId);
			// debugger;
			if (updateIds.indexOf(data.updateId) === -1 && data.grid && JSON.stringify(data.grid) != JSON.stringify(grid)) {
				console.log("Updating grid");
				grid = [...data.grid];
				lastRecieved = JSON.stringify(grid);
			}
			if (updateIds.indexOf(data.updateId) > -1) updateIds.splice(updateIds.indexOf(data.updateId), 1);
			firstUpdate = true;
		}
	};
	$: {
		if (connected && (firstUpdate || !(JSON.stringify(grid) == JSON.stringify(clear)))) {
			const updateId = Math.round(Math.random() * 1000000);
			updateIds.push(updateId);
			console.log("Creating new updateId: " + updateId);
			if (lastRecieved != JSON.stringify(grid)) {
				client.publish(clientChannel, JSON.stringify({ updateId, grid }), 0, true);
				client.publish(signChannel, grid.join(""), 0, true);
			}
		}
	}

	let grid = new Array(504).fill(0);
	const clear = new Array(504).fill(0);
	let elements = new Array(504).fill(null);

	let drawing = false,
		color = 1,
		mode = "draw",
		temporaryErase = false;

	function onDraw(index) {
		if (mode === "erase" || temporaryErase) grid[index] = 0;
		else if (mode === "draw") grid[index] = color;
		text = null;
	}
	let lastTouchedIndex = -1;
</script>

<svelte:window on:mouseup={() => (drawing = false)} />

<main>
	<div class="tools" style="flex-direction: column;">
		<div class="tools">
			<button class:toolSelected={mode === "draw"} on:click={() => (mode = "draw")}>Draw</button>
			<button class:toolSelected={mode === "erase"} on:click={() => (mode = "erase")}>Erase</button>
			<button on:click={() => (grid = new Array(504).fill(0))}>Clear</button>
		</div>
	</div>
	<div
		class="grid"
		on:mousedown={(e) => {
			if (e.button === 2) {
				temporaryErase = true;
			}
			drawing = true;
		}}
		on:contextmenu={(e) => e.preventDefault()}
		on:mouseup={(_) => {
			temporaryErase = false;
			drawing = false;
		}}
		on:touchmove={(e) => {
			e.preventDefault();
			const newIndex = elements.indexOf(document.elementFromPoint(e.touches[0].pageX, e.touches[0].pageY));
			if (newIndex != lastTouchedIndex) {
				onDraw(newIndex);
				lastTouchedIndex = newIndex;
			}
		}}
		on:touchend={(_) => (lastTouchedIndex = -1)}
		on:dragstart={(e) => e.preventDefault()}
	>
		{#each grid as item, i}
			<div
				bind:this={elements[i]}
				class="box"
				style={`background: ${item ? "#F00" : "#000"}`}
				on:mouseenter={(_) => {
					if (drawing) onDraw(i);
				}}
				on:touchstart={(_) => onDraw(i)}
				on:touchenter={(_) => onDraw(i)}
				on:mousedown={(e) => {
					console.log(e);
					if (e.button === 2 && mode !== "erase") temporaryErase = true;
					onDraw(i);
				}}
			/>
		{/each}
	</div>
	<div class="tools">
		<input
			bind:value={text}
			type="text"
			on:click={(e) => {
				if (!confirmedTextOverwrite) {
					if (confirm("Entering any text will reset the grid, continue?")) confirmedTextOverwrite = true;
					else e.target.blur();
				}
			}}
		/>
		<button on:click={() => localStorage.setItem("grid", JSON.stringify(grid))}>Stash</button>
		<button
			on:click={() => {
				let saved = localStorage.getItem("grid");
				if (saved) grid = JSON.parse(saved);
			}}>Stash Pop</button
		>
	</div>
	<div style="display: flex; gap: 12px; align-items: center;">
		<div style={`height: 1em; aspect-ratio: 1; background: ${connected ? "#0F0" : "#F00"}; border-radius: 50%;`} />
		<code style="font-size: 0.7rem;">{connected ? "connected" : "disconnected"}<br />{clientId}</code>
	</div>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		width: 100%;
		max-width: 2000px;
	}

	.tools {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 8px;
	}

	.tools > *:not(.tools) {
		border: none;
		padding: 4px 6px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 24px;
		height: 100%;
	}

	.tools > *:not(.tools).toolSelected {
		border: 2px solid lightgreen;
	}

	.tools > input {
		padding-top: 0 !important;
		padding-bottom: 0 !important;
	}

	.grid {
		width: 100%;
		display: grid;
		gap: 2px;
		aspect-ratio: 72/7;
		grid-template-columns: repeat(72, auto);
	}
	.box {
		box-shadow: 3px 3px 0 0 #222;
		border-radius: 50%;
	}
</style>
