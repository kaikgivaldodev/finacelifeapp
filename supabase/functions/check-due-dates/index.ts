import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface BillNotification {
  bill_id: string;
  bill_name: string;
  due_date: string;
  amount: number;
  user_id: string;
  days_until_due: number;
}

Deno.serve(async (req) => {
  try {
    console.log("Iniciando verificação de vencimentos...");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar todas as instâncias pendentes
    const { data: bills, error: billsError } = await supabase
      .from("bills_instances")
      .select(`
        id,
        due_date,
        amount,
        user_id,
        fixed_bill_id,
        fixed_bills (
          name
        )
      `)
      .eq("status", "pending");

    if (billsError) {
      console.error("Erro ao buscar contas:", billsError);
      throw billsError;
    }

    console.log(`Encontradas ${bills?.length || 0} contas pendentes`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notifications: BillNotification[] = [];

    // Calcular dias até vencimento para cada conta
    for (const bill of bills || []) {
      const dueDate = new Date(bill.due_date);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Verificar se deve notificar (3 dias, 1 dia ou hoje)
      if (diffDays === 3 || diffDays === 1 || diffDays === 0) {
        const fixedBill = bill.fixed_bills as any;
        notifications.push({
          bill_id: bill.id,
          bill_name: fixedBill?.name || "Conta",
          due_date: bill.due_date,
          amount: bill.amount,
          user_id: bill.user_id,
          days_until_due: diffDays,
        });
      }
    }

    console.log(`${notifications.length} notificações para enviar`);

    // Buscar configurações dos usuários e enviar notificações
    for (const notification of notifications) {
      const { data: settings, error: settingsError } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", notification.user_id)
        .eq("push_enabled", true)
        .single();

      if (settingsError || !settings) {
        console.log(`Usuário ${notification.user_id} não tem notificações ativas`);
        continue;
      }

      // Verificar se deve notificar baseado nas preferências
      const shouldNotify =
        (notification.days_until_due === 3 && settings.notify_3_days_before) ||
        (notification.days_until_due === 1 && settings.notify_1_day_before) ||
        (notification.days_until_due === 0 && settings.notify_on_due_date);

      if (!shouldNotify) {
        console.log(`Notificação ignorada para ${notification.bill_name} (preferências do usuário)`);
        continue;
      }

      // Enviar notificação (via web push ou outro método)
      console.log(`Enviando notificação para ${notification.bill_name}:`, {
        user_id: notification.user_id,
        days_until_due: notification.days_until_due,
        amount: notification.amount,
      });

      // Aqui você enviaria a notificação real
      // Por enquanto, apenas logamos
      const message = notification.days_until_due === 0
        ? `A conta "${notification.bill_name}" vence hoje!`
        : `A conta "${notification.bill_name}" vence em ${notification.days_until_due} dia${notification.days_until_due > 1 ? 's' : ''}`;

      console.log(`Mensagem: ${message} - Valor: R$ ${notification.amount}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: bills?.length || 0,
        notifications: notifications.length,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro na função:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
