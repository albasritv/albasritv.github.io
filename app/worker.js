export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowed = (env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || "https://albasritv.github.io,null")
      .split(",").map(x => x.trim()).filter(Boolean);
    const origin = request.headers.get("Origin") || "";
    const normalizedOrigin = origin || "null";
    const publicOriginAllowed = allowed.includes("*") || allowed.includes(normalizedOrigin);
    const corsOrigin = publicOriginAllowed && origin ? origin : (allowed.includes("*") ? "*" : "https://albasritv.github.io");
    const cors = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
      "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
      "Cache-Control": "no-store",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") return new Response(null,{status:204,headers:cors});
    const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{"content-type":"application/json; charset=utf-8",...cors}});
    const isAdmin=()=>{const key=request.headers.get("X-Admin-Key")||"";return !!env.ADMIN_KEY&&key===env.ADMIN_KEY};

    if(url.pathname==="/health") return json({ok:true,service:"bsr-private-api"});

    const publicMatch=url.pathname.match(/^\/channel\/([^/]+)$/);
    if(request.method==="GET"&&publicMatch){
      if(!publicOriginAllowed) return json({error:"forbidden_origin"},403);
      const id=decodeURIComponent(publicMatch[1]);
      const raw=await env.BSR_DATA.get("channel:"+id);
      if(!raw)return json({error:"not_found"},404);
      return new Response(raw,{status:200,headers:{"content-type":"application/json; charset=utf-8",...cors}});
    }

    if(url.pathname==="/admin/import"&&request.method==="POST"){
      if(!isAdmin())return json({error:"unauthorized"},401);
      let body;try{body=await request.json()}catch{return json({error:"bad_json"},400)}
      const channels=body?.channels||{},entries=Object.entries(channels);
      if(!entries.length)return json({error:"no_channels"},400);
      let saved=0;
      for(const [id,value] of entries){await env.BSR_DATA.put("channel:"+id,JSON.stringify(value));saved++}
      await env.BSR_DATA.put("meta:last_import",JSON.stringify({saved,at:Date.now(),version:body?.version||1}));
      return json({ok:true,saved});
    }

    const adminMatch=url.pathname.match(/^\/admin\/channel\/([^/]+)$/);
    if(adminMatch){
      if(!isAdmin())return json({error:"unauthorized"},401);
      const id=decodeURIComponent(adminMatch[1]);
      if(request.method==="GET"){const raw=await env.BSR_DATA.get("channel:"+id);if(!raw)return json({error:"not_found"},404);return new Response(raw,{status:200,headers:{"content-type":"application/json; charset=utf-8",...cors}})}
      if(request.method==="PUT"){let body;try{body=await request.json()}catch{return json({error:"bad_json"},400)}await env.BSR_DATA.put("channel:"+id,JSON.stringify(body));return json({ok:true})}
      if(request.method==="DELETE"){await env.BSR_DATA.delete("channel:"+id);return json({ok:true})}
    }
    return json({error:"not_found"},404);
  }
};