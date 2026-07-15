-- Local demo users + sample roadmap data
-- Admin:  admin@feedback.local / password123
-- Member: member@feedback.local / password123

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  admin_id UUID := '11111111-1111-1111-1111-111111111111';
  member_id UUID := '22222222-2222-2222-2222-222222222222';
  post1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  post2 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
  post3 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3';
  post4 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4';
  post5 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5';
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES
    (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      'admin@feedback.local',
      crypt('password123', gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Admin"}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      member_id,
      'authenticated',
      'authenticated',
      'member@feedback.local',
      crypt('password123', gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Alex Member"}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      ''
    );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES
    (
      admin_id,
      admin_id,
      format('{"sub":"%s","email":"admin@feedback.local"}', admin_id)::jsonb,
      'email',
      admin_id::text,
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      member_id,
      member_id,
      format('{"sub":"%s","email":"member@feedback.local"}', member_id)::jsonb,
      'email',
      member_id::text,
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    );

  UPDATE profiles
  SET is_admin = true, display_name = 'Admin'
  WHERE id = admin_id;

  UPDATE profiles
  SET display_name = 'Alex Member'
  WHERE id = member_id;

  INSERT INTO posts (id, title, description, status, author_id, created_at, tags) VALUES
    (
      post1,
      'Dark mode for the entire dashboard',
      'Add a system-aware dark theme so teams can work comfortably in low-light environments.',
      'planned',
      member_id,
      timezone('utc', now()) - INTERVAL '20 days',
      ARRAY['ui']
    ),
    (
      post2,
      'AI duplicate detection before submit',
      'When a user types a new idea, suggest similar existing requests to reduce duplicates.',
      'in-progress',
      admin_id,
      timezone('utc', now()) - INTERVAL '14 days',
      ARRAY['ai']
    ),
    (
      post3,
      'Slack notifications for status changes',
      'Notify voters in Slack when an idea they upvoted moves to Planned, In Progress, or Done.',
      'idea',
      member_id,
      timezone('utc', now()) - INTERVAL '10 days',
      ARRAY['integrations', 'notifications']
    ),
    (
      post4,
      'Public roadmap embed widget',
      'Allow products to embed a read-only roadmap on their marketing site via a simple script tag.',
      'idea',
      member_id,
      timezone('utc', now()) - INTERVAL '6 days',
      ARRAY['integrations']
    ),
    (
      post5,
      'CSV export for feature requests',
      'Admins should be able to export all posts with vote counts and status for quarterly planning.',
      'done',
      admin_id,
      timezone('utc', now()) - INTERVAL '30 days',
      ARRAY['admin', 'integrations']
    );

  INSERT INTO votes (post_id, user_id) VALUES
    (post1, admin_id),
    (post1, member_id),
    (post2, member_id),
    (post3, admin_id),
    (post3, member_id),
    (post4, admin_id),
    (post5, member_id);

  INSERT INTO comments (post_id, user_id, content, created_at) VALUES
    (
      post2,
      member_id,
      'This would save us so much triage time. Happy to beta test.',
      timezone('utc', now()) - INTERVAL '3 days'
    ),
    (
      post2,
      admin_id,
      'Agreed — we are wiring the heuristic stub first, then a Python service.',
      timezone('utc', now()) - INTERVAL '2 days'
    ),
    (
      post3,
      admin_id,
      'We will prioritize Slack once the public board comment thread ships.',
      timezone('utc', now()) - INTERVAL '1 day'
    );
END $$;
