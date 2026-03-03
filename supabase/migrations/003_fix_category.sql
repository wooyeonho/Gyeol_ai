ALTER TABLE user_memories DROP CONSTRAINT IF EXISTS user_memories_category_check;
ALTER TABLE user_memories ADD CONSTRAINT user_memories_category_check
  CHECK (category IN ('taste','emotion','event','anniversary','topic','speech'));
