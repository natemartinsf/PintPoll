import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Beer, Feedback } from '$lib/types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const brewerToken = params.brewer_token;

	// Validate brewer_token and get beer_id
	const { data: tokenRecord, error: tokenError } = await locals.supabase
		.from('brewer_tokens')
		.select('beer_id')
		.eq('id', brewerToken)
		.single();

	if (tokenError || !tokenRecord || !tokenRecord.beer_id) {
		throw error(404, 'Invalid feedback link. Please check the URL and try again.');
	}

	// Get beer details
	const { data: beer, error: beerError } = await locals.supabase
		.from('beers')
		.select('*')
		.eq('id', tokenRecord.beer_id)
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
