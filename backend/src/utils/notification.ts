import { Notification } from '../modules/notification/notification.model';
import mongoose from 'mongoose';

export interface ICreateNotificationInput {
  tenantId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  type: 'attendance' | 'screenshot' | 'system' | 'subscription' | 'alert';
  title: string;
  message: string;
  link?: string;
}

export const createNotification = async (
  app: any,
  data: ICreateNotificationInput
) => {
  const notif = await Notification.create({
    tenantId: data.tenantId,
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link || '',
  });

  const io = app?.get('io');
  if (io) {
    io.to(data.userId.toString()).emit('notification', notif);
  }
  return notif;
};
