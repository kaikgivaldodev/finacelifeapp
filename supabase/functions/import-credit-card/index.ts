import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransactionInput {
  date: string;
  description: string;
  amount: number;
  externalId?: string;
  category?: string;
}

interface ImportRequest {
  creditCardId: string;
  transactions: TransactionInput[];
  fileName: string;
  fileHash: string;
  fileType: 'csv' | 'ofx';
  closingDay?: number;
}

function normalizeDescription(desc: string): string {
  return desc.toLowerCase().trim().replace(/\s+/g, ' ');
}

function generateFingerprint(date: string, amount: number, description: string, externalId?: string): string {
  const normalized = normalizeDescription(description);
  const base = `${date}|${Math.abs(amount).toFixed(2)}|${normalized}`;
  if (externalId) {
    return `${base}|${externalId}`;
  }
  return base;
}

function calculateReferenceMonth(transactionDate: string, closingDay?: number): string {
  const date = new Date(transactionDate);
  const day = date.getDate();
  let year = date.getFullYear();
  let month = date.getMonth();

  if (closingDay && day > closingDay) {
    // Goes to next month's statement
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  // Return first day of the reference month
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
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

    const { creditCardId, transactions, fileName, fileHash, fileType, closingDay } = await req.json() as ImportRequest;

    console.log(`Starting import for user ${user.id}, card ${creditCardId}, ${transactions.length} transactions`);

    // Verify the credit card belongs to the user
    const { data: card, error: cardError } = await supabase
      .from('credit_cards')
      .select('id, closing_day')
      .eq('id', creditCardId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (cardError || !card) {
      console.error('Card not found:', cardError);
      return new Response(JSON.stringify({ error: 'Card not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const effectiveClosingDay = closingDay ?? card.closing_day;

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from('imports')
      .insert({
        user_id: user.id,
        file_name: fileName,
        file_hash: fileHash,
        file_type: fileType,
        scope: 'credit_card',
        credit_card_id: creditCardId,
        status: 'processing',
        total_records: transactions.length,
      })
      .select()
      .single();

    if (importError) {
      console.error('Failed to create import record:', importError);
      return new Response(JSON.stringify({ error: 'Failed to create import record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let importedCount = 0;
    let duplicateCount = 0;
    const statementsToUpdate = new Set<string>();

    // Group transactions by reference month
    const transactionsByMonth: Record<string, TransactionInput[]> = {};
    
    for (const tx of transactions) {
      const refMonth = calculateReferenceMonth(tx.date, effectiveClosingDay);
      if (!transactionsByMonth[refMonth]) {
        transactionsByMonth[refMonth] = [];
      }
      transactionsByMonth[refMonth].push(tx);
    }

    // Process each month's transactions
    for (const [refMonth, monthTxs] of Object.entries(transactionsByMonth)) {
      // Get or create statement for this month
      const { data: existingStatement } = await supabase
        .from('credit_card_statements')
        .select('id')
        .eq('user_id', user.id)
        .eq('credit_card_id', creditCardId)
        .eq('reference_month', refMonth)
        .maybeSingle();

      let statementId: string;

      if (existingStatement) {
        statementId = existingStatement.id;
      } else {
        const { data: newStatement, error: stmtError } = await supabase
          .from('credit_card_statements')
          .insert({
            user_id: user.id,
            credit_card_id: creditCardId,
            reference_month: refMonth,
            status: 'open',
          })
          .select()
          .single();

        if (stmtError) {
          console.error('Failed to create statement:', stmtError);
          continue;
        }
        statementId = newStatement.id;
      }

      statementsToUpdate.add(statementId);

      // Insert transactions
      for (const tx of monthTxs) {
        const fingerprint = generateFingerprint(tx.date, tx.amount, tx.description, tx.externalId);
        const amount = Math.abs(tx.amount); // Always positive for credit card

        const { error: txError } = await supabase
          .from('credit_card_transactions')
          .insert({
            user_id: user.id,
            credit_card_id: creditCardId,
            statement_id: statementId,
            date: tx.date,
            amount,
            description: tx.description,
            category: tx.category || 'Sem categoria',
            external_id: tx.externalId || null,
            import_id: importRecord.id,
            fingerprint,
          });

        if (txError) {
          if (txError.code === '23505') { // Unique violation
            duplicateCount++;
            console.log(`Duplicate transaction: ${fingerprint}`);
          } else {
            console.error('Failed to insert transaction:', txError);
          }
        } else {
          importedCount++;
        }
      }
    }

    // Update statement totals
    for (const statementId of statementsToUpdate) {
      const { data: txSum } = await supabase
        .from('credit_card_transactions')
        .select('amount')
        .eq('statement_id', statementId);

      if (txSum) {
        const total = txSum.reduce((sum, tx) => sum + Number(tx.amount), 0);
        await supabase
          .from('credit_card_statements')
          .update({ total_amount: total })
          .eq('id', statementId);
      }
    }

    // Update import record
    await supabase
      .from('imports')
      .update({
        status: 'completed',
        imported_records: importedCount,
        duplicate_records: duplicateCount,
      })
      .eq('id', importRecord.id);

    console.log(`Import completed: ${importedCount} imported, ${duplicateCount} duplicates`);

    return new Response(JSON.stringify({
      success: true,
      importId: importRecord.id,
      importedCount,
      duplicateCount,
      totalRecords: transactions.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in import-credit-card:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
