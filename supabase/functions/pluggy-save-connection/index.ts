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

  const response = await fetch(`${PLUGGY_API_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  });

  if (!response.ok) {
    throw new Error(`Failed to authenticate with Pluggy: ${response.status}`);
  }

  const data = await response.json();
  return data.apiKey;
}

async function syncAccounts(
  accessToken: string,
  connectionId: string,
  itemId: string,
  supabaseClient: any
) {
  console.log('Syncing accounts for item:', itemId);

  // Fetch accounts from Pluggy
  const accountsResponse = await fetch(`${PLUGGY_API_BASE_URL}/accounts?itemId=${itemId}`, {
    headers: { 'X-API-KEY': accessToken },
  });

  if (!accountsResponse.ok) {
    const errorText = await accountsResponse.text();
    console.error('Error fetching accounts:', accountsResponse.status, errorText);
    throw new Error(`Failed to fetch accounts: ${accountsResponse.status}`);
  }

  const accountsData = await accountsResponse.json();
  const accounts = accountsData.results || [];
  
  console.log(`Found ${accounts.length} accounts`);

  // Map Pluggy account types to our types
  const typeMap: Record<string, string> = {
    'BANK': 'checking',
    'CHECKING_ACCOUNT': 'checking',
    'SAVINGS_ACCOUNT': 'savings',
    'CREDIT_CARD': 'credit',
    'INVESTMENT': 'investment',
  };

  for (const account of accounts) {
    const accountType = typeMap[account.type] || 'other';
    const balance = account.balance || 0;

    const { error } = await supabaseClient
      .from('bank_accounts')
      .upsert({
        connection_id: connectionId,
        provider_account_id: account.id,
        name: account.name || account.marketingName || 'Conta',
        institution_name: account.bankData?.transferNumber ? null : null,
        type: accountType,
        currency: account.currencyCode || 'BRL',
        current_balance: balance,
        available_balance: account.availableBalance,
        last_refreshed_at: new Date().toISOString(),
      }, {
        onConflict: 'connection_id,provider_account_id',
      });

    if (error) {
      console.error('Error upserting account:', error);
    }
  }

  // Update connection last_sync_at
  await supabaseClient
    .from('bank_connections')
    .update({ 
      last_sync_at: new Date().toISOString(),
      status: 'active',
      error_message: null,
    })
    .eq('id', connectionId);

  console.log('Sync completed successfully');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // User client for auth verification
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { itemId } = await req.json();

    if (!itemId) {
      return new Response(JSON.stringify({ error: 'itemId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Saving connection for user:', user.id, 'itemId:', itemId);

    // Upsert bank_connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('bank_connections')
      .upsert({
        user_id: user.id,
        provider: 'pluggy',
        provider_item_id: itemId,
        status: 'active',
        last_sync_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider_item_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (connError) {
      // Try to find existing connection
      const { data: existingConn } = await supabaseAdmin
        .from('bank_connections')
        .select()
        .eq('user_id', user.id)
        .eq('provider_item_id', itemId)
        .single();

      if (!existingConn) {
        // Insert new
        const { data: newConn, error: insertError } = await supabaseAdmin
          .from('bank_connections')
          .insert({
            user_id: user.id,
            provider: 'pluggy',
            provider_item_id: itemId,
            status: 'active',
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating connection:', insertError);
          throw new Error('Failed to create connection');
        }

        // Sync accounts
        const accessToken = await getPluggyAccessToken();
        await syncAccounts(accessToken, newConn.id, itemId, supabaseAdmin);

        return new Response(JSON.stringify({ success: true, connectionId: newConn.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update existing and sync
      await supabaseAdmin
        .from('bank_connections')
        .update({ status: 'active', last_sync_at: new Date().toISOString() })
        .eq('id', existingConn.id);

      const accessToken = await getPluggyAccessToken();
      await syncAccounts(accessToken, existingConn.id, itemId, supabaseAdmin);

      return new Response(JSON.stringify({ success: true, connectionId: existingConn.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sync accounts after saving connection
    const accessToken = await getPluggyAccessToken();
    await syncAccounts(accessToken, connection.id, itemId, supabaseAdmin);

    return new Response(JSON.stringify({ success: true, connectionId: connection.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in pluggy-save-connection:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
