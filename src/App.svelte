<script>
	import Paho from "paho-mqtt";
	import { v4 as uuidv4 } from "uuid";

	const clientId = "mobile-" + uuidv4();
	const client = new Paho.Client("wss://mqtt.4hcomputers.club/mqtt", clientId);
	const channel = "sign-draw-1";
	const channel2 = "sign-draw-2";
	window.client = client;

	let connected = false;
	function mqttConnect() {
		client.connect({
			onSuccess: (_) => {
				console.log("connected");
				connected = true;
				client.subscribe(channel);
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

	let updateIds = [];
	let lastRecieved = "";
	let firstUpdate = false;
	client.onMessageArrived = (message) => {
		if (message.destinationName === channel) {
			const data = JSON.parse(message.payloadString);
			console.log(data);
			// console.log("Comparing update Ids: " + updateId + " " + data.updateId);
			// debugger;
			if (
				updateIds.indexOf(data.updateId) === -1 &&
				data.grid &&
				JSON.stringify(data.grid) != JSON.stringify(grid)
			) {
				console.log("Updating grid");
				grid = [...data.grid];
				lastRecieved = JSON.stringify(grid);
			}
			if (updateIds.indexOf(data.updateId) > -1)
				updateIds.splice(updateIds.indexOf(data.updateId), 1);
			firstUpdate = true;
		}
	};
	$: {
		if (
			connected &&
			(firstUpdate || !(JSON.stringify(grid) == JSON.stringify(clear)))
		) {
			const updateId = Math.round(Math.random() * 1000000);
			updateIds.push(updateId);
			console.log("Creating new updateId: " + updateId);
			if (lastRecieved != JSON.stringify(grid)) {
				client.publish(channel, JSON.stringify({ updateId, grid }), 0, true);
				client.publish(channel2, grid.join(""), 0, true);
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
	}
	let lastTouchedIndex = -1;
</script>

<svelte:window on:mouseup={() => (drawing = false)} />

<main>
	<div class="tools" style="flex-direction: column;">
		<div class="tools">
			<button
				class:toolSelected={mode === "draw"}
				on:click={(_) => (mode = "draw")}>Draw</button
			>
			<button
				class:toolSelected={mode === "erase"}
				on:click={(_) => (mode = "erase")}>Erase</button
			>
			<button on:click={(_) => (grid = new Array(504).fill(0))}>Clear</button>
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
			const newIndex = elements.indexOf(
				document.elementFromPoint(e.touches[0].pageX, e.touches[0].pageY)
			);
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
					if (e.button === 2 && mode !== "erase") {
						temporaryErase = true;
					}
					onDraw(i);
				}}
				onmous
			/>
		{/each}
	</div>
	<div style="display: flex; gap: 12px; align-items: center;">
		<div
			style={`height: 1em; aspect-ratio: 1; background: ${
				connected ? "#0F0" : "#F00"
			}; border-radius: 50%;`}
		/>
		<code style="font-size: 0.7rem;">
			{connected ? "connected" : "disconnected"}<br />{clientId}</code
		>
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
