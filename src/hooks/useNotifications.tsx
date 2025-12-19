import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface NotificationSettings {
  id: string;
  user_id: string;
  push_enabled: boolean;
  notify_3_days_before: boolean;
  notify_1_day_before: boolean;
  notify_on_due_date: boolean;
  push_subscription: any;
  created_at: string;
  updated_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(true);

  // Verificar permissão de notificação
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Carregar configurações do usuário
  useEffect(() => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        setSettings(data);
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  // Solicitar permissão de notificação
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Seu navegador não suporta notificações');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Notificações ativadas!');
        await subscribeToPush();
        return true;
      } else {
        toast.error('Permissão de notificação negada');
        return false;
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      toast.error('Erro ao ativar notificações');
      return false;
    }
  };

  // Registrar service worker e obter subscription
  const subscribeToPush = async () => {
    if (!user) return null;

    try {
      // Registrar service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Por enquanto, só registramos o SW
      // Em produção, você precisaria de um servidor VAPID para push real
      console.log('Service Worker registrado com sucesso');

      // Criar ou atualizar configurações
      const { data, error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          push_enabled: true,
          notify_3_days_before: true,
          notify_1_day_before: true,
          notify_on_due_date: true,
        })
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      return data;
    } catch (error) {
      console.error('Erro ao registrar push:', error);
      toast.error('Erro ao configurar notificações');
      return null;
    }
  };

  // Atualizar configurações
  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    if (!user || !settings) return;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      toast.success('Configurações atualizadas!');
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      toast.error('Erro ao atualizar configurações');
    }
  };

  // Desativar notificações
  const disableNotifications = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notification_settings')
        .update({ push_enabled: false })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings((prev) => prev ? { ...prev, push_enabled: false } : null);
      toast.success('Notificações desativadas');
    } catch (error) {
      console.error('Erro ao desativar notificações:', error);
      toast.error('Erro ao desativar notificações');
    }
  };

  return {
    settings,
    permission,
    loading,
    requestPermission,
    updateSettings,
    disableNotifications,
    isEnabled: permission === 'granted' && settings?.push_enabled,
  };
};
