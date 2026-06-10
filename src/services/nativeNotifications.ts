import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  type ActionPerformed,
  type DeliveredNotifications,
  type PermissionStatus,
} from '@capacitor/local-notifications';

export type NotificationPermissionState = PermissionStatus['display'] | 'unsupported';

export type ChatNotificationExtra = {
  kind: 'chat-message';
  roomId: string;
  eventId?: string;
  senderId?: string;
};

export type ChatNotificationPayload = {
  roomId: string;
  title: string;
  body: string;
  eventId?: string;
  senderId?: string;
  summaryArgument?: string;
  silent?: boolean;
};

export const chatNotificationOpenActionId = 'open';

const chatNotificationActionTypeId = 'chat-message-actions';

const normalizeNotificationPermission = (
  value: PermissionStatus['display'] | string | undefined
): NotificationPermissionState => {
  if (value === 'granted' || value === 'denied' || value === 'prompt') {
    return value;
  }
  return 'unsupported';
};

export const isLocalNotificationSupported = (): boolean =>
  Capacitor.isNativePlatform() || typeof Notification !== 'undefined';

export const checkLocalNotificationPermission = async (): Promise<NotificationPermissionState> => {
  if (!isLocalNotificationSupported()) return 'unsupported';

  try {
    return normalizeNotificationPermission((await LocalNotifications.checkPermissions()).display);
  } catch {
    return 'unsupported';
  }
};

export const requestLocalNotificationPermission = async (): Promise<NotificationPermissionState> => {
  if (!isLocalNotificationSupported()) return 'unsupported';

  try {
    return normalizeNotificationPermission((await LocalNotifications.requestPermissions()).display);
  } catch {
    return 'unsupported';
  }
};

export const registerChatNotificationActions = async (): Promise<void> => {
  if (!isLocalNotificationSupported()) return;

  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: chatNotificationActionTypeId,
          actions: [
            {
              id: chatNotificationOpenActionId,
              title: '查看',
              foreground: true,
            },
          ],
          iosCustomDismissAction: true,
          iosHiddenPreviewsBodyPlaceholder: '你收到一条新消息',
          iosHiddenPreviewsShowTitle: true,
          iosHiddenPreviewsShowSubtitle: false,
        },
      ],
    });
  } catch {
    // Ignore action registration failures on unsupported platforms.
  }
};

export const buildChatNotificationId = (roomId: string): number => {
  let hash = 0;
  for (let index = 0; index < roomId.length; index += 1) {
    hash = (hash * 31 + roomId.charCodeAt(index)) | 0;
  }
  return Math.max(1, Math.abs(hash) % 2_147_000_000);
};

const filterDeliveredNotificationsByIds = (
  delivered: DeliveredNotifications,
  ids: Set<number>
): DeliveredNotifications => ({
  notifications: delivered.notifications.filter((notification) => ids.has(notification.id)),
});

export const clearChatNotifications = async (roomIds?: string[]): Promise<void> => {
  if (!isLocalNotificationSupported()) return;

  if (!roomIds || roomIds.length === 0) {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((notification) => ({ id: notification.id })),
        });
      }
    } catch {
      // Ignore pending notification cleanup failures.
    }

    await LocalNotifications.removeAllDeliveredNotifications().catch(() => undefined);
    return;
  }

  const ids = new Set(roomIds.map((roomId) => buildChatNotificationId(roomId)));

  try {
    await LocalNotifications.cancel({
      notifications: Array.from(ids, (id) => ({ id })),
    });
  } catch {
    // Ignore missing or already-cleared pending notifications.
  }

  try {
    const delivered = await LocalNotifications.getDeliveredNotifications();
    const matchingDelivered = filterDeliveredNotificationsByIds(delivered, ids);
    if (matchingDelivered.notifications.length > 0) {
      await LocalNotifications.removeDeliveredNotifications(matchingDelivered);
    }
  } catch {
    // Ignore delivered notification cleanup failures.
  }
};

export const scheduleChatNotification = async ({
  roomId,
  title,
  body,
  eventId,
  senderId,
  summaryArgument,
  silent,
}: ChatNotificationPayload): Promise<void> => {
  if (!isLocalNotificationSupported()) return;

  await clearChatNotifications([roomId]);

  await LocalNotifications.schedule({
    notifications: [
      {
        id: buildChatNotificationId(roomId),
        title,
        body,
        actionTypeId: chatNotificationActionTypeId,
        threadIdentifier: roomId,
        summaryArgument,
        silent,
        extra: {
          kind: 'chat-message',
          roomId,
          eventId,
          senderId,
        } satisfies ChatNotificationExtra,
      },
    ],
  });
};

export const extractChatNotificationExtra = (action: ActionPerformed): ChatNotificationExtra | undefined => {
  const extra = action.notification.extra;
  if (!extra || typeof extra !== 'object') return undefined;

  const roomId = typeof extra.roomId === 'string' ? extra.roomId : undefined;
  if (!roomId) return undefined;

  return {
    kind: 'chat-message',
    roomId,
    eventId: typeof extra.eventId === 'string' ? extra.eventId : undefined,
    senderId: typeof extra.senderId === 'string' ? extra.senderId : undefined,
  };
};

export const isChatNotificationOpenAction = (action: ActionPerformed): boolean =>
  action.actionId === 'tap' || action.actionId === chatNotificationOpenActionId;
