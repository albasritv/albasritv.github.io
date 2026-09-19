const OWNER="albasritv";
const REPO="albasritv.github.io";
const BRANCH="live-data";
const FIREBASE="https://bsr-player-9c88b-default-rtdb.firebaseio.com";

export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    if(request.method==="GET" && url.pathname==="/health"){
      return json({ok:true,service:"bsr-instant-sync",mode:"direct-live-data",branch:BRANCH},200);
    }
    if(request.method!=="POST" || url.pathname!=="/sync"){
      return json({ok:false,error:"not_found"},404);
    }
    if(!env.GITHUB_TOKEN)return json({ok:false,error:"missing_github_token"},500);
    try{
      const [categories,channels,publicMatches,matchLinks]=await Promise.all([
        fb("/bsr_player/catalog_categories"),fb("/bsr_player/catalog_channels"),
        fb("/bsr_player/public_matches"),fb("/bsr_player/match_channel_links")
      ]);
      const cats=values(categories).filter(c=>c&&String(c.scope||"LIVE").toUpperCase()==="LIVE").sort((a,b)=>(a.order??999999)-(b.order??999999)||String(a.title||"").localeCompare(String(b.title||"")));
      const allChannels=values(channels).filter(Boolean);
      const sections=cats.map(c=>{
        const list=allChannels.filter(ch=>String(ch.categoryId||"")===String(c.id||"")).sort((a,b)=>(a.order??999999)-(b.order??999999)||String(a.title||"").localeCompare(String(b.title||""))).map(ch=>({
          id:ch.id||"",categoryId:c.id||"",name:ch.title||"",image:ch.imageUrl||"",order:ch.order??0,enabled:true,
          servers:values(ch.servers).filter(Boolean).sort((a,b)=>(a.order??999999)-(b.order??999999)||String(a.name||"").localeCompare(String(b.name||"")))
        }));
        return {id:c.id||"",name:c.title||"",image:c.imageUrl||"",order:c.order??0,enabled:true,channelCount:list.length,channels:list};
      });
      const flatLinks=values(matchLinks).flatMap(x=>Array.isArray(x)?x:[x]).filter(Boolean);
      const matches=values(publicMatches).filter(Boolean).filter(m=>m.important!==false).map(m=>{
        const links=flatLinks.filter(l=>(m.matchId&&l.matchId&&String(l.matchId)===String(m.matchId))||(m.matchKey&&l.matchKey&&String(l.matchKey)===String(m.matchKey))).map(l=>({channelId:l.channelId||"",channelTitle:l.channelTitle||""})).filter(l=>l.channelId);
        if(m.channelId&&!links.some(l=>String(l.channelId)===String(m.channelId)))links.unshift({channelId:m.channelId,channelTitle:m.channelTitle||""});
        const seen=new Set(),unique=[];for(const l of links){if(seen.has(String(l.channelId)))continue;seen.add(String(l.channelId));unique.push(l)}
        return {id:m.id||"",matchId:m.matchId||"",matchKey:m.matchKey||"",homeName:m.homeName||"",awayName:m.awayName||"",homeLogo:m.homeLogo||"",awayLogo:m.awayLogo||"",baghdadTime:m.baghdadTime||m.meccaTime||"",meccaTime:m.meccaTime||m.baghdadTime||"",sourceDate:m.sourceDate||"",status:m.status||"",score:m.score||"",tournament:m.tournament||"",important:m.important!==false,channels:unique};
      }).sort((a,b)=>String(a.sourceDate||"").localeCompare(String(b.sourceDate||""))||String(a.baghdadTime||"").localeCompare(String(b.baghdadTime||"")));
      const now=new Date().toISOString(),version=Date.now();
      const catalog={version,updatedAt:now,source:"firebase-direct-worker",sections};
      const changed=await commitFiles(env.GITHUB_TOKEN,{
        "app/data/catalog-live.json":JSON.stringify(catalog,null,2),
        "app/data/matches-live.json":JSON.stringify(matches,null,2)
      });
      return json({ok:true,instant:true,changed,sections:sections.length,channels:sections.reduce((n,s)=>n+s.channels.length,0),matches:matches.length,updatedAt:now},200);
    }catch(e){return json({ok:false,error:String(e?.message||e)},500)}
  }
};

function values(v){return Array.isArray(v)?v:Object.values(v||{})}
async function fb(path){const r=await fetch(FIREBASE+path+".json?ts="+Date.now(),{headers:{"Cache-Control":"no-cache"}});if(!r.ok)throw new Error("firebase "+path+" HTTP "+r.status);return r.json()}
function ghHeaders(token){return{"Accept":"application/vnd.github+json","Authorization":"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28","User-Agent":"BSR-Instant-Sync","Content-Type":"application/json"}}
async function commitFiles(token,files){
  const headers=ghHeaders(token);
  const getRefUrl=`https://api.github.com/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`;
  const updateRefUrl=`https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`;
  const ref=await fetch(getRefUrl,{headers}).then(checkJson),parent=ref.object.sha;
  const commit=await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/commits/${parent}`,{headers}).then(checkJson);
  const treeEntries=[];
  for(const [path,content] of Object.entries(files)){
    const blob=await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/blobs`,{method:"POST",headers,body:JSON.stringify({content,encoding:"utf-8"})}).then(checkJson);
    treeEntries.push({path,mode:"100644",type:"blob",sha:blob.sha});
  }
  const tree=await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/trees`,{method:"POST",headers,body:JSON.stringify({base_tree:commit.tree.sha,tree:treeEntries})}).then(checkJson);
  if(String(tree.sha)===String(commit.tree.sha))return false;
  const newCommit=await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/commits`,{method:"POST",headers,body:JSON.stringify({message:"Instant Firebase live data sync",tree:tree.sha,parents:[parent]})}).then(checkJson);
  const update=await fetch(updateRefUrl,{method:"PATCH",headers,body:JSON.stringify({sha:newCommit.sha,force:false})});
  if(!update.ok)throw new Error("github ref update HTTP "+update.status+" "+await update.text());
  return true;
}
async function checkJson(r){if(!r.ok)throw new Error("github HTTP "+r.status+" "+await r.text());return r.json()}
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}})}
