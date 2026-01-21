<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { Files, Check } from 'lucide-svelte';
	import type { Beer } from '$lib/types';

	type BeerWithToken = Beer & { brewer_tokens: { id: string } | null };

	let { data, form } = $props();

	let selectedAdminId = $state('');
	let copied = $state(false);
	let copiedFeedbackId = $state<string | null>(null);
	let beers = $state<BeerWithToken[]>(data.beers);

	const manageUrl = $derived(`${$page.url.origin}/manage/${data.event.manage_token}`);
	const resultsUrl = $derived(`${$page.url.origin}/results/${data.event.id}`);

	// Real-time subscription for beer updates
	onMount(() => {
		const channel = data.supabase
			.channel('admin-beers-changes')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'beers',
					filter: `event_id=eq.${data.event.id}`
				},
				async (payload) => {
					const newBeer = payload.new as Beer;
					if (!beers.some((b) => b.id === newBeer.id)) {
						// Fetch the brewer_token for the new beer
						const { data: tokenData } = await data.supabase
							.from('brewer_tokens')
							.select('id')
							.eq('beer_id', newBeer.id)
							.single();

						const beerWithToken: BeerWithToken = {
							...newBeer,
							brewer_tokens: tokenData
						};
						beers = [...beers, beerWithToken];
					}
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'DELETE',
					schema: 'public',
					table: 'beers'
				},
				(payload) => {
					const deletedId = payload.old.id;
					beers = beers.filter((b) => b.id !== deletedId);
				}
			)
			.subscribe();

		return () => {
			data.supabase.removeChannel(channel);
		};
	});

	// Admins not yet assigned to this event
	const availableAdmins = $derived(
		data.allAdmins.filter((admin) => !data.assignedAdmins.some((a) => a.id === admin.id))
	);

	async function copyToClipboard(text: string) {
		await navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function copyFeedbackUrl(beerId: string, token: string) {
		const url = `${$page.url.origin}/feedback/${token}`;
		await navigator.clipboard.writeText(url);
		copiedFeedbackId = beerId;
		setTimeout(() => (copiedFeedbackId = null), 2000);
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
		<div class="relative">
			<input type="text" readonly value={manageUrl} class="input w-full text-sm pr-20" />
			<button
				type="button"
				onclick={() => copyToClipboard(manageUrl)}
				class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 rounded text-sm text-brown-600 hover:text-brown-800 hover:bg-brown-100 transition-colors"
				title={copied ? 'Copied!' : 'Copy to clipboard'}
			>
				{#if copied}
					<Check class="w-4 h-4 text-green-600" />
					<span class="text-green-600">Copied</span>
				{:else}
					<Files class="w-4 h-4" />
					<span>Copy</span>
				{/if}
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
		<h2 class="text-lg font-semibold text-brown-900 mb-4">Beers ({beers.length})</h2>
		{#if form?.error && form?.action === 'deleteBeer'}
			<p class="text-red-600 text-sm mb-3">{form.error}</p>
		{/if}
		{#if beers.length === 0}
			<p class="text-muted">No beers added yet. Share the manage URL with tap volunteers to add beers.</p>
		{:else}
			<ul class="divide-y divide-brown-100">
				{#each beers as beer (beer.id)}
					<li class="py-3">
						<div class="flex items-center justify-between">
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
						</div>
						{#if beer.brewer_tokens?.id}
							<div class="mt-2 flex items-center gap-2">
								<span class="text-xs text-muted">Feedback URL:</span>
								<code class="text-xs text-brown-600 bg-brown-50 px-1.5 py-0.5 rounded truncate max-w-xs">
									/feedback/{beer.brewer_tokens.id}
								</code>
								<button
									type="button"
									onclick={() => copyFeedbackUrl(beer.id, beer.brewer_tokens!.id)}
									class="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-brown-600 hover:text-brown-800 hover:bg-brown-100 transition-colors"
									title={copiedFeedbackId === beer.id ? 'Copied!' : 'Copy feedback URL'}
								>
									{#if copiedFeedbackId === beer.id}
										<Check class="w-3 h-3 text-green-600" />
										<span class="text-green-600">Copied</span>
									{:else}
										<Files class="w-3 h-3" />
										<span>Copy</span>
									{/if}
								</button>
							</div>
						{/if}
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
