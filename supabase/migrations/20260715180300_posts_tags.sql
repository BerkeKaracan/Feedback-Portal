-- Persist AI / manual tags on feature requests

ALTER TABLE posts
  ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX posts_tags_gin_idx ON posts USING GIN (tags);
