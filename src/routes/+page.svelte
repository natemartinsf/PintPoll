<script lang="ts">
	import PointPicker from '$lib/components/PointPicker.svelte';

	const maxPoints = 10;
	let beer1Points = $state(3);
	let beer2Points = $state(1);
	let beer3Points = $state(0);

	const remaining = $derived(maxPoints - beer1Points - beer2Points - beer3Points);
</script>

<!-- Design Preview - Remove this file's contents after approval -->
<div class="min-h-screen p-6 max-w-2xl mx-auto">
	<h1 class="heading mb-2">People's Choice Beer Voting</h1>
	<p class="text-muted mb-8">Design preview - craft brewery aesthetic</p>

	<!-- Color Palette -->
	<section class="mb-8">
		<h2 class="subheading mb-4">Color Palette</h2>
		<div class="space-y-3">
			<div>
				<p class="text-sm text-brown-600 mb-1">Amber (Primary)</p>
				<div class="flex gap-1">
					<div class="w-12 h-12 rounded bg-amber-100"></div>
					<div class="w-12 h-12 rounded bg-amber-300"></div>
					<div class="w-12 h-12 rounded bg-amber-500"></div>
					<div class="w-12 h-12 rounded bg-amber-600"></div>
					<div class="w-12 h-12 rounded bg-amber-800"></div>
				</div>
			</div>
			<div>
				<p class="text-sm text-brown-600 mb-1">Brown (Secondary)</p>
				<div class="flex gap-1">
					<div class="w-12 h-12 rounded bg-brown-100"></div>
					<div class="w-12 h-12 rounded bg-brown-300"></div>
					<div class="w-12 h-12 rounded bg-brown-500"></div>
					<div class="w-12 h-12 rounded bg-brown-700"></div>
					<div class="w-12 h-12 rounded bg-brown-900"></div>
				</div>
			</div>
			<div>
				<p class="text-sm text-brown-600 mb-1">Copper (Accent)</p>
				<div class="flex gap-1">
					<div class="w-12 h-12 rounded bg-copper-400"></div>
					<div class="w-12 h-12 rounded bg-copper-500"></div>
					<div class="w-12 h-12 rounded bg-copper-600"></div>
				</div>
			</div>
		</div>
	</section>

	<!-- Buttons -->
	<section class="mb-8">
		<h2 class="subheading mb-4">Buttons</h2>
		<div class="flex flex-wrap gap-3">
			<button class="btn-primary">Primary</button>
			<button class="btn-secondary">Secondary</button>
			<button class="btn-ghost">Ghost</button>
			<button class="btn-primary" disabled>Disabled</button>
		</div>
	</section>

	<!-- Cards -->
	<section class="mb-8">
		<h2 class="subheading mb-4">Cards</h2>
		<div class="space-y-3">
			<div class="card">
				<h3 class="font-semibold text-brown-800">Hop Monster IPA</h3>
				<p class="text-sm text-brown-500">Brewed by Sarah M. • West Coast IPA</p>
			</div>
			<div class="card-interactive">
				<h3 class="font-semibold text-brown-800">Oatmeal Stout</h3>
				<p class="text-sm text-brown-500">Brewed by Mike T. • Stout</p>
				<p class="text-xs text-copper-600 mt-2">Tap to vote →</p>
			</div>
		</div>
	</section>

	<!-- Form Elements -->
	<section class="mb-8">
		<h2 class="subheading mb-4">Form Elements</h2>
		<div class="card space-y-4">
			<div>
				<label class="label" for="beer-name">Beer Name</label>
				<input class="input" id="beer-name" type="text" placeholder="Enter beer name..." />
			</div>
			<div>
				<label class="label" for="notes">Tasting Notes</label>
				<textarea class="input" id="notes" rows="3" placeholder="What did you think?"></textarea>
			</div>
			<button class="btn-primary w-full">Submit</button>
		</div>
	</section>

	<!-- Typography -->
	<section class="mb-8">
		<h2 class="subheading mb-4">Typography</h2>
		<div class="space-y-2">
			<p class="text-4xl font-bold text-brown-900">Heading 4XL</p>
			<p class="heading">Heading (2XL bold)</p>
			<p class="subheading">Subheading (LG semibold)</p>
			<p>Body text - this is what most content looks like.</p>
			<p class="text-muted">Muted text for secondary information</p>
			<p class="text-sm">Small text (14px)</p>
			<a href="/example">This is a link</a>
		</div>
	</section>

	<!-- Example: Point Allocation with PointPicker Component -->
	<section class="mb-8">
		<h2 class="subheading mb-4">Point Allocation (Interactive)</h2>
		<p class="text-sm text-brown-500 mb-3">{maxPoints} max points, {maxPoints - remaining} used, {remaining} remaining</p>

		<!-- Beer 1 -->
		<div class="card mb-3">
			<div class="flex justify-between items-center mb-3">
				<div>
					<h3 class="font-semibold text-brown-800">Belgian Tripel</h3>
					<p class="text-sm text-brown-500">Brewed by Dan K.</p>
				</div>
				<span class={beer1Points > 0 ? 'text-amber-600 font-bold text-xl' : 'text-brown-400 font-bold text-xl'}>
					{beer1Points} {beer1Points === 1 ? 'pt' : 'pts'}
				</span>
			</div>
			<PointPicker max={maxPoints} bind:value={beer1Points} maxSelectable={beer1Points + remaining} />
		</div>

		<!-- Beer 2 -->
		<div class="card mb-3">
			<div class="flex justify-between items-center mb-3">
				<div>
					<h3 class="font-semibold text-brown-800">Oatmeal Stout</h3>
					<p class="text-sm text-brown-500">Brewed by Mike T.</p>
				</div>
				<span class={beer2Points > 0 ? 'text-amber-600 font-bold text-xl' : 'text-brown-400 font-bold text-xl'}>
					{beer2Points} {beer2Points === 1 ? 'pt' : 'pts'}
				</span>
			</div>
			<PointPicker max={maxPoints} bind:value={beer2Points} maxSelectable={beer2Points + remaining} />
		</div>

		<!-- Beer 3 -->
		<div class="card">
			<div class="flex justify-between items-center mb-3">
				<div>
					<h3 class="font-semibold text-brown-800">Hop Monster IPA</h3>
					<p class="text-sm text-brown-500">Brewed by Sarah M.</p>
				</div>
				<span class={beer3Points > 0 ? 'text-amber-600 font-bold text-xl' : 'text-brown-400 font-bold text-xl'}>
					{beer3Points} {beer3Points === 1 ? 'pt' : 'pts'}
				</span>
			</div>
			<PointPicker max={maxPoints} bind:value={beer3Points} maxSelectable={beer3Points + remaining} />
		</div>
	</section>
</div>
