import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const base=(process.env.FIREBASE_DATABASE_URL||"").replace(/\/$/,"");
const token=process.env.FIREBASE_AUTH_TOKEN||"";
if(!base) throw new Error("FIREBASE_DATABASE_URL secret is required");
const qs=token?"?auth="+encodeURIComponent(token):"";
async function get(p){
  const r=await fetch(base+p+".json"+qs,{headers:{"Cache-Control":"no-cache"}});
  if(!r.ok)throw new Error(p+" -> HTTP "+r.status);
  return await r.json();
}

const [categories,channels,publicMatches,matchLinks]=await Promise.all([
  get("/bsr_player/catalog_categories"),
  get("/bsr_player/catalog_channels"),
  get("/bsr_player/public_matches"),
  get("/bsr_player/match_channel_links")
]);

const cats=(Array.isArray(categories)?categories:Object.values(categories||{}))
  .filter(c=>c&&c.scope==="LIVE")
  .sort((a,b)=>(a.order??999999)-(b.order??999999)||String(a.title||"").localeCompare(String(b.title||"")));
const allChannels=(Array.isArray(channels)?channels:Object.values(channels||{})).filter(Boolean);

const categoriesDir="app/data/categories";
const channelsDir="app/data/channels";
await rm(categoriesDir,{recursive:true,force:true});
await rm(channelsDir,{recursive:true,force:true});
await mkdir(categoriesDir,{recursive:true});
await mkdir(channelsDir,{recursive:true});

const sections=[];
let channelCount=0,serverCount=0;

for(const c of cats){
  const fullChannels=allChannels
    .filter(ch=>ch.categoryId===c.id)
    .sort((a,b)=>(a.order??999999)-(b.order??999999)||String(a.title||"").localeCompare(String(b.title||"")))
    .map(ch=>{
      const servers=(Array.isArray(ch.servers)?ch.servers:Object.values(ch.servers||{}))
        .filter(Boolean)
        .sort((a,b)=>(a.order??999999)-(b.order??999999)||String(a.name||"").localeCompare(String(b.name||"")));
      serverCount+=servers.length;
      return {id:ch.id||"",categoryId:c.id||"",name:ch.title||"",image:ch.imageUrl||"",order:ch.order??0,enabled:true,servers};
    });

  channelCount+=fullChannels.length;
  const summaries=[];

  for(const ch of fullChannels){
    summaries.push({id:ch.id,name:ch.name,image:ch.image,order:ch.order,enabled:ch.enabled,serverCount:ch.servers.length});
    await writeFile(path.join(channelsDir,ch.id+".json"),JSON.stringify(ch,null,2));
  }

  sections.push({id:c.id||"",name:c.title||"",image:c.imageUrl||"",order:c.order??0,enabled:true,channelCount:summaries.length});
  await writeFile(path.join(categoriesDir,(c.id||"unknown")+".json"),JSON.stringify({
    id:c.id||"",name:c.title||"",image:c.imageUrl||"",order:c.order??0,channels:summaries
  },null,2));
}

await writeFile("app/data/sections.json",JSON.stringify(sections,null,2));

const matches=(Array.isArray(publicMatches)?publicMatches:Object.values(publicMatches||{}))
  .filter(Boolean)
  .filter(m=>m.important!==false)
  .map(m=>{
    const links=(Array.isArray(matchLinks)?matchLinks:Object.values(matchLinks||{}))
      .flatMap(x=>Array.isArray(x)?x:[x])
      .filter(Boolean)
      .filter(l=>
        (m.matchId&&l.matchId&&String(l.matchId)===String(m.matchId)) ||
        (m.matchKey&&l.matchKey&&String(l.matchKey)===String(m.matchKey))
      )
      .map(l=>({channelId:l.channelId||"",channelTitle:l.channelTitle||""}))
      .filter(l=>l.channelId);

    if(m.channelId && !links.some(l=>l.channelId===m.channelId)){
      links.unshift({channelId:m.channelId,channelTitle:m.channelTitle||""});
    }

    const unique=[];
    const seen=new Set();
    for(const l of links){
      if(seen.has(l.channelId)) continue;
      seen.add(l.channelId);
      unique.push(l);
    }

    return {
      id:m.id||"",
      matchId:m.matchId||"",
      matchKey:m.matchKey||"",
      homeName:m.homeName||"",
      awayName:m.awayName||"",
      homeLogo:m.homeLogo||"",
      awayLogo:m.awayLogo||"",
      baghdadTime:m.baghdadTime||m.meccaTime||"",
      meccaTime:m.meccaTime||m.baghdadTime||"",
      sourceDate:m.sourceDate||"",
      status:m.status||"",
      score:m.score||"",
      tournament:m.tournament||"",
      important:m.important!==false,
      channels:unique
    };
  })
  .sort((a,b)=>String(a.sourceDate||"").localeCompare(String(b.sourceDate||"")) || String(a.baghdadTime||"").localeCompare(String(b.baghdadTime||"")));

await writeFile("app/data/matches.json",JSON.stringify(matches,null,2));

await writeFile("app/data/version.json",JSON.stringify({
  version:Date.now(),updatedAt:new Date().toISOString(),source:"firebase",
  sections:sections.length,channels:channelCount,servers:serverCount,matches:matches.length
},null,2));

console.log({sections:sections.length,channels:channelCount,servers:serverCount,matches:matches.length});
