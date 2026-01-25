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
		/** Disable all buttons (e.g., during save) */
		disabled?: boolean;
	}

	let { max, value = $bindable(0), maxSelectable, onchange, disabled = false }: Props = $props();

	const useButtons = $derived(max <= 6);

	function select(points: number) {
		if (disabled || points > maxSelectable) return;
		// Tap selected value again to deselect (return to 0)
		if (points === value) {
			value = 0;
			onchange?.(0);
		} else {
			value = points;
			onchange?.(points);
		}
	}

	function increment() {
		if (disabled || value >= maxSelectable) return;
		value = value + 1;
		onchange?.(value);
	}

	function decrement() {
		if (disabled || value <= 0) return;
		value = value - 1;
		onchange?.(value);
	}
</script>

{#if useButtons}
	<!-- Button row for max ≤ 6: buttons 1 through max, centered -->
	<div class="flex gap-1.5 justify-center">
		{#each Array.from({ length: max }, (_, i) => i + 1) as points}
			<button
				type="button"
				class={points === value
					? 'point-btn-selected'
					: disabled || points > maxSelectable
						? 'point-btn-disabled'
						: 'point-btn'}
				disabled={disabled || points > maxSelectable}
				onclick={() => select(points)}
			>
				{points}
			</button>
		{/each}
	</div>
{:else}
	<!-- Stepper for max > 6 -->
	<div class="flex items-center justify-center gap-4">
		<button
			type="button"
			class={disabled || value <= 0 ? 'point-btn-disabled' : 'point-btn'}
			disabled={disabled || value <= 0}
			onclick={decrement}
			aria-label="Decrease points"
		>
			−
		</button>
		<div class="text-center min-w-[4rem]">
			<span class="text-2xl font-bold text-brown-900">{value}</span>
			<span class="text-sm text-muted"> / {max}</span>
		</div>
		<button
			type="button"
			class={disabled || value >= maxSelectable ? 'point-btn-disabled' : 'point-btn'}
			disabled={disabled || value >= maxSelectable}
			onclick={increment}
			aria-label="Increase points"
		>
			+
		</button>
	</div>
{/if}
