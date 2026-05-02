-- Tavily quota tracker. Free tier = 1,000 searches/month. We keep a single-row
-- counter keyed to the start-of-month date; when month_start rolls over, the
-- caller resets count to 0 before incrementing.
create table if not exists tavily_quota (
  id int primary key default 1,
  month_start date not null,
  count int not null default 0,
  check (id = 1)
);
insert into tavily_quota (id, month_start, count)
values (1, date_trunc('month', now())::date, 0)
on conflict (id) do nothing;
