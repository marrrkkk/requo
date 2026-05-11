/* global self */
/**
 * Requo Push Notification Service Worker
 *
 * Handles incoming push events and notification click navigation.
 */

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload;

  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Requo", body: event.data.text() };
  }

  const title = payload.title || "Requo";
  const targetUrl = getSameOriginUrl(payload.url || "/");
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/logo.svg",
    badge: payload.badge || "/logo.svg",
    data: {
      url: targetUrl,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }

        // Open a new window if none is available
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});

function getSameOriginUrl(url) {
  try {
    const parsedUrl = new URL(url, self.location.origin);

    if (parsedUrl.origin !== self.location.origin) {
      return self.location.origin;
    }

    return parsedUrl.toString();
  } catch {
    return self.location.origin;
  }
}
