import { fail, redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Event, Beer, Admin } from '$lib/types';

export const load: PageServerLoad = async ({ parent, locals, params }) => {
	const parentData = await parent();

	if (!parentData.isAdmin) {
		throw redirect(303, '/admin');
	}

	const eventId = params.id;
	const currentAdminId = parentData.admin.id;

	// Verify admin is assigned to this event
	const { data: assignment, error: assignmentError } = await locals.supabase
		.from('event_admins')
		.select('event_id')
		.eq('event_id', eventId)
		.eq('admin_id', currentAdminId)
		.single();

	if (assignmentError || !assignment) {
		throw error(403, 'You are not assigned to this event');
	}

	// Get event details
	const { data: event, error: eventError } = await locals.supabase
		.from('events')
		.select('*')
		.eq('id', eventId)
		.single();

	if (eventError || !event) {
		throw error(404, 'Event not found');
	}

	// Get beers for this event
	const { data: beers, error: beersError } = await locals.supabase
		.from('beers')
		.select('*')
		.eq('event_id', eventId)
		.order('created_at', { ascending: true });

	if (beersError) {
		console.error('Error fetching beers:', beersError);
	}

	// Get admins assigned to this event (with their info)
	const { data: eventAdmins, error: eventAdminsError } = await locals.supabase
		.from('event_admins')
		.select('admin_id, admins(id, email)')
		.eq('event_id', eventId);

	if (eventAdminsError) {
		console.error('Error fetching event admins:', eventAdminsError);
	}

	// Get all admins (for the add admin dropdown)
	const { data: allAdmins, error: allAdminsError } = await locals.supabase
		.from('admins')
		.select('id, email')
		.order('email', { ascending: true });

	if (allAdminsError) {
		console.error('Error fetching all admins:', allAdminsError);
	}

	// Extract assigned admin info
	const assignedAdmins = (eventAdmins || [])
		.map((ea) => ea.admins as { id: string; email: string })
		.filter(Boolean);

	return {
		event: event as Event,
		beers: (beers || []) as Beer[],
		assignedAdmins,
		allAdmins: (allAdmins || []) as Pick<Admin, 'id' | 'email'>[],
		currentAdminId
	};
};

