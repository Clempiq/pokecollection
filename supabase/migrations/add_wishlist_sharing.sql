-- Add sharing columns to profiles
alter table profiles add column if not exists wishlist_share_token text unique;
alter table profiles add column if not exists wishlist_public boolean default false;

-- Create function to get public wishlist
create or replace function get_public_wishlist(token text)
returns json as $$
begin
  return (
    select json_build_object(
      'username', p.username,
      'email', p.email,
      'items', json_agg(
        json_build_object(
          'id', w.id,
          'name', w.name,
          'target_price', w.target_price,
          'priority', w.priority,
          'image_url', w.image_url,
          'product_id', w.product_id
        )
      )
    )
    from profiles p
    left join wishlists w on w.user_id = p.id
    where p.wishlist_share_token = token and p.wishlist_public = true
    group by p.id, p.username, p.email
  );
end;
$$ language plpgsql security definer;

-- Create function to get wishlist owner
create or replace function get_wishlist_owner(token text)
returns uuid as $$
begin
  return (
    select id from profiles
    where wishlist_share_token = token and wishlist_public = true
    limit 1
  );
end;
$$ language plpgsql security definer;
