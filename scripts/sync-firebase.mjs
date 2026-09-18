import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const base=(process.env.FIREBASE_DATABASE_URL||"").replace(/\\\/$/,"");
const token=process.env.FIREBASE_AUTH_TOKEN||"";
if(!base) throw new Error("FIREBASE_DATABASE_URL secret is required");
const qs=token?"?auth="+encodeURIComponent(token):"";
async function get(p){const r=await fetch(base+p+".json"+qs);if(!r.ok)throw new Error(p+" -> HTTP "+r.status);return await r.json();}

const [categories,channels]=await Promise.all([
  get("/bsr_player/catalog_categories"),
  get("/bsr_player/catalog_channels")
]);
const cats=(Array.isArray(categories)?categories:Object.values(categories||{})).filter(c=>c&&c.scope==="LIVE").sort((a,b)=>(a.order??999999)-(b.order??999999)||String(a.title||"").localeCompare(String(b.title||"")));
const allChannels=(Array.isArray(channels)?channels:Object.values(channels||{})).filter(Boolean);
const outDir="app/data/categories";
await rm(outDir,{recursive:true,force:true});
await mkdir(outDir,{recursive:true});
const sections=[];
let channelCount=0,serverCount=0;
for(const c of cats){
  const chs=allChannels.filter(ch=>ch.categoryId===c.id).sort((a,b)=>(a.order??999999)-(b.order??999999)||String(a.title||"").localeCompare(String(b.title||""))).map(ch=>{
    const servers=(Array.isArray(ch.servers)?ch.servers:Object.values(ch.servers||{})).filter(Boolean).sort((a,b)=>(a.order??999999)-(b.order??999999)||String(a.name||"").localeCompare(String(b.name||"")));
    serverCount+=servers.length;
    return {id:ch.id||"",name:ch.title||"",image:ch.imageUrl||"",order:ch.order??0,enabled:true,servers};
  });
  channelCount+=chs.length;
  sections.push({id:c.id||"",name:c.title||"",image:c.imageUrl||"",order:c.order??0,enabled:true,channelCount:chs.length});
  await writeFile(path.join(outDir,(c.id||"unknown")+".json"),JSON.stringify({id:c.id||"",name:c.title||"",image:c.imageUrl||"",order:c.order??0,channels:chs},null,2));
}
await writeFile("app/data/sections.json",JSON.stringify(sections,null,2));
await writeFile("app/data/version.json",JSON.stringify({version:Date.now(),updatedAt:new Date().toISOString(),source:"firebase",sections:sections.length,channels:channelCount,servers:serverCount},null,2));
console.log({sections:sections.length,channels:channelCount,servers:serverCount});
