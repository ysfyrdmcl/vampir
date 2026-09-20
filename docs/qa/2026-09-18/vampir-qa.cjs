const {io}=require('socket.io-client');
const fs=require('node:fs');
const output=[]; const sockets=[];
const log=(kind,data)=>{output.push({kind,...data}); console.log(JSON.stringify(output.at(-1)))};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function send(c,event,payload,success){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{cleanup();reject(new Error('Timeout '+event))},4000);
    function cleanup(){clearTimeout(timer);c.s.off(success,ok);c.s.off('error:event',bad)}
    function ok(v){if(success==='game:private-result'&&!v.accepted)return;cleanup();resolve(v)}
    function bad(v){cleanup();resolve({error:v})}
    c.s.on(success,ok);c.s.on('error:event',bad);c.s.emit(event,payload);
  });
}
async function client(i){
  const s=io('http://127.0.0.1:3000',{transports:['websocket'],reconnection:false});sockets.push(s);
  const c={s,identity:{deviceId:`qa-${Date.now()}-${i}`},role:null};
  s.on('room:state',v=>c.room=v);s.on('game:phase',v=>c.phase=v);
  s.on('game:private-role',v=>{if(v.role)c.role=v.role});
  s.on('game:over',v=>c.winner=v.winner);
  s.on('game:result',v=>{c.results??=[];c.results.push(v)});
  await new Promise((r,j)=>{s.once('connect',r);s.once('connect_error',j)});return c;
}
const base=c=>({identity:c.identity,roomCode:c.roomCode});
async function setup(n,rules={}){
  const cs=[];for(let i=0;i<n;i++)cs.push(await client(i));
  const phaseDurations=Object.fromEntries(['roleReveal','nightStart','vampireVote','detectiveInspect','doctorProtect','nightResolve','dayStart','mayorElection','guardProtect','dayDiscussion','dayVote','executionResolve','hunterLastBreath','winCheck'].map(k=>[k,0]));
  const session=await send(cs[0],'room:create',{identity:cs[0].identity,nickname:'QA Host',phaseDurations,gameMode:rules.firstNightNoKill?'SafeFirstNight':'Classic',rolePreset:'beginner',rules:{mayorEnabled:false,loversEnabled:false,...rules}},'room:join');
  for(let i=0;i<n;i++){
    const c=cs[i];const joined=i?await send(c,'room:join',{identity:c.identity,roomCode:session.roomCode,nickname:`QA Player ${i}`},'room:join'):session;
    Object.assign(c,{roomCode:joined.roomCode,id:joined.playerId});c.identity.playerSessionToken=joined.playerSessionToken;
    await send(c,'room:ready-toggle',{...base(c),isReady:true},'room:state');
  }
  await send(cs[0],'room:start',base(cs[0]),'game:phase');await delay(40);return cs;
}
const advance=c=>send(c,'game:phase-advance',base(c),'game:phase');
const action=(c,type,target)=>send(c,'game:action:submit',{...base(c),actionType:type,targetPlayerId:target,phase:c.phase.phase,round:c.phase.round},'game:private-result');
async function toDay(cs){
  const h=cs[0];while(h.phase.phase!=='DayVote'){
    if(h.phase.phase==='VampireVote')for(const c of cs.filter(c=>c.role==='Vampire'))await action(c,'vampire-target',cs.find(p=>p.role!=='Vampire').id);
    const result=await advance(h);if(result.error)throw new Error(JSON.stringify(result));await delay(30);
  }
}
module.exports={client,send,base,setup,advance,action,delay,sockets};
if(require.main===module)(async()=>{
 try{
  const cs=await setup(4,{firstNightNoKill:true,noLynchEnabled:true});const h=cs[0];await toDay(cs);
  const target=cs[0].id;
  for(let i=0;i<4;i++)await action(cs[i],'day-vote',i<2?'__NO_LYNCH__':target);
  await advance(h);await delay(30);log('tie-result',{phase:h.phase.phase,summary:h.phase.lastDayVoteSummary,event:h.results?.at(-1)});
  await advance(h);await delay(30);
  log('no-lynch-revote',{reply:await action(h,'day-vote','__NO_LYNCH__')});
  log('self-revote',{reply:await action(h,'day-vote',target)});
  for(const c of cs.slice(1))await action(c,'day-vote',target);
  log('manual-deadlock',{reply:await advance(h),phase:h.phase.phase,phaseEndsAt:h.phase.phaseEndsAt});
  cs.forEach(c=>c.s.disconnect());await delay(100);
  for(const outcome of ['Villagers','Vampires']){
    const players=await setup(4,{firstNightNoKill:false,noLynchEnabled:false});const host=players[0];await toDay(players);
    const alive=players.filter(c=>host.room.players.find(p=>p.playerId===c.id)?.isAlive);
    const targetPlayer=alive.find(c=>outcome==='Villagers'?c.role==='Vampire':c.role!=='Vampire');
    for(const c of alive)await action(c,'day-vote',c.id===targetPlayer.id?alive.find(p=>p.id!==c.id).id:targetPlayer.id);
    await advance(host);await delay(30);await advance(host);await delay(30);
    log('complete-match',{expected:outcome,status:host.room.status,phase:host.phase.phase,winner:host.winner,players:host.room.players.map(p=>({name:p.nickname,role:p.role,alive:p.isAlive}))});
    await send(host,'room:reset-to-lobby',base(host),'room:state');await delay(30);
    log('rematch-reset',{status:host.room.status,allUnready:host.room.players.every(p=>!p.isReady),rolesCleared:host.room.players.every(p=>p.role===null)});
    for(const c of players)await send(c,'room:ready-toggle',{...base(c),isReady:true},'room:state');
    await send(host,'room:start',base(host),'game:phase');await delay(30);
    log('rematch-start',{phase:host.phase.phase,round:host.phase.round});
    players.forEach(c=>c.s.disconnect());await delay(100);
  }
 }finally{sockets.forEach(s=>s.disconnect());fs.writeFileSync(require('node:path').join(__dirname,'vampir-qa-results.json'),JSON.stringify(output,null,2))}
})().catch(e=>{console.error(e);process.exitCode=1});
