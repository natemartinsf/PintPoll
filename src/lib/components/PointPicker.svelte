<script lang="ts">
	interface Props {
		/** Maximum points available (from event.max_points) */
		max: number;
		/** Current selected value */
		value: number;
		/** Maximum value that can be selected (current value + remaining pool) */
		maxSelectable: number;
		/** Called when selection changes */
		onchange?: (value: number) => void;
	}

	let { max, value = $bindable(0), maxSelectable, onchange }: Props = $props();

	function select(points: number) {
		if (points > maxSelectable) return;
		value = points;
		onchange?.(points);
	}
</script>

<div class="flex gap-1.5 flex-wrap">
	{#each Array.from({ length: max + 1 }, (_, i) => i) as points}
		<button
			type="button"
			class={points === value
				? 'point-btn-selected'
				: points > maxSelectable
					? 'point-btn-disabled'
					: 'point-btn'}
			disabled={points > maxSelectable}
			onclick={() => select(points)}
		>
			{points}
		</button>
	{/each}
</div>
