import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Beer, Feedback } from '$lib/types';
import { resolveShortCode } from '$lib/short-codes';

export const load: PageServerLoad = async ({ locals, params }) => {
	const beerId = await resolveShortCode(locals.supabase, params.code, 'brewer');

	if (!beerId) {
		throw error(404, 'Invalid feedback link. Please check the URL and try again.');
	}

	// Get beer details
	const { data: beer, error: beerError } = await locals.supabase
		.from('beers')
		.select('*')
		.eq('id', beerId)
		.single();

	if (beerError || !beer) {
		throw error(404, 'Beer not found.');
	}

	// Get feedback where share_with_brewer is true
	const { data: feedback, error: feedbackError } = await locals.supabase
		.from('feedback')
		.select('id, notes, created_at')
		.eq('beer_id', beer.id)
		.eq('share_with_brewer', true)
		.order('created_at', { ascending: false });

	if (feedbackError) {
		console.error('Error fetching feedback:', feedbackError);
	}

	return {
		beer: beer as Beer,
		feedback: (feedback || []) as Pick<Feedback, 'id' | 'notes' | 'created_at'>[]
	};
};
