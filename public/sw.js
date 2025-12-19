// Service Worker para notificações push
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker ativado');
  event.waitUntil(clients.claim());
});

// Receber notificações push
self.addEventListener('push', (event) => {
  console.log('Push recebido:', event);
  
  const data = event.data?.json() || {};
  const title = data.title || 'Lembrete de Conta';
  const options = {
    body: data.body || 'Você tem uma conta próxima do vencimento',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'bill-reminder',
    data: data.url ? { url: data.url } : undefined,
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Lidar com cliques na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('Notificação clicada:', event);
  event.notification.close();

  if (event.notification.data?.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
