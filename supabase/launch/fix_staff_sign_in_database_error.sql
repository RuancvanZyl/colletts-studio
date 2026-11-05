-- Fixes "Database error querying schema" when staff sign in (and the "{}" message in the app).
-- Staff accounts that were created directly in the database have empty (NULL) values in a few columns
-- the sign-in service cannot read. This turns each empty value into a blank text. Safe to run more than once.

update auth.users set
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change               = coalesce(email_change, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '')
where confirmation_token is null or recovery_token is null or email_change_token_new is null or email_change is null
   or email_change_token_current is null or phone_change is null or phone_change_token is null or reauthentication_token is null;

-- Check: every staff account, and whether it has a sign-in identity (should be 1 for everyone)
select u.email, (select count(*) from auth.identities i where i.user_id = u.id) as identities
from auth.users u order by u.email;
