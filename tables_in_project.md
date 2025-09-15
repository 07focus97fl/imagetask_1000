CREATE TABLE public.it_categorizations (
  frame_id integer NOT NULL,
  user_id integer NOT NULL,
  category text NOT NULL,
  note text,
  id integer NOT NULL DEFAULT nextval('it_categorizations_id_seq'::regclass),
  flagged boolean DEFAULT false,
  CONSTRAINT it_categorizations_pkey PRIMARY KEY (id),
  CONSTRAINT it_categorizations_frame_id_fkey FOREIGN KEY (frame_id) REFERENCES public.it_frames(id),
  CONSTRAINT it_categorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.it_users(id)
);
create table public.it_frames (
  id serial not null,
  frame_name text not null,
  segment_id integer not null,
  frame_url text null,
  side integer null,
  constraint it_frames_pkey primary key (id),
  constraint it_frames_frame_name_key unique (frame_name),
  constraint it_frames_segment_id_fkey foreign KEY (segment_id) references it_segments (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists it_frames_segment_id_idx on public.it_frames using btree (segment_id) TABLESPACE pg_default;
CREATE TABLE public.it_groups (
  group_number text,
  id integer NOT NULL,
  CONSTRAINT it_groups_pkey PRIMARY KEY (id)
);
CREATE TABLE public.it_segments (
  order_presented integer,
  id integer NOT NULL,
  group_id integer NOT NULL,
  CONSTRAINT it_segments_pkey PRIMARY KEY (id),
  CONSTRAINT it_segments_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.it_groups(id)
);
CREATE TABLE public.it_users (
  display_name text NOT NULL,
  id integer NOT NULL DEFAULT nextval('it_users_id_seq'::regclass),
  CONSTRAINT it_users_pkey PRIMARY KEY (id)
);
