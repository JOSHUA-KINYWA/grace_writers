-- Enable realtime on notifications so admin toasts can fire without polling only.
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
