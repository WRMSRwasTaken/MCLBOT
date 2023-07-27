CREATE TABLE blacklist (
  guild_id bigint NOT NULL,
  channel_id bigint NOT NULL,
  user_id bigint NOT NULL,
  created_at timestamp NOT NULL,
  PRIMARY KEY (guild_id, channel_id, user_id)
);

CREATE TABLE guild_settings (
  guild_id bigint NOT NULL ,
  key varchar(255) NOT NULL,
  value varchar(255) NOT NULL,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  PRIMARY KEY (guild_id, key)
);

CREATE TABLE muted_members (
  guild_id bigint NOT NULL,
  target_id bigint NOT NULL,
  target_tag varchar(255) NOT NULL,
  invoker_id bigint NOT NULL,
  created_at timestamp NOT NULL,
  PRIMARY KEY (guild_id, target_id)
);

CREATE TABLE reminders (
  user_id bigint NOT NULL,
  fake_id bigint NOT NULL,
  notify_date timestamp NOT NULL,
  text varchar(4000),
  message_id bigint NOT NULL,
  channel_id bigint NOT NULL,
  guild_id bigint,
  queue_id bigint,
  created_at timestamp NOT NULL,
  PRIMARY KEY (user_id, fake_id)
);
