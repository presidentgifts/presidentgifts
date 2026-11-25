// One-time helper for obtaining AmoCRM OAuth tokens from an authorization code.
// Disabled in production because it returns secrets in the response.
import {NextResponse} from 'next/server';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({error: 'Not found'}, {status: 404});
    }

    try {
        const response = await fetch(`https://${process.env.AMOCRM_SUBDOMAIN}.amocrm.ru/oauth2/access_token`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                client_id: process.env.AMOCRM_CLIENT_ID,
                client_secret: process.env.AMOCRM_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: process.env.AMOCRM_AUTHORIZATION_CODE,
                redirect_uri: process.env.AMOCRM_REDIRECT_URI,
            }),
        });

        if (!response.ok) {
            return NextResponse.json({error: 'Failed to get token', details: await response.text()}, {status: 400});
        }

        const data = await response.json();
        return NextResponse.json({
            success: true,
            tokens: {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                token_type: data.token_type,
                expires_in: data.expires_in,
            },
        });
    } catch (error) {
        return NextResponse.json({error: 'Server error', details: error.message}, {status: 500});
    }
}
