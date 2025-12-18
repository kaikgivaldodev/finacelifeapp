import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLUGGY_API_BASE_URL = Deno.env.get('PLUGGY_API_BASE_URL') || 'https://api.pluggy.ai';

async function getPluggyAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
  const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Pluggy credentials not configured');
  }

  console.log('Getting Pluggy access token...');
  
  const response = await fetch(`${PLUGGY_API_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Pluggy auth error:', response.status, errorText);
    throw new Error(`Failed to authenticate with Pluggy: ${response.status}`);
  }

  const data = await response.json();
  console.log('Pluggy access token obtained successfully');
  return data.apiKey;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Creating connect token for user:', user.id);

    // Get Pluggy access token
    const accessToken = await getPluggyAccessToken();

    // Create connect token
    const response = await fetch(`${PLUGGY_API_BASE_URL}/connect_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': accessToken,
      },
      body: JSON.stringify({
        clientUserId: user.id,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pluggy connect token error:', response.status, errorText);
      throw new Error(`Failed to create connect token: ${response.status}`);
    }

    const data = await response.json();
    console.log('Connect token created successfully');

    return new Response(JSON.stringify({ connectToken: data.accessToken }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in pluggy-create-connect-token:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
