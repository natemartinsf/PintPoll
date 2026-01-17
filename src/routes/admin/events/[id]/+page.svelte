<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	let { data, form } = $props();

	let selectedAdminId = $state('');
	let copied = $state(false);

	const manageUrl = $derived(`${$page.url.origin}/manage/${data.event.manage_token}`);
	const resultsUrl = $derived(`${$page.url.origin}/results/${data.event.id}`);

	// Admins not yet assigned to this event
	const availableAdmins = $derived(
		data.allAdmins.filter((admin) => !data.assignedAdmins.some((a) => a.id === admin.id))
	);

	async function copyToClipboard(text: string) {
		await navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<svelte:head>
	<title>{data.event.name} - Admin</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header with back link -->
	<div>
		<a href="/admin" class="text-sm text-brown-600 hover:text-brown-800 no-underline mb-2 inline-block">
			&larr; Back to Events
		</a>
		<h1 class="heading">{data.event.name}</h1>
		<div class="text-muted mt-1 space-x-3">
			{#if data.event.date}
				<span>{new Date(data.event.date).toLocaleDateString()}</span>
			{/if}
			<span>{data.event.max_points} points max</span>
		</div>
	</div>

	<!-- Manage URL -->
	<div class="card">
		<h2 class="text-lg font-semibold text-brown-900 mb-3">Tap Volunteer URL</h2>
		<p class="text-sm text-muted mb-3">Share this link with tap volunteers so they can add beers.</p>
		<div class="flex gap-2">
			<input type="text" readonly value={manageUrl} class="input flex-1 text-sm" />
			<button type="button" onclick={() => copyToClipboard(manageUrl)} class="btn-secondary whitespace-nowrap">
				{copied ? 'Copied!' : 'Copy'}
			</button>
		</div>
	</div>

	<!-- Results Control -->
	<div class="card">
		<h2 class="text-lg font-semibold text-brown-900 mb-3">Results</h2>
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm text-muted">
					{#if data.event.results_visible}
						Results are currently <span class="text-green-600 font-medium">visible</span> to everyone.
					{:else}
						Results are currently <span class="text-brown-700 font-medium">hidden</span>.
					{/if}
				</p>
			</div>
			<form method="POST" action="?/toggleResults" use:enhance>
				<input type="hidden" name="results_visible" value={data.event.results_visible ? 'false' : 'true'} />
				<button type="submit" class={data.event.results_visible ? 'btn-secondary' : 'btn-primary'}>
					{data.event.results_visible ? 'Hide Results' : 'Reveal Results'}
				</button>
			</form>
		</div>
		{#if form?.error && form?.action === 'toggleResults'}
			<p class="text-red-600 text-sm mt-3">{form.error}</p>
		{/if}
		<div class="mt-4 pt-4 border-t border-brown-100">
			<a href={resultsUrl} target="_blank" rel="noopener noreferrer" class="text-sm">
				View Results Page &rarr;
			</a>
		</div>
	</div>

	<!-- Beers List -->
	<div class="card">
		<h2 class="text-lg font-semibold text-brown-900 mb-4">Beers ({data.beers.length})</h2>
		{#if form?.error && form?.action === 'deleteBeer'}
			<p class="text-red-600 text-sm mb-3">{form.error}</p>
		{/if}
		{#if data.beers.length === 0}
			<p class="text-muted">No beers added yet. Share the manage URL with tap volunteers to add beers.</p>
		{:else}
			<ul class="divide-y divide-brown-100">
				{#each data.beers as beer}
					<li class="py-3 flex items-center justify-between">
						<div>
							<span class="font-medium text-brown-900">{beer.name}</span>
							<span class="text-muted ml-2">by {beer.brewer}</span>
							{#if beer.style}
								<span class="text-sm text-muted ml-2">({beer.style})</span>
							{/if}
						</div>
						<form
							method="POST"
							action="?/deleteBeer"
							use:enhance={() => {
								if (!confirm(`Delete "${beer.name}"? This will also delete all votes and feedback for this beer.`)) {
									return () => {};
								}
								return async ({ update }) => {
									await update();
								};
							}}
						>
							<input type="hidden" name="beerId" value={beer.id} />
							<button type="submit" class="btn-ghost text-red-600 hover:text-red-700 text-sm">
								Delete
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- Event Admins -->
	<div class="card">
		<h2 class="text-lg font-semibold text-brown-900 mb-4">Event Admins</h2>
		<p class="text-sm text-muted mb-4">Admins who can manage this event.</p>

		<!-- Add Admin Form -->
		{#if availableAdmins.length > 0}
			<form method="POST" action="?/addEventAdmin" use:enhance class="flex gap-2 mb-4">
				<select name="adminId" bind:value={selectedAdminId} required class="input flex-1">
					<option value="">Select an admin...</option>
					{#each availableAdmins as admin}
						<option value={admin.id}>{admin.email}</option>
					{/each}
				</select>
				<button type="submit" class="btn-primary whitespace-nowrap">Add</button>
			</form>
		{:else}
			<p class="text-sm text-muted mb-4 italic">All admins are already assigned to this event.</p>
		{/if}

		{#if form?.error && (form?.action === 'addEventAdmin' || form?.action === 'removeEventAdmin')}
			<p class="text-red-600 text-sm mb-3">{form.error}</p>
		{/if}

		<!-- Assigned Admins List -->
		<ul class="divide-y divide-brown-100">
			{#each data.assignedAdmins as admin}
				{@const isSelf = admin.id === data.currentAdminId}
				{@const isOnlyAdmin = data.assignedAdmins.length === 1}
				<li class="py-3 flex items-center justify-between">
					<div>
						<span class="text-brown-900">{admin.email}</span>
						{#if isSelf}
							<span class="text-xs text-muted ml-2">(you)</span>
						{/if}
					</div>
					{#if !isOnlyAdmin || !isSelf}
						<form
							method="POST"
							action="?/removeEventAdmin"
							use:enhance={() => {
								const message = isSelf
									? 'Remove yourself from this event? You will lose access.'
									: `Remove ${admin.email} from this event?`;
								if (!confirm(message)) {
									return () => {};
								}
								return async ({ update }) => {
									await update();
								};
							}}
						>
							<input type="hidden" name="adminId" value={admin.id} />
							<button type="submit" class="btn-ghost text-red-600 hover:text-red-700 text-sm">
								Remove
							</button>
						</form>
					{:else}
						<span class="text-xs text-muted">Only admin</span>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</div>
