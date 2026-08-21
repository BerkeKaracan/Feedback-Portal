-- Local demo users + sample roadmap data
-- Admin:  admin@feedback.local / password123
-- Member: member@feedback.local / password123
-- Demo tenant board: /?tenant=demo  (fake product "Northwind Labs" — local test only)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  admin_id UUID := '11111111-1111-1111-1111-111111111111';
  member_id UUID := '22222222-2222-2222-2222-222222222222';
  demo_project_id UUID := '33333333-3333-3333-3333-333333333333';
  post1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  post2 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
  post3 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3';
  post4 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4';
  post5 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5';
  demo1 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  demo2 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2';
  demo3 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3';
  demo4 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4';
  demo5 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5';
  demo6 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6';
  demo7 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb7';
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

  -- Fake white-label product for local UI / tenant testing only.
  INSERT INTO projects (
    id,
    slug,
    name,
    logo_url,
    theme_config,
    custom_features,
    origin_url,
    origin_host
  ) VALUES (
    demo_project_id,
    'demo',
    'Northwind Labs',
    NULL,
    jsonb_build_object(
      'primary', '#0f766e',
      'primaryForeground', '#f0fdfa',
      'accent', '#115e59',
      'accentForeground', '#ccfbf1',
      'muted', '#f0fdfa',
      'ring', '#2dd4bf'
    ),
    jsonb_build_object(
      'comments', true,
      'duplicateDetection', true,
      'submitIdeas', true,
      'integrations', '{}'::jsonb
    ),
    'https://demo.feedback.local',
    'demo.feedback.local'
  );

  INSERT INTO project_members (project_id, user_id, role) VALUES
    (demo_project_id, admin_id, 'admin'),
    (demo_project_id, member_id, 'member');

  -- Universal (platform) sample board — project_id NULL
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

  -- Demo tenant mock board — looks like a real connected product
  INSERT INTO posts (id, project_id, title, description, status, author_id, created_at, tags) VALUES
    (
      demo1,
      demo_project_id,
      'Offline mode for field technicians',
      'Our techs lose connectivity on site visits. Queue sync jobs locally and push when they reconnect.',
      'in-progress',
      member_id,
      timezone('utc', now()) - INTERVAL '18 days',
      ARRAY['mobile', 'sync']
    ),
    (
      demo2,
      demo_project_id,
      'Bulk import customers from CSV',
      'Ops still copy-pastes accounts one by one. Need a guided CSV importer with validation errors.',
      'planned',
      admin_id,
      timezone('utc', now()) - INTERVAL '12 days',
      ARRAY['admin', 'import']
    ),
    (
      demo3,
      demo_project_id,
      'Calendar view for scheduled jobs',
      'List view is fine for triage, but dispatchers want a week calendar with drag-and-drop reassignment.',
      'idea',
      member_id,
      timezone('utc', now()) - INTERVAL '9 days',
      ARRAY['ui', 'scheduling']
    ),
    (
      demo4,
      demo_project_id,
      'SMS alerts when a job is reassigned',
      'Customers get confused when the tech changes. Send a short SMS with the new ETA window.',
      'idea',
      member_id,
      timezone('utc', now()) - INTERVAL '5 days',
      ARRAY['notifications', 'sms']
    ),
    (
      demo5,
      demo_project_id,
      'Dark map tiles for night driving',
      'The default bright map blinds drivers after sunset. Offer a night style in the mobile map.',
      'done',
      admin_id,
      timezone('utc', now()) - INTERVAL '40 days',
      ARRAY['mobile', 'maps']
    ),
    (
      demo6,
      demo_project_id,
      'Role-based permission templates',
      'We keep recreating the same roles (Dispatcher, Tech Lead, Viewer). Save them as reusable templates.',
      'idea',
      member_id,
      timezone('utc', now()) - INTERVAL '3 days',
      ARRAY['admin', 'permissions']
    ),
    (
      demo7,
      demo_project_id,
      'Export invoice PDF from job detail',
      'Accounting asks for a one-click PDF with line items, tax, and customer address after job close.',
      'planned',
      admin_id,
      timezone('utc', now()) - INTERVAL '7 days',
      ARRAY['billing', 'export']
    );

  -- Rate-limit triggers require auth.uid(); disable for seed inserts only.
  ALTER TABLE votes DISABLE TRIGGER votes_rate_limit;
  ALTER TABLE comments DISABLE TRIGGER comments_rate_limit;

  INSERT INTO votes (post_id, user_id) VALUES
    (post1, admin_id),
    (post1, member_id),
    (post2, member_id),
    (post3, admin_id),
    (post3, member_id),
    (post4, admin_id),
    (post5, member_id),
    (demo1, admin_id),
    (demo1, member_id),
    (demo2, member_id),
    (demo3, admin_id),
    (demo3, member_id),
    (demo4, admin_id),
    (demo5, member_id),
    (demo6, admin_id),
    (demo6, member_id),
    (demo7, member_id);

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
    ),
    (
      demo1,
      admin_id,
      'Spike is underway — IndexedDB queue + background sync on Android first.',
      timezone('utc', now()) - INTERVAL '4 days'
    ),
    (
      demo1,
      member_id,
      'Please keep conflict resolution simple: last-write-wins is fine for v1.',
      timezone('utc', now()) - INTERVAL '2 days'
    ),
    (
      demo3,
      member_id,
      'Could we color-code by job priority on the calendar?',
      timezone('utc', now()) - INTERVAL '1 day'
    ),
    (
      demo4,
      admin_id,
      'Need to confirm SMS cost center with finance before we schedule this.',
      timezone('utc', now()) - INTERVAL '12 hours'
    );

  ALTER TABLE votes ENABLE TRIGGER votes_rate_limit;
  ALTER TABLE comments ENABLE TRIGGER comments_rate_limit;
END $$;
