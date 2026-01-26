import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const token_hash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type');
	const next = url.searchParams.get('next');

	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (error) {
			console.error('Code exchange failed:', error.message);
		}
	} else if (token_hash && type) {
		// Fallback for email flows where PKCE code verifier isn't available
		// (e.g., invite links opened in a browser that didn't initiate the flow)
		const { error } = await locals.supabase.auth.verifyOtp({
			token_hash,
			type: type as 'invite' | 'recovery' | 'email'
		});
		if (error) {
			console.error('Token verification failed:', error.message);
		}
	}

	if (next === 'set-password') {
		throw redirect(303, '/auth/set-password');
	}

	throw redirect(303, '/admin');
};