export const actions: Actions = {
	toggleResults: async ({ request, locals, params }) => {
		const { user } = await locals.safeGetSession();
		if (!user) {
			return fail(403, { error: 'Not authorized' });
		}

		const eventId = params.id;

		// Verify user is admin and assigned to this event
		const { data: currentAdmin } = await locals.supabase
			.from('admins')
			.select('id')
			.eq('user_id', user.id)
			.single();

		if (!currentAdmin) {
			return fail(403, { error: 'Not authorized' });
		}

		const { data: assignment } = await locals.supabase
			.from('event_admins')
			.select('event_id')
			.eq('event_id', eventId)
			.eq('admin_id', currentAdmin.id)
			.single();

		if (!assignment) {
			return fail(403, { error: 'You are not assigned to this event' });
		}

		const formData = await request.formData();
		const resultsVisible = formData.get('results_visible') === 'true';

		const { error } = await locals.supabase
			.from('events')
			.update({ results_visible: resultsVisible })
			.eq('id', eventId);

		if (error) {
			console.error('Error updating results visibility:', error);
			return fail(500, { error: 'Failed to update results visibility' });
		}

		return { success: true };
	},

	deleteBeer: async ({ request, locals, params }) => {
		const { user } = await locals.safeGetSession();
		if (!user) {
			return fail(403, { error: 'Not authorized' });
		}

		const eventId = params.id;

		// Verify user is admin and assigned to this event
		const { data: currentAdmin } = await locals.supabase
			.from('admins')
			.select('id')
			.eq('user_id', user.id)
			.single();

		if (!currentAdmin) {
			return fail(403, { error: 'Not authorized' });
		}

		const { data: assignment } = await locals.supabase
			.from('event_admins')
			.select('event_id')
			.eq('event_id', eventId)
			.eq('admin_id', currentAdmin.id)
			.single();

		if (!assignment) {
			return fail(403, { error: 'You are not assigned to this event' });
		}

		const formData = await request.formData();
		const beerId = formData.get('beerId')?.toString();

		if (!beerId) {
			return fail(400, { error: 'Beer ID is required' });
		}

		// Verify beer belongs to this event
		const { data: beer } = await locals.supabase
			.from('beers')
			.select('id')
			.eq('id', beerId)
			.eq('event_id', eventId)
			.single();

		if (!beer) {
			return fail(404, { error: 'Beer not found' });
		}

		const { error } = await locals.supabase.from('beers').delete().eq('id', beerId);

		if (error) {
			console.error('Error deleting beer:', error);
			return fail(500, { error: 'Failed to delete beer' });
		}

		return { beerDeleted: true };
	},

	addEventAdmin: async ({ request, locals, params }) => {
		const { user } = await locals.safeGetSession();
		if (!user) {
			return fail(403, { error: 'Not authorized' });
		}

		const eventId = params.id;

		// Verify user is admin and assigned to this event
		const { data: currentAdmin } = await locals.supabase
			.from('admins')
			.select('id')
			.eq('user_id', user.id)
			.single();

		if (!currentAdmin) {
			return fail(403, { error: 'Not authorized' });
		}

		const { data: assignment } = await locals.supabase
			.from('event_admins')
			.select('event_id')
			.eq('event_id', eventId)
			.eq('admin_id', currentAdmin.id)
			.single();

		if (!assignment) {
			return fail(403, { error: 'You are not assigned to this event' });
		}

		const formData = await request.formData();
		const adminId = formData.get('adminId')?.toString();

		if (!adminId) {
			return fail(400, { error: 'Admin ID is required' });
		}

		// Check if already assigned
		const { data: existing } = await locals.supabase
			.from('event_admins')
			.select('event_id')
			.eq('event_id', eventId)
			.eq('admin_id', adminId)
			.single();

		if (existing) {
			return fail(400, { error: 'Admin is already assigned to this event' });
		}

		const { error } = await locals.supabase.from('event_admins').insert({
			event_id: eventId,
			admin_id: adminId
		});

		if (error) {
			console.error('Error adding event admin:', error);
			return fail(500, { error: 'Failed to add admin to event' });
		}

		return { adminAdded: true };
	},

	removeEventAdmin: async ({ request, locals, params }) => {
		const { user } = await locals.safeGetSession();
		if (!user) {
			return fail(403, { error: 'Not authorized' });
		}

		const eventId = params.id;

		// Verify user is admin and assigned to this event
		const { data: currentAdmin } = await locals.supabase
			.from('admins')
			.select('id')
			.eq('user_id', user.id)
			.single();

		if (!currentAdmin) {
			return fail(403, { error: 'Not authorized' });
		}

		const { data: assignment } = await locals.supabase
			.from('event_admins')
			.select('event_id')
			.eq('event_id', eventId)
			.eq('admin_id', currentAdmin.id)
			.single();

		if (!assignment) {
			return fail(403, { error: 'You are not assigned to this event' });
		}

		const formData = await request.formData();
		const adminId = formData.get('adminId')?.toString();

		if (!adminId) {
			return fail(400, { error: 'Admin ID is required' });
		}

		// Check if trying to remove self
		if (adminId === currentAdmin.id) {
			// Count how many admins are assigned
			const { count } = await locals.supabase
				.from('event_admins')
				.select('*', { count: 'exact', head: true })
				.eq('event_id', eventId);

			if (count === 1) {
				return fail(400, { error: 'Cannot remove yourself as the only admin' });
			}
		}

		const { error } = await locals.supabase
			.from('event_admins')
			.delete()
			.eq('event_id', eventId)
			.eq('admin_id', adminId);

		if (error) {
			console.error('Error removing event admin:', error);
			return fail(500, { error: 'Failed to remove admin from event' });
		}

		// If admin removed themselves, redirect to admin home
		if (adminId === currentAdmin.id) {
			throw redirect(303, '/admin');
		}

		return { adminRemoved: true };
	}
};
