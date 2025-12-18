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

async function syncConnectionAccounts(
  accessToken: string,
  connection: any,
  supabaseClient: any
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Syncing connection:', connection.id, 'itemId:', connection.provider_item_id);

    // Fetch accounts from Pluggy
    const accountsResponse = await fetch(
      `${PLUGGY_API_BASE_URL}/accounts?itemId=${connection.provider_item_id}`,
      { headers: { 'X-API-KEY': accessToken } }
    );

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      console.error('Error fetching accounts:', accountsResponse.status, errorText);
      
      // Update connection with error
      await supabaseClient
        .from('bank_connections')
        .update({ 
          status: 'error', 
          error_message: `Failed to fetch accounts: ${accountsResponse.status}` 
        })
        .eq('id', connection.id);
      
      return { success: false, error: `Failed to fetch accounts: ${accountsResponse.status}` };
    }

    const accountsData = await accountsResponse.json();
    const accounts = accountsData.results || [];
    
    console.log(`Found ${accounts.length} accounts for connection ${connection.id}`);

    // Map Pluggy account types
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
          connection_id: connection.id,
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

    // Update connection
    await supabaseClient
      .from('bank_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        status: 'active',
        error_message: null,
      })
      .eq('id', connection.id);

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error syncing connection:', connection.id, err);
    
    await supabaseClient
      .from('bank_connections')
      .update({ 
        status: 'error', 
        error_message: errorMessage 
      })
      .eq('id', connection.id);
    
    return { success: false, error: errorMessage };
  }
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let body = {};
    try {
      body = await req.json();
    } catch {
      // No body, sync all connections
    }

    const { connectionId } = body as { connectionId?: string };

    console.log('Sync request for user:', user.id, 'connectionId:', connectionId || 'all');

    // Get connections to sync
    let connectionsQuery = supabaseAdmin
      .from('bank_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (connectionId) {
      connectionsQuery = connectionsQuery.eq('id', connectionId);
    }

    const { data: connections, error: connError } = await connectionsQuery;

    if (connError) {
      console.error('Error fetching connections:', connError);
      throw new Error('Failed to fetch connections');
    }

    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active connections to sync',
        synced: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${connections.length} connections to sync`);

    // Get Pluggy access token
    const accessToken = await getPluggyAccessToken();

    // Sync each connection
    const results = [];
    for (const connection of connections) {
      const result = await syncConnectionAccounts(accessToken, connection, supabaseAdmin);
      results.push({ connectionId: connection.id, ...result });
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Sync completed: ${successCount} success, ${failCount} failed`);

    return new Response(JSON.stringify({ 
      success: true, 
      synced: successCount,
      failed: failCount,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in pluggy-sync:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
