-- Réglage événement : moyen de communication pour le partage (WhatsApp uniquement, SMS, email, ou tous).
alter table events
add column if not exists share_channel_preference text
check (share_channel_preference is null or share_channel_preference in ('whatsapp', 'sms', 'email', 'all'));

comment on column events.share_channel_preference is 'Canal unique pour partage documents/invitations (whatsapp, sms, email) ou all = priorité WhatsApp → SMS → email.';
