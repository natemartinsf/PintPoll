import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolveShortCode } from '$lib/short-codes';

export const load: PageServerLoad = async ({ parent, locals, params, url }) => {
	const parentData = await parent();

	if (!parentData.isAdmin) {
		throw redirect(303, '/admin');
	}

	const eventId = await resolveShortCode(locals.supabase, params.code, 'event');
	if (!eventId) {
		throw error(404, 'Event not found');
	}

	// Get event details
	const { data: event, error: eventError } = await locals.supabase
		.from('events')
		.select('id, name, logo_url, organization_id')
		.eq('id', eventId)
		.single();

	if (eventError || !event) {
		throw error(404, 'Event not found');
	}

	// Verify admin's org matches the event's org (or is super admin)
	if (event.organization_id !== parentData.admin.organization_id && !parentData.isSuper) {
		throw error(403, 'You do not have access to this event');
	}

	// Get voter codes from URL query params
	const codesParam = url.searchParams.get('codes');
	const voterCodes = codesParam ? codesParam.split(',').filter((c) => c.length > 0) : [];

	if (voterCodes.length === 0) {
		throw error(400, 'No voter codes specified');
	}

	return {
		event: {
			name: event.name,
			logoUrl: event.logo_url
		},
		eventCode: params.code,
		voterCodes
	};
};
