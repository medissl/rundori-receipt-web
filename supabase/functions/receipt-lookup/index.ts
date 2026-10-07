import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
// The 256-bit capability token is custom authentication. No anonymous table access.
// The service credential is provided by Supabase only inside this Edge Function.
Deno.serve(async (req:Request)=>{
 const headers={'Content-Type':'application/json','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'};
 const miss=()=>new Response(JSON.stringify({error:'not_found'}),{status:404,headers});
 if(req.method!=='POST'||Number(req.headers.get('content-length')??0)>1024) return miss();
 try{
  const {token}=await req.json();if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return miss();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.from('receipts').select('id,receipt_number,customer_name,status,payment_method,total,amount_paid,notes,created_at,updated_at,confirmed_at,receipt_items(id,service_name,description,quantity,unit_price,position,item_photos(id,item_id,phase,object_key))').eq('public_token_hash',hash).gt('token_expires_at',new Date().toISOString()).not('confirmed_at','is',null).maybeSingle();
  if(error) return new Response(JSON.stringify({error:'unavailable'}),{status:503,headers});
  if(!data)return miss();data.receipt_items.sort((a:{position:number},b:{position:number})=>a.position-b.position);
  return new Response(JSON.stringify(data),{headers});
 }catch{return miss();}
});
