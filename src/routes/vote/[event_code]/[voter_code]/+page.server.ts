import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Event, Beer, Voter, Vote, Feedback } from '$lib/types';
import { resolveShortCode } from '$lib/short-codes';

export const load: PageServerLoad = async ({ locals, params }) => {
	const eventId = await resolveShortCode(locals.supabase, params.event_code, 'event');
	if (!eventId) {
		throw error(404, 'Event not found');
	}

	const voterUuid = await resolveShortCode(locals.supabase, params.voter_code, 'voter');
	if (!voterUuid) {
		throw error(404, 'Invalid voter link');
	}

	// Validate event exists
	const { data: event, error: eventError } = await locals.supabase
		.from('events')
		.select('*')
		.eq('id', eventId)
		.single();

	if (eventError || !event) {
		throw error(404, 'Event not found');
	}

	// If ceremony has started (reveal_stage > 0), redirect to results page
	if ((event.reveal_stage ?? 0) > 0) {
		throw redirect(303, `/results/${params.event_code}`);
	}

	// Get or create voter record
	// Using select-then-insert instead of upsert to avoid needing UPDATE permission
	let voter: Voter | null = null;

	const { data: existingVoter } = await locals.supabase
		.from('voters')
		.select('*')
		.eq('id', voterUuid)
		.eq('event_id', eventId)
		.single();

	if (existingVoter) {
		voter = existingVoter as Voter;
	} else {
		const { data: newVoter, error: insertError } = await locals.supabase
			.from('voters')
			.insert({ id: voterUuid, event_id: eventId })
			.select()
			.single();

		if (insertError) {
			// Could be a race condition - try select again
			const { data: raceVoter } = await locals.supabase
				.from('voters')
				.select('*')
				.eq('id', voterUuid)
				.single();

			if (raceVoter) {
				voter = raceVoter as Voter;
			} else {
				console.error('Error creating voter:', insertError);
				throw error(500, 'Failed to register voter');
			}
		} else {
			voter = newVoter as Voter;
		}
	}

	// Get beers for this event (newest first)
	const { data: beers, error: beersError } = await locals.supabase
		.from('beers')
		.select('*')
		.eq('event_id', eventId)
		.order('created_at', { ascending: false });

	if (beersError) {
		console.error('Error fetching beers:', beersError);
	}

	// Get existing votes for this voter
	const { data: votes, error: votesError } = await locals.supabase
		.from('votes')
		.select('*')
		.eq('voter_id', voter!.id);

	if (votesError) {
		console.error('Error fetching votes:', votesError);
	}

	// Get existing feedback for this voter
	const { data: feedback, error: feedbackError } = await locals.supabase
		.from('feedback')
		.select('*')
		.eq('voter_id', voter!.id);

	if (feedbackError) {
		console.error('Error fetching feedback:', feedbackError);
	}

	return {
		event: event as Event,
		voter: voter as Voter,
		beers: (beers || []) as Beer[],
		votes: (votes || []) as Vote[],
		feedback: (feedback || []) as Feedback[],
		eventCode: params.event_code
	};
};
