<script lang="ts">
	import { onMount } from 'svelte';
	import QRCodeStyling from 'qr-code-styling';

	let { data } = $props();

	let qrDataUrls = $state<string[]>([]);
	let isGenerating = $state(true);

	onMount(async () => {
		const urls: string[] = [];

		for (const code of data.voterCodes) {
			const url = `https://pintpoll.com/vote/${data.eventCode}/${code}`;

			const qrOptions: ConstructorParameters<typeof QRCodeStyling>[0] = {
				width: 200,
				height: 200,
				data: url,
				dotsOptions: {
					color: '#4a3728',
					type: 'rounded'
				},
				cornersSquareOptions: {
					color: '#4a3728',
					type: 'extra-rounded'
				},
				cornersDotOptions: {
					color: '#d97706',
					type: 'dot'
				},
				backgroundOptions: {
					color: '#ffffff'
				}
			};

			if (data.event.logoUrl) {
				qrOptions.image = data.event.logoUrl;
				qrOptions.imageOptions = {
					hideBackgroundDots: true,
					imageSize: 0.4,
					margin: 2,
					crossOrigin: 'anonymous'
				};
				qrOptions.qrOptions = {
					errorCorrectionLevel: 'H'
				};
			}

			const qr = new QRCodeStyling(qrOptions);
			const blob = await qr.getRawData('png');

			if (blob && blob instanceof Blob) {
				const dataUrl = await blobToDataUrl(blob);
				urls.push(dataUrl);
			}
		}

		qrDataUrls = urls;
		isGenerating = false;
	});

	function blobToDataUrl(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}

	function handlePrint() {
		window.print();
	}
</script>

<svelte:head>
	<title>QR Codes - {data.event.name}</title>
	<style>
		@page {
			size: letter;
			margin: 0.5in;
		}

		@media print {
			.no-print {
				display: none !important;
			}
		}
	</style>
</svelte:head>

<div class="no-print header">
	<div class="header-content">
		<a href="/admin/events/{data.eventCode}" class="back-link">&larr; Back to Event</a>
		<strong>{data.event.name}</strong> — {data.voterCodes.length} QR codes
		<button onclick={handlePrint} disabled={isGenerating} class="print-btn">
			{isGenerating ? 'Generating...' : 'Print'}
		</button>
	</div>
</div>

{#if isGenerating}
	<div class="loading">
		<p>Generating QR codes...</p>
	</div>
{:else}
	<div class="grid">
		{#each data.voterCodes as code, i (code)}
			<div class="card">
				{#if qrDataUrls[i]}
					<img src={qrDataUrls[i]} alt="QR Code" />
				{/if}
				<div class="instruction">Scan to vote</div>
				<div class="url">pintpoll.com/vote/{data.eventCode}/{code}</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.header {
		padding: 16px;
		background: #f5f5f5;
		margin-bottom: 16px;
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 16px;
		max-width: 1200px;
		margin: 0 auto;
	}

	.back-link {
		color: #4a3728;
		text-decoration: none;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	.print-btn {
		margin-left: auto;
		padding: 8px 16px;
		cursor: pointer;
		background: #4a3728;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 14px;
	}

	.print-btn:hover:not(:disabled) {
		background: #3a2a1e;
	}

	.print-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.loading {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 200px;
		color: #666;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0;
		max-width: 8.5in;
		margin: 0 auto;
	}

	.card {
		border: 2px dashed #ccc;
		padding: 12px;
		text-align: center;
		page-break-inside: avoid;
		height: 2.5in;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
	}

	.card img {
		width: 120px;
		height: 120px;
	}

	.instruction {
		font-size: 12px;
		color: #666;
		margin-top: 4px;
	}

	.url {
		font-size: 8px;
		color: #999;
		margin-top: 4px;
		word-break: break-all;
		max-width: 100%;
	}
</style>
