# Where do signups come from?

GlowUpp has no analytics service. Instead it remembers, for 30 days, where a visitor *first* came from and writes that next to the new account when they sign up.

## How it works
1. `src/proxy.ts` looks at every page request. If the visitor has no `glowupp_attr` cookie yet and the request carries `utm_source` / `utm_medium` / `utm_campaign` tags, or comes from another website (the `Referer` header), it sets the cookie. The first visit wins; later visits never overwrite it. Direct visits and clicks inside our own site set nothing.
2. `signup()` (`src/lib/actions/auth.ts`) calls `recordSignupSource`, which adds one `activity_log` row of type `SIGNUP_SOURCE` for the new user, with `metadata` like `{"label":"facebook","source":"facebook","medium":"social","campaign":"trades-explainer","refHost":null,"landing":"/signup","role":"PROFESSIONAL"}`. With no cookie the label is `direct`.
3. Nothing needs a database migration: it uses the existing `activity_log` table.

## Tagging links (new posts)
Add tags to any link you share, for example:
`https://www.glowupp.co.uk/signup?role=professional&utm_source=facebook&utm_medium=social&utm_campaign=trades-explainer`
Use a short lowercase campaign name per video or post. Values are cleaned to letters, digits, `.`, `_`, `-` and cut to 40 characters.
Links without tags still work: the referring site (for example `l.facebook.com` or `lnkd.in`) is recorded instead. Some in-app browsers hide the referrer, so those show as `direct`.

## Reading the numbers (run in the Supabase SQL editor)
```sql
-- signups per source, last 30 days
select metadata->>'label' as source, metadata->>'role' as role, count(*) as signups
from activity_log
where type = 'SIGNUP_SOURCE' and created_at > now() - interval '30 days'
group by 1, 2
order by signups desc;

-- per campaign
select metadata->>'source' as source, metadata->>'campaign' as campaign, count(*) as signups
from activity_log
where type = 'SIGNUP_SOURCE' and metadata->>'campaign' is not null
group by 1, 2
order by signups desc;
```
Only signups are counted, not visits. Visits and clicks stay in Buffer's own analytics.
